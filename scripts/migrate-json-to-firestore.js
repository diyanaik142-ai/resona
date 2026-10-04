import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRESTORE_DATABASE_ID, db } from '../server/firebaseAdmin.js';

// Dry-run by default. This additive/idempotent importer refuses to overwrite
// any destination document and preserves local source files unchanged.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'server', 'data');
const apply = process.argv.includes('--apply');
const confirmation = `resona-13-${FIRESTORE_DATABASE_ID}`;
if (apply && process.env.CONFIRM_EXISTING_FIRESTORE_SCHEMA !== confirmation) {
  throw new Error(`Before applying, inspect existing Firestore collections and set CONFIRM_EXISTING_FIRESTORE_SCHEMA=${confirmation} to confirm the mapping.`);
}
const report = [];
const migratedProfileIds = new Set();
const mediaReport = [];

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isEmptyDefaultAccountData(fileName, data) {
  if (!isPlainObject(data)) return false;
  if (fileName === 'social.json') {
    return ['friends', 'notifications'].every((key) => Array.isArray(data[key]) && data[key].length === 0);
  }
  if (fileName === 'shelf.json') {
    return ['likedTrackIds', 'downloadedTrackIds', 'playlists', 'recentlyPlayed', 'listeningEvents'].every((key) => Array.isArray(data[key]) && data[key].length === 0);
  }
  return false;
}

function isObviousTestAudit(item) {
  return /automated test/i.test(JSON.stringify(item));
}

function sanitizeAdminSettings(data) {
  if (!isPlainObject(data)) return data;
  const next = structuredClone(data);
  if (/automated test/i.test(String(next.platform?.maintenanceMessage || ''))) {
    next.platform.maintenanceMessage = "Resona is currently undergoing scheduled maintenance. We'll be back shortly.";
    report.push({ source: 'global/admin_settings.json', field: 'platform.maintenanceMessage', action: 'sanitized-obvious-test-value' });
  }
  return next;
}

async function listFiles(directory) {
  let entries;
  try { entries = await fs.readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
  const nested = await Promise.all(entries.map(async (entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  }));
  return nested.flat();
}

async function importDocument(ref, data, source) {
  const existing = await ref.get();
  if (existing.exists) {
    report.push({ source, destination: ref.path, action: 'skipped-existing' });
    return;
  }
  if (apply) await ref.create(data);
  report.push({ source, destination: ref.path, action: apply ? 'imported' : 'would-import' });
}

const mediaDir = path.join(dataDir, 'media');
const mediaFiles = (await listFiles(mediaDir)).filter((file) => !file.endsWith('.json'));
for (const file of mediaFiles) {
  mediaReport.push({ source: path.relative(dataDir, file).split(path.sep).join('/'), bytes: (await fs.stat(file)).size, action: 'requires-reviewed-upload' });
}

for (const file of await listFiles(dataDir)) {
  const relative = path.relative(dataDir, file).split(path.sep).join('/');
  if (!relative.endsWith('.json')) continue;
  const data = JSON.parse(await fs.readFile(file, 'utf8'));
  if (relative === 'auth/accounts.json' && Array.isArray(data)) {
    for (const account of data) {
      if (!account?.id) { report.push({ source: relative, action: 'skipped-invalid-account' }); continue; }
      const profilePath = path.join(dataDir, 'accounts', account.id, 'profile.json');
      let profile = {};
      try { profile = JSON.parse(await fs.readFile(profilePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      const merged = { ...account, ...profile, id: account.id, internalUserId: account.id, emailLower: String(account.email || '').toLowerCase() };
      await importDocument(db.collection('users').doc(account.id), merged, relative);
      migratedProfileIds.add(String(account.id));
      const accountEmail = account.email || profile.email;
      if (accountEmail) await importDocument(db.collection('userEmailIndex').doc(encodeURIComponent(String(accountEmail).toLowerCase())), { userId: account.id }, relative);
      const uid = String(profile.uid || profile.handle || '').replace(/^@+/, '').toLowerCase();
      if (uid) await importDocument(db.collection('userUids').doc(uid), { userId: account.id, normalizedUid: uid }, relative);
      const accountDir = path.join(dataDir, 'accounts', account.id);
      for (const accountFile of await listFiles(accountDir)) {
        if (!accountFile.endsWith('.json') || accountFile.endsWith('profile.json')) continue;
        const name = path.basename(accountFile, '.json');
        const accountData = JSON.parse(await fs.readFile(accountFile, 'utf8'));
        if (isEmptyDefaultAccountData(path.basename(accountFile), accountData)) {
          report.push({ source: path.relative(dataDir, accountFile), action: 'skipped-empty-default' });
          continue;
        }
        await importDocument(db.collection('users').doc(account.id).collection('privateData').doc(name), { data: accountData }, path.relative(dataDir, accountFile));
      }
    }
    continue;
  }
  if (!relative.startsWith('global/')) continue;
  const base = path.basename(relative, '.json');
  const collectionByFile = {
    catalog: 'tracks', audit_logs: 'auditLogs', requests: 'songRequests', creator_apps: 'creatorApplications',
    huddles: 'huddles', fusions: 'fusions', plan_change_requests: 'planChangeRequests'
  };
  if (base === 'admin_settings') { await importDocument(db.collection('resonaData').doc('platformSettings'), { value: sanitizeAdminSettings(data) }, relative); continue; }
  if (base === 'plans') { await importDocument(db.collection('resonaData').doc('plans'), { value: data }, relative); continue; }
  if (base === 'overrides') { await importDocument(db.collection('resonaData').doc('featureOverrides'), { value: data }, relative); continue; }
  if (base === 'recommendation_cache') { await importDocument(db.collection('resonaData').doc('recommendationCache'), { value: data }, relative); continue; }
  const collection = collectionByFile[base];
  if (!collection || !Array.isArray(data)) { report.push({ source: relative, action: 'skipped-unmapped-or-not-array' }); continue; }
  for (let index = 0; index < data.length; index++) {
    const item = data[index];
    if (base === 'audit_logs' && isObviousTestAudit(item)) { report.push({ source: relative, index, action: 'skipped-obvious-test-audit' }); continue; }
    if (!item?.id) { report.push({ source: relative, index, action: 'skipped-no-stable-id' }); continue; }
    const localReferences = ['audioUrl', 'cover', 'artwork'].filter((field) => /(?:localhost|127\.0\.0\.1|\/media\/|^[A-Za-z]:\\)/i.test(String(item[field] || '')));
    if (localReferences.length) report.push({ source: relative, id: item.id, action: 'media-reference-needs-review', fields: localReferences });
    await importDocument(db.collection(collection).doc(String(item.id)), item, relative);
  }
}

for (const profileFile of (await listFiles(path.join(dataDir, 'accounts'))).filter((file) => path.basename(file) === 'profile.json')) {
  const userId = path.basename(path.dirname(profileFile));
  if (migratedProfileIds.has(userId)) continue;
  const profile = JSON.parse(await fs.readFile(profileFile, 'utf8'));
  if (!profile?.id && !profile?.email && !profile?.name) continue;
  const userProfile = { id: userId, internalUserId: userId, ...profile };
  if (profile.email) userProfile.emailLower = String(profile.email).toLowerCase();
  await importDocument(db.collection('users').doc(userId), userProfile, path.relative(dataDir, profileFile));
  const uid = String(profile.uid || profile.handle || '').replace(/^@+/, '').toLowerCase();
  if (uid) await importDocument(db.collection('userUids').doc(uid), { userId, normalizedUid: uid }, path.relative(dataDir, profileFile));
  const accountDir = path.dirname(profileFile);
  for (const file of await listFiles(accountDir)) {
    if (!file.endsWith('.json') || file === profileFile) continue;
    const accountData = JSON.parse(await fs.readFile(file, 'utf8'));
    if (isEmptyDefaultAccountData(path.basename(file), accountData)) {
      report.push({ source: path.relative(dataDir, file), action: 'skipped-empty-default' });
      continue;
    }
    await importDocument(db.collection('users').doc(userId).collection('privateData').doc(path.basename(file, '.json')), { data: accountData }, path.relative(dataDir, file));
  }
}

console.log(JSON.stringify({ mode: apply ? 'apply-additive' : 'dry-run', projectId: db.projectId, database: FIRESTORE_DATABASE_ID, records: report.length, report, media: { files: mediaReport.length, bytes: mediaReport.reduce((sum, item) => sum + item.bytes, 0), candidates: mediaReport } }, null, 2));

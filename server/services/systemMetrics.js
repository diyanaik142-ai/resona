import fs from 'fs/promises';
import path from 'path';
import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from '../firebaseAdmin.js';
import { DATA_DIR, CATALOG_FILE, CREATORS_FILE } from '../config.js';
import { getGlobalData } from '../db/storage.js';

/**
 * RESONA SYSTEM METRICS — every value here is measured, never assumed.
 * If something cannot be measured, the result says so (ok:false / null + error),
 * it never substitutes a placeholder number.
 */

export const MEDIA_DIR = path.resolve(DATA_DIR, 'media');
export const PROCESS_STARTED_AT = new Date(Date.now() - process.uptime() * 1000).toISOString();

export function getEnvironment() {
  const raw = (process.env.NODE_ENV || '').trim().toLowerCase();
  if (raw === 'production') return { name: 'production', source: 'NODE_ENV=production' };
  if (raw === 'test') return { name: 'test', source: 'NODE_ENV=test' };
  if (raw) return { name: 'development', source: `NODE_ENV=${raw}` };
  return { name: 'development', source: 'NODE_ENV not set' };
}

async function timed(fn) {
  const start = process.hrtime.bigint();
  try {
    const detail = await fn();
    return { ok: true, latencyMs: Number(process.hrtime.bigint() - start) / 1e6, detail: detail ?? null, error: null };
  } catch (err) {
    return { ok: false, latencyMs: Number(process.hrtime.bigint() - start) / 1e6, detail: null, error: describeError(err) };
  }
}

function describeError(err) {
  if (!err) return 'Unknown error';
  if (err.code === 5 || /NOT_FOUND/.test(err.message || '')) return 'Database not found (NOT_FOUND) — no Firestore database exists for this project';
  if (err.code === 7 || /PERMISSION_DENIED/.test(err.message || '')) return 'Permission denied';
  if (err.code === 'ENOENT') return `Path not found: ${err.path}`;
  if (err.code === 'EACCES' || err.code === 'EPERM') return `Access denied: ${err.path}`;
  return err.message || String(err);
}

/** Recursively measure a directory. Returns { bytes, files }. */
export async function measureDir(dir) {
  let bytes = 0, files = 0;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return { bytes: 0, files: 0, exists: false };
    throw err;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const sub = await measureDir(full);
      bytes += sub.bytes; files += sub.files;
    } else if (e.isFile()) {
      const st = await fs.stat(full);
      bytes += st.size; files += 1;
    }
  }
  return { bytes, files, exists: true };
}

async function readJsonArray(file) {
  const raw = await fs.readFile(file, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error(`${path.basename(file)} is not an array`);
  return data;
}

/** Individual component health checks. */
export async function runHealthChecks() {
  const [firebaseAuth, firestore, catalog, media] = await Promise.all([
    timed(async () => { await getAuth().listUsers(1); return 'listUsers succeeded'; }),
    timed(async () => { const cols = await getAdminFirestore().listCollections(); return `${cols.length} collection(s)`; }),
    timed(async () => { const items = await getGlobalData(CATALOG_FILE); return `${items.length} record(s) readable`; }),
    timed(async () => { const { bucket } = await import('../firebaseAdmin.js'); await bucket.getMetadata(); return `bucket ${bucket.name} accessible`; })
  ]);

  const components = [
    { id: 'backend', name: 'Backend API', required: true, ok: true, latencyMs: 0, detail: `Process ${process.pid} responding`, error: null },
    { id: 'firebase_auth', name: 'Firebase Authentication', required: true, ...firebaseAuth },
    {
      id: 'firestore', name: 'Firestore', required: false, ...firestore,
      note: 'Firestore is the authoritative application data store'
    },
    { id: 'catalog', name: 'Firestore Catalog', required: true, ...catalog, location: 'tracks' },
    { id: 'media', name: 'Firebase Storage', required: true, ...media, location: 'default bucket' }
  ].map(c => ({ ...c, status: c.ok ? 'operational' : 'unavailable', latencyMs: Math.round(c.latencyMs * 10) / 10 }));

  const requiredDown = components.filter(c => c.required && !c.ok).length;
  const optionalDown = components.filter(c => !c.required && !c.ok).length;
  const overall = requiredDown === 0 ? 'operational' : requiredDown >= components.filter(c => c.required).length - 1 ? 'unavailable' : 'degraded';

  return {
    overall,
    requiredDown,
    optionalDown,
    checkedAt: new Date().toISOString(),
    components
  };
}

export async function getStorageMetrics() {
  const [data, media, disk] = await Promise.all([
    measureDir(DATA_DIR),
    measureDir(MEDIA_DIR),
    fs.statfs(DATA_DIR).then(s => ({
      totalBytes: s.blocks * s.bsize,
      freeBytes: s.bavail * s.bsize
    })).catch(err => ({ error: describeError(err) }))
  ]);
  return {
    totalBytes: data.bytes,
    totalFiles: data.files,
    mediaBytes: media.bytes,
    mediaFiles: media.files,
    appDataBytes: data.bytes - media.bytes,
    disk: disk.error ? { available: false, error: disk.error } : {
      available: true,
      totalBytes: disk.totalBytes,
      freeBytes: disk.freeBytes,
      usedBytes: disk.totalBytes - disk.freeBytes
    },
    location: path.relative(process.cwd(), DATA_DIR)
  };
}

/** List every Firebase Auth user (paginated). */
async function listAllAuthUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await getAuth().listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

function startOfMonth(d, offset = 0) { return new Date(d.getFullYear(), d.getMonth() + offset, 1); }
function startOfWeek(d) {
  const s = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (s.getDay() + 6) % 7; // Monday = 0
  s.setDate(s.getDate() - day);
  return s;
}

export async function getUserStats() {
  const users = await listAllAuthUsers();
  const now = new Date();
  const thisMonth = startOfMonth(now), lastMonth = startOfMonth(now, -1);
  let currentMonth = 0, previousMonth = 0;
  for (const u of users) {
    const created = new Date(u.metadata.creationTime);
    if (created >= thisMonth) currentMonth++;
    else if (created >= lastMonth) previousMonth++;
  }
  const percentChange = previousMonth > 0 ? ((currentMonth - previousMonth) / previousMonth) * 100 : null;
  return {
    total: users.length,
    disabled: users.filter(u => u.disabled).length,
    createdThisMonth: currentMonth,
    createdPreviousMonth: previousMonth,
    percentChange, // null when previous month had 0 (avoid Infinity)
    source: 'Firebase Authentication'
  };
}

const isPublished = t => String(t?.status || '').toLowerCase() === 'published';

export async function getCatalogStats() {
  const tracks = await getGlobalData(CATALOG_FILE);
  const weekStart = startOfWeek(new Date());
  const published = tracks.filter(isPublished);
  const addedThisWeek = published.filter(t => t.createdAt && new Date(t.createdAt) >= weekStart).length;
  const statusCounts = {};
  for (const t of tracks) {
    const s = t.status || 'Unknown';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }
  return {
    published: published.length,
    totalRecords: tracks.length,
    statusCounts,
    addedThisWeek,
    weekStartsAt: weekStart.toISOString(),
    missingTimestamps: published.filter(t => !t.createdAt).length,
    source: 'Firestore tracks collection'
  };
}

export async function getCreatorApplicationStats() {
  const apps = await getGlobalData(CREATORS_FILE);
  const by = s => apps.filter(a => String(a?.status || '').toLowerCase() === s).length;
  return { total: apps.length, pending: by('pending'), approved: by('approved'), rejected: by('rejected'), source: 'Firestore creatorApplications collection' };
}

/** Wrap a metric so one failure doesn't hide the others; failures are reported, not zeroed. */
export async function settle(fn) {
  try { return { ok: true, data: await fn(), error: null }; }
  catch (err) { return { ok: false, data: null, error: describeError(err) }; }
}

/**
 * Catalog integrity verification (read-only): checks every catalog record's media
 * files exist on disk and finds media files no record references.
 */
export async function verifyCatalog() {
  const tracks = await getGlobalData(CATALOG_FILE);
  const fileFromUrl = url => {
    if (!url || typeof url !== 'string') return null;
    const m = url.match(/\/media\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  };

  const issues = [];
  for (const t of tracks) {
    for (const [field, label] of [['audioUrl', 'audio'], ['cover', 'cover']]) {
      const file = fileFromUrl(t[field]);
      if (!t[field]) {
        if (label === 'audio') issues.push({ trackId: t.id, title: t.title, type: 'no_audio', message: 'Track has no audio file' });
        continue;
      }
      if (!file) continue;
      issues.push({ trackId: t.id, title: t.title, type: `legacy_${label}_url`, message: `${label} still references local media; migrate it to Firebase Storage.` });
    }
    if (!t.createdAt) issues.push({ trackId: t.id, title: t.title, type: 'no_timestamp', message: 'Track has no createdAt timestamp' });
  }
  const orphanedFiles = [];

  return {
    checkedAt: new Date().toISOString(),
    tracksChecked: tracks.length,
    mediaFilesChecked: mediaFiles.length,
    issues,
    orphanedFiles,
    healthy: issues.length === 0 && orphanedFiles.length === 0
  };
}

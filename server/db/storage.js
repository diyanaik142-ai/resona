import bcrypt from 'bcryptjs';
import path from 'path';
import {
  CATALOG_FILE, AUDIT_FILE, REQUESTS_FILE, CREATORS_FILE, SETTINGS_FILE, HUDDLES_FILE, FUSIONS_FILE,
  PLANS_FILE, OVERRIDES_FILE, PLAN_CHANGE_REQUESTS_FILE, RECOMMENDATION_CACHE_FILE,
  ADMIN_PLAYLISTS_FILE
} from '../config.js';
import { db } from '../firebaseAdmin.js';
import { normalizePlans, normalizeOverrides } from '../services/entitlements.js';

const globalCollections = new Map([
  [CATALOG_FILE, 'tracks'], [AUDIT_FILE, 'auditLogs'], [REQUESTS_FILE, 'songRequests'],
  [CREATORS_FILE, 'creatorApplications'], [HUDDLES_FILE, 'huddles'], [FUSIONS_FILE, 'fusions'],
  [PLAN_CHANGE_REQUESTS_FILE, 'planChangeRequests'], [ADMIN_PLAYLISTS_FILE, 'adminPlaylists']
]);
const singletonCollections = new Map([
  [SETTINGS_FILE, 'platformSettings'], [PLANS_FILE, 'plans'], [OVERRIDES_FILE, 'featureOverrides'],
  [RECOMMENDATION_CACHE_FILE, 'recommendationCache']
]);

const profileFromAccount = (account) => ({
  id: account.id, email: account.email, name: '', uid: '', handle: '', role: 'listener',
  planId: 'resona', avatar: null, phone: '', createdAt: account.createdAt
});

export function normalizeUid(rawValue) {
  if (rawValue === null || rawValue === undefined) return '';
  const normalized = String(rawValue).trim().replace(/^@+/, '').toLowerCase();
  if (!normalized || normalized.length < 3 || normalized.length > 30 || !/^[a-z0-9_]+$/.test(normalized)) return '';
  return normalized;
}

export function formatUid(rawValue) {
  const value = normalizeUid(rawValue);
  return value ? `@${value}` : '';
}

function collectionForGlobalFile(file) {
  const collection = globalCollections.get(path.resolve(file));
  if (!collection) throw new Error(`Unmapped Firestore data collection: ${path.basename(file)}`);
  return collection;
}

function singletonForGlobalFile(file) {
  return singletonCollections.get(path.resolve(file)) || null;
}

function profileRef(userId) { return db.collection('users').doc(String(userId)); }

export async function initStorage() {
  // Deliberately do not seed production with default data or read local JSON.
  // Existing records remain untouched until an explicit, reviewed migration.
  await db.listCollections();
}

export function getAccountFilePath(userId, fileName) {
  return `users/${userId}/${fileName}`;
}

export async function initAccountData(userId, profileData = {}) {
  const now = new Date().toISOString();
  const name = (profileData.name || '').trim();
  const uid = normalizeUid(profileData.uid || profileData.handle || name.replace(/\s+/g, '_'));
  const profile = {
    id: userId, name, email: profileData.email || '', uid, handle: uid,
    role: profileData.role || 'listener', planId: profileData.planId || 'resona',
    avatar: profileData.avatar || null, phone: profileData.phone || '', dob: profileData.dob || '',
    bio: profileData.bio || '', createdAt: now
  };
  const initial = {
    'profile.json': profile,
    'preferences.json': { theme: 'Dark', accentColor: 'Teal', streamingQuality: 'High (320kbps)', crossfade: '5 seconds', mobileDataStreaming: true, autoplay: true, gapless: true, normalizeVolume: true, pushNotifs: true, quietHours: false, privateProfile: false, friendActivityVisible: true, reduceMotion: false, selectedGenres: profileData.genres || [] },
    'shelf.json': { likedTrackIds: [], downloadedTrackIds: [], playlists: [], recentlyPlayed: [], listeningEvents: [], playStats: {}, recommendationVersion: 0 },
    'creator.json': { isCreator: false, status: 'none', artistName: name, stats: { uploads: 0, plays: '0', followers: '0' }, uploads: [], songRequests: [] },
    'social.json': { activeHuddle: null, huddleRoom: null, fusionsList: [] },
    'sessions.json': []
  };
  const ref = profileRef(userId);
  const existing = await ref.get();
  if (!existing.exists) await ref.create({ ...profile, internalUserId: userId, emailLower: String(profile.email || '').toLowerCase(), updatedAt: now });
  else await ref.set({ ...profile, internalUserId: userId, emailLower: String(profile.email || '').toLowerCase() }, { merge: true });
  for (const [fileName, data] of Object.entries(initial)) {
    const privateRef = ref.collection('privateData').doc(fileName.replace(/\.json$/, ''));
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(privateRef);
      if (!snapshot.exists) tx.create(privateRef, { data, updatedAt: now });
    });
  }
  const uidRefValue = normalizeUid(profile.uid);
  if (uidRefValue) {
    const uidRef = db.collection('userUids').doc(uidRefValue);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(uidRef);
      if (!snapshot.exists) tx.create(uidRef, { userId: String(userId), normalizedUid: uidRefValue, createdAt: now });
      else if (snapshot.data().userId !== String(userId)) throw new Error('UID already taken');
    });
  }
  return profile;
}

export async function getAllAccounts() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map((doc) => {
    const { passwordHash, ...account } = doc.data();
    return { id: doc.id, ...account };
  });
}

export async function findAccountByEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return undefined;
  const snapshot = await db.collection('userEmailIndex').doc(encodeURIComponent(normalized)).get();
  if (snapshot.exists) return findAccountById(snapshot.data().userId);
  const legacy = await db.collection('users').where('emailLower', '==', normalized).limit(1).get();
  if (!legacy.empty) {
    const doc = legacy.docs[0];
    await db.collection('userEmailIndex').doc(encodeURIComponent(normalized)).create({ userId: doc.id }).catch((error) => { if (error.code !== 6 && error.code !== 'already-exists') throw error; });
    return { id: doc.id, ...doc.data() };
  }
  return undefined;
}

export async function findAccountById(id) {
  if (!id) return undefined;
  const doc = await profileRef(id).get();
  if (!doc.exists) return undefined;
  const { passwordHash, ...account } = doc.data();
  return { id: doc.id, ...account, ...(passwordHash ? { passwordHash } : {}) };
}

export async function createAccount({ email, password, profileData }) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const emailRef = db.collection('userEmailIndex').doc(encodeURIComponent(normalizedEmail));
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = db.collection('users').doc().id;
  const now = new Date().toISOString();
  const account = { id: userId, email: normalizedEmail, emailLower: normalizedEmail, passwordHash, createdAt: now };
  const profile = { ...profileFromAccount(account), ...(profileData || {}), id: userId, internalUserId: userId, email: normalizedEmail, emailLower: normalizedEmail, passwordHash, createdAt: now, updatedAt: now };
  await db.runTransaction(async (tx) => {
    const existing = await tx.get(emailRef);
    if (existing.exists) throw new Error('An account with this email already exists.');
    tx.create(emailRef, { userId, createdAt: now });
    tx.create(profileRef(userId), profile);
  });
  await initAccountData(userId, { ...profileData, email: normalizedEmail });
  return account;
}

export async function updateAccountPassword(userId, newPassword) {
  const ref = profileRef(userId);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Account not found.');
  await ref.update({ passwordHash: await bcrypt.hash(newPassword, 10), updatedAt: new Date().toISOString() });
  return true;
}

export async function getAccountData(userId, fileName) {
  if (!userId) return null;
  if (fileName === 'profile.json') {
    const doc = await profileRef(userId).get();
    if (!doc.exists) return null;
    const { passwordHash, emailLower, internalUserId, ...profile } = doc.data();
    return { id: doc.id, ...profile };
  }
  const doc = await profileRef(userId).collection('privateData').doc(String(fileName).replace(/\.json$/, '')).get();
  return doc.exists ? (doc.data().data ?? null) : null;
}

export async function saveAccountData(userId, fileName, data) {
  if (!userId) throw new Error('An internal user ID is required.');
  const now = new Date().toISOString();
  if (fileName === 'profile.json') {
    const ref = profileRef(userId);
    const current = await ref.get();
    const oldUid = normalizeUid(current.data().uid || current.data().handle);
    const newUid = normalizeUid(data.uid || data.handle);
    const uidRef = newUid ? db.collection('userUids').doc(newUid) : null;
    await db.runTransaction(async (tx) => {
      const userSnapshot = await tx.get(ref);
      if (!userSnapshot.exists) throw new Error('Account not found.');
      if (uidRef) {
        const uidSnapshot = await tx.get(uidRef);
        if (uidSnapshot.exists && uidSnapshot.data().userId !== String(userId)) throw new Error('UID already taken');
      }
      if (oldUid && oldUid !== newUid) {
        const oldUidRef = db.collection('userUids').doc(oldUid);
        const oldUidSnapshot = await tx.get(oldUidRef);
        if (oldUidSnapshot.exists && oldUidSnapshot.data().userId === String(userId)) tx.delete(oldUidRef);
      }
      if (uidRef) tx.set(uidRef, { userId: String(userId), normalizedUid: newUid, updatedAt: now });
      tx.set(ref, { ...data, id: userId, internalUserId: userId, updatedAt: now }, { merge: true });
    });
    return data;
  }
  await profileRef(userId).collection('privateData').doc(String(fileName).replace(/\.json$/, '')).set({ data, updatedAt: now }, { merge: true });
  return data;
}

export async function getGlobalData(tableFile) {
  const singleton = singletonForGlobalFile(tableFile);
  if (singleton) {
    const snapshot = await db.collection('resonaData').doc(singleton).get();
    if (!snapshot.exists) return singleton === 'platformSettings' ? null : {};
    return snapshot.data().value;
  }
  const collection = collectionForGlobalFile(tableFile);
  const snapshot = await db.collection(collection).get();
  const documents = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  if (documents.length) return documents;
  // Existing deployments may already store a legacy snapshot document; read it
  // only when the canonical record collection is empty.
  const legacy = await db.collection('resonaData').doc(collection).get();
  return legacy.exists && Array.isArray(legacy.data().value) ? legacy.data().value : [];
}

export async function saveGlobalData(tableFile, data) {
  const singleton = singletonForGlobalFile(tableFile);
  if (singleton) {
    await db.collection('resonaData').doc(singleton).set({ value: data, updatedAt: new Date().toISOString() }, { merge: true });
    return data;
  }
  if (!Array.isArray(data)) throw new Error('Target Firestore collection data must be an array');
  const collection = db.collection(collectionForGlobalFile(tableFile));
  const legacy = db.collection('resonaData').doc(collection.id);
  const legacySnapshot = await legacy.get();
  const snapshot = await collection.get();
  const nextIds = new Set(data.map((item) => String(item.id)));
  const operations = [];
  for (const item of data) {
    if (!item?.id) throw new Error('Every collection record must have a stable id');
    operations.push((batch) => batch.set(collection.doc(String(item.id)), item, { merge: true }));
  }
  for (const doc of snapshot.docs) if (!nextIds.has(doc.id)) operations.push((batch) => batch.delete(doc.ref));
  if (legacySnapshot.exists) operations.push((batch) => batch.delete(legacy));
  for (let start = 0; start < operations.length; start += 450) {
    const batch = db.batch();
    for (const operation of operations.slice(start, start + 450)) operation(batch);
    await batch.commit();
  }
  return data;
}

export async function addGlobalItem(tableFile, item) {
  const collection = collectionForGlobalFile(tableFile);
  if (!item?.id) throw new Error('Every collection record must have a stable id');
  await db.collection(collection).doc(String(item.id)).create(item);
  return item;
}

export async function updateGlobalItem(tableFile, id, updates) {
  const ref = db.collection(collectionForGlobalFile(tableFile)).doc(String(id));
  const snapshot = await ref.get();
  if (!snapshot.exists) throw new Error('Item not found');
  const updated = { ...snapshot.data(), ...updates, id: String(id), updatedAt: new Date().toISOString() };
  await ref.set(updated);
  return updated;
}

export async function deleteGlobalItem(tableFile, id) {
  await db.collection(collectionForGlobalFile(tableFile)).doc(String(id)).delete();
  return true;
}

export async function deleteUserAccount(userId) {
  const ref = profileRef(userId);
  const profile = await ref.get();
  if (!profile.exists) return false;
  const email = profile.data().emailLower || String(profile.data().email || '').toLowerCase();
  const uid = normalizeUid(profile.data().uid || profile.data().handle);
  const privateDocs = await ref.collection('privateData').get();
  const batch = db.batch();
  for (const doc of privateDocs.docs) batch.delete(doc.ref);
  batch.delete(ref);
  if (email) batch.delete(db.collection('userEmailIndex').doc(encodeURIComponent(email)));
  if (uid) batch.delete(db.collection('userUids').doc(uid));
  await batch.commit();
  return true;
}

export async function getUserByUid(uid) {
  const normalized = normalizeUid(uid);
  if (!normalized) return null;
  const ref = db.collection('userUids').doc(normalized);
  const doc = await ref.get();
  if (doc.exists) return { userId: doc.data().userId, normalizedUid: normalized };
  const profiles = await db.collection('users').get();
  const match = profiles.docs.find((entry) => normalizeUid(entry.data().uid || entry.data().handle) === normalized);
  if (!match) return null;
  await ref.create({ userId: match.id, normalizedUid: normalized }).catch((error) => { if (error.code !== 6 && error.code !== 'already-exists') throw error; });
  return { userId: match.id, normalizedUid: normalized };
}

export async function getAllProfiles() {
  const snapshot = await db.collection('users').get();
  return snapshot.docs.map((doc) => {
    const { passwordHash, emailLower, internalUserId, ...profile } = doc.data();
    return { id: doc.id, profile: { id: doc.id, ...profile } };
  });
}

export async function findUserByEmail(email) {
  const account = await findAccountByEmail(email);
  return account || null;
}

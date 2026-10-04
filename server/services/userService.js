import { getAccountData, getAllAccounts, findAccountById, saveAccountData, normalizeUid, getUserByUid } from '../db/storage.js';
import { userStatusTracker } from './userStatusTracker.js';
import { getAuth } from 'firebase-admin/auth';
import '../firebaseAdmin.js';
import { db } from '../firebaseAdmin.js';

export function formatUid(rawValue) {
  const value = normalizeUid(rawValue);
  return value ? `@${value}` : '';
}

export async function findUserByUid(uid, excludeUserId = null) {
  const normalized = normalizeUid(uid);
  if (!normalized) return null;
  const indexed = await getUserByUid(normalized);
  if (!indexed || indexed.userId === excludeUserId) return null;
  const userId = indexed.userId;
  const profile = await getResonaProfile(userId);
  return profile ? { ...profile, id: userId } : null;
}

export async function getResonaProfile(userId) {
  if (!userId) return null;
  const account = await findAccountById(userId);
  let identity = null;
  try { identity = await getAuth().getUser(userId); } catch (_) {}
  if (!account && !identity) return null;
  const profile = (await getAccountData(userId, 'profile.json')) || {};
  const normalizedUid = normalizeUid(profile.uid || profile.handle || profile.username || profile.name?.replace(/\s+/g, '_'));
  const planId = normalizePlanId(profile.planId || identity?.customClaims?.planId);
  if (normalizedUid && (!profile.uid || profile.planId !== planId)) {
    await saveAccountData(userId, 'profile.json', { ...profile, id: userId, uid: normalizedUid, handle: normalizedUid, planId });
  } else if (profile.planId !== planId) {
    await saveAccountData(userId, 'profile.json', { ...profile, id: userId, planId });
  }
  return {
    id: userId,
    uid: normalizedUid,
    handle: normalizedUid,
    name: profile.name || identity?.displayName || account?.email?.split('@')[0] || 'Listener',
    email: account?.email || identity?.email || profile.email || '',
    phone: profile.phone || '',
    avatar: profile.avatar || null,
    role: profile.role || identity?.customClaims?.role || 'listener',
    planId
  };
}

export function normalizePlanId(value) {
  const key = String(value || 'resona').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ['resona', 'resona_silver', 'resona_gold', 'resona_platinum'].includes(key) ? key : 'resona';
}

export function planName(planId) {
  return ({ resona: 'Resona', resona_silver: 'Resona Silver', resona_gold: 'Resona Gold', resona_platinum: 'Resona Platinum' })[normalizePlanId(planId)];
}

export async function ensureProfilePlan(userId, fallbackPlan = null) {
  const profile = (await getAccountData(userId, 'profile.json')) || {};
  const planId = normalizePlanId(profile.planId || fallbackPlan);
  if (profile.planId !== planId) await saveAccountData(userId, 'profile.json', { ...profile, id: userId, planId });
  return planId;
}

/**
 * Fetch user records from the selected profile authority for each account ID:
 * local Resona accounts and Firebase Auth-backed profile folders.
 */
export async function getAllRealUsers(excludeUserId = null) {
  const usersMap = new Map();
  let firebaseUsers = [];
  try {
    const listResult = await getAuth().listUsers(1000);
    firebaseUsers = listResult.users;
  } catch (err) {
    console.warn('[UserService] Could not load Firebase Auth identities:', err.message);
  }

  const getUserEntry = (id, profile = {}, fallbackEmail = '', fallbackName = 'Listener') => {
    const displayName = profile.name || fallbackName;
    const uidValue = normalizeUid(profile.uid || profile.handle || profile.username || '');
    const status = userStatusTracker.getStatus(id);
    return {
      id,
      uid: uidValue,
      handle: uidValue,
      name: displayName,
      email: profile.email || fallbackEmail || '',
      avatar: profile.avatar || null,
      planId: normalizePlanId(profile.planId),
      isOnline: status.isOnline,
      statusText: status.statusText,
      lastActive: status.lastActive
    };
  };

  // 1. Local auth accounts from AUTH_FILE
  try {
    const localAccounts = await getAllAccounts();
    const activeFirebaseIds = new Set(firebaseUsers.filter((user) => !user.disabled).map((user) => user.uid));
    for (const acc of localAccounts) {
      if (!acc || !acc.id) continue;
      if (acc.email?.endsWith('@test.resona')) continue;
      if (activeFirebaseIds.has(acc.id)) continue;
      const profile = (await getAccountData(acc.id, 'profile.json')) || {};
      const canonicalUid = normalizeUid(profile.uid || profile.handle || profile.username || profile.name?.replace(/\s+/g, '_'));
      const planId = normalizePlanId(profile.planId);
      if (canonicalUid && (profile.uid !== canonicalUid || profile.planId !== planId)) {
        const normalizedProfile = { ...profile, id: acc.id, uid: canonicalUid, handle: canonicalUid, planId };
        await saveAccountData(acc.id, 'profile.json', normalizedProfile);
        usersMap.set(acc.id, getUserEntry(acc.id, { ...normalizedProfile, email: acc.email }, acc.email, 'Listener'));
      } else {
        usersMap.set(acc.id, getUserEntry(acc.id, { ...profile, email: acc.email, id: acc.id }, acc.email, 'Listener'));
      }
    }
  } catch (err) {
    console.warn('[UserService] Could not load local accounts:', err.message);
  }

  // Firebase Auth identity owns legacy Firebase-backed account directories which
  // are not present in Resona's local credential file. Profile fields remain in
  // that account's Resona JSON folder; Auth is only the identity directory.
  try {
    for (const fbUser of firebaseUsers) {
      if (!fbUser?.uid || usersMap.has(fbUser.uid)) continue;
      const profile = (await getAccountData(fbUser.uid, 'profile.json')) || {};
      if (fbUser.disabled || (!profile.id && !profile.name && !profile.email && !fbUser.email)) continue;
      const canonicalUid = normalizeUid(profile.uid || profile.handle || profile.username || profile.name?.replace(/\s+/g, '_'));
      const planId = normalizePlanId(profile.planId || fbUser.customClaims?.planId);
      if (canonicalUid && (profile.uid !== canonicalUid || profile.planId !== planId)) {
        await saveAccountData(fbUser.uid, 'profile.json', { ...profile, id: fbUser.uid, email: fbUser.email || profile.email || '', uid: canonicalUid, handle: canonicalUid, planId });
      } else if (profile.planId !== planId) {
        await saveAccountData(fbUser.uid, 'profile.json', { ...profile, id: fbUser.uid, email: fbUser.email || profile.email || '', planId });
      }
      usersMap.set(fbUser.uid, getUserEntry(fbUser.uid, { ...profile, uid: canonicalUid, handle: canonicalUid, planId }, fbUser.email || profile.email || '', profile.name || fbUser.displayName || 'Listener'));
    }
  } catch (err) {
    console.warn('[UserService] Could not load Firebase Auth identities:', err.message);
  }

  // Exclude current user if requested
  if (excludeUserId) {
    usersMap.delete(excludeUserId);
  }

  return Array.from(usersMap.values());
}

/**
 * Get profile for a specific user ID
 */
export async function getRealUserProfile(userId) {
  if (!userId) return null;
  const allUsers = await getAllRealUsers();
  return allUsers.find((u) => u.id === userId) || null;
}

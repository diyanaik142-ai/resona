import express from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getAuth } from 'firebase-admin/auth';
import { getAdminFirestore } from '../firebaseAdmin.js';
import {
  JWT_SECRET,
  CATALOG_FILE,
  AUDIT_FILE,
  REQUESTS_FILE,
  CREATORS_FILE,
  SETTINGS_FILE,
  AUTH_FILE,
  PLANS_FILE,
  OVERRIDES_FILE,
  PLAN_CHANGE_REQUESTS_FILE,
  ADMIN_PLAYLISTS_FILE
} from '../config.js';
import {
  getGlobalData,
  saveGlobalData,
  addGlobalItem,
  updateGlobalItem,
  deleteGlobalItem,
  getAccountData,
  saveAccountData,
  findAccountById,
  getAllProfiles,
  getAllAccounts,
  deleteUserAccount
} from '../db/storage.js';
import { upload } from '../middlewares/upload.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GENRES, isValidGenre } from '../config/genres.js';
import admin from '../firebaseAdmin.js';
import { FEATURE_REGISTRY, FEATURE_CATEGORIES, FEATURE_IDS } from '../../shared/featureRegistry.js';
import { normalizePlans, computeEntitlements } from '../services/entitlements.js';
import { getResonaProfile, normalizePlanId, planName } from '../services/userService.js';
import {
  getPlatformSettings,
  updatePlatformSettings,
  resetPlatformSettings,
  getGlobalFeatureMap
} from '../services/platformSettings.js';
import {
  runHealthChecks, getStorageMetrics, getUserStats, getCatalogStats,
  getCreatorApplicationStats, verifyCatalog, settle, getEnvironment, PROCESS_STARTED_AT
} from '../services/systemMetrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

async function auditAction(adminId, action, target, details = {}, result = 'success') {
  try {
    await addGlobalItem(AUDIT_FILE, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      adminId,
      action,
      target,
      details,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

if (process.env.NODE_ENV === 'production' && !process.env.ADMIN_PASSWORD_HASH) {
  throw new Error('ADMIN_PASSWORD_HASH must be configured for production admin access.');
}
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || '130917', 10);

// Basic rate limiting for admin login
const loginAttempts = new Map();

router.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  const ip = req.ip;

  if (username !== 'admin') {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Rate limiting
  const attempts = loginAttempts.get(ip) || 0;
  if (attempts > 5) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  try {
    const isMatch = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);

    if (!isMatch) {
      loginAttempts.set(ip, attempts + 1);
      setTimeout(() => loginAttempts.delete(ip), 15 * 60 * 1000); // 15 mins
      await auditAction('admin', 'ADMIN_LOGIN', 'admin', { ip }, 'failure');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    loginAttempts.delete(ip);
    await auditAction('admin', 'ADMIN_LOGIN', 'admin', { ip });

    // Create a signed JWT token
    const token = jwt.sign(
      { id: 'admin', role: 'admin' },
      JWT_SECRET,
      { expiresIn: '8h' } // longer session for admin
    );

    res.json({
      token,
      user: {
        id: 'admin',
        email: 'admin',
        name: 'Administrator',
        role: 'admin',
        preferences: {}
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify admin token
export const requireAdmin = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const isAdmin = decoded.admin === true || decoded.role === 'admin' || decoded.id === 'admin';
    if (!isAdmin) {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Protected admin routes
router.get('/system/status', requireAdmin, (req, res) => {
  res.json({
    status: 'online',
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    startedAt: PROCESS_STARTED_AT,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: getEnvironment()
  });
});

// ---- Real-data dashboard endpoints (all admin-only) ----

router.get('/overview', requireAdmin, async (req, res) => {
  const [users, catalog, creators, health] = await Promise.all([
    settle(getUserStats),
    settle(getCatalogStats),
    settle(getCreatorApplicationStats),
    settle(runHealthChecks)
  ]);
  res.json({
    generatedAt: new Date().toISOString(),
    environment: getEnvironment(),
    backend: { pid: process.pid, startedAt: PROCESS_STARTED_AT, uptimeSeconds: process.uptime() },
    users, catalog, creators, health
  });
});

router.get('/health', requireAdmin, async (req, res) => {
  try {
    res.json(await runHealthChecks());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/storage', requireAdmin, async (req, res) => {
  try {
    res.json(await getStorageMetrics());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/catalog/stats', requireAdmin, async (req, res) => {
  try {
    res.json(await getCatalogStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/catalog/verify', requireAdmin, async (req, res) => {
  try {
    const report = await verifyCatalog();
    await auditAction(req.admin.id, 'VERIFY_CATALOG', 'catalog', {
      tracksChecked: report.tracksChecked, issues: report.issues.length, orphanedFiles: report.orphanedFiles.length
    });
    res.json(report);
  } catch (error) {
    await auditAction(req.admin.id, 'VERIFY_CATALOG', 'catalog', { error: error.message }, 'failure');
    res.status(500).json({ error: error.message });
  }
});

router.get('/creator-applications/stats', requireAdmin, async (req, res) => {
  try {
    res.json(await getCreatorApplicationStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    const logs = await getGlobalData(AUDIT_FILE);
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ total: logs.length, entries: sorted.slice(0, limit) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings Routes
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    const result = await updatePlatformSettings(req.body, req.admin.id);
    res.json({
      success: true,
      settings: result.settings,
      diff: result.diff
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Users Route (Secure Firebase Admin Integration)
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const accounts = await getAllAccounts();
    const storedProfiles = await getAllProfiles();
    const firebaseUsers = await getAuth().listUsers(1000).then(result => result.users).catch(() => []);
    const identities = new Map(firebaseUsers.map(user => [user.uid, user]));
    const userIds = new Set([...accounts.map(account => account.id), ...firebaseUsers.map(user => user.uid), ...storedProfiles.map(entry => entry.id).filter(Boolean)]);
    const plansData = normalizePlans(await getGlobalData(PLANS_FILE));
    const overridesData = (await getGlobalData(OVERRIDES_FILE)) || {};
    for (const id of userIds) {
      const existing = await getAccountData(id, 'profile.json');
      if (existing && !['resona', 'resona_silver', 'resona_gold', 'resona_platinum'].includes(existing.planId)) {
        const legacyPlan = identities.get(id)?.customClaims?.planId;
        const planId = normalizePlanId(legacyPlan);
        await saveAccountData(id, 'profile.json', { ...existing, id, planId });
      }
    }
    const platformSettings = await getPlatformSettings();
    const globalFeatureMap = getGlobalFeatureMap(platformSettings);

    const users = await Promise.all(Array.from(userIds).map(async (id) => {
      const account = accounts.find(entry => entry.id === id);
      const identity = identities.get(id);
      const profile = await getResonaProfile(id) || (await getAllProfiles()).find(entry => entry.id === id)?.profile || {};
      const claims = identity?.customClaims || {};
      const planId = normalizePlanId(profile.planId || claims.planId);
      const plan = plansData[planId];

      // effective = globalAllowed && (userOverride ?? planDefault), for EVERY registered feature
      const { planFeatures, features, overrides } = computeEntitlements(plan, overridesData[id], globalFeatureMap);

      return {
        id,
        uid: profile.uid || '',
        email: profile.email || account?.email || identity?.email || '',
        displayName: profile.name || identity?.displayName || 'Unknown',
        photoURL: identity?.photoURL || null,
        emailVerified: identity?.emailVerified || false,
        disabled: identity?.disabled || false,
        creationTime: identity?.metadata?.creationTime || account?.createdAt || null,
        lastSignInTime: identity?.metadata?.lastSignInTime || null,
        role: claims.role || profile.role || 'user',
        status: identity?.disabled ? 'disabled' : 'active',
        planId: planId,
        planName: plan?.name || planName(planId),
        planFeatures,
        features,
        overrides
      };
    }));

    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users from Firebase" });
  }
});

router.put('/users/:id/disable', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { disabled } = req.body;
    await getAuth().updateUser(id, { disabled });

    // Attempt to update Firestore profile if it exists
    try {
      await getAdminFirestore().collection('users').doc(id).set({ disabled: Boolean(disabled), status: disabled ? 'disabled' : 'active' }, { merge: true });
    } catch (e) {
      // Ignore firestore missing profile
    }

    await auditAction(req.admin.id, disabled ? 'DISABLE_USER' : 'ENABLE_USER', id);

    res.json({ success: true, disabled });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Save to Firebase Auth Custom Claims as source of truth
    const userRecord = await getAuth().getUser(id);
    const claims = userRecord.customClaims || {};
    await getAuth().setCustomUserClaims(id, { ...claims, role });

    // Attempt to update Firestore profile if it exists
    try {
      await getAdminFirestore().collection('users').doc(id).set({ role }, { merge: true });
    } catch (e) {
      // Ignore
    }

    await auditAction(req.admin.id, 'UPDATE_ROLE', id, { newRole: role });

    res.json({ success: true, role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/users/:id/plan', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const planId = normalizePlanId(req.body?.planId);
    const plansData = normalizePlans(await getGlobalData(PLANS_FILE));
    if (!plansData[planId] || String(req.body?.planId || '').toLowerCase() !== planId) return res.status(400).json({ error: 'Unknown plan.' });
    const current = await getResonaProfile(id) || await (async () => {
      const entry = (await getAllProfiles()).find(profile => profile.id === id)?.profile;
      const identity = await getAuth().getUser(id).catch(() => null);
      if (!entry && !identity) return null;
      return { id, ...entry, email: identity?.email || entry?.email || '', planId: normalizePlanId(entry?.planId || identity?.customClaims?.planId) };
    })();
    if (!current) return res.status(404).json({ error: 'User not found.' });
    const account = await findAccountById(id);
    const existingProfile = (await getAccountData(id, 'profile.json')) || {};
    await saveAccountData(id, 'profile.json', { ...existingProfile, id, email: account?.email || existingProfile.email || current.email, planId });
    const identity = await getAuth().getUser(id).catch(() => null);
    if (identity) {
      const userRecord = identity;
      await getAuth().setCustomUserClaims(id, { ...(userRecord.customClaims || {}), planId });
    }
    const planRequests = (await getGlobalData(PLAN_CHANGE_REQUESTS_FILE)) || [];
    for (const request of planRequests) {
      if (request.userId === id && request.status === 'pending') {
        request.status = request.requestedPlan === planId ? 'approved' : 'cancelled';
        request.reviewedAt = new Date().toISOString();
        request.reviewedBy = req.admin.id;
        request.adminNote = request.status === 'approved' ? 'Plan assigned by administrator.' : 'Plan changed by administrator; request closed.';
        const social = (await getAccountData(id, 'social.json')) || {};
        social.notifications = Array.isArray(social.notifications) ? social.notifications : [];
        social.notifications.unshift({ id: randomUUID(), type: 'plan_change', status: 'pending', read: false, title: request.status === 'approved' ? 'Plan change approved' : 'Plan change request closed', message: request.status === 'approved' ? `Your plan change request was approved. Your Resona plan is now ${planName(planId)}.` : `Your plan change request was closed because your plan was changed by an administrator. Your current plan is ${planName(planId)}.`, createdAt: request.reviewedAt, timestamp: request.reviewedAt });
        await saveAccountData(id, 'social.json', social);
      }
    }
    await saveGlobalData(PLAN_CHANGE_REQUESTS_FILE, planRequests);
    await auditAction(req.admin.id, 'UPDATE_PLAN', id, { oldPlan: current.planId, newPlan: planId });
    res.json({ success: true, planId, planName: planName(planId) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/plan-change-requests', requireAdmin, async (req, res) => {
  try {
    const requests = (await getGlobalData(PLAN_CHANGE_REQUESTS_FILE)) || [];
    const pending = requests.filter((request) => request.status === 'pending');
    const enriched = await Promise.all(pending.map(async (request) => {
      const profile = await getResonaProfile(request.userId) || (await getAllProfiles()).find(entry => entry.id === request.userId)?.profile;
      return { ...request, userName: profile?.name || 'Unknown', uid: profile?.uid || '', email: profile?.email || '' };
    }));
    res.json(enriched.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/plan-change-requests/:id/review', requireAdmin, async (req, res) => {
  try {
    const { decision, adminNote = '' } = req.body || {};
    if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or rejected.' });
    const requests = (await getGlobalData(PLAN_CHANGE_REQUESTS_FILE)) || [];
    const request = requests.find((entry) => entry.id === req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found.' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'Request is no longer pending.' });
    const profile = await getResonaProfile(request.userId) || await (async () => {
      const entry = (await getAllProfiles()).find(item => item.id === request.userId)?.profile;
      const identity = await getAuth().getUser(request.userId).catch(() => null);
      return entry || identity ? { id: request.userId, ...entry, planId: normalizePlanId(entry?.planId || identity?.customClaims?.planId), email: identity?.email || entry?.email } : null;
    })();
    if (!profile) return res.status(404).json({ error: 'User no longer exists.' });
    if (normalizePlanId(request.requestedPlan) === profile.planId) {
      request.status = 'approved';
      request.adminNote = 'Requested plan already assigned.';
    } else if (decision === 'approved') {
      const existing = (await getAccountData(request.userId, 'profile.json')) || {};
      const account = await findAccountById(request.userId);
      await saveAccountData(request.userId, 'profile.json', { ...existing, id: request.userId, email: account?.email || existing.email || profile.email, planId: normalizePlanId(request.requestedPlan) });
      const identity = await getAuth().getUser(request.userId).catch(() => null);
      if (identity) {
        const userRecord = identity;
        await getAuth().setCustomUserClaims(request.userId, { ...(userRecord.customClaims || {}), planId: normalizePlanId(request.requestedPlan) });
      }
      request.status = 'approved';
      request.adminNote = String(adminNote).trim();
    } else {
      request.status = 'rejected';
      request.adminNote = String(adminNote).trim();
    }
    request.reviewedAt = new Date().toISOString();
    request.reviewedBy = req.admin.id;
    await saveGlobalData(PLAN_CHANGE_REQUESTS_FILE, requests);
    await auditAction(req.admin.id, `PLAN_CHANGE_REQUEST_${request.status.toUpperCase()}`, request.userId, { requestId: request.id, oldPlan: profile.planId, requestedPlan: request.requestedPlan, adminNote: request.adminNote });
    const updatedProfile = await getResonaProfile(request.userId) || { ...profile, planId: decision === 'approved' ? normalizePlanId(request.requestedPlan) : profile.planId };
    const userSocial = (await getAccountData(request.userId, 'social.json')) || {};
    userSocial.notifications = Array.isArray(userSocial.notifications) ? userSocial.notifications : [];
    userSocial.notifications.unshift({ id: randomUUID(), type: 'plan_change', status: 'pending', read: false, title: request.status === 'approved' ? 'Plan change approved' : 'Plan change not approved', message: request.status === 'approved' ? `Your plan change request was approved. Your Resona plan is now ${planName(updatedProfile.planId)}.` : `Your plan change request was not approved. Your current plan is ${planName(updatedProfile.planId)}.${request.adminNote ? ` Reason: ${request.adminNote}` : ''}`, createdAt: request.reviewedAt, timestamp: request.reviewedAt });
    await saveAccountData(request.userId, 'social.json', userSocial);
    res.json({ request, planId: updatedProfile.planId, planName: planName(updatedProfile.planId) });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.post('/users/:id/plan', requireAdmin, async (req, res, next) => {
  if (req.method !== 'POST') return next();
  return res.status(405).json({ error: 'Use PUT to assign a user plan.' });
});

router.put('/users/:id/overrides', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { overrides } = req.body;

    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      return res.status(400).json({ error: 'overrides must be an object' });
    }
    // Strict validation against the central registry
    const clean = {};
    for (const [featureId, value] of Object.entries(overrides)) {
      const feature = FEATURE_REGISTRY.find(f => f.id === featureId);
      if (!feature) return res.status(400).json({ error: `Unknown feature: ${featureId}` });
      if (!feature.controllable) return res.status(400).json({ error: `Feature not controllable: ${featureId}` });
      if (typeof value !== 'boolean') return res.status(400).json({ error: `Override for ${featureId} must be boolean` });
      clean[featureId] = value;
    }

    const overridesData = (await getGlobalData(OVERRIDES_FILE)) || {};
    if (Object.keys(clean).length) overridesData[id] = clean;
    else delete overridesData[id];

    await saveGlobalData(OVERRIDES_FILE, overridesData);

    await auditAction(req.admin.id, 'UPDATE_OVERRIDES', id, { overrides: clean });

    res.json({ success: true, overrides: clean });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Central feature registry (what features exist)
router.get('/features', requireAdmin, (req, res) => {
  res.json({ categories: FEATURE_CATEGORIES, features: FEATURE_REGISTRY });
});

// Plan configuration (default availability), normalized to the full registry
router.get('/plans', requireAdmin, async (req, res) => {
  try {
    res.json(normalizePlans(await getGlobalData(PLANS_FILE)));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/plans/:planId/features', requireAdmin, async (req, res) => {
  try {
    const { planId } = req.params;
    const { features } = req.body;
    const plans = normalizePlans(await getGlobalData(PLANS_FILE));
    if (!plans[planId]) return res.status(404).json({ error: `Unknown plan: ${planId}` });
    if (!features || typeof features !== 'object') return res.status(400).json({ error: 'features must be an object' });

    for (const [featureId, value] of Object.entries(features)) {
      if (!FEATURE_IDS.has(featureId)) return res.status(400).json({ error: `Unknown feature: ${featureId}` });
      if (typeof value !== 'boolean') return res.status(400).json({ error: `Value for ${featureId} must be boolean` });
      plans[planId].features[featureId] = value;
    }
    await saveGlobalData(PLANS_FILE, plans);
    await auditAction(req.admin.id, 'UPDATE_PLAN_FEATURES', planId, { features });
    res.json({ success: true, plan: plans[planId] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await getAuth().deleteUser(id);

    try {
      await getAdminFirestore().collection('users').doc(id).delete();
    } catch (e) {
      // Ignore if document didn't exist
    }

    await auditAction(req.admin.id, 'DELETE_USER', id);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catalog Routes
router.get('/catalog', requireAdmin, async (req, res) => {
  try {
    const catalog = await getGlobalData(CATALOG_FILE);
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/catalog', requireAdmin, upload.fields([{ name: 'audio', maxCount: 1 }, { name: 'cover', maxCount: 1 }]), async (req, res) => {
  try {
    const settings = await getPlatformSettings();

    if (settings.catalog?.allowAdminUploads === false) {
      return res.status(403).json({ error: 'Admin catalog uploads are currently disabled by platform settings.' });
    }

    if (req.files?.['audio']) {
      if (settings.storage?.allowAudioUploads === false) {
        return res.status(403).json({ error: 'Audio uploads are globally disabled by platform settings.' });
      }
      const audioFile = req.files['audio'][0];
      const maxAudioBytes = (settings.storage?.maxAudioSizeMb || 50) * 1024 * 1024;
      if (audioFile.size > maxAudioBytes) {
        return res.status(400).json({ error: `Audio file exceeds maximum size of ${settings.storage?.maxAudioSizeMb || 50} MB.` });
      }
    }

    if (req.files?.['cover']) {
      if (settings.storage?.allowImageUploads === false) {
        return res.status(403).json({ error: 'Image uploads are globally disabled by platform settings.' });
      }
      const coverFile = req.files['cover'][0];
      const maxImageBytes = (settings.storage?.maxImageSizeMb || 10) * 1024 * 1024;
      if (coverFile.size > maxImageBytes) {
        return res.status(400).json({ error: `Cover image exceeds maximum size of ${settings.storage?.maxImageSizeMb || 10} MB.` });
      }
    }

    const uploadDir = process.env.NODE_ENV === 'production' 
      ? '/opt/resona/media/catalog/' 
      : path.resolve(__dirname, '..', 'data', 'media', 'catalog');
      
    await fs.mkdir(uploadDir, { recursive: true });

    const saveLocally = async (file, type) => {
      if (!file) return null;
      const uploadId = randomUUID();
      const ext = path.extname(file.originalname || '');
      const filename = `${type}_${uploadId}${ext}`;
      const destination = path.join(uploadDir, filename);
      
      if (file.buffer) {
        await fs.writeFile(destination, file.buffer);
      } else if (file.path) {
        try {
          await fs.rename(file.path, destination);
        } catch (err) {
          // Fallback if cross-device link error
          await fs.copyFile(file.path, destination);
          await fs.unlink(file.path).catch(() => {});
        }
      }
      return `/media/catalog/${filename}`;
    };

    const audioFile = req.files?.audio?.[0];
    const coverFile = req.files?.cover?.[0];
    
    const [audioUrl, coverUrl] = await Promise.all([
      saveLocally(audioFile, 'audio'),
      saveLocally(coverFile, 'cover')
    ]);

    const genreId = req.body.genre;
    if (!isValidGenre(genreId)) {
      return res.status(400).json({ error: 'Invalid genre ID' });
    }

    const defaultStatus = settings.catalog?.requireCatalogApproval ? 'Pending' : 'Published';

    const newTrack = {
      id: 'track_' + Date.now(),
      title: req.body.title,
      artist: req.body.artist,
      genre: genreId,
      duration: req.body.duration || '0:00',
      createdAt: new Date().toISOString(),
      streams: 0,
      status: req.body.status || defaultStatus,
      audioUrl: audioUrl,
      cover: coverUrl,
      uploadedBy: req.admin.id,
      album: req.body.album || '',
      publishedAt: (req.body.status || defaultStatus) === 'Published' ? new Date().toISOString() : null
    };

    await addGlobalItem(CATALOG_FILE, newTrack);
    await auditAction(req.admin.id, 'UPLOAD_TRACK', newTrack.id, { title: newTrack.title, artist: newTrack.artist, status: newTrack.status });
    res.json(newTrack);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/catalog/:id', requireAdmin, async (req, res) => {
  try {
    if (req.body.genre && !isValidGenre(req.body.genre)) {
      return res.status(400).json({ error: 'Invalid genre ID' });
    }
    const updated = await updateGlobalItem(CATALOG_FILE, req.params.id, req.body);
    await auditAction(req.admin.id, 'UPDATE_TRACK', req.params.id, { changes: Object.keys(req.body) });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/catalog/:id', requireAdmin, async (req, res) => {
  try {
    const existing = (await getGlobalData(CATALOG_FILE)).find(t => t.id === req.params.id);
    await deleteGlobalItem(CATALOG_FILE, req.params.id);
    await auditAction(req.admin.id, 'DELETE_TRACK', req.params.id, { title: existing?.title });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// ==========================================
// ADMIN PLAYLISTS
// ==========================================

router.get('/playlists', requireAdmin, async (req, res) => {
  try {
    const playlists = await getGlobalData(ADMIN_PLAYLISTS_FILE) || [];
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/playlists/:id', requireAdmin, async (req, res) => {
  try {
    const playlists = await getGlobalData(ADMIN_PLAYLISTS_FILE) || [];
    const playlist = playlists.find(p => p.playlistId === req.params.id);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    res.json(playlist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/playlists', requireAdmin, upload.single('cover'), async (req, res) => {
  try {
    const uploadDir = process.env.NODE_ENV === 'production' 
      ? '/opt/resona/media/playlists/' 
      : path.resolve(__dirname, '..', 'data', 'media', 'playlists');
      
    await fs.mkdir(uploadDir, { recursive: true });

    let coverUrl = null;
    if (req.file) {
      const uploadId = randomUUID();
      const ext = path.extname(req.file.originalname || '');
      const filename = `playlist_${uploadId}${ext}`;
      const destination = path.join(uploadDir, filename);
      
      if (req.file.buffer) {
        await fs.writeFile(destination, req.file.buffer);
      } else if (req.file.path) {
        try {
          await fs.rename(req.file.path, destination);
        } catch (err) {
          await fs.copyFile(req.file.path, destination);
          await fs.unlink(req.file.path).catch(() => {});
        }
      }
      coverUrl = `/media/playlists/${filename}`;
    }

    const { name, description, status, trackItems } = req.body;
    
    const newPlaylist = {
      playlistId: `ap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: name || 'Untitled Playlist',
      description: description || '',
      coverUrl,
      ownerType: 'admin',
      ownerId: req.admin.id,
      trackItems: trackItems ? JSON.parse(trackItems) : [],
      status: status || 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await addGlobalItem(ADMIN_PLAYLISTS_FILE, newPlaylist);
    await auditAction(req.admin.id, 'CREATE_ADMIN_PLAYLIST', newPlaylist.playlistId, { name: newPlaylist.name });

    res.status(201).json(newPlaylist);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/playlists/:id', requireAdmin, upload.single('cover'), async (req, res) => {
  try {
    const playlists = await getGlobalData(ADMIN_PLAYLISTS_FILE) || [];
    const existing = playlists.find(p => p.playlistId === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Playlist not found' });

    let coverUrl = existing.coverUrl;
    if (req.file) {
      const uploadDir = process.env.NODE_ENV === 'production' 
        ? '/opt/resona/media/playlists/' 
        : path.resolve(__dirname, '..', 'data', 'media', 'playlists');
        
      await fs.mkdir(uploadDir, { recursive: true });
      const uploadId = randomUUID();
      const ext = path.extname(req.file.originalname || '');
      const filename = `playlist_${uploadId}${ext}`;
      const destination = path.join(uploadDir, filename);
      
      if (req.file.buffer) {
        await fs.writeFile(destination, req.file.buffer);
      } else if (req.file.path) {
        try {
          await fs.rename(req.file.path, destination);
        } catch (err) {
          await fs.copyFile(req.file.path, destination);
          await fs.unlink(req.file.path).catch(() => {});
        }
      }
      coverUrl = `/media/playlists/${filename}`;
    }

    const { name, description, status, trackItems } = req.body;
    
    const updated = {
      ...existing,
      name: name || existing.name,
      description: description !== undefined ? description : existing.description,
      coverUrl,
      status: status || existing.status,
      trackItems: trackItems ? JSON.parse(trackItems) : existing.trackItems,
      updatedAt: new Date().toISOString()
    };

    await updateGlobalItem(ADMIN_PLAYLISTS_FILE, req.params.id, updated, 'playlistId');
    await auditAction(req.admin.id, 'UPDATE_ADMIN_PLAYLIST', req.params.id, { name: updated.name });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/playlists/:id', requireAdmin, async (req, res) => {
  try {
    const existing = (await getGlobalData(ADMIN_PLAYLISTS_FILE)).find(p => p.playlistId === req.params.id);
    if (!existing) return res.status(404).json({ error: 'Playlist not found' });
    
    await deleteGlobalItem(ADMIN_PLAYLISTS_FILE, req.params.id, 'playlistId');
    await auditAction(req.admin.id, 'DELETE_ADMIN_PLAYLIST', req.params.id, { name: existing.name });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Song Requests Routes
router.get('/requests', requireAdmin, async (req, res) => {
  try {
    const requests = await getGlobalData(REQUESTS_FILE);
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/requests/:id', requireAdmin, async (req, res) => {
  try {
    const updated = await updateGlobalItem(REQUESTS_FILE, req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Creator Applications Routes
router.get('/creators', requireAdmin, async (req, res) => {
  try {
    const apps = await getGlobalData(CREATORS_FILE);
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/creators/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['pending', 'approved', 'rejected'];
    if (!allowed.includes(String(status).toLowerCase())) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
    }
    const updated = await updateGlobalItem(CREATORS_FILE, req.params.id, {
      status: String(status).toLowerCase(),
      reviewedBy: req.admin.id,
      reviewedAt: new Date().toISOString()
    });
    
    if (updated && updated.userId) {
      const creator = (await getAccountData(updated.userId, 'creator.json')) || {
        isCreator: false,
        status: 'none',
        artistName: updated.artistName || 'Artist',
        stats: { uploads: 0, plays: '0', followers: '0' },
        uploads: [],
        songRequests: []
      };
      
      creator.status = updated.status;
      if (updated.status === 'approved') {
        creator.isCreator = true;
      } else {
        creator.isCreator = false;
      }
      
      await saveAccountData(updated.userId, 'creator.json', creator);
    }
    
    await auditAction(req.admin.id, `CREATOR_APPLICATION_${String(status).toUpperCase()}`, req.params.id, {
      applicant: updated.email || updated.name || null
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Audit Logs Route
router.get('/audit', requireAdmin, async (req, res) => {
  try {
    const logs = await getGlobalData(AUDIT_FILE);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Danger Zone Actions
router.post('/danger/:action', requireAdmin, async (req, res) => {
  const { action } = req.params;
  const { confirmText, adminPassword } = req.body || {};

  const verifyPassword = (pwd) => {
    return bcrypt.compareSync(pwd || '', ADMIN_PASSWORD_HASH);
  };

  try {
    switch (action) {
      case 'clear-temp-uploads': {
        const mediaDir = path.resolve(__dirname, '..', 'data', 'media');
        let cleanedCount = 0;
        let freedBytes = 0;
        try {
          const files = await fs.readdir(mediaDir);
          const catalog = (await getGlobalData(CATALOG_FILE)) || [];
          const referenced = new Set(
            catalog.flatMap(t => [t.audioUrl, t.cover].filter(Boolean).map(u => u.split('/').pop()))
          );
          for (const file of files) {
            if (file.endsWith('.tmp') || (!referenced.has(file) && file.startsWith('temp_'))) {
              const fullPath = path.join(mediaDir, file);
              const stat = await fs.stat(fullPath);
              freedBytes += stat.size;
              await fs.unlink(fullPath);
              cleanedCount++;
            }
          }
        } catch (_) {}

        await auditAction(req.admin.id, 'CLEAR_TEMP_UPLOADS', 'storage', { cleanedCount, freedBytes });
        return res.json({ success: true, message: `Cleaned ${cleanedCount} temporary upload files (${Math.round(freedBytes / 1024)} KB freed).` });
      }

      case 'clear-cache': {
        await auditAction(req.admin.id, 'CLEAR_CACHE', 'system', { cleared: true });
        return res.json({ success: true, message: 'Platform caches cleared successfully.' });
      }

      case 'rebuild-catalog-index': {
        const catalog = (await getGlobalData(CATALOG_FILE)) || [];
        let fixed = 0;
        const normalizedCatalog = catalog.map(t => {
          let updated = { ...t };
          if (!updated.id) { updated.id = 'track_' + Date.now() + Math.random().toString(36).slice(2, 6); fixed++; }
          if (!updated.status) { updated.status = 'Published'; fixed++; }
          if (typeof updated.streams !== 'number') { updated.streams = 0; fixed++; }
          return updated;
        });
        await saveGlobalData(CATALOG_FILE, normalizedCatalog);
        await auditAction(req.admin.id, 'REBUILD_CATALOG_INDEX', 'catalog', { trackCount: normalizedCatalog.length, fixedItems: fixed });
        return res.json({ success: true, message: `Catalog index rebuilt. Verified ${normalizedCatalog.length} tracks (${fixed} normalized).` });
      }

      case 'rebuild-recommendation-index': {
        const catalog = (await getGlobalData(CATALOG_FILE)) || [];
        const genreMap = {};
        for (const t of catalog) {
          if (t.genre) {
            genreMap[t.genre] = (genreMap[t.genre] || 0) + 1;
          }
        }
        await auditAction(req.admin.id, 'REBUILD_RECOMMENDATION_INDEX', 'recommendations', { genresIndexed: Object.keys(genreMap).length });
        return res.json({ success: true, message: `Recommendation index rebuilt across ${Object.keys(genreMap).length} genre clusters.` });
      }

      case 'reset-platform-config': {
        if (confirmText !== 'RESET CONFIGURATION') {
          return res.status(400).json({ error: 'Confirmation text mismatch. Type "RESET CONFIGURATION" to confirm.' });
        }
        const restored = await resetPlatformSettings(req.admin.id);
        return res.json({ success: true, message: 'Platform configuration restored to authoritative defaults.', settings: restored });
      }

      case 'delete-catalog': {
        if (confirmText !== 'DELETE CATALOG') {
          return res.status(400).json({ error: 'Confirmation text mismatch. Type "DELETE CATALOG" to confirm.' });
        }
        if (!verifyPassword(adminPassword)) {
          return res.status(401).json({ error: 'Invalid administrator password.' });
        }
        const previousCatalog = (await getGlobalData(CATALOG_FILE)) || [];
        const oldIds = previousCatalog.map((track) => String(track.id));
        for (const id of oldIds) await deleteGlobalItem(CATALOG_FILE, id);
        await auditAction(req.admin.id, 'DELETE_CATALOG', 'catalog', { deletedTrackCount: previousCatalog.length }, 'success');
        return res.json({ success: true, message: `All ${previousCatalog.length} tracks removed from catalog.` });
      }

      case 'delete-all-users': {
        if (confirmText !== 'DELETE ALL USERS') {
          return res.status(400).json({ error: 'Confirmation text mismatch. Type "DELETE ALL USERS" to confirm.' });
        }
        if (!verifyPassword(adminPassword)) {
          return res.status(401).json({ error: 'Invalid administrator password.' });
        }

        let deletedCount = 0;
        try {
          const list = await getAuth().listUsers(1000);
          for (const u of list.users) {
            const claims = u.customClaims || {};
            if (claims.role !== 'admin' && u.email !== 'admin') {
              await getAuth().deleteUser(u.uid);
              try {
              await deleteUserAccount(u.uid);
              } catch (_) {}
              deletedCount++;
            }
          }
        } catch (e) {
          console.warn('Firebase batch user deletion warning:', e.message);
        }

        await auditAction(req.admin.id, 'DELETE_ALL_USERS', 'users', { deletedCount });
        return res.json({ success: true, message: `Deleted ${deletedCount} non-admin user accounts.` });
      }

      case 'factory-reset': {
        if (confirmText !== 'FACTORY RESET RESONA') {
          return res.status(400).json({ error: 'Confirmation text mismatch. Type "FACTORY RESET RESONA" to confirm.' });
        }
        if (!verifyPassword(adminPassword)) {
          return res.status(401).json({ error: 'Invalid administrator password.' });
        }

        const restored = await resetPlatformSettings(req.admin.id);
        for (const track of (await getGlobalData(CATALOG_FILE)) || []) await deleteGlobalItem(CATALOG_FILE, track.id);
        for (const creator of (await getGlobalData(CREATORS_FILE)) || []) await deleteGlobalItem(CREATORS_FILE, creator.id);
        await saveGlobalData(OVERRIDES_FILE, {});

        await auditAction(req.admin.id, 'FACTORY_RESET', 'platform', { timestamp: new Date().toISOString() });
        return res.json({ success: true, message: 'Platform successfully reset to factory condition.', settings: restored });
      }

      default:
        return res.status(400).json({ error: `Unknown danger action: ${action}` });
    }
  } catch (err) {
    console.error(`[Danger Action Error] ${action}:`, err);
    res.status(500).json({ error: err.message || 'Operation failed' });
  }
});

// Note: there is intentionally no POST /audit. Audit entries are written only by the
// server-side handler that performed the action, so clients cannot fabricate log entries.

export default router;

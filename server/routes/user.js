import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { formatUid, findUserByUid, getResonaProfile } from '../services/userService.js';
import { normalizeProfileAvatar } from '../services/mediaUrls.js';
import { getAccountData, saveAccountData, normalizeUid, findAccountById, addGlobalItem } from '../db/storage.js';
import { getGlobalData, saveGlobalData, getAllProfiles } from '../db/storage.js';
import { PLAN_CHANGE_REQUESTS_FILE, AUDIT_FILE, CATALOG_FILE } from '../config.js';
import { randomUUID } from 'node:crypto';
import { normalizePlanId, planName } from '../services/userService.js';
import { PLANS_FILE, OVERRIDES_FILE } from '../config.js';
import { normalizePlans, computeEntitlements } from '../services/entitlements.js';
import { getPlatformSettings, getGlobalFeatureMap } from '../services/platformSettings.js';
import { getDailyDose, getRecommendations, recordListeningEvent } from '../services/recommendationService.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { createNotification } from '../services/notificationService.js';
import { logSecurityEvent } from '../services/securityService.js';
import { userStatusTracker } from '../services/userStatusTracker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.'));
    }
  }
});

const router = express.Router();
const PLAN_OPTIONS = ['resona', 'resona_silver', 'resona_gold', 'resona_platinum'];

const serializeProfile = (profile = {}) => {
  const uid = normalizeUid(profile.uid || profile.handle || profile.username || '');
  const followers = Array.isArray(profile.followers) ? profile.followers : [];
  const following = Array.isArray(profile.following) ? profile.following : [];
  return {
    id: profile.id || '',
    uid,
    handle: uid,
    displayHandle: formatUid(uid),
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    avatar: normalizeProfileAvatar(profile.avatar),
    role: profile.role || 'listener',
    planId: normalizePlanId(profile.planId),
    ...(profile.tier ? { tier: profile.tier } : {}),
    followersCount: followers.length,
    followingCount: following.length
  };
};

const validateUidInput = (candidate) => {
  const uid = normalizeUid(candidate);
  if (!uid) {
    return {
      valid: false,
      error: 'UID must be 3-30 characters and use only letters, numbers, or underscores.'
    };
  }
  if (new Set(['admin', 'administrator', 'resona', 'support', 'help', 'null', 'undefined']).has(uid)) {
    return { valid: false, error: 'That UID is reserved.' };
  }
  return { valid: true, uid };
};

router.get('/profile/:handle', optionalAuth, async (req, res) => {
  try {
    const { handle } = req.params;
    const user = await findUserByUid(handle);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const profile = serializeProfile(user);
    
    const targetUserProfile = (await getAccountData(user.id, 'profile.json')) || {};
    const followers = Array.isArray(targetUserProfile.followers) ? targetUserProfile.followers : [];
    const following = Array.isArray(targetUserProfile.following) ? targetUserProfile.following : [];
    
    let isFollowing = false;
    let isRequested = false;
    if (req.user && req.user.id) {
      isFollowing = followers.includes(req.user.id);
      if (!isFollowing) {
        const targetSocial = (await getAccountData(user.id, 'social.json')) || {};
        const notifications = Array.isArray(targetSocial.notifications) ? targetSocial.notifications : [];
        isRequested = notifications.some(n => n.type === 'follow_request' && n.fromUserId === req.user.id && n.status === 'pending');
      }
    }

    // Fetch uploaded tracks
    const catalog = await getGlobalData(CATALOG_FILE) || [];
    const tracks = catalog.filter(t => t.uploaderId === user.id && (!t.status || t.status === 'Published'));
    
    // Privacy check for follower-only tracks can be done here if needed.
    // For now we just return public ones.
    const publicTracks = tracks.filter(t => {
      if (t.privacy === 'private') return false;
      if (t.privacy === 'follower-only' && !isFollowing && (!req.user || req.user.id !== user.id)) return false;
      return true;
    });

    return res.json({ 
      ...profile, 
      tracks: publicTracks,
      followersCount: followers.length,
      followingCount: following.length,
      isFollowing,
      isRequested
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// All routes here require authentication
router.use(requireAuth);

router.get('/plan-request', async (req, res) => {
  try {
    const profile = await getResonaProfile(req.user.id);
    const requests = (await getGlobalData(PLAN_CHANGE_REQUESTS_FILE)) || [];
    const latest = requests.filter((request) => request.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
    return res.json({ planId: profile?.planId || 'resona', planName: planName(profile?.planId), request: latest });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/plan-request', async (req, res) => {
  try {
    const profile = await getResonaProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Account not found' });
    const requestedPlan = normalizePlanId(req.body?.requestedPlan);
    if (!PLAN_OPTIONS.includes(requestedPlan) || String(req.body?.requestedPlan || '').toLowerCase() !== requestedPlan) {
      return res.status(400).json({ error: 'Select a valid Resona plan.' });
    }
    if (requestedPlan === profile.planId) return res.status(400).json({ error: 'Your account already has that plan.' });
    const requests = (await getGlobalData(PLAN_CHANGE_REQUESTS_FILE)) || [];
    const pending = requests.find((request) => request.userId === req.user.id && request.status === 'pending');
    if (pending) return res.status(409).json({ error: 'A plan change request is already pending.', request: pending });
    const request = { id: randomUUID(), userId: req.user.id, currentPlan: profile.planId, requestedPlan, status: 'pending', createdAt: new Date().toISOString(), reviewedAt: null, reviewedBy: null, adminNote: '' };
    requests.push(request);
    await saveGlobalData(PLAN_CHANGE_REQUESTS_FILE, requests);
    await addGlobalItem(AUDIT_FILE, { id: randomUUID(), adminId: req.user.id, action: 'PLAN_CHANGE_REQUESTED', target: req.user.id, details: { currentPlan: profile.planId, requestedPlan }, result: 'success', timestamp: request.createdAt });
    
    try {
      const { createAdminNotification } = await import('../services/notificationService.js');
      await createAdminNotification({
        type: 'PLAN_CHANGE_REQUEST',
        title: 'Plan Change Request',
        message: `${profile.name || req.user.id} requested a plan change to ${planName(requestedPlan)}.`,
        actorUserId: req.user.id,
        actorName: profile.name,
        targetUrl: `/admin/users`,
        priority: 'HIGH'
      });
      req.app.get('io')?.emit('admin_notification_received');
    } catch (e) {}

    return res.status(201).json({ request });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/plan-request/:id/cancel', async (req, res) => {
  try {
    const requests = (await getGlobalData(PLAN_CHANGE_REQUESTS_FILE)) || [];
    const request = requests.find((entry) => entry.id === req.params.id && entry.userId === req.user.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'pending') return res.status(409).json({ error: 'Only a pending request can be cancelled.' });
    request.status = 'cancelled';
    request.reviewedAt = new Date().toISOString();
    await saveGlobalData(PLAN_CHANGE_REQUESTS_FILE, requests);
    return res.json({ request });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get('/entitlements', async (req, res) => {
  try {
    const profile = await getResonaProfile(req.user.id);
    const plans = normalizePlans(await getGlobalData(PLANS_FILE));
    const platform = await getPlatformSettings();
    const overrides = (await getGlobalData(OVERRIDES_FILE)) || {};
    const planId = profile?.planId || 'resona';
    const plan = plans[planId] || plans.resona;
    const globalFeatures = getGlobalFeatureMap(platform);
    return res.json({ planId, planName: planName(planId), ...computeEntitlements(plan, overrides[req.user.id], globalFeatures) });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get('/recommendations', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    const limit = Number(req.query.limit || 12);
    return res.json(await getRecommendations(req.user.id, { limit, force }));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.get('/daily-dose', async (req, res) => {
  try {
    const force = req.query.force === 'true';
    return res.json(await getDailyDose(req.user.id, { force }));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/activity', async (req, res) => {
  try {
    const { trackId, type, position, duration, completedRatio } = req.body || {};
    if (!trackId) return res.status(400).json({ error: 'trackId is required' });
    const result = await recordListeningEvent(req.user.id, { trackId, type, position, duration, completedRatio });
    return res.status(201).json({ event: result.event, recentlyPlayed: result.shelf.recentlyPlayed });
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/user/profile
 */
router.get('/profile', async (req, res) => {
  try {
    const profile = await getResonaProfile(req.user.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    return res.json(serializeProfile(profile));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/uid/check', async (req, res) => {
  try {
    const rawValue = req.query.uid;
    const validation = validateUidInput(rawValue);
    if (!validation.valid) {
      return res.status(400).json({ available: false, valid: false, error: validation.error, uid: '' });
    }

    const existingUser = await findUserByUid(validation.uid);
    const available = !existingUser || existingUser.id === req.user.id;
    return res.json({
      uid: validation.uid,
      available,
      valid: true,
      taken: !available,
      message: available ? 'UID available' : 'UID already taken'
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/user/profile
 */
router.put('/profile', async (req, res) => {
  try {
    const current = (await getResonaProfile(req.user.id)) || {};
    if (!current.id) return res.status(404).json({ error: 'Profile not found' });
    const account = await findAccountById(req.user.id);
    const incoming = {};
    for (const field of ['name', 'phone', 'avatar', 'uid', 'handle', 'username']) {
      if (Object.hasOwn(req.body || {}, field)) incoming[field] = req.body[field];
    }
    if (Object.hasOwn(req.body || {}, 'planId') || Object.hasOwn(req.body || {}, 'plan')) {
      return res.status(403).json({ error: 'Plan changes must be requested and approved by an administrator.' });
    }

    const uidCandidate = incoming.uid ?? incoming.handle ?? incoming.username;
    if (uidCandidate !== undefined) {
      const validation = validateUidInput(uidCandidate);
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error, available: false, valid: false });
      }

      const existingUser = await findUserByUid(validation.uid);
      if (existingUser && existingUser.id !== req.user.id) {
        return res.status(409).json({ error: 'UID already taken', available: false, valid: true, uid: validation.uid });
      }

      incoming.uid = validation.uid;
      incoming.handle = validation.uid;
    }

    const updated = {
      ...current,
      ...incoming,
      id: req.user.id,
      email: account?.email || req.user.email || current.email || '',
      name: typeof incoming.name === 'string' ? incoming.name.trim() : (current.name || ''),
      phone: typeof incoming.phone === 'string' ? incoming.phone.trim() : (current.phone || ''),
      avatar: incoming.avatar ?? current.avatar ?? null,
      uid: normalizeUid(incoming.uid ?? incoming.handle ?? current.uid ?? current.handle) || normalizeUid(current.uid || current.handle) || '',
      handle: normalizeUid(incoming.uid ?? incoming.handle ?? current.uid ?? current.handle) || normalizeUid(current.uid || current.handle) || '',
      updatedAt: new Date().toISOString()
    };

    await saveAccountData(req.user.id, 'profile.json', updated);
    return res.json({ message: 'Profile updated successfully', profile: serializeProfile(updated) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/user/profile/picture
 */
router.post('/profile/picture', upload.single('picture'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No picture uploaded.' });
    
    const profilesDir = process.env.NODE_ENV === 'production'
      ? '/opt/resona/media/profiles'
      : path.resolve(__dirname, '..', 'data', 'media', 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });
    
    const extensionByMimeType = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp'
    };
    const ext = extensionByMimeType[req.file.mimetype] || '.jpg';
    const filename = `usr_${req.user.id}_${Date.now()}${ext}`;
    const filePath = path.join(profilesDir, filename);
    
    await fs.writeFile(filePath, req.file.buffer);
    const photoUrl = `/media/profiles/${filename}`;
    
    const current = (await getResonaProfile(req.user.id)) || {};
    const updated = {
      ...current,
      avatar: photoUrl,
      id: req.user.id,
      updatedAt: new Date().toISOString()
    };
    await saveAccountData(req.user.id, 'profile.json', updated);
    
    return res.json({ message: 'Profile picture updated', avatar: photoUrl, profile: serializeProfile(updated) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/user/profile/picture
 */
router.delete('/profile/picture', async (req, res) => {
  try {
    const current = (await getResonaProfile(req.user.id)) || {};
    if (current.avatar && current.avatar.startsWith('/media/profiles/')) {
      const filename = path.basename(current.avatar);
      if (filename) {
        const profilesDir = process.env.NODE_ENV === 'production'
          ? '/opt/resona/media/profiles'
          : path.resolve(__dirname, '..', 'data', 'media', 'profiles');
        const filePath = path.join(profilesDir, filename);
        if (filePath.startsWith(profilesDir)) {
          await fs.unlink(filePath).catch(() => {});
        }
      }
    }
    
    const updated = {
      ...current,
      avatar: null,
      id: req.user.id,
      updatedAt: new Date().toISOString()
    };
    await saveAccountData(req.user.id, 'profile.json', updated);
    return res.json({ message: 'Profile picture removed', profile: serializeProfile(updated) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


/**
 * GET /api/user/preferences
 */
router.get('/preferences', async (req, res) => {
  try {
    const prefs = await getAccountData(req.user.id, 'preferences.json');
    return res.json(prefs || {});
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * PUT /api/user/preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const current = (await getAccountData(req.user.id, 'preferences.json')) || {};
    const updated = {
      ...current,
      ...req.body
    };
    await saveAccountData(req.user.id, 'preferences.json', updated);
    if (typeof req.body?.friendActivityVisible === 'boolean') {
      if (!req.body.friendActivityVisible) {
        userStatusTracker.setListeningActivity(req.user.id, null, false);
      }
      const [profile, social] = await Promise.all([
        getAccountData(req.user.id, 'profile.json'),
        getAccountData(req.user.id, 'social.json')
      ]);
      const relatedUserIds = new Set([
        ...(Array.isArray(profile?.following) ? profile.following : []),
        ...(Array.isArray(profile?.followers) ? profile.followers : []),
        ...(Array.isArray(social?.friends) ? social.friends : [])
      ].filter((id) => typeof id === 'string' && id && id !== req.user.id));
      const io = req.app.get('io');
      for (const relatedUserId of relatedUserIds) {
        io?.to(`user:${relatedUserId}`).emit('listening_activity_updated', { userId: req.user.id });
      }
    }
    return res.json({ message: 'Preferences saved', preferences: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/user/sessions
 */
router.get('/sessions', async (req, res) => {
  try {
    const sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    const currentSessionId = req.headers['x-session-id'];
    
    const activeSessions = sessions
      .filter(s => !s.revokedAt)
      .map(s => ({
        ...s,
        isCurrent: s.id === currentSessionId
      }));
      
    return res.json(activeSessions);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/user/sessions/:id
 * Revoke a specific session
 */
router.delete('/sessions/:id', async (req, res) => {
  try {
    const sessionIdToRevoke = req.params.id;
    let sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    
    sessions = sessions.map(s => {
      if (s.id === sessionIdToRevoke && !s.revokedAt) {
        return { ...s, revokedAt: new Date().toISOString() };
      }
      return s;
    });
    
    await saveAccountData(req.user.id, 'sessions.json', sessions);
    await logSecurityEvent(req.user.id, 'session_revoked', { device: req.headers['user-agent'] });
    return res.json({ message: 'Session revoked successfully' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/user/sessions/others
 * Sign out of all other sessions
 */
router.delete('/sessions/others', async (req, res) => {
  try {
    const currentSessionId = req.headers['x-session-id'];
    if (!currentSessionId) {
      return res.status(400).json({ error: 'Missing current session ID.' });
    }
    
    let sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    const now = new Date().toISOString();
    
    sessions = sessions.map(s => {
      if (s.id !== currentSessionId && !s.revokedAt) {
        return { ...s, revokedAt: now };
      }
      return s;
    });
    
    await saveAccountData(req.user.id, 'sessions.json', sessions);
    await logSecurityEvent(req.user.id, 'all_sessions_revoked', { device: req.headers['user-agent'] });
    return res.json({ message: 'Signed out of all other devices', sessions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/user/profile/:handle/follow
 */
router.post('/profile/:handle/follow', async (req, res) => {
  try {
    const { handle } = req.params;
    const targetUser = await findUserByUid(handle);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });
    if (targetUser.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

    const currentUserProfile = (await getAccountData(req.user.id, 'profile.json')) || {};
    const targetUserProfile = (await getAccountData(targetUser.id, 'profile.json')) || {};

    const targetPreferences = (await getAccountData(targetUser.id, 'preferences.json')) || {};
    const isPrivate = targetPreferences.privateProfile === true;

    if (isPrivate) {
      const targetSocial = (await getAccountData(targetUser.id, 'social.json')) || {};
      const notifications = Array.isArray(targetSocial.notifications) ? targetSocial.notifications : [];
      const existing = notifications.find(n => n.type === 'follow_request' && n.fromUserId === req.user.id && n.status === 'pending');
      
      if (!existing) {
        // Keep the old social notification for backward compatibility if needed, 
        // or just rely on the new service
        notifications.push({
          id: randomUUID(),
          type: 'follow_request',
          fromUserId: req.user.id,
          fromUserName: currentUserProfile.name || req.user.name || 'A user',
          fromUserHandle: currentUserProfile.handle || req.user.handle || req.user.id,
          fromUserAvatar: currentUserProfile.avatar || null,
          title: 'Follow Request',
          message: 'Requested to follow you.',
          timestamp: new Date().toISOString(),
          read: false,
          status: 'pending'
        });
        await saveAccountData(targetUser.id, 'social.json', { ...targetSocial, notifications });
        
        // Dispatch new notification system event (in-app + FCM)
        await createNotification(targetUser.id, {
          type: 'follow_request',
          title: 'New follow request',
          message: `@${currentUserProfile.handle || req.user.handle || req.user.id} requested to follow you`,
          actorUserId: req.user.id,
          actorName: currentUserProfile.name || req.user.name,
          actorHandle: currentUserProfile.handle || req.user.handle || req.user.id,
          actorAvatar: currentUserProfile.avatar || null,
          targetUrl: '/profile'
        });
      }
      return res.json({ message: 'Requested to follow user', requested: true });
    }

    const following = Array.isArray(currentUserProfile.following) ? currentUserProfile.following : [];
    const followers = Array.isArray(targetUserProfile.followers) ? targetUserProfile.followers : [];

    if (!following.includes(targetUser.id)) {
      following.push(targetUser.id);
      await saveAccountData(req.user.id, 'profile.json', { ...currentUserProfile, following });
    }
    
    if (!followers.includes(req.user.id)) {
      followers.push(req.user.id);
      await saveAccountData(targetUser.id, 'profile.json', { ...targetUserProfile, followers });
      
      await createNotification(targetUser.id, {
        type: 'follow',
        title: 'New follower',
        message: `@${currentUserProfile.handle || req.user.handle || req.user.id} started following you`,
        actorUserId: req.user.id,
        actorName: currentUserProfile.name || req.user.name,
        actorHandle: currentUserProfile.handle || req.user.handle || req.user.id,
        actorAvatar: currentUserProfile.avatar || null,
        targetUrl: `/profile/${currentUserProfile.handle || req.user.handle || req.user.id}`
      });
    }

    return res.json({ message: 'Followed user', requested: false });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/user/profile/:handle/follow
 */
router.delete('/profile/:handle/follow', async (req, res) => {
  try {
    const { handle } = req.params;
    const targetUser = await findUserByUid(handle);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const currentUserProfile = (await getAccountData(req.user.id, 'profile.json')) || {};
    const targetUserProfile = (await getAccountData(targetUser.id, 'profile.json')) || {};

    const following = Array.isArray(currentUserProfile.following) ? currentUserProfile.following : [];
    const followers = Array.isArray(targetUserProfile.followers) ? targetUserProfile.followers : [];

    const newFollowing = following.filter(id => id !== targetUser.id);
    const newFollowers = followers.filter(id => id !== req.user.id);

    await saveAccountData(req.user.id, 'profile.json', { ...currentUserProfile, following: newFollowing });
    await saveAccountData(targetUser.id, 'profile.json', { ...targetUserProfile, followers: newFollowers });

    return res.json({ message: 'Unfollowed user' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/user/profile/:handle/followers
 */
router.get('/profile/:handle/followers', async (req, res) => {
  try {
    const { handle } = req.params;
    const targetUser = await findUserByUid(handle);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const targetUserProfile = (await getAccountData(targetUser.id, 'profile.json')) || {};
    const followers = Array.isArray(targetUserProfile.followers) ? targetUserProfile.followers : [];

    const users = [];
    for (const id of followers) {
      const u = await getResonaProfile(id);
      if (u) users.push({ id: u.id, name: u.name, handle: u.handle, avatar: u.avatar });
    }
    return res.json({ followers: users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/user/profile/:handle/following
 */
router.get('/profile/:handle/following', async (req, res) => {
  try {
    const { handle } = req.params;
    const targetUser = await findUserByUid(handle);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const targetUserProfile = (await getAccountData(targetUser.id, 'profile.json')) || {};
    const following = Array.isArray(targetUserProfile.following) ? targetUserProfile.following : [];

    const users = [];
    for (const id of following) {
      const u = await getResonaProfile(id);
      if (u) users.push({ id: u.id, name: u.name, handle: u.handle, avatar: u.avatar });
    }
    return res.json({ following: users });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/user/followers/:handle
 */
router.delete('/followers/:handle', async (req, res) => {
  try {
    const { handle } = req.params;
    const targetUser = await findUserByUid(handle);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const currentUserProfile = (await getAccountData(req.user.id, 'profile.json')) || {};
    const targetUserProfile = (await getAccountData(targetUser.id, 'profile.json')) || {};

    const followers = Array.isArray(currentUserProfile.followers) ? currentUserProfile.followers : [];
    const following = Array.isArray(targetUserProfile.following) ? targetUserProfile.following : [];

    const newFollowers = followers.filter(id => id !== targetUser.id);
    const newFollowing = following.filter(id => id !== req.user.id);

    await saveAccountData(req.user.id, 'profile.json', { ...currentUserProfile, followers: newFollowers });
    await saveAccountData(targetUser.id, 'profile.json', { ...targetUserProfile, following: newFollowing });

    return res.json({ message: 'Removed follower' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

  /**
   * GET /api/user/security/events
   * Retrieve security events
   */
  router.get('/security/events', async (req, res) => {
    try {
      const events = (await getAccountData(req.user.id, 'security_events.json')) || [];
      return res.json(events);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

export default router;

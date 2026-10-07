import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireFeature } from '../middleware/entitlements.js';
import { CATALOG_FILE } from '../config.js';
import { getAccountData, getGlobalData, saveAccountData } from '../db/storage.js';
import { getPlatformSettings } from '../services/platformSettings.js';
import { getAllRealUsers, getRealUserProfile } from '../services/userService.js';
import { userStatusTracker } from '../services/userStatusTracker.js';
import { huddleService } from '../services/huddleService.js';
import { fusionService } from '../services/fusionService.js';
import huddleRouter from './huddle.js';

const router = express.Router();
router.use('/huddle', huddleRouter);
router.use(requireAuth);

/**
 * GET /api/social
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    const social = (await getAccountData(req.user.id, 'social.json')) || {
      activeHuddle: false,
      huddleRoom: null,
      fusionsList: [],
      friends: [],
      notifications: []
    };

    if (settings.social?.enableHuddle === false) {
      social.activeHuddle = false;
      social.huddleRoom = null;
    }
    if (settings.social?.enableFusion === false) {
      social.fusionsList = [];
    }

    return res.json(social);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/social/friends
 * Returns list of user's real friends with live presence
 */
router.get('/friends', async (req, res) => {
  try {
    const [social, profile, platform] = await Promise.all([
      getAccountData(req.user.id, 'social.json'),
      getAccountData(req.user.id, 'profile.json'),
      getPlatformSettings()
    ]);
    const friendIds = new Set([
      ...(Array.isArray(social?.friends) ? social.friends : []),
      ...(Array.isArray(profile?.following) ? profile.following : []),
      ...(Array.isArray(profile?.followers) ? profile.followers : [])
    ].filter((id) => typeof id === 'string' && id && id !== req.user.id));

    const friends = (await Promise.all(Array.from(friendIds, async (friendId) => {
      const friendProfile = await getRealUserProfile(friendId);
      if (!friendProfile || friendProfile.id === req.user.id) return null;

      const [friendSocial, preferences] = await Promise.all([
        getAccountData(friendId, 'social.json'),
        getAccountData(friendId, 'preferences.json')
      ]);
      const status = userStatusTracker.getStatus(friendProfile.id);
      const canShareActivity = platform.social?.enableFriendActivity !== false &&
        platform.social?.defaultActivityVisibility !== 'private' &&
        preferences?.friendActivityVisible !== false;

      return {
        id: friendProfile.id,
        name: friendProfile.name,
        handle: friendProfile.handle,
        planId: friendProfile.planId,
        avatar: friendProfile.avatar,
        isOnline: status.isOnline,
        statusText: status.statusText,
        lastActive: status.lastActive,
        listeningActivity: canShareActivity ? userStatusTracker.getListeningActivity(friendProfile.id) : null
      };
    }))).filter(Boolean);

    return res.json({ friends });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/social/listening-activity
 * Publish or clear the authenticated user's current playback presence.
 */
router.post('/listening-activity', async (req, res) => {
  try {
    const { isPlaying, trackId } = req.body || {};
    if (typeof isPlaying !== 'boolean') {
      return res.status(400).json({ error: 'isPlaying must be a boolean' });
    }
    if (isPlaying && (typeof trackId !== 'string' || !trackId.trim())) {
      return res.status(400).json({ error: 'trackId is required while playing' });
    }

    const [preferences, profile, social, platform] = await Promise.all([
      getAccountData(req.user.id, 'preferences.json'),
      getAccountData(req.user.id, 'profile.json'),
      getAccountData(req.user.id, 'social.json'),
      getPlatformSettings()
    ]);
    let track = null;
    const canShareActivity = preferences?.friendActivityVisible !== false &&
      platform.social?.enableFriendActivity !== false &&
      platform.social?.defaultActivityVisibility !== 'private';
    if (isPlaying && canShareActivity) {
      const catalog = (await getGlobalData(CATALOG_FILE)) || [];
      track = catalog.find((item) =>
        String(item.id) === trackId.trim() &&
        (!item.status || item.status === 'Published') &&
        !item.deleted &&
        item.title &&
        (item.audioUrl || item.streamUrl)
      );
      if (!track) {
        const previousActivity = userStatusTracker.getListeningActivity(req.user.id);
        userStatusTracker.setListeningActivity(req.user.id, null, false);
        if (previousActivity) {
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
        return res.status(404).json({ error: 'Track not found' });
      }
    }

    const previousActivity = userStatusTracker.getListeningActivity(req.user.id);
    userStatusTracker.setListeningActivity(req.user.id, track, isPlaying && canShareActivity);
    const listeningActivity = userStatusTracker.getListeningActivity(req.user.id);

    const relatedUserIds = new Set([
      ...(Array.isArray(profile?.following) ? profile.following : []),
      ...(Array.isArray(profile?.followers) ? profile.followers : []),
      ...(Array.isArray(social?.friends) ? social.friends : [])
    ].filter((id) => typeof id === 'string' && id && id !== req.user.id));
    if (previousActivity?.trackId !== listeningActivity?.trackId) {
      const io = req.app.get('io');
      for (const relatedUserId of relatedUserIds) {
        io?.to(`user:${relatedUserId}`).emit('listening_activity_updated', { userId: req.user.id });
      }
    }

    return res.json({ success: true, listeningActivity });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/social/users/search
 * Search real users across Resona to connect/add as friends
 */
router.get('/users/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const query = q.toLowerCase().replace(/^@+/, '');
    const allUsers = await getAllRealUsers(req.user.id);
    const social = (await getAccountData(req.user.id, 'social.json')) || {};
    const friendSet = new Set(Array.isArray(social.friends) ? social.friends : []);

    const filtered = allUsers.filter(u => {
      if (!query) return true;
      const uidValue = String(u.uid || u.handle || '').toLowerCase().replace(/^@+/, '');
      const handleValue = String(u.handle || '').toLowerCase().replace(/^@+/, '');
      return (
        u.name?.toLowerCase().includes(query) ||
        uidValue.includes(query) ||
        handleValue.includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    }).map(u => ({
      ...u,
      isFriend: friendSet.has(u.id)
    }));

    return res.json({ users: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/social/friends/add
 * Add a real user as friend
 */
router.post('/friends/add', async (req, res) => {
  try {
    const { friendId } = req.body;
    if (!friendId || friendId === req.user.id) {
      return res.status(400).json({ error: 'Invalid friend ID' });
    }

    const targetUser = await getRealUserProfile(friendId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add to current user's friends
    const currentSocial = (await getAccountData(req.user.id, 'social.json')) || {};
    const friends = new Set(Array.isArray(currentSocial.friends) ? currentSocial.friends : []);
    friends.add(friendId);
    currentSocial.friends = Array.from(friends);
    await saveAccountData(req.user.id, 'social.json', currentSocial);

    // Mutual friendship: also add current user to friend's list
    const friendSocial = (await getAccountData(friendId, 'social.json')) || {};
    const friendFriends = new Set(Array.isArray(friendSocial.friends) ? friendSocial.friends : []);
    friendFriends.add(req.user.id);
    friendSocial.friends = Array.from(friendFriends);
    await saveAccountData(friendId, 'social.json', friendSocial);

    const status = userStatusTracker.getStatus(targetUser.id);
    return res.json({
      success: true,
      friend: {
        id: targetUser.id,
        name: targetUser.name,
        handle: targetUser.handle,
        avatar: targetUser.avatar,
        isOnline: status.isOnline,
        statusText: status.statusText,
        lastActive: status.lastActive
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/social/friends/:friendId
 * Remove friend
 */
router.delete('/friends/:friendId', async (req, res) => {
  try {
    const currentSocial = (await getAccountData(req.user.id, 'social.json')) || {};
    if (Array.isArray(currentSocial.friends)) {
      currentSocial.friends = currentSocial.friends.filter(id => id !== req.params.friendId);
      await saveAccountData(req.user.id, 'social.json', currentSocial);
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/social/notifications
 * Returns list of notifications for the user
 */
router.get('/notifications', async (req, res) => {
  try {
    const social = (await getAccountData(req.user.id, 'social.json')) || {};
    const notifs = Array.isArray(social.notifications) ? social.notifications : [];
    // Sort descending by timestamp
    notifs.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));
    return res.json({ notifications: notifs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }

    const social = (await getAccountData(req.user.id, 'social.json')) || {};
    const notifications = Array.isArray(social.notifications) ? social.notifications : [];
    const ids = new Set(notificationIds);
    const now = new Date().toISOString();

    notifications.forEach((notification) => {
      if (ids.has(notification.id)) {
        notification.read = true;
        notification.readAt = now;
      }
    });

    await saveAccountData(req.user.id, 'social.json', { ...social, notifications });
    return res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/notifications/read-all', async (req, res) => {
  try {
    const social = (await getAccountData(req.user.id, 'social.json')) || {};
    const notifications = Array.isArray(social.notifications) ? social.notifications : [];
    const now = new Date().toISOString();

    notifications.forEach((notification) => {
      notification.read = true;
      notification.readAt = now;
    });

    await saveAccountData(req.user.id, 'social.json', { ...social, notifications });
    return res.json({ message: 'All social notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/social/notifications/:id/action
 * Handles actions on a notification (e.g. Accept/Decline)
 */
router.post('/notifications/:id/action', async (req, res) => {
  try {
    const { action } = req.body;
    const social = (await getAccountData(req.user.id, 'social.json')) || {};
    const notifications = social.notifications || [];
    
    const notif = notifications.find(n => n.id === req.params.id);
    if (notif) {
      if (action === 'decline') {
        notif.status = 'declined';
        notif.read = true;
        await huddleService.declineInvitation(req.user, notif.invitationId || notif.id);
      } else if (action === 'accept') {
        notif.status = 'accepted';
        notif.read = true;
      } else if (action === 'dismiss') {
        const idx = notifications.indexOf(notif);
        if (idx !== -1) notifications.splice(idx, 1);
      }
      await saveAccountData(req.user.id, 'social.json', social);
    }

    return res.json({ success: true, action });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/social/fusions
 * Get all Fusions for the current user
 */
router.get('/fusions', requireFeature('fusion'), async (req, res) => {
  try {
    const fusions = await fusionService.getUserFusions(req.user.id);
    
    // Resolve participant profiles for each fusion
    const enrichedFusions = (await Promise.all(fusions.map(async (f) => {
      const participantProfiles = await Promise.all(
        f.participants.map(async (uid) => {
          const profile = await getRealUserProfile(uid);
          return profile ? { id: profile.id, name: profile.name, handle: profile.handle, avatar: profile.avatar } : null;
        })
      );
      const participantsData = participantProfiles.filter(Boolean);
      return participantsData.length >= 2 ? { ...f, participantsData } : null;
    }))).filter(Boolean);
    
    return res.json({ fusions: enrichedFusions });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/social/fusions
 * Create a new Fusion with selected friends
 */
router.post('/fusions', requireFeature('fusion'), async (req, res) => {
  try {
    const { participantIds } = req.body;
    if (!Array.isArray(participantIds) || participantIds.length === 0) {
      return res.status(400).json({ error: 'Participants are required' });
    }
    
    const newFusion = await fusionService.createFusion(req.user.id, participantIds);
    return res.json({ fusion: newFusion });
  } catch (err) {
    if (err.code === 'RECIPIENT_FEATURE_NOT_ENABLED') {
      return res.status(403).json({ error: err.message, code: err.code });
    }
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/social/fusions/:id
 * Get a specific Fusion
 */
router.get('/fusions/:id', requireFeature('fusion'), async (req, res) => {
  try {
    const fusion = await fusionService.getFusion(req.params.id, req.user.id);
    const participantProfiles = await Promise.all(
      fusion.participants.map(async (uid) => {
        const profile = await getRealUserProfile(uid);
        return profile ? { id: profile.id, name: profile.name, handle: profile.handle, avatar: profile.avatar } : null;
      })
    );
    const realParticipants = participantProfiles.filter(Boolean);
    if (realParticipants.length < 2) {
      return res.status(404).json({ error: 'Fusion participants are no longer available' });
    }
    return res.json({ fusion: { ...fusion, participantsData: realParticipants } });
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }
});

/**
 * PUT /api/social
 */
router.put('/', async (req, res) => {
  try {
    const current = (await getAccountData(req.user.id, 'social.json')) || {};
    const updated = {
      ...current,
      ...req.body
    };
    await saveAccountData(req.user.id, 'social.json', updated);
    return res.json({ message: 'Social settings updated', social: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

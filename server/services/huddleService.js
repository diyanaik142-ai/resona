import { CATALOG_FILE, HUDDLES_FILE } from '../config.js';
import { db } from '../firebaseAdmin.js';
import { getAccountData, saveAccountData, getGlobalData, saveGlobalData } from '../db/storage.js';
import { getRealUserProfile } from './userService.js';

let ioInstance = null;
let lockPromise = Promise.resolve();

/**
 * Execute an operation under a promise-based mutex lock to ensure atomic queue operations.
 */
function withLock(fn) {
  if (process.env.NODE_ENV === 'production') return fn();
  const nextLock = lockPromise.then(async () => {
    try {
      return await fn();
    } catch (err) {
      throw err;
    }
  });
  lockPromise = nextLock.catch(() => {});
  return nextLock;
}

/**
 * Safely read HUDDLES_FILE
 */
async function loadHuddles() {
  return (await getGlobalData(HUDDLES_FILE)) || [];
}

/**
 * Safely write HUDDLES_FILE
 */
async function saveHuddles(huddles) {
  const collection = db.collection('huddles');
  const updates = huddles.map((huddle) => collection.doc(String(huddle.id)).set(huddle, { merge: true }));
  await Promise.all(updates);
}

/**
 * Load published tracks from CATALOG_FILE
 */
async function loadCatalog() {
  return (await getGlobalData(CATALOG_FILE)) || [];
}

/**
 * Formats a date into "HH:MM"
 */
function formatTimeStr(date = new Date()) {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

/**
 * Format duration in minutes / hours
 */
function formatDuration(ms) {
  const totalMinutes = Math.max(1, Math.round(ms / 60000));
  if (totalMinutes < 60) {
    return `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;
  return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}

/**
 * Audit history logger for a Huddle
 */
function logHuddleEvent(huddle, { text, type, userId, userName, trackTitle }) {
  if (!huddle.history) huddle.history = [];
  const now = new Date();
  const timeStr = formatTimeStr(now);
  const event = {
    id: `hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: now.toISOString(),
    timeStr,
    text,
    type: type || 'general',
    userId: userId || null,
    userName: userName || null,
    trackTitle: trackTitle || null
  };
  huddle.history.push(event);
  return event;
}

/**
 * Broadcast event and authoritative state to room participants
 */
function broadcast(huddleId, eventName, payload) {
  if (!ioInstance) return;
  const room = `huddle:${huddleId}`;
  ioInstance.to(room).emit(eventName, payload);
  if (eventName !== 'huddle_state_updated') {
    ioInstance.to(room).emit('huddle_state_updated', payload);
  }
}

/**
 * Sanitize huddle for public/client delivery (filters private votes if needed)
 */
function sanitizeHuddle(huddle, currentUserId) {
  if (!huddle) return null;
  const sanitized = JSON.parse(JSON.stringify(huddle));

  // Compute aggregate vote counts for polls so individual user IDs are not leaked
  if (Array.isArray(sanitized.polls)) {
    sanitized.polls = sanitized.polls.map(p => {
      const voteEntries = Object.entries(p.votes || {});
      const totalVotes = voteEntries.length;
      const counts = (p.options || []).map((opt, idx) => {
        const count = voteEntries.filter(([_, optIdx]) => optIdx === idx).length;
        const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
        return {
          text: typeof opt === 'string' ? opt : opt.text,
          track: opt.track || null,
          votesCount: count,
          percentage
        };
      });

      const userVote = currentUserId && p.votes ? p.votes[currentUserId] : undefined;

      return {
        id: p.id,
        type: p.type,
        question: p.question,
        trackIds: p.trackIds || [],
        tracks: p.tracks || [],
        options: counts,
        totalVotes,
        userVoted: userVote !== undefined,
        userVoteIndex: userVote,
        status: p.status,
        winner: p.winner || null,
        actionTaken: p.actionTaken || null,
        createdAt: p.createdAt,
        endedAt: p.endedAt || null
      };
    });
  }

  // Support both 'upNext' and 'queue' aliases
  sanitized.queue = Array.isArray(sanitized.upNext) ? sanitized.upNext : [];
  sanitized.upNext = sanitized.queue;

  // Invitations (Invited friends who have not joined yet or handled invitations)
  sanitized.invitations = Array.isArray(huddle.invitations)
    ? huddle.invitations.map(inv => ({
        id: inv.id,
        huddleId: inv.huddleId,
        recipientId: inv.recipientId,
        recipientName: inv.recipientName || 'Friend',
        recipientAvatar: inv.recipientAvatar || null,
        senderId: inv.senderId,
        senderName: inv.senderName || 'Host',
        status: inv.status || 'pending',
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt
      }))
    : [];

  return sanitized;
}

export const huddleService = {
  /**
   * Set Socket.IO instance
   */
  init(io) {
    ioInstance = io;
    console.log('[HuddleService] Real-time Socket.IO initialized');
  },

  /**
   * Get active Huddle for a specific user
   */
  async getUserActiveHuddle(userId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const active = huddles.find(h => 
        h.status === 'active' && 
        (h.hostId === userId || h.participants?.some(p => p.id === userId))
      );
      return active ? sanitizeHuddle(active, userId) : null;
    });
  },

  /**
   * Get Huddle by ID
   */
  async getHuddleById(huddleId, currentUserId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId);
      if (!huddle) return null;

      // Verify track availability against current catalog
      if (process.env.NODE_ENV === 'production') {
        const state = db.collection('resonaData').doc('huddles');
        const stateSnapshot = await state.get();
        const persisted = stateSnapshot.exists ? stateSnapshot.data().value || [] : [];
        const duplicate = persisted.find((entry) => entry.status === 'active' && (entry.hostId === user.id || entry.participants?.some((participant) => participant.id === user.id)));
        if (duplicate) throw new Error("You're already in an active Huddle.");
      }

      const catalog = await loadCatalog();
      const catalogIds = new Set(catalog.map(t => t.id));

      if (huddle.nowPlaying) {
        huddle.nowPlaying.available = catalogIds.has(huddle.nowPlaying.trackId);
      }
      if (Array.isArray(huddle.upNext)) {
        huddle.upNext.forEach(item => {
          item.available = catalogIds.has(item.trackId);
        });
      }

      return sanitizeHuddle(huddle, currentUserId);
    });
  },

  /**
   * Create a new Huddle session
   * Requires inviting at least one friend (Requirement 3).
   * Enforces One Active Huddle Rule (Requirement 10).
   */
  async createHuddle(user, { name, mode = 'HOST_CONTROLLED', initialTrackId = null, invitedFriendIds = [] } = {}) {
    return withLock(async () => {
      // 1. Minimum invitation requirement (Requirements 1 & 3)
      if (!Array.isArray(invitedFriendIds) || invitedFriendIds.length === 0) {
        throw new Error('Select at least one friend to start a Huddle.');
      }

      const huddles = await loadHuddles();
      const now = new Date();

      // 2. One Active Huddle Rule (Requirement 10)
      const existingActive = huddles.find(h =>
        h.status === 'active' &&
        (h.hostId === user.id || h.participants?.some(p => p.id === user.id))
      );
      if (existingActive) {
        const err = new Error("You're already in an active Huddle.");
        err.code = 'ALREADY_IN_HUDDLE';
        err.activeHuddle = { id: existingActive.id, name: existingActive.name };
        throw err;
      }

      const catalog = await loadCatalog();
      let nowPlaying = null;

      if (initialTrackId) {
        const found = catalog.find(t => t.id === initialTrackId);
        if (found) {
          nowPlaying = {
            queueId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            trackId: found.id,
            title: found.title,
            artist: found.artist,
            artwork: found.cover,
            duration: found.duration,
            audioUrl: found.audioUrl,
            startedAt: Date.now(),
            addedBy: { id: user.id, name: user.name || 'Host' },
            source: 'host_add',
            available: true
          };
        }
      }

      const huddleId = `huddle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const huddleName = name?.trim() || `${user.name ? user.name + "'s" : 'Sonic'} Huddle`;

      const newHuddle = {
        id: huddleId,
        name: huddleName,
        hostId: user.id,
        hostName: user.name || 'Host',
        mode: mode === 'COLLABORATIVE' ? 'COLLABORATIVE' : 'HOST_CONTROLLED',
        status: 'active',
        createdAt: now.toISOString(),
        endedAt: null,
        participants: [
          {
            id: user.id,
            name: user.name || 'Host',
            avatar: user.avatar || null,
            isHost: true,
            joinedAt: now.toISOString()
          }
        ],
        invitations: [],
        nowPlaying,
        upNext: [],
        playedTracks: [],
        recommendations: [],
        polls: [],
        history: [],
        recap: null
      };

      // 3. Create real invitations for selected friends (Requirements 4, 5, 11, 15)
      const { hasFeature } = await import('./entitlements.js');
      const invitedFriendsList = [];
      for (const friendId of invitedFriendIds) {
        if (!friendId || friendId === user.id) continue;
        
        // Enforce Huddle Entitlement for Recipient
        const recipientHasHuddle = await hasFeature(friendId, 'huddle');
        if (!recipientHasHuddle) {
          const err = new Error("One or more invited friends do not have Huddle enabled on their account.");
          err.code = 'RECIPIENT_FEATURE_NOT_ENABLED';
          throw err;
        }

        const friendProfile = await getRealUserProfile(friendId) || { id: friendId, name: 'Friend' };
        invitedFriendsList.push(friendProfile);

        const invitation = {
          id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          huddleId: newHuddle.id,
          huddleName: newHuddle.name,
          senderId: user.id,
          senderName: user.name || 'Host',
          senderAvatar: user.avatar || null,
          recipientId: friendId,
          recipientName: friendProfile.name || 'Friend',
          recipientAvatar: friendProfile.avatar || null,
          status: 'pending',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };

        newHuddle.invitations.push(invitation);

        // Store real notification in recipient's social.json
        try {
          const friendSocial = (await getAccountData(friendId, 'social.json')) || {};
          if (!friendSocial.notifications) friendSocial.notifications = [];
          const notif = {
            id: invitation.id,
            invitationId: invitation.id,
            type: 'huddle_invite',
            huddleId: newHuddle.id,
            huddleName: newHuddle.name,
            senderId: user.id,
            senderName: user.name || 'Host',
            senderAvatar: user.avatar || null,
            message: `${user.name || 'A friend'} invited you to join a Huddle.`,
            status: 'pending',
            timestamp: now.toISOString(),
            read: false
          };
          friendSocial.notifications.unshift(notif);
          await saveAccountData(friendId, 'social.json', friendSocial);

          // Socket.IO Real-time broadcast to user room (Requirement 15)
          if (ioInstance) {
            ioInstance.to(`user:${friendId}`).emit('notification_received', notif);
            ioInstance.to(`user:${friendId}`).emit('huddle_invitation', notif);
          }
        } catch (err) {
          console.error(`Failed to send invite notification to ${friendId}:`, err);
        }
      }

      logHuddleEvent(newHuddle, {
        text: `${user.name || 'Host'} started Huddle "${huddleName}" (${newHuddle.mode}) and invited ${invitedFriendsList.map(f => f.name).join(', ')}`,
        type: 'start',
        userId: user.id,
        userName: user.name
      });

      if (nowPlaying) {
        logHuddleEvent(newHuddle, {
          text: `${nowPlaying.title} is now playing`,
          type: 'now_playing',
          userId: user.id,
          userName: user.name,
          trackTitle: nowPlaying.title
        });
      }

      huddles.push(newHuddle);
      await saveHuddles(huddles);

      const sanitized = sanitizeHuddle(newHuddle, user.id);
      broadcast(newHuddle.id, 'huddle_state_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Invite more friends to an active Huddle (Requirement 14)
   */
  async inviteFriends(user, huddleId, friendIds) {
    return withLock(async () => {
      if (!Array.isArray(friendIds) || friendIds.length === 0) {
        throw new Error('Select at least one friend to invite.');
      }
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle session not found or inactive.');

      if (huddle.hostId !== user.id && user.role !== 'admin' && huddle.mode !== 'COLLABORATIVE') {
        throw new Error('Only the host can invite friends to this Huddle.');
      }

      if (!huddle.invitations) huddle.invitations = [];
      const now = new Date();
      const newInvitations = [];

      const { hasFeature } = await import('./entitlements.js');
      for (const friendId of friendIds) {
        if (!friendId || friendId === user.id) continue;

        // Enforce Huddle Entitlement for Recipient
        const recipientHasHuddle = await hasFeature(friendId, 'huddle');
        if (!recipientHasHuddle) {
          const err = new Error("One or more invited friends do not have Huddle enabled on their account.");
          err.code = 'RECIPIENT_FEATURE_NOT_ENABLED';
          throw err;
        }

        // Requirement 14: Do not allow inviting users who are already participants
        if (huddle.participants.some(p => p.id === friendId)) {
          continue;
        }

        // Requirement 14: Do not allow duplicate pending invitations
        if (huddle.invitations.some(i => i.recipientId === friendId && i.status === 'pending')) {
          continue;
        }

        const friendProfile = await getRealUserProfile(friendId) || { id: friendId, name: 'Friend' };
        const invitation = {
          id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          huddleId: huddle.id,
          huddleName: huddle.name,
          senderId: user.id,
          senderName: user.name || 'Host',
          senderAvatar: user.avatar || null,
          recipientId: friendId,
          recipientName: friendProfile.name || 'Friend',
          recipientAvatar: friendProfile.avatar || null,
          status: 'pending',
          createdAt: now.toISOString(),
          updatedAt: now.toISOString()
        };

        huddle.invitations.push(invitation);
        newInvitations.push(invitation);

        // Save real notification in friend's social.json
        try {
          const friendSocial = (await getAccountData(friendId, 'social.json')) || {};
          if (!friendSocial.notifications) friendSocial.notifications = [];
          const notif = {
            id: invitation.id,
            invitationId: invitation.id,
            type: 'huddle_invite',
            huddleId: huddle.id,
            huddleName: huddle.name,
            senderId: user.id,
            senderName: user.name || 'Host',
            senderAvatar: user.avatar || null,
            message: `${user.name || 'A friend'} invited you to join a Huddle.`,
            status: 'pending',
            timestamp: now.toISOString(),
            read: false
          };
          friendSocial.notifications.unshift(notif);
          await saveAccountData(friendId, 'social.json', friendSocial);

          // Real-time socket delivery
          if (ioInstance) {
            ioInstance.to(`user:${friendId}`).emit('notification_received', notif);
            ioInstance.to(`user:${friendId}`).emit('huddle_invitation', notif);
          }
        } catch (err) {
          console.error(`Failed to send invite notification to ${friendId}:`, err);
        }
      }

      if (newInvitations.length === 0) {
        throw new Error('Selected friends are already participants or already have pending invitations.');
      }

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} invited ${newInvitations.map(i => i.recipientName).join(', ')} to join`,
        type: 'invite',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'huddle_state_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Join an active Huddle session with strict validation (Requirements 7, 9, 10, 11)
   */
  async joinHuddle(user, huddleId, invitationId = null) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const target = huddles.find(h => h.id === huddleId);

      // 1. Huddle exists
      if (!target) {
        throw new Error('Huddle session not found.');
      }

      // 2. Huddle is still active
      if (target.status !== 'active') {
        throw new Error('This Huddle session has already ended.');
      }

      // 3. User is already in participants -> return current state
      if (target.participants.some(p => p.id === user.id)) {
        return sanitizeHuddle(target, user.id);
      }

      // Re-check entitlement at join time
      const { hasFeature } = await import('./entitlements.js');
      const canJoinHuddle = await hasFeature(user.id, 'huddle');
      if (!canJoinHuddle) {
        const err = new Error("You do not have Huddle enabled on your account.");
        err.code = 'RECIPIENT_FEATURE_NOT_ENABLED';
        throw err;
      }

      // 4. One Active Huddle Rule (Requirement 10)
      const otherActive = huddles.find(h =>
        h.id !== huddleId &&
        h.status === 'active' &&
        (h.hostId === user.id || h.participants?.some(p => p.id === user.id))
      );
      if (otherActive) {
        const err = new Error("You're already in an active Huddle.");
        err.code = 'ALREADY_IN_HUDDLE';
        err.activeHuddle = { id: otherActive.id, name: otherActive.name };
        throw err;
      }

      // 5. Invitation Validation (Requirement 9)
      if (!target.invitations) target.invitations = [];
      const inv = target.invitations.find(i =>
        invitationId ? i.id === invitationId : i.recipientId === user.id
      );

      // Non-host users must have an invitation
      if (target.hostId !== user.id) {
        if (!inv) {
          throw new Error('No invitation found for this Huddle.');
        }
        if (inv.recipientId !== user.id) {
          throw new Error('This invitation belongs to another user.');
        }
        if (inv.status === 'declined') {
          throw new Error('This invitation was previously declined.');
        }
        if (inv.status === 'cancelled') {
          throw new Error('This invitation was cancelled because the Huddle ended.');
        }
        if (inv.status === 'expired') {
          throw new Error('This invitation has expired.');
        }
        if (inv.status !== 'pending' && inv.status !== 'accepted') {
          throw new Error('This invitation is no longer valid.');
        }
      }

      const now = new Date();

      // Mark invitation accepted (Requirement 11)
      if (inv) {
        inv.status = 'accepted';
        inv.updatedAt = now.toISOString();

        // Update recipient's notification in social.json
        try {
          const userSocial = (await getAccountData(user.id, 'social.json')) || {};
          if (userSocial.notifications) {
            const notif = userSocial.notifications.find(n => n.id === inv.id || n.invitationId === inv.id);
            if (notif) {
              notif.status = 'accepted';
              notif.read = true;
            }
            await saveAccountData(user.id, 'social.json', userSocial);
          }
        } catch (err) {
          console.error('Failed to update recipient notification state:', err);
        }
      }

      // Add user to participants list (INVITED -> PARTICIPANT)
      target.participants.push({
        id: user.id,
        name: user.name || 'Listener',
        avatar: user.avatar || null,
        isHost: target.hostId === user.id,
        joinedAt: now.toISOString()
      });

      logHuddleEvent(target, {
        text: `${user.name || 'Listener'} accepted invitation and joined the Huddle`,
        type: 'join',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(target, user.id);
      broadcast(target.id, 'participants_updated', sanitized);
      broadcast(target.id, 'huddle_state_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Decline an invitation (Requirements 8 & 11)
   */
  async declineInvitation(user, invitationId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      let foundHuddle = null;

      for (const h of huddles) {
        if (!h.invitations) continue;
        const inv = h.invitations.find(i => (i.id === invitationId || (i.recipientId === user.id && i.huddleId === invitationId)));
        if (inv && inv.recipientId === user.id) {
          inv.status = 'declined';
          inv.updatedAt = new Date().toISOString();
          foundHuddle = h;
          break;
        }
      }

      if (foundHuddle) {
        await saveHuddles(huddles);
        broadcast(foundHuddle.id, 'huddle_state_updated', sanitizeHuddle(foundHuddle, null));
      }

      // Update in user's notifications in social.json
      try {
        const userSocial = (await getAccountData(user.id, 'social.json')) || {};
        if (userSocial.notifications) {
          const notif = userSocial.notifications.find(n => n.id === invitationId || n.invitationId === invitationId);
          if (notif) {
            notif.status = 'declined';
            notif.read = true;
          }
          await saveAccountData(user.id, 'social.json', userSocial);
        }
      } catch (err) {
        console.error('Failed to update declined notification:', err);
      }

      return { success: true, invitationId, status: 'declined' };
    });
  },

  /**
   * Leave existing active Huddle and join invited one (Requirement 10)
   */
  async leaveAndJoinHuddle(user, fromHuddleId, toHuddleId, invitationId = null) {
    if (fromHuddleId) {
      await this.leaveHuddle(user, fromHuddleId);
    }
    return await this.joinHuddle(user, toHuddleId, invitationId);
  },

  /**
   * Leave Huddle
   * Note: Leaving participants' queue additions and recommendations remain!
   */
  async leaveHuddle(user, huddleId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const isHost = huddle.hostId === user.id;
      huddle.participants = huddle.participants.filter(p => p.id !== user.id);

      logHuddleEvent(huddle, {
        text: `${user.name || 'Participant'} left the Huddle`,
        type: 'leave',
        userId: user.id,
        userName: user.name
      });

      if (isHost) {
        if (huddle.participants.length > 0) {
          // Transfer host to first remaining participant
          const newHost = huddle.participants[0];
          huddle.hostId = newHost.id;
          huddle.hostName = newHost.name;
          newHost.isHost = true;
          logHuddleEvent(huddle, {
            text: `Host transferred to ${newHost.name}`,
            type: 'host_transfer',
            userId: newHost.id,
            userName: newHost.name
          });
        } else {
          // No participants left, cleanly end the Huddle
          huddle.status = 'ended';
          huddle.endedAt = new Date().toISOString();
          huddle.recap = this._generateRecap(huddle);

          if (Array.isArray(huddle.invitations)) {
            for (const inv of huddle.invitations) {
              if (inv.status === 'pending') {
                inv.status = 'cancelled';
                inv.updatedAt = new Date().toISOString();
                try {
                  const friendSocial = (await getAccountData(inv.recipientId, 'social.json')) || {};
                  if (friendSocial.notifications) {
                    const notif = friendSocial.notifications.find(n => n.id === inv.id || n.invitationId === inv.id);
                    if (notif) {
                      notif.status = 'cancelled';
                      notif.read = true;
                    }
                    await saveAccountData(inv.recipientId, 'social.json', friendSocial);
                  }
                } catch (_) {}
                if (ioInstance) {
                  ioInstance.to(`user:${inv.recipientId}`).emit('invitation_cancelled', {
                    invitationId: inv.id,
                    huddleId: huddle.id
                  });
                }
              }
            }
          }

          logHuddleEvent(huddle, {
            text: `Huddle ended (no active participants remaining)`,
            type: 'end',
            userId: user.id,
            userName: user.name
          });
        }
      }

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, huddle.status === 'ended' ? 'huddle_ended' : 'participants_updated', sanitized);
      return { success: true, huddle: sanitized };
    });
  },

  /**
   * Transfer host to another active participant
   */
  async transferHost(user, huddleId, newHostId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Unauthorized: Only current host can transfer host ownership.');
      }

      const newHost = huddle.participants.find(p => p.id === newHostId);
      if (!newHost) throw new Error('Target participant is not in this Huddle.');

      huddle.participants.forEach(p => {
        p.isHost = p.id === newHostId;
      });
      huddle.hostId = newHost.id;
      huddle.hostName = newHost.name;

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} transferred host authority to ${newHost.name}`,
        type: 'host_transfer',
        userId: newHost.id,
        userName: newHost.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'participants_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Set Huddle mode: HOST_CONTROLLED vs COLLABORATIVE
   */
  async setMode(user, huddleId, newMode) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Unauthorized: Only host can configure Huddle permissions mode.');
      }

      const mode = newMode === 'COLLABORATIVE' ? 'COLLABORATIVE' : 'HOST_CONTROLLED';
      huddle.mode = mode;

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} set playback mode to ${mode}`,
        type: 'mode_change',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'huddle_state_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Add Track to Queue (or Play Next)
   */
  async addTrackToQueue(user, huddleId, { trackId, action = 'add_to_queue', source = null }) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const isHost = huddle.hostId === user.id;
      const isParticipant = huddle.participants.some(p => p.id === user.id);
      if (!isHost && !isParticipant) {
        throw new Error('Unauthorized: You must be a member of this Huddle.');
      }

      // Permissions check
      if (huddle.mode === 'HOST_CONTROLLED' && !isHost) {
        throw new Error('Permission denied: In HOST_CONTROLLED mode, only host can add directly to queue.');
      }

      if (action === 'play_next' && !isHost) {
        throw new Error('Permission denied: Only host can execute Play Next.');
      }

      // Verify track in catalog
      const catalog = await loadCatalog();
      const track = catalog.find(t => t.id === trackId);
      if (!track) {
        throw new Error(`Track "${trackId}" does not exist in the Resona catalog.`);
      }

      const itemSource = source || (isHost ? 'host_add' : 'participant_add');
      const now = new Date();

      const queueItem = {
        queueId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        artwork: track.cover,
        duration: track.duration,
        audioUrl: track.audioUrl,
        position: 1,
        addedBy: { id: user.id, name: user.name || 'Participant' },
        source: itemSource,
        timestamp: now.toISOString(),
        available: true
      };

      // If nothing is currently playing, start playing this track immediately
      if (!huddle.nowPlaying) {
        huddle.nowPlaying = queueItem;
        huddle.nowPlaying.startedAt = Date.now();

        logHuddleEvent(huddle, {
          text: `${queueItem.title} is now playing (added by ${queueItem.addedBy.name})`,
          type: 'now_playing',
          userId: user.id,
          userName: user.name,
          trackTitle: queueItem.title
        });
      } else if (action === 'play_next') {
        // Insert at beginning of Up Next
        huddle.upNext.unshift(queueItem);
        // Re-index all positions
        huddle.upNext.forEach((item, idx) => {
          item.position = idx + 1;
        });

        logHuddleEvent(huddle, {
          text: `${user.name || 'Host'} set "${queueItem.title}" to Play Next`,
          type: 'play_next',
          userId: user.id,
          userName: user.name,
          trackTitle: queueItem.title
        });
      } else {
        // Append to end of Up Next
        queueItem.position = huddle.upNext.length + 1;
        huddle.upNext.push(queueItem);

        logHuddleEvent(huddle, {
          text: `${user.name || 'User'} added "${queueItem.title}" to the queue`,
          type: 'queue_add',
          userId: user.id,
          userName: user.name,
          trackTitle: queueItem.title
        });
      }

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return { success: true, item: queueItem, huddle: sanitized };
    });
  },

  /**
   * Play Next on an already queued item
   */
  async playNext(user, huddleId, queueId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can execute Play Next.');
      }

      const itemIdx = huddle.upNext.findIndex(item => item.queueId === queueId);
      if (itemIdx === -1) {
        throw new Error('Queue item not found.');
      }

      // Move to index 0 without duplicating
      const [item] = huddle.upNext.splice(itemIdx, 1);
      huddle.upNext.unshift(item);

      // Re-index positions
      huddle.upNext.forEach((it, idx) => {
        it.position = idx + 1;
      });

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} moved "${item.title}" to Play Next`,
        type: 'play_next',
        userId: user.id,
        userName: user.name,
        trackTitle: item.title
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Reorder Queue (supports drag-and-drop array of queueIds or move actions)
   */
  async reorderQueue(user, huddleId, newOrderedQueueIds) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can reorder the playback queue.');
      }

      if (!Array.isArray(newOrderedQueueIds)) {
        throw new Error('Invalid reorder payload: expected array of queue IDs.');
      }

      const currentMap = new Map(huddle.upNext.map(item => [item.queueId, item]));
      const newQueue = [];

      for (const qId of newOrderedQueueIds) {
        if (currentMap.has(qId)) {
          newQueue.push(currentMap.get(qId));
          currentMap.delete(qId);
        }
      }

      // Append any items that were not specified in the payload to preserve them
      for (const remaining of currentMap.values()) {
        newQueue.push(remaining);
      }

      // Re-index
      newQueue.forEach((item, idx) => {
        item.position = idx + 1;
      });

      huddle.upNext = newQueue;

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} reordered the queue`,
        type: 'reorder',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Remove item from queue
   */
  async removeQueueItem(user, huddleId, queueId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const item = huddle.upNext.find(i => i.queueId === queueId);
      if (!item) throw new Error('Queue item not found.');

      const isHost = huddle.hostId === user.id;
      const isOwner = item.addedBy?.id === user.id;

      if (!isHost && !(huddle.mode === 'COLLABORATIVE' && isOwner)) {
        throw new Error('Permission denied: You can only remove your own additions in Collaborative mode.');
      }

      huddle.upNext = huddle.upNext.filter(i => i.queueId !== queueId);
      huddle.upNext.forEach((it, idx) => {
        it.position = idx + 1;
      });

      logHuddleEvent(huddle, {
        text: `${user.name || 'User'} removed "${item.title}" from the queue`,
        type: 'queue_remove',
        userId: user.id,
        userName: user.name,
        trackTitle: item.title
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Clear Queue
   */
  async clearQueue(user, huddleId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can clear the queue.');
      }

      huddle.upNext = [];

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} cleared the queue`,
        type: 'queue_clear',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Advance playback (track completed or host skip)
   */
  async advancePlayback(user, huddleId, { reason = 'track_ended' } = {}) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const isHost = huddle.hostId === user.id;
      const isParticipant = huddle.participants.some(p => p.id === user.id);

      // Track completion can be triggered by host or participant; manual skip only by host
      if (reason === 'skip' && !isHost) {
        throw new Error('Permission denied: Only host can skip tracks.');
      }
      if (!isHost && !isParticipant) {
        throw new Error('Unauthorized.');
      }

      // Move current Now Playing to playedTracks
      if (huddle.nowPlaying) {
        if (!huddle.playedTracks) huddle.playedTracks = [];
        huddle.playedTracks.push({
          ...huddle.nowPlaying,
          playedAt: new Date().toISOString()
        });
      }

      // Find first available track in Up Next
      const catalog = await loadCatalog();
      const catalogIds = new Set(catalog.map(t => t.id));

      let nextTrack = null;
      while (huddle.upNext.length > 0) {
        const candidate = huddle.upNext.shift();
        if (catalogIds.has(candidate.trackId)) {
          nextTrack = candidate;
          break;
        } else {
          // Track became unavailable; mark and leave for host removal or discard
          candidate.available = false;
        }
      }

      // Re-index remaining Up Next
      huddle.upNext.forEach((item, idx) => {
        item.position = idx + 1;
      });

      if (nextTrack) {
        nextTrack.startedAt = Date.now();
        huddle.nowPlaying = nextTrack;

        logHuddleEvent(huddle, {
          text: `${nextTrack.title} is now playing`,
          type: 'now_playing',
          userId: user.id,
          userName: user.name,
          trackTitle: nextTrack.title
        });
      } else {
        huddle.nowPlaying = null;
        logHuddleEvent(huddle, {
          text: `Playback queue completed`,
          type: 'playback_complete',
          userId: user.id,
          userName: user.name
        });
      }

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'track_changed', sanitized);
      return sanitized;
    });
  },

  /**
   * Recommend a track for the Huddle
   */
  async recommendTrack(user, huddleId, { trackId }) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const isParticipant = huddle.participants.some(p => p.id === user.id);
      if (!isParticipant) throw new Error('Must be a participant of this Huddle to recommend songs.');

      const catalog = await loadCatalog();
      const track = catalog.find(t => t.id === trackId);
      if (!track) throw new Error('Track not found in catalog.');

      const rec = {
        id: `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        trackId: track.id,
        title: track.title,
        artist: track.artist,
        artwork: track.cover,
        duration: track.duration,
        audioUrl: track.audioUrl,
        recommender: { id: user.id, name: user.name || 'Participant' },
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      if (!huddle.recommendations) huddle.recommendations = [];
      huddle.recommendations.unshift(rec);

      logHuddleEvent(huddle, {
        text: `${user.name || 'Participant'} recommended "${track.title}"`,
        type: 'recommendation',
        userId: user.id,
        userName: user.name,
        trackTitle: track.title
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'recommendations_updated', sanitized);
      return { success: true, recommendation: rec, huddle: sanitized };
    });
  },

  /**
   * Accept a recommendation -> adds to queue
   */
  async acceptRecommendation(user, huddleId, recId, { action = 'add_to_queue' } = {}) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can accept recommendations.');
      }

      const rec = (huddle.recommendations || []).find(r => r.id === recId);
      if (!rec) throw new Error('Recommendation not found.');

      rec.status = 'accepted';

      // Create queue item attributed to recommender
      const queueItem = {
        queueId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        trackId: rec.trackId,
        title: rec.title,
        artist: rec.artist,
        artwork: rec.artwork,
        duration: rec.duration,
        audioUrl: rec.audioUrl,
        position: 1,
        addedBy: rec.recommender,
        source: 'recommendation',
        timestamp: new Date().toISOString(),
        available: true
      };

      if (!huddle.nowPlaying) {
        huddle.nowPlaying = queueItem;
        huddle.nowPlaying.startedAt = Date.now();
      } else if (action === 'play_next') {
        huddle.upNext.unshift(queueItem);
        huddle.upNext.forEach((item, idx) => { item.position = idx + 1; });
      } else {
        queueItem.position = huddle.upNext.length + 1;
        huddle.upNext.push(queueItem);
      }

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} added recommended track "${rec.title}" (recommended by ${rec.recommender.name})`,
        type: 'recommendation_accepted',
        userId: user.id,
        userName: user.name,
        trackTitle: rec.title
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Dismiss a recommendation
   */
  async dismissRecommendation(user, huddleId, recId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can dismiss recommendations.');
      }

      const rec = (huddle.recommendations || []).find(r => r.id === recId);
      if (!rec) throw new Error('Recommendation not found.');

      rec.status = 'dismissed';

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} dismissed recommendation for "${rec.title}"`,
        type: 'recommendation_dismissed',
        userId: user.id,
        userName: user.name,
        trackTitle: rec.title
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'recommendations_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Create Poll (Single-song or Multiple-song)
   */
  async createPoll(user, huddleId, { type = 'single', question, trackIds = [] }) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can create Huddle polls.');
      }

      if (!Array.isArray(trackIds) || trackIds.length === 0) {
        throw new Error('At least one catalog track must be selected for the poll.');
      }

      const catalog = await loadCatalog();
      const matchedTracks = [];
      for (const tId of trackIds) {
        const found = catalog.find(t => t.id === tId);
        if (found) matchedTracks.push(found);
      }

      if (matchedTracks.length === 0) {
        throw new Error('None of the selected tracks were found in the catalog.');
      }

      let pollQuestion = question?.trim();
      let options = [];

      if (type === 'single') {
        const trk = matchedTracks[0];
        if (!pollQuestion) {
          pollQuestion = `Should we play "${trk.title}" next?`;
        }
        options = [
          { text: 'YES', track: trk },
          { text: 'NO', track: null }
        ];
      } else {
        if (!pollQuestion) {
          pollQuestion = 'Choose the next song';
        }
        options = matchedTracks.map(trk => ({
          text: `${trk.title} — ${trk.artist}`,
          track: trk
        }));
      }

      const poll = {
        id: `poll_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type: type === 'multi' ? 'multi' : 'single',
        question: pollQuestion,
        trackIds: matchedTracks.map(t => t.id),
        tracks: matchedTracks.map(t => ({
          trackId: t.id,
          title: t.title,
          artist: t.artist,
          artwork: t.cover,
          duration: t.duration,
          audioUrl: t.audioUrl
        })),
        options,
        votes: {},
        status: 'active',
        winner: null,
        actionTaken: null,
        createdAt: new Date().toISOString(),
        endedAt: null
      };

      if (!huddle.polls) huddle.polls = [];
      huddle.polls.unshift(poll);

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} created a poll: "${pollQuestion}"`,
        type: 'poll_create',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'poll_updated', sanitized);
      return { success: true, poll, huddle: sanitized };
    });
  },

  /**
   * Vote in Poll
   */
  async voteInPoll(user, huddleId, pollId, optionIndex) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const isParticipant = huddle.participants.some(p => p.id === user.id);
      if (!isParticipant) throw new Error('You must be in the Huddle to vote.');

      const poll = (huddle.polls || []).find(p => p.id === pollId);
      if (!poll) throw new Error('Poll not found.');

      if (poll.status !== 'active') {
        throw new Error('This poll has already ended.');
      }

      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        throw new Error('Invalid vote option.');
      }

      poll.votes[user.id] = optionIndex;

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'poll_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * End Poll and calculate winner
   */
  async endPoll(user, huddleId, pollId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can end polls.');
      }

      const poll = (huddle.polls || []).find(p => p.id === pollId);
      if (!poll) throw new Error('Poll not found.');

      if (poll.status === 'ended') {
        return sanitizeHuddle(huddle, user.id);
      }

      poll.status = 'ended';
      poll.endedAt = new Date().toISOString();

      // Calculate winning option
      const voteEntries = Object.entries(poll.votes || {});
      const counts = poll.options.map((_, idx) => {
        return voteEntries.filter(([_, optIdx]) => optIdx === idx).length;
      });

      let winnerTrack = null;
      let maxVotes = -1;
      let winningIndex = -1;

      counts.forEach((count, idx) => {
        if (count > maxVotes) {
          maxVotes = count;
          winningIndex = idx;
        }
      });

      if (winningIndex >= 0 && maxVotes > 0) {
        const winningOption = poll.options[winningIndex];
        if (poll.type === 'single') {
          // If option is YES (index 0)
          if (winningIndex === 0) {
            winnerTrack = poll.tracks[0];
          }
        } else {
          winnerTrack = poll.tracks[winningIndex] || null;
        }
      }

      poll.winner = winnerTrack ? { ...winnerTrack, votesCount: maxVotes } : null;

      const logText = winnerTrack 
        ? `Poll ended: "${winnerTrack.title}" won with ${maxVotes} vote${maxVotes === 1 ? '' : 's'}`
        : `Poll ended with no approved winning track`;

      logHuddleEvent(huddle, {
        text: logText,
        type: 'poll_win',
        userId: user.id,
        userName: user.name,
        trackTitle: winnerTrack ? winnerTrack.title : null
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'poll_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Resolve Poll Winner -> host explicitly adds winning track to queue
   */
  async resolvePollWinner(user, huddleId, pollId, { action = 'play_next' }) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      if (huddle.hostId !== user.id) {
        throw new Error('Permission denied: Only host can resolve poll winners.');
      }

      const poll = (huddle.polls || []).find(p => p.id === pollId);
      if (!poll) throw new Error('Poll not found.');

      if (poll.status !== 'ended') {
        throw new Error('Poll must be ended before resolving winner.');
      }

      if (!poll.winner) {
        throw new Error('This poll did not produce a winning track.');
      }

      if (poll.actionTaken) {
        throw new Error('Poll winner has already been added to the queue.');
      }

      poll.actionTaken = action;

      // Add to queue with source: poll_winner
      const winnerTrack = poll.winner;
      const queueItem = {
        queueId: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        trackId: winnerTrack.trackId,
        title: winnerTrack.title,
        artist: winnerTrack.artist,
        artwork: winnerTrack.artwork,
        duration: winnerTrack.duration,
        audioUrl: winnerTrack.audioUrl,
        position: 1,
        addedBy: { id: user.id, name: 'Huddle Poll' },
        source: 'poll_winner',
        timestamp: new Date().toISOString(),
        available: true
      };

      if (!huddle.nowPlaying) {
        huddle.nowPlaying = queueItem;
        huddle.nowPlaying.startedAt = Date.now();
      } else if (action === 'play_next') {
        huddle.upNext.unshift(queueItem);
        huddle.upNext.forEach((item, idx) => { item.position = idx + 1; });
      } else {
        queueItem.position = huddle.upNext.length + 1;
        huddle.upNext.push(queueItem);
      }

      logHuddleEvent(huddle, {
        text: `${winnerTrack.title} won the Huddle Poll and was added to the queue (${action === 'play_next' ? 'Play Next' : 'Up Next'})`,
        type: 'poll_accepted',
        userId: user.id,
        userName: user.name,
        trackTitle: winnerTrack.title
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'queue_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * End Huddle Session and build Recap
   */
  async endHuddle(user, huddleId) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or already ended.');

      if (huddle.hostId !== user.id && user.role !== 'admin') {
        throw new Error('Permission denied: Only host can end the Huddle.');
      }

      const now = new Date();
      huddle.status = 'ended';
      huddle.endedAt = now.toISOString();
      huddle.recap = this._generateRecap(huddle);

      // Requirement 11: Invalidate / cancel all pending invitations when host ends Huddle
      if (Array.isArray(huddle.invitations)) {
        for (const inv of huddle.invitations) {
          if (inv.status === 'pending') {
            inv.status = 'cancelled';
            inv.updatedAt = now.toISOString();

            try {
              const friendSocial = (await getAccountData(inv.recipientId, 'social.json')) || {};
              if (friendSocial.notifications) {
                const notif = friendSocial.notifications.find(n => n.id === inv.id || n.invitationId === inv.id);
                if (notif) {
                  notif.status = 'cancelled';
                  notif.read = true;
                }
                await saveAccountData(inv.recipientId, 'social.json', friendSocial);
              }
            } catch (err) {
              console.error('Error updating cancelled invite notification:', err);
            }

            if (ioInstance) {
              ioInstance.to(`user:${inv.recipientId}`).emit('invitation_cancelled', {
                invitationId: inv.id,
                huddleId: huddle.id
              });
            }
          }
        }
      }

      logHuddleEvent(huddle, {
        text: `${user.name || 'Host'} ended the Huddle session`,
        type: 'end',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'huddle_ended', sanitized);
      return sanitized;
    });
  },

  /**
   * Save Huddle recap as playlist
   */
  async savePlaylist(user, huddleId, { type = 'played', title } = {}) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId);
      if (!huddle) throw new Error('Huddle not found.');

      let tracksToSave = [];
      if (type === 'played') {
        tracksToSave = (huddle.playedTracks || []).map(t => t.trackId);
        if (huddle.nowPlaying && !tracksToSave.includes(huddle.nowPlaying.trackId)) {
          tracksToSave.unshift(huddle.nowPlaying.trackId);
        }
      } else {
        tracksToSave = (huddle.upNext || []).map(t => t.trackId);
      }

      if (tracksToSave.length === 0) {
        throw new Error(`No ${type === 'played' ? 'played' : 'queue'} tracks available to save.`);
      }

      // Read user shelf
      const shelf = (await getAccountData(user.id, 'shelf.json')) || {
        likedTrackIds: [],
        playlists: [],
        downloadedTrackIds: [],
        recentlyPlayed: []
      };

      const playlistTitle = title?.trim() || `${huddle.name} (${type === 'played' ? 'Played Tracks' : 'Queue'})`;
      const newPlaylist = {
        id: `pl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: playlistTitle,
        description: `Saved from Huddle "${huddle.name}" on ${new Date().toLocaleDateString()}`,
        trackIds: tracksToSave,
        cover: huddle.nowPlaying?.artwork || 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=300&auto=format&fit=crop&q=80',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      shelf.playlists.unshift(newPlaylist);
      await saveAccountData(user.id, 'shelf.json', shelf);

      return { success: true, playlist: newPlaylist, shelf };
    });
  },

  /**
   * Send Chat Message
   */
  async sendChatMessage(user, huddleId, message) {
    return withLock(async () => {
      const huddles = await loadHuddles();
      const huddle = huddles.find(h => h.id === huddleId && h.status === 'active');
      if (!huddle) throw new Error('Huddle not found or inactive.');

      const isParticipant = huddle.participants.some(p => p.id === user.id);
      if (!isParticipant && huddle.hostId !== user.id) {
        throw new Error('You must be in the Huddle to send a message.');
      }

      if (!message || message.trim() === '') {
        throw new Error('Message cannot be empty.');
      }

      logHuddleEvent(huddle, {
        text: message.trim(),
        type: 'chat',
        userId: user.id,
        userName: user.name
      });

      await saveHuddles(huddles);
      const sanitized = sanitizeHuddle(huddle, user.id);
      broadcast(huddle.id, 'huddle_state_updated', sanitized);
      return sanitized;
    });
  },

  /**
   * Internal helper to calculate recap metrics
   */
  _generateRecap(huddle) {
    const start = new Date(huddle.createdAt).getTime();
    const end = huddle.endedAt ? new Date(huddle.endedAt).getTime() : Date.now();
    const durationMs = Math.max(1000, end - start);

    const played = (huddle.playedTracks || []).slice();
    if (huddle.nowPlaying) {
      played.push(huddle.nowPlaying);
    }

    return {
      huddleId: huddle.id,
      huddleName: huddle.name,
      mode: huddle.mode,
      durationMinutes: Math.round(durationMs / 60000),
      durationFormatted: formatDuration(durationMs),
      participantsCount: (huddle.participants || []).length,
      participants: (huddle.participants || []).map(p => ({ id: p.id, name: p.name })),
      tracksPlayedCount: played.length,
      tracksPlayed: played.map(t => ({ trackId: t.trackId, title: t.title, artist: t.artist, artwork: t.artwork })),
      remainingQueueCount: (huddle.upNext || []).length,
      remainingQueue: (huddle.upNext || []).map(t => ({ trackId: t.trackId, title: t.title, artist: t.artist, artwork: t.artwork })),
      recommendationsCount: (huddle.recommendations || []).length,
      pollsCount: (huddle.polls || []).length,
      queueActivityCount: (huddle.history || []).length,
      endedAt: huddle.endedAt
    };
  }
};

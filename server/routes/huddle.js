import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { huddleService } from '../services/huddleService.js';
import { getPlatformSettings } from '../services/platformSettings.js';

const router = express.Router();
router.use(requireAuth);

/**
 * Middleware to check if social huddles are enabled in platform settings
 */
async function checkHuddleEnabled(req, res, next) {
  try {
    const settings = await getPlatformSettings();
    if (settings.social?.enableHuddle === false) {
      return res.status(403).json({ error: 'Social Huddles are currently disabled by platform administrator.' });
    }
    next();
  } catch (err) {
    next();
  }
}

router.use(checkHuddleEnabled);

/**
 * GET /api/social/huddle/active
 * Get current active Huddle session for authenticated user
 */
router.get('/active', async (req, res) => {
  try {
    const huddle = await huddleService.getUserActiveHuddle(req.user.id);
    return res.json({ huddle });
  } catch (err) {
    console.error('[Huddle active error]', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/social/huddle/:id
 * Get details of a specific Huddle
 */
router.get('/:id', async (req, res) => {
  try {
    const huddle = await huddleService.getHuddleById(req.params.id, req.user.id);
    if (!huddle) {
      return res.status(404).json({ error: 'Huddle not found.' });
    }
    return res.json({ huddle });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/create
 * Start a new Huddle session with required invited friends
 */
router.post('/create', async (req, res) => {
  try {
    const { name, mode, initialTrackId, invitedFriendIds } = req.body;
    const huddle = await huddleService.createHuddle(req.user, { name, mode, initialTrackId, invitedFriendIds });
    return res.status(201).json({ success: true, huddle });
  } catch (err) {
    const status = err.code === 'ALREADY_IN_HUDDLE' ? 409 : 400;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      activeHuddle: err.activeHuddle
    });
  }
});

/**
 * POST /api/social/huddle/invite
 * Invite friends to a Huddle
 */
router.post('/invite', async (req, res) => {
  try {
    const { huddleId, friendIds } = req.body;
    const huddle = await huddleService.inviteFriends(req.user, huddleId, friendIds);
    return res.json({ success: true, huddle });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/invitations/:id/accept
 * Accept invitation and join active Huddle
 */
router.post('/invitations/:id/accept', async (req, res) => {
  try {
    const { huddleId } = req.body;
    const huddle = await huddleService.joinHuddle(req.user, huddleId, req.params.id);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.code === 'ALREADY_IN_HUDDLE' ? 409 : 400;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      activeHuddle: err.activeHuddle
    });
  }
});

/**
 * POST /api/social/huddle/invitations/:id/decline
 * Decline invitation
 */
router.post('/invitations/:id/decline', async (req, res) => {
  try {
    const result = await huddleService.declineInvitation(req.user, req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/leave-and-join
 * Leave current active Huddle and join invited one
 */
router.post('/leave-and-join', async (req, res) => {
  try {
    const { fromHuddleId, toHuddleId, invitationId } = req.body;
    const huddle = await huddleService.leaveAndJoinHuddle(req.user, fromHuddleId, toHuddleId, invitationId);
    return res.json({ success: true, huddle });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/join
 * Join an active Huddle session
 */
router.post('/:id/join', async (req, res) => {
  try {
    const { invitationId } = req.body || {};
    const huddle = await huddleService.joinHuddle(req.user, req.params.id, invitationId);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.code === 'ALREADY_IN_HUDDLE' ? 409 : 400;
    return res.status(status).json({
      error: err.message,
      code: err.code,
      activeHuddle: err.activeHuddle
    });
  }
});

/**
 * POST /api/social/huddle/:id/leave
 * Leave Huddle session
 */
router.post('/:id/leave', async (req, res) => {
  try {
    const result = await huddleService.leaveHuddle(req.user, req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/transfer-host
 * Transfer host authority
 */
router.post('/:id/transfer-host', async (req, res) => {
  try {
    const { newHostId } = req.body;
    if (!newHostId) return res.status(400).json({ error: 'newHostId is required' });
    const huddle = await huddleService.transferHost(req.user, req.params.id, newHostId);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/mode
 * Change playback permission mode (HOST_CONTROLLED vs COLLABORATIVE)
 */
router.post('/:id/mode', async (req, res) => {
  try {
    const { mode } = req.body;
    const huddle = await huddleService.setMode(req.user, req.params.id, mode);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Unauthorized') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/queue/add
 * Add track to queue or Play Next
 */
router.post('/:id/queue/add', async (req, res) => {
  try {
    const { trackId, action, source } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required' });
    const result = await huddleService.addTrackToQueue(req.user, req.params.id, {
      trackId,
      action: action || 'add_to_queue',
      source
    });
    return res.json(result);
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/queue/play-next
 * Move existing queued track to Play Next (position 1)
 */
router.post('/:id/queue/play-next', async (req, res) => {
  try {
    const { queueId } = req.body;
    if (!queueId) return res.status(400).json({ error: 'queueId is required' });
    const huddle = await huddleService.playNext(req.user, req.params.id, queueId);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * PUT /api/social/huddle/:id/queue/reorder
 * Reorder entire Up Next queue
 */
router.put('/:id/queue/reorder', async (req, res) => {
  try {
    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) return res.status(400).json({ error: 'itemIds array is required' });
    const huddle = await huddleService.reorderQueue(req.user, req.params.id, itemIds);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * DELETE /api/social/huddle/:id/queue/:queueId
 * Remove item from queue
 */
router.delete('/:id/queue/:queueId', async (req, res) => {
  try {
    const huddle = await huddleService.removeQueueItem(req.user, req.params.id, req.params.queueId);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * DELETE /api/social/huddle/:id/queue
 * Clear queue
 */
router.delete('/:id/queue', async (req, res) => {
  try {
    const huddle = await huddleService.clearQueue(req.user, req.params.id);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/playback/advance
 * Advance playback when current track finishes or host skips
 */
router.post('/:id/playback/advance', async (req, res) => {
  try {
    const { reason } = req.body;
    const huddle = await huddleService.advancePlayback(req.user, req.params.id, { reason });
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/recommend
 * Recommend a catalog track
 */
router.post('/:id/recommend', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required' });
    const result = await huddleService.recommendTrack(req.user, req.params.id, { trackId });
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/recommendations/:recId/accept
 * Host accepts recommendation
 */
router.post('/:id/recommendations/:recId/accept', async (req, res) => {
  try {
    const { action } = req.body;
    const huddle = await huddleService.acceptRecommendation(req.user, req.params.id, req.params.recId, { action });
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/recommendations/:recId/dismiss
 * Host dismisses recommendation
 */
router.post('/:id/recommendations/:recId/dismiss', async (req, res) => {
  try {
    const huddle = await huddleService.dismissRecommendation(req.user, req.params.id, req.params.recId);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/polls
 * Create single-song or multiple-song poll
 */
router.post('/:id/polls', async (req, res) => {
  try {
    const { type, question, trackIds } = req.body;
    const result = await huddleService.createPoll(req.user, req.params.id, { type, question, trackIds });
    return res.status(201).json(result);
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/polls/:pollId/vote
 * Cast vote in poll
 */
router.post('/:id/polls/:pollId/vote', async (req, res) => {
  try {
    const { optionIndex } = req.body;
    if (typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'optionIndex must be a number' });
    }
    const huddle = await huddleService.voteInPoll(req.user, req.params.id, req.params.pollId, optionIndex);
    return res.json({ success: true, huddle });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/polls/:pollId/end
 * End poll and calculate winner
 */
router.post('/:id/polls/:pollId/end', async (req, res) => {
  try {
    const huddle = await huddleService.endPoll(req.user, req.params.id, req.params.pollId);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/polls/:pollId/resolve
 * Host adds winning track to queue
 */
router.post('/:id/polls/:pollId/resolve', async (req, res) => {
  try {
    const { action } = req.body;
    const huddle = await huddleService.resolvePollWinner(req.user, req.params.id, req.params.pollId, { action });
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/end
 * End Huddle session and calculate recap
 */
router.post('/:id/end', async (req, res) => {
  try {
    const huddle = await huddleService.endHuddle(req.user, req.params.id);
    return res.json({ success: true, huddle, recap: huddle.recap });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/chat
 * Send a chat message
 */
router.post('/:id/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const huddle = await huddleService.sendChatMessage(req.user, req.params.id, message);
    return res.json({ success: true, huddle });
  } catch (err) {
    const status = err.message.includes('Permission denied') ? 403 : 400;
    return res.status(status).json({ error: err.message });
  }
});

/**
 * POST /api/social/huddle/:id/save-playlist
 * Save played tracks or remaining queue as a playlist in user's shelf
 */
router.post('/:id/save-playlist', async (req, res) => {
  try {
    const { type, title } = req.body;
    const result = await huddleService.savePlaylist(req.user, req.params.id, { type, title });
    return res.status(201).json(result);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;

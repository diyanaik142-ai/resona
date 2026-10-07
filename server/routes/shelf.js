import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAccountData, saveAccountData } from '../db/storage.js';
import { normalizeShelf, recordListeningEvent } from '../services/recommendationService.js';
import { ADMIN_PLAYLISTS_FILE } from '../config.js';

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/shelf
 * Retrieve user's library and shelf
 */
router.get('/', async (req, res) => {
  try {
    const shelf = normalizeShelf(await getAccountData(req.user.id, 'shelf.json'));
    await saveAccountData(req.user.id, 'shelf.json', shelf);
    return res.json(shelf);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shelf/like
 * Toggle like status on a track for the authenticated user
 */
router.post('/like', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required' });

    const shelf = normalizeShelf(await getAccountData(req.user.id, 'shelf.json'));

    const isLiked = shelf.likedTrackIds.includes(trackId);
    if (isLiked) {
      shelf.likedTrackIds = shelf.likedTrackIds.filter((id) => id !== trackId);
      shelf.recommendationVersion += 1;
    } else {
      shelf.likedTrackIds.push(trackId);
      shelf.recommendationVersion += 1;
      await saveAccountData(req.user.id, 'shelf.json', shelf);
      await recordListeningEvent(req.user.id, { trackId, type: 'LIKE' });
      const updatedShelf = normalizeShelf(await getAccountData(req.user.id, 'shelf.json'));
      return res.json({
        message: 'Track saved to Liked Songs',
        liked: true,
        likedTrackIds: updatedShelf.likedTrackIds
      });
    }

    await saveAccountData(req.user.id, 'shelf.json', shelf);
    return res.json({
      message: isLiked ? 'Track unliked' : 'Track saved to Liked Songs',
      liked: !isLiked,
      likedTrackIds: shelf.likedTrackIds
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shelf/playlist
 * Create a new user playlist
 */
router.post('/playlist', async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Playlist title is required' });
    }

    const shelf = normalizeShelf(await getAccountData(req.user.id, 'shelf.json'));

    const newPlaylist = {
      id: `pl_${Date.now()}`,
      title: title.trim(),
      description: description || 'Personal playlist',
      songCount: 0,
      coverColor: 'from-teal-500 to-cyan-600',
      trackIds: [],
      createdAt: new Date().toISOString()
    };

    shelf.playlists.unshift(newPlaylist);
    await saveAccountData(req.user.id, 'shelf.json', shelf);

    return res.status(201).json({ message: 'Playlist created', playlist: newPlaylist, shelf });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/shelf/playlist/:id
 * Delete a user playlist
 */
/**
 * POST /api/shelf/playlist/save
 * Toggle a published curated playlist in the authenticated user's Shelf.
 */
router.post('/playlist/save', async (req, res) => {
  try {
    const { playlistId } = req.body || {};
    if (!playlistId) return res.status(400).json({ error: 'playlistId is required' });

    const playlists = await getGlobalData(ADMIN_PLAYLISTS_FILE) || [];
    const source = playlists.find((item) =>
      item?.playlistId === playlistId && (item.status === 'published' || item.status === 'Published')
    );
    if (!source) return res.status(404).json({ error: 'Published playlist not found' });

    const shelf = normalizeShelf(await getAccountData(req.user.id, 'shelf.json'));
    const existingIndex = shelf.playlists.findIndex((item) =>
      item?.sourcePlaylistId === playlistId || item?.id === ('saved_' + playlistId)
    );

    if (existingIndex >= 0) {
      shelf.playlists.splice(existingIndex, 1);
      await saveAccountData(req.user.id, 'shelf.json', shelf);
      return res.json({ saved: false, shelf });
    }

    const savedPlaylist = {
      id: 'saved_' + playlistId,
      sourcePlaylistId: playlistId,
      title: source.name || 'Saved playlist',
      description: source.description || '',
      coverUrl: source.coverUrl || null,
      trackIds: Array.isArray(source.trackItems) ? source.trackItems.map((item) => item?.trackId).filter(Boolean) : [],
      source: 'curated',
      savedAt: new Date().toISOString()
    };
    shelf.playlists.unshift(savedPlaylist);
    await saveAccountData(req.user.id, 'shelf.json', shelf);
    return res.status(201).json({ saved: true, playlist: savedPlaylist, shelf });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/playlist/:id', async (req, res) => {
  try {
    const playlistId = req.params.id;
    const shelf = normalizeShelf(await getAccountData(req.user.id, 'shelf.json'));

    shelf.playlists = shelf.playlists.filter((p) => p.id !== playlistId);
    await saveAccountData(req.user.id, 'shelf.json', shelf);

    return res.json({ message: 'Playlist deleted', shelf });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/shelf/recent
 * Log recently played track
 */
router.post('/recent', async (req, res) => {
  try {
    const { trackId } = req.body;
    if (!trackId) return res.status(400).json({ error: 'trackId is required' });

    const result = await recordListeningEvent(req.user.id, { trackId, type: 'PLAY_STARTED' });
    return res.json({ recentlyPlayed: result.shelf.recentlyPlayed });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

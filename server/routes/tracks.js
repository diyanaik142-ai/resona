import express from 'express';
import { randomUUID } from 'node:crypto';
import { getGlobalData } from '../db/storage.js';
import { CATALOG_FILE } from '../config.js';

import { getPlatformSettings } from '../services/platformSettings.js';

const router = express.Router();

/**
 * GET /api/tracks
 * Returns any uploaded tracks from the catalog.
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    if (settings.catalog?.publicCatalog === false) {
      return res.json([]);
    }

    const sanitizeMediaUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      if (url.includes('/media/')) {
        const parts = url.split('/media/');
        return `/media/${parts[1]}`;
      }
      return url;
    };

    const customCatalog = await getGlobalData(CATALOG_FILE) || [];
    const publishedCustomCatalog = customCatalog
      .filter(t => !t.status || t.status === 'Published')
      .map(t => ({
        ...t,
        audioUrl: sanitizeMediaUrl(t.audioUrl),
        cover: sanitizeMediaUrl(t.cover)
      }));
    res.json(publishedCustomCatalog);
  } catch (error) {
    console.error('Failed to get tracks:', error);
    res.json([]); // Fallback
  }
});

import { ADMIN_PLAYLISTS_FILE } from '../config.js';

router.get('/playlists', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    if (settings.catalog?.publicCatalog === false) {
      return res.json([]);
    }
    const playlists = await getGlobalData(ADMIN_PLAYLISTS_FILE) || [];
    const published = playlists.filter(p => p.status === 'published' || p.status === 'Published');
    res.json(published);
  } catch (error) {
    console.error('Failed to get playlists:', error);
    res.json([]);
  }
});

router.get('/playlists/:id', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    if (settings.catalog?.publicCatalog === false) {
      return res.status(403).json({ error: 'Catalog disabled' });
    }
    
    const playlists = await getGlobalData(ADMIN_PLAYLISTS_FILE) || [];
    const playlist = playlists.find(p => p.playlistId === req.params.id && (p.status === 'published' || p.status === 'Published'));
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
    
    const customCatalog = await getGlobalData(CATALOG_FILE) || [];
    const sanitizeMediaUrl = (url) => {
      if (!url || typeof url !== 'string') return url;
      if (url.includes('/media/')) {
        const parts = url.split('/media/');
        return `/media/${parts[1]}`;
      }
      return url;
    };
    
    // Populate trackItems with actual track data
    const usedPlaylistItemIds = new Set();
    const populatedTrackItems = (Array.isArray(playlist.trackItems) ? playlist.trackItems : []).map((item, order) => {
      if (!item || typeof item !== 'object' || typeof item.trackId !== 'string') return null;
      const track = customCatalog.find(t => t.id === item.trackId);
      if (!track) return null;

      let playlistItemId = item.playlistItemId;
      if (typeof playlistItemId !== 'string' || !playlistItemId || usedPlaylistItemIds.has(playlistItemId)) {
        playlistItemId = `pi_${randomUUID()}`;
      }
      usedPlaylistItemIds.add(playlistItemId);
      return {
        ...item,
        playlistItemId,
        trackId: track.id,
        order,
        track: {
          ...track,
          audioUrl: sanitizeMediaUrl(track.audioUrl),
          cover: sanitizeMediaUrl(track.cover)
        }
      };
    }).filter(Boolean);
    
    res.json({ ...playlist, trackItems: populatedTrackItems });
  } catch (error) {
    console.error('Failed to get playlist:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getAccountData, saveAccountData } from '../db/storage.js';

import { getPlatformSettings } from '../services/platformSettings.js';
import { requireFeature } from '../middleware/entitlements.js';

const router = express.Router();
router.use(requireAuth);
router.use(requireFeature('creator_hub'));

/**
 * GET /api/creator
 * Fetch creator dashboard data for authenticated user
 */
router.get('/', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    if (settings.creator?.enableCreatorHub === false) {
      return res.status(403).json({ error: 'Creator Hub is currently disabled by platform settings.' });
    }

    const storedCreator = (await getAccountData(req.user.id, 'creator.json')) || {};
    const creator = {
      ...storedCreator,
      isCreator: storedCreator.isCreator === true,
      status: storedCreator.status || (storedCreator.isCreator ? 'approved' : 'none'),
      artistName: typeof storedCreator.artistName === 'string' ? storedCreator.artistName : '',
      stats: {
        uploads: 0,
        plays: '0',
        followers: '0',
        ...(storedCreator.stats && typeof storedCreator.stats === 'object' && !Array.isArray(storedCreator.stats)
          ? storedCreator.stats
          : {})
      },
      uploads: Array.isArray(storedCreator.uploads) ? storedCreator.uploads : [],
      songRequests: Array.isArray(storedCreator.songRequests) ? storedCreator.songRequests : []
    };
    return res.json(creator);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/creator/apply
 * Submit a creator application
 */
router.post('/apply', async (req, res) => {
  try {
    const creator = (await getAccountData(req.user.id, 'creator.json')) || {
      isCreator: false,
      status: 'none',
      artistName: '',
      stats: { uploads: 0, plays: '0', followers: '0' },
      uploads: [],
      songRequests: []
    };

    if (creator.status === 'pending') {
      return res.status(400).json({ error: 'Application already pending.' });
    }
    if (creator.status === 'approved' || creator.isCreator) {
      return res.status(400).json({ error: 'Already a creator.' });
    }

    creator.status = 'pending';
    creator.artistName = req.body.artistName || req.user.name || 'Unknown Artist';
    
    // Create global creator application for admin
    const { getGlobalData, saveGlobalData } = await import('../db/storage.js');
    const { CREATORS_FILE } = await import('../config.js');
    const apps = (await getGlobalData(CREATORS_FILE)) || [];
    const newApp = {
      id: `app_${Date.now()}`,
      userId: req.user.id,
      name: req.user.name,
      email: req.user.email || '',
      artistName: creator.artistName,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    apps.push(newApp);
    await saveGlobalData(CREATORS_FILE, apps);

    await saveAccountData(req.user.id, 'creator.json', creator);

    return res.status(200).json(creator);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/creator/upload
 * Publish or draft a new track for this user
 */
router.post('/upload', requireFeature('creator_upload'), async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    if (settings.creator?.allowCreatorUploads === false) {
      return res.status(403).json({ error: 'Creator uploads are currently disabled by platform settings.' });
    }

    const { title, genre, audioFileName, coverUrl } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Track title is required.' });
    }

    if (settings.creator?.requireCoverArt && !coverUrl) {
      return res.status(400).json({ error: 'Cover art is required by platform settings.' });
    }

    const creator = (await getAccountData(req.user.id, 'creator.json')) || {
      isCreator: false,
      status: 'none',
      artistName: 'Artist',
      stats: { uploads: 0, plays: '0', followers: '0' },
      uploads: [],
      songRequests: []
    };

    if (creator.status !== 'approved' && !creator.isCreator) {
      return res.status(403).json({ error: 'You are not an approved creator.' });
    }

    const status = settings.creator?.requirePublishingApproval ? 'Pending' : 'Published';

    const newTrack = {
      id: `usr_trk_${Date.now()}`,
      title: title.trim(),
      genre: genre || 'indie',
      status: status,
      plays: '0 plays',
      date: 'Just now',
      audioFile: audioFileName || 'uploaded_audio.mp3',
      cover: coverUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
      createdAt: new Date().toISOString()
    };

    creator.uploads.unshift(newTrack);
    creator.stats.uploads = (creator.stats.uploads || 0) + 1;
    await saveAccountData(req.user.id, 'creator.json', creator);

    return res.status(201).json({ message: 'Track published successfully to your account', track: newTrack, creator });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/creator/request
 * Submit a song request
 */
router.post('/request', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    if (settings.catalog?.allowSongRecommendations === false) {
      return res.status(403).json({ error: 'Song recommendations are currently disabled by platform settings.' });
    }

    const { songTitle, artist, notes } = req.body;
    if (!songTitle) return res.status(400).json({ error: 'Song title is required.' });

    const creator = (await getAccountData(req.user.id, 'creator.json')) || {
      isCreator: false,
      uploads: [],
      songRequests: []
    };

    const requestItem = {
      id: `req_${Date.now()}`,
      songTitle,
      artist: artist || 'Unknown',
      notes: notes || '',
      status: 'In Review',
      submittedAt: new Date().toISOString()
    };

    creator.songRequests = creator.songRequests || [];
    creator.songRequests.unshift(requestItem);
    await saveAccountData(req.user.id, 'creator.json', creator);

    return res.status(201).json({ message: 'Song request submitted', request: requestItem });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

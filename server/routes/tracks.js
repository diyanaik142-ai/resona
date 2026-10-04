import express from 'express';
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

export default router;

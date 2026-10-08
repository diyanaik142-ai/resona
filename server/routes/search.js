import express from 'express';
import { getGlobalData } from '../db/storage.js';
import { CATALOG_FILE } from '../config.js';
import { getAllRealUsers } from '../services/userService.js';

const router = express.Router();

import { GENRES } from '../../shared/config/genres.js';

async function getFullCatalog() {
  try {
    const customCatalog = await getGlobalData(CATALOG_FILE) || [];
    const publishedCustomCatalog = customCatalog.filter(t => !t.status || t.status === 'Published');
    return publishedCustomCatalog;
  } catch (err) {
    return [];
  }
}

router.get('/', async (req, res) => {
  const { q } = req.query;
  const catalog = await getFullCatalog();
  
  if (!q || !q.trim()) {
    return res.json({ songs: [], artists: [], albums: [], playlists: [], accounts: [] });
  }

  const query = q.toLowerCase().trim().replace(/\s+/g, ' ');
  const exactQuery = q.toLowerCase().trim();

  // Search accounts
  const users = await getAllRealUsers();
  const matchUsers = users.filter(u => {
    if (!u) return false;
    const nameMatch = u.name?.toLowerCase().includes(query);
    const uidMatch = u.uid?.toLowerCase().includes(exactQuery);
    const handleMatch = u.handle?.toLowerCase().includes(exactQuery);
    return nameMatch || uidMatch || handleMatch;
  });

  // Sort users
  matchUsers.sort((a, b) => {
    const aUidExact = (a.uid?.toLowerCase() === exactQuery) || (a.handle?.toLowerCase() === exactQuery);
    const bUidExact = (b.uid?.toLowerCase() === exactQuery) || (b.handle?.toLowerCase() === exactQuery);
    if (aUidExact && !bUidExact) return -1;
    if (!aUidExact && bUidExact) return 1;

    const aNameExact = a.name?.toLowerCase() === query;
    const bNameExact = b.name?.toLowerCase() === query;
    if (aNameExact && !bNameExact) return -1;
    if (!aNameExact && bNameExact) return 1;

    return 0;
  });

  // Simple search logic
  const songs = catalog.filter(t => 
    t.title?.toLowerCase().replace(/\s+/g, ' ').includes(query) || 
    t.artist?.toLowerCase().replace(/\s+/g, ' ').includes(query)
  );
  
  // Extract unique artists
  const artistsMap = new Map();
  catalog.forEach(t => {
    if (t.artist && t.artist.toLowerCase().replace(/\s+/g, ' ').includes(query)) {
      if (!artistsMap.has(t.artist)) {
        artistsMap.set(t.artist, { name: t.artist, cover: t.cover });
      }
    }
  });
  
  // Extract unique albums
  const albumsMap = new Map();
  catalog.forEach(t => {
    if (t.album && t.album.toLowerCase().replace(/\s+/g, ' ').includes(query)) {
      if (!albumsMap.has(t.album)) {
        albumsMap.set(t.album, { title: t.album, artist: t.artist, cover: t.cover });
      }
    }
  });

  res.json({
    songs,
    artists: Array.from(artistsMap.values()),
    albums: Array.from(albumsMap.values()),
    playlists: [],
    accounts: matchUsers
  });
});

router.get('/suggestions', async (req, res) => {
  const { q } = req.query;
  const catalog = await getFullCatalog();
  if (!q) return res.json([]);
  
  const query = q.toLowerCase().trim();
  const suggestions = catalog.filter(t => t.title?.toLowerCase().includes(query) || t.artist?.toLowerCase().includes(query)).slice(0, 5);
  res.json(suggestions);
});

router.get('/genres', async (req, res) => {
  res.json(GENRES);
});

router.get('/genres/:id', async (req, res) => {
  const genre = GENRES.find(g => g.id === req.params.id);
  if (!genre) return res.status(404).json({ error: 'Genre not found' });
  
  const catalog = await getFullCatalog();
  const tracks = catalog.filter(t => t.genre === genre.id);
  
  res.json({ genre, tracks });
});

router.get('/trending', async (req, res) => {
  const catalog = await getFullCatalog();
  // Sort by plays descending
  const trending = [...catalog].sort((a, b) => {
    const playsA = typeof a.plays === 'number' ? a.plays : 0;
    const playsB = typeof b.plays === 'number' ? b.plays : 0;
    return playsB - playsA;
  }).slice(0, 10);
  
  res.json(trending);
});

export default router;

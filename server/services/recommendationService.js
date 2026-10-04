import { CATALOG_FILE, OVERRIDES_FILE, PLANS_FILE, RECOMMENDATION_CACHE_FILE } from '../config.js';
import { getAccountData, getGlobalData, saveAccountData, saveGlobalData } from '../db/storage.js';
import { computeEntitlements, normalizePlans } from './entitlements.js';
import { getGlobalFeatureMap, getPlatformSettings } from './platformSettings.js';
import { getResonaProfile, planName } from './userService.js';

const EVENT_LIMIT = 500;
const RECENT_WINDOW_MS = 1000 * 60 * 60 * 24 * 45;
const CACHE_TTL_MS = 1000 * 60 * 60 * 6;
const MIN_SIGNALS = 2;
const PLAN_FEATURES = {
  recommendations: 'tuned_for_you',
  dailyDose: 'daily_dose',
  activity: 'listening_history'
};

function emptyShelf() {
  return {
    likedTrackIds: [],
    downloadedTrackIds: [],
    playlists: [],
    recentlyPlayed: [],
    listeningEvents: [],
    playStats: {},
    recommendationVersion: 0
  };
}

export function normalizeShelf(shelf = {}) {
  const normalized = { ...emptyShelf(), ...(shelf || {}) };
  normalized.likedTrackIds = Array.isArray(normalized.likedTrackIds) ? normalized.likedTrackIds : [];
  normalized.downloadedTrackIds = Array.isArray(normalized.downloadedTrackIds) ? normalized.downloadedTrackIds : [];
  normalized.playlists = Array.isArray(normalized.playlists) ? normalized.playlists : [];
  normalized.recentlyPlayed = Array.isArray(normalized.recentlyPlayed) ? normalized.recentlyPlayed : [];
  normalized.listeningEvents = Array.isArray(normalized.listeningEvents) ? normalized.listeningEvents : [];
  normalized.playStats = normalized.playStats && typeof normalized.playStats === 'object' ? normalized.playStats : {};
  normalized.recommendationVersion = Number.isFinite(Number(normalized.recommendationVersion)) ? Number(normalized.recommendationVersion) : 0;
  return normalized;
}

async function getPublishedCatalog() {
  const catalog = (await getGlobalData(CATALOG_FILE)) || [];
  return catalog.filter((track) => (!track.status || track.status === 'Published') && !track.deleted);
}

function trackKey(value) {
  return String(value || '').trim().toLowerCase();
}

function getTrackMeta(track) {
  return {
    artist: trackKey(track.artist),
    genre: trackKey(track.genre),
    title: trackKey(track.title)
  };
}

function addScore(map, key, value) {
  if (!key) return;
  map[key] = (map[key] || 0) + value;
}

function recencyWeight(timestamp) {
  const age = Date.now() - new Date(timestamp || 0).getTime();
  if (!Number.isFinite(age) || age < 0) return 1;
  return Math.max(0.25, 1 - Math.min(age, RECENT_WINDOW_MS) / RECENT_WINDOW_MS);
}

async function getEntitlement(userId) {
  const profile = await getResonaProfile(userId);
  const plans = normalizePlans(await getGlobalData(PLANS_FILE));
  const overrides = (await getGlobalData(OVERRIDES_FILE)) || {};
  const planId = profile?.planId || 'resona';
  const plan = plans[planId] || plans.resona;
  const platform = await getPlatformSettings();
  return {
    profile,
    planId,
    planName: planName(planId),
    ...computeEntitlements(plan, overrides[userId], getGlobalFeatureMap(platform))
  };
}

function buildTasteProfile(shelf, catalog) {
  const byId = new Map(catalog.map((track) => [track.id, track]));
  const artists = {};
  const genres = {};
  const tracks = {};
  const skippedTracks = {};
  const events = (shelf.listeningEvents || []).filter((event) => byId.has(event.trackId));

  for (const event of events) {
    const track = byId.get(event.trackId);
    const meta = getTrackMeta(track);
    const recent = recencyWeight(event.timestamp);
    const completedRatio = Number(event.completedRatio || 0);
    let weight = 0;

    if (event.type === 'PLAY_STARTED') weight = 0.4;
    if (event.type === 'PLAY_COMPLETED') weight = completedRatio >= 0.8 ? 3.2 : 1.5;
    if (event.type === 'REPLAY') weight = 2.8;
    if (event.type === 'LIKE') weight = 5;
    if (event.type === 'SAVE') weight = 3.5;
    if (event.type === 'SKIP') weight = -1.6;

    const weighted = weight * recent;
    addScore(tracks, event.trackId, weighted);
    addScore(artists, meta.artist, weighted);
    addScore(genres, meta.genre, weighted);
    if (event.type === 'SKIP') addScore(skippedTracks, event.trackId, Math.abs(weighted));
  }

  for (const likedId of shelf.likedTrackIds || []) {
    const track = byId.get(likedId);
    if (!track) continue;
    const meta = getTrackMeta(track);
    addScore(tracks, likedId, 6);
    addScore(artists, meta.artist, 4);
    addScore(genres, meta.genre, 4);
  }

  for (const playlist of shelf.playlists || []) {
    for (const trackId of playlist.trackIds || []) {
      const track = byId.get(trackId);
      if (!track) continue;
      const meta = getTrackMeta(track);
      addScore(tracks, trackId, 2.5);
      addScore(artists, meta.artist, 1.7);
      addScore(genres, meta.genre, 1.7);
    }
  }

  const positiveSignals = events.filter((event) => ['PLAY_COMPLETED', 'REPLAY', 'LIKE', 'SAVE'].includes(event.type)).length + (shelf.likedTrackIds || []).length;
  return { artists, genres, tracks, skippedTracks, positiveSignals, eventCount: events.length };
}

function reasonFor(track, taste) {
  const meta = getTrackMeta(track);
  if ((taste.tracks[track.id] || 0) >= 6) return 'Familiar favorite';
  if ((taste.artists[meta.artist] || 0) > 0) return `Because you listen to ${track.artist}`;
  if ((taste.genres[meta.genre] || 0) > 0) return `From your ${track.genre || 'recent'} listening`;
  return 'Based on your recent listening';
}

function scoreCatalog(catalog, shelf, taste) {
  const recentSet = new Set((shelf.recentlyPlayed || []).slice(0, 3));
  return catalog.map((track) => {
    const meta = getTrackMeta(track);
    const liked = (shelf.likedTrackIds || []).includes(track.id);
    const baseTrack = taste.tracks[track.id] || 0;
    const artistScore = taste.artists[meta.artist] || 0;
    const genreScore = taste.genres[meta.genre] || 0;
    const skipPenalty = taste.skippedTracks[track.id] || 0;
    const freshness = Math.max(0, 1 - ((Date.now() - new Date(track.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24 * 90)));
    const familiarCap = recentSet.has(track.id) ? 0.55 : 1;
    const score = ((baseTrack * 0.65) + (artistScore * 0.8) + (genreScore * 0.55) + (liked ? 4 : 0) + freshness) * familiarCap - (skipPenalty * 1.2);
    return { ...track, score, reason: reasonFor(track, taste), signals: { artist: artistScore, genre: genreScore, track: baseTrack, skipPenalty } };
  }).filter((track) => track.score > 0.35).sort((a, b) => b.score - a.score);
}

function limitedState(reason = 'insufficient_activity') {
  return {
    personalized: false,
    reason,
    message: 'Listen to a few songs and Resona will start personalizing your mixes.',
    recommendations: [],
    mixes: []
  };
}

function makeMixes(scoredTracks, taste) {
  const seeds = [
    ...Object.entries(taste.artists).map(([key, score]) => ({ type: 'artist', key, score })),
    ...Object.entries(taste.genres).map(([key, score]) => ({ type: 'genre', key, score }))
  ].filter((seed) => seed.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);

  const usedTopTracks = new Set();
  return seeds.map((seed, idx) => {
    const tracks = scoredTracks.filter((track) => {
      const meta = getTrackMeta(track);
      return seed.type === 'artist' ? meta.artist === seed.key : meta.genre === seed.key;
    }).concat(scoredTracks.filter((track) => {
      const meta = getTrackMeta(track);
      return seed.type === 'artist' ? meta.artist !== seed.key && track.signals.genre > 0 : meta.genre !== seed.key && track.signals.artist > 0;
    })).filter((track, pos, arr) => arr.findIndex((entry) => entry.id === track.id) === pos).slice(0, 12);

    if (tracks.length < 2 && scoredTracks.length > 1) return null;
    const top = tracks[0]?.id;
    if (top && usedTopTracks.has(top) && tracks.length > 1) {
      tracks.push(tracks.shift());
    }
    if (tracks[0]) usedTopTracks.add(tracks[0].id);
    const label = seed.type === 'artist'
      ? tracks.find((track) => getTrackMeta(track).artist === seed.key)?.artist || 'Artist'
      : tracks.find((track) => getTrackMeta(track).genre === seed.key)?.genre || 'Genre';

    return {
      id: `daily_dose_${idx + 1}_${seed.type}_${seed.key.replace(/[^a-z0-9_]/g, '_')}`,
      title: `Daily Dose ${idx + 1}`,
      subtitle: seed.type === 'artist' ? `${label} and related sounds` : `${label} sounds you return to`,
      basis: seed.type,
      seed: label,
      refreshedAt: new Date().toISOString(),
      tracks
    };
  }).filter(Boolean);
}

export async function recordListeningEvent(userId, { trackId, type, position = 0, duration = 0, completedRatio = null }) {
  const catalog = await getPublishedCatalog();
  if (!catalog.find((track) => track.id === trackId)) {
    const err = new Error('Track is not available.');
    err.status = 404;
    throw err;
  }

  const shelf = normalizeShelf(await getAccountData(userId, 'shelf.json'));
  const eventType = String(type || '').toUpperCase();
  if (!['PLAY_STARTED', 'PLAY_COMPLETED', 'SKIP', 'REPLAY', 'LIKE', 'SAVE'].includes(eventType)) {
    const err = new Error('Unsupported listening event.');
    err.status = 400;
    throw err;
  }

  const now = new Date().toISOString();
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: eventType,
    trackId,
    position: Number(position) || 0,
    duration: Number(duration) || 0,
    completedRatio: completedRatio === null ? null : Math.max(0, Math.min(1, Number(completedRatio) || 0)),
    timestamp: now
  };

  shelf.listeningEvents = [event, ...shelf.listeningEvents].slice(0, EVENT_LIMIT);
  shelf.recommendationVersion += 1;
  shelf.playStats[trackId] = {
    ...(shelf.playStats[trackId] || {}),
    playStarts: (shelf.playStats[trackId]?.playStarts || 0) + (eventType === 'PLAY_STARTED' ? 1 : 0),
    completions: (shelf.playStats[trackId]?.completions || 0) + (eventType === 'PLAY_COMPLETED' ? 1 : 0),
    skips: (shelf.playStats[trackId]?.skips || 0) + (eventType === 'SKIP' ? 1 : 0),
    replays: (shelf.playStats[trackId]?.replays || 0) + (eventType === 'REPLAY' ? 1 : 0),
    lastEventAt: now
  };

  if (eventType === 'PLAY_STARTED' || eventType === 'PLAY_COMPLETED' || eventType === 'REPLAY') {
    shelf.recentlyPlayed = [trackId, ...shelf.recentlyPlayed.filter((id) => id !== trackId)].slice(0, 50);
  }

  await saveAccountData(userId, 'shelf.json', shelf);
  return { event, shelf };
}

export async function getRecommendations(userId, { limit = 12, force = false } = {}) {
  const entitlements = await getEntitlement(userId);
  if (!entitlements.features?.[PLAN_FEATURES.recommendations]) {
    return { enabled: false, ...limitedState('feature_unavailable'), planId: entitlements.planId, planName: entitlements.planName };
  }

  const catalog = await getPublishedCatalog();
  const shelf = normalizeShelf(await getAccountData(userId, 'shelf.json'));
  const taste = buildTasteProfile(shelf, catalog);
  if (catalog.length < 2 || taste.positiveSignals < MIN_SIGNALS) {
    return { enabled: true, planId: entitlements.planId, planName: entitlements.planName, catalogSize: catalog.length, signals: taste, ...limitedState() };
  }

  const cache = (await getGlobalData(RECOMMENDATION_CACHE_FILE)) || {};
  const cached = cache[userId]?.recommendations;
  const cacheFresh = cached && cached.version === shelf.recommendationVersion && Date.now() - new Date(cached.generatedAt).getTime() < CACHE_TTL_MS;
  if (cacheFresh && !force) return cached.payload;

  const recommendations = scoreCatalog(catalog, shelf, taste).slice(0, Number(limit) || 12);
  const payload = {
    enabled: true,
    personalized: recommendations.length > 0,
    generatedAt: new Date().toISOString(),
    planId: entitlements.planId,
    planName: entitlements.planName,
    catalogSize: catalog.length,
    signals: taste,
    recommendations,
    message: recommendations.length > 0 ? '' : 'Listen to a few songs and Resona will start personalizing your mixes.'
  };
  cache[userId] = { ...(cache[userId] || {}), recommendations: { version: shelf.recommendationVersion, generatedAt: payload.generatedAt, payload } };
  await saveGlobalData(RECOMMENDATION_CACHE_FILE, cache);
  return payload;
}

export async function getDailyDose(userId, { force = false } = {}) {
  const entitlements = await getEntitlement(userId);
  if (!entitlements.features?.[PLAN_FEATURES.dailyDose]) {
    return { enabled: false, ...limitedState('feature_unavailable'), planId: entitlements.planId, planName: entitlements.planName };
  }

  const catalog = await getPublishedCatalog();
  const shelf = normalizeShelf(await getAccountData(userId, 'shelf.json'));
  const taste = buildTasteProfile(shelf, catalog);
  if (catalog.length < 2 || taste.positiveSignals < MIN_SIGNALS) {
    return { enabled: true, planId: entitlements.planId, planName: entitlements.planName, catalogSize: catalog.length, signals: taste, ...limitedState() };
  }

  const cache = (await getGlobalData(RECOMMENDATION_CACHE_FILE)) || {};
  const cached = cache[userId]?.dailyDose;
  const today = new Date().toISOString().slice(0, 10);
  const cacheFresh = cached && cached.date === today && cached.version === shelf.recommendationVersion;
  if (cacheFresh && !force) return cached.payload;

  const scoredTracks = scoreCatalog(catalog, shelf, taste);
  const mixes = makeMixes(scoredTracks, taste);
  const payload = {
    enabled: true,
    personalized: mixes.length > 0,
    generatedAt: new Date().toISOString(),
    refreshDate: today,
    planId: entitlements.planId,
    planName: entitlements.planName,
    catalogSize: catalog.length,
    signals: taste,
    mixes,
    message: mixes.length > 0 ? '' : 'Your Daily Dose is getting ready.'
  };
  cache[userId] = { ...(cache[userId] || {}), dailyDose: { version: shelf.recommendationVersion, date: today, generatedAt: payload.generatedAt, payload } };
  await saveGlobalData(RECOMMENDATION_CACHE_FILE, cache);
  return payload;
}

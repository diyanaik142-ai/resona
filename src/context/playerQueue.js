export function createQueueItem(track, usedIds = new Set(), createId = () => (
  `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
)) {
  if (!track || typeof track !== 'object') return null;
  let queueItemId = track.queueItemId;
  if (!queueItemId || usedIds.has(queueItemId)) {
    do {
      queueItemId = createId();
    } while (usedIds.has(queueItemId));
  }
  usedIds.add(queueItemId);
  return { ...track, queueItemId };
}

export function normalizeQueueItems(items = [], createId) {
  if (!Array.isArray(items)) return [];
  const usedIds = new Set();
  return items
    .filter((track) => track && track.id)
    .map((track) => createQueueItem(track, usedIds, createId));
}

export function reorderQueueItems(currentQueue, nextQueue) {
  const currentIds = currentQueue.map((track) => track.queueItemId);
  const nextIds = Array.isArray(nextQueue) ? nextQueue.map((track) => track?.queueItemId) : [];
  if (
    nextIds.length !== currentIds.length ||
    new Set(nextIds).size !== currentIds.length ||
    currentIds.some((id) => !nextIds.includes(id))
  ) {
    return { changed: false, valid: false };
  }
  return {
    changed: currentIds.some((id, index) => id !== nextIds[index]),
    valid: true,
    queue: nextQueue
  };
}

export function takeNextQueueItem(queue) {
  if (!Array.isArray(queue) || queue.length === 0) return null;
  return { track: queue[0], queue: queue.slice(1) };
}

export function getRepeatAllNext(currentTrack, repeatSequence) {
  if (!currentTrack || !Array.isArray(repeatSequence) || repeatSequence.length === 0) return null;
  const currentIndex = repeatSequence.findIndex((track) => (
    track.queueItemId === currentTrack.queueItemId
  ));
  const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % repeatSequence.length;
  const cycle = [...repeatSequence.slice(nextIndex), ...repeatSequence.slice(0, nextIndex)];
  const [track, ...queue] = cycle;
  return { track, queue };
}

export function getEndedPlaybackAction({ repeatMode, currentTrack, queue, repeatSequence }) {
  if (repeatMode === 'one') return { type: 'repeat-one', track: currentTrack, queue };
  const next = takeNextQueueItem(queue);
  if (next) return { type: 'queue', ...next };
  if (repeatMode === 'all') {
    const repeated = getRepeatAllNext(currentTrack, repeatSequence);
    if (repeated) return { type: 'repeat-all', ...repeated };
  }
  return { type: 'autoplay', queue: [] };
}

export function isAutoplayEnabled(autoplayPreference) {
  return autoplayPreference !== false;
}

export function isPlayableQueueTrack(track) {
  return Boolean(
    track?.id &&
    typeof track.audioUrl === 'string' &&
    track.audioUrl.trim() &&
    track.deleted !== true &&
    (!track.status || track.status.toLowerCase() === 'published') &&
    track.isPublished !== false &&
    track.available !== false &&
    track.isAvailable !== false
  );
}

export function getRecommendationTracks(response) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    throw new TypeError('Invalid recommendation response');
  }
  const tracks = Array.isArray(response.recommendations)
    ? response.recommendations
    : response.tracks;
  if (!Array.isArray(tracks)) {
    throw new TypeError('Recommendation response did not contain a tracks array');
  }
  return response.enabled === false ? [] : tracks;
}

function relatednessScore(seed, candidate) {
  const values = (track, keys) => keys.flatMap((key) => {
    const value = track?.[key];
    return (Array.isArray(value) ? value : [value])
      .filter(Boolean)
      .map((entry) => String(entry).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  });
  const matches = (keys) => {
    const seedValues = new Set(values(seed, keys));
    return values(candidate, keys).some((value) => seedValues.has(value));
  };

  return (
    (matches(['artist', 'artists', 'relatedArtists']) ? 100 : 0) +
    (matches(['subgenre', 'subgenreId', 'subgenres']) ? 55 : 0) +
    (matches(['genre', 'genreId', 'genres']) ? 35 : 0) +
    (matches(['language', 'languages']) ? 25 : 0) +
    (matches(['mood', 'moods']) ? 12 : 0) +
    (matches(['style', 'styles']) ? 10 : 0)
  );
}

export function selectAutoplayTracks({
  recommendationResponse,
  catalog,
  endedTrack,
  excludedIds = [],
  allowStandaloneRecommendations = false
}) {
  const availableCatalog = Array.isArray(catalog) ? catalog.filter(isPlayableQueueTrack) : [];
  const catalogById = new Map(availableCatalog.map((track) => [String(track.id), track]));
  const recommendationTracks = recommendationResponse
    ? getRecommendationTracks(recommendationResponse)
    : [];
  const recommended = recommendationTracks
    .map((track) => {
      const catalogTrack = catalogById.get(String(track?.id));
      if (catalogTrack) return catalogTrack;
      return allowStandaloneRecommendations && isPlayableQueueTrack(track) ? track : null;
    })
    .filter(Boolean);
  const catalogFallback = availableCatalog
    .filter((track) => String(track.id) !== String(endedTrack?.id))
    .sort((left, right) => relatednessScore(endedTrack, right) - relatednessScore(endedTrack, left));

  const excluded = new Set([String(endedTrack?.id), ...excludedIds.map(String)]);
  const uniqueCandidates = (candidates) => [...new Map(
    candidates.map((track) => [String(track.id), track])
  ).values()];
  const isEligible = (track) => !excluded.has(String(track.id));
  const recommendedCandidates = uniqueCandidates(recommended).filter(isEligible);
  const catalogCandidates = uniqueCandidates(catalogFallback).filter(isEligible);
  return uniqueCandidates([...recommendedCandidates, ...catalogCandidates]).slice(0, 20);
}

export async function loadAutoplayCandidates({
  fetchRecommendations,
  fetchCatalog,
  fallbackCatalog = [],
  endedTrack,
  excludedIds = []
}) {
  let recommendationResponse = null;
  let recommendationError = null;
  try {
    recommendationResponse = await fetchRecommendations();
    getRecommendationTracks(recommendationResponse);
  } catch (error) {
    recommendationError = error;
    recommendationResponse = null;
  }

  let catalog = fallbackCatalog;
  let catalogError = null;
  try {
    const result = await fetchCatalog();
    catalog = Array.isArray(result) ? result : result?.tracks;
    if (!Array.isArray(catalog)) {
      throw new TypeError('Catalog response did not contain a tracks array');
    }
  } catch (error) {
    catalogError = error;
  }

  return {
    candidates: selectAutoplayTracks({
      recommendationResponse,
      catalog,
      endedTrack,
      excludedIds,
      allowStandaloneRecommendations: Boolean(catalogError)
    }),
    recommendationError,
    catalogError,
    publishedCatalogCount: Array.isArray(catalog) ? catalog.filter(isPlayableQueueTrack).length : 0
  };
}

export async function tryAutoplayCandidates(candidates, canContinue, playTrack) {
  const failedIds = [];
  for (let index = 0; index < candidates.length; index += 1) {
    if (!canContinue()) return { track: null, index: -1, failedIds, aborted: true };
    const track = candidates[index];
    if (await playTrack(track)) return { track, index, failedIds, aborted: false };
    failedIds.push(String(track.id));
  }
  return { track: null, index: -1, failedIds, aborted: false };
}

export function handleAudioEnded(audio, repeatOne, playNext, onRepeatError) {
  if (repeatOne) {
    audio.currentTime = 0;
    audio.play().catch(onRepeatError);
    return;
  }
  playNext?.(true);
}

export function runEndedTransition(lock, transition) {
  if (lock.current) return Promise.resolve(false);
  lock.current = true;
  return Promise.resolve()
    .then(transition)
    .finally(() => {
      lock.current = false;
    });
}

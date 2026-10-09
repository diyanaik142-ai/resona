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

export function isPlayableQueueTrack(track) {
  return Boolean(
    track?.id &&
    typeof track.audioUrl === 'string' &&
    track.audioUrl.trim() &&
    track.deleted !== true &&
    (!track.status || track.status === 'Published') &&
    track.isPublished !== false &&
    track.available !== false &&
    track.isAvailable !== false
  );
}

export function selectAutoplayTracks({
  recommendationResponse,
  catalog,
  endedTrack,
  excludedIds = []
}) {
  if (recommendationResponse?.enabled === false) return [];

  const availableCatalog = Array.isArray(catalog) ? catalog.filter(isPlayableQueueTrack) : [];
  const catalogById = new Map(availableCatalog.map((track) => [String(track.id), track]));
  const recommended = Array.isArray(recommendationResponse?.recommendations)
    ? recommendationResponse.recommendations
      .map((track) => catalogById.get(String(track?.id)))
      .filter(Boolean)
    : [];
  const relatedCatalog = () => {
    const genreKeys = new Set([
      endedTrack?.genre,
      ...(Array.isArray(endedTrack?.genres) ? endedTrack.genres : []),
      ...(Array.isArray(endedTrack?.subgenres) ? endedTrack.subgenres : [])
    ].filter(Boolean).map((value) => String(value).toLowerCase()));
    return availableCatalog
      .filter((track) => {
        if (String(track.id) === String(endedTrack?.id)) return false;
        const trackGenres = [
          track.genre,
          ...(Array.isArray(track.genres) ? track.genres : []),
          ...(Array.isArray(track.subgenres) ? track.subgenres : [])
        ].filter(Boolean).map((value) => String(value).toLowerCase());
        return track.artist === endedTrack?.artist ||
          trackGenres.some((genre) => genreKeys.has(genre));
      })
      .sort((left, right) => (
        Number(left.artist === endedTrack?.artist) - Number(right.artist === endedTrack?.artist)
      ));
  };

  const excluded = new Set([String(endedTrack?.id), ...excludedIds.map(String)]);
  const uniqueCandidates = (candidates) => [...new Map(
    candidates.map((track) => [String(track.id), track])
  ).values()];
  let filtered = uniqueCandidates(recommended).filter((track) => !excluded.has(String(track.id)));
  if (filtered.length === 0) {
    filtered = uniqueCandidates(relatedCatalog()).filter((track) => !excluded.has(String(track.id)));
  }
  if (filtered.some((track) => track.artist !== endedTrack?.artist)) {
    filtered = filtered.filter((track) => track.artist !== endedTrack?.artist);
  }
  return filtered.slice(0, 10);
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

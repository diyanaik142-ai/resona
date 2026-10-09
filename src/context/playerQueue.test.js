import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createQueueItem,
  handleAudioEnded,
  getEndedPlaybackAction,
  getRecommendationTracks,
  isAutoplayEnabled,
  isPlayableQueueTrack,
  loadAutoplayCandidates,
  normalizeQueueItems,
  reorderQueueItems,
  selectAutoplayTracks,
  takeNextQueueItem,
  tryAutoplayCandidates,
  runEndedTransition
} from './playerQueue.js';

const makeTrack = (id, overrides = {}) => ({
  id,
  title: `Track ${id}`,
  artist: `Artist ${id}`,
  genre: 'ambient',
  audioUrl: `/audio/${id}.wav`,
  ...overrides
});

test('duplicate songs remain separate queue items with stable unique identities', () => {
  let nextId = 0;
  const duplicate = makeTrack('same');
  const queue = normalizeQueueItems([duplicate, duplicate], () => `queue-${++nextId}`);

  assert.equal(queue.length, 2);
  assert.equal(queue[0].id, queue[1].id);
  assert.notEqual(queue[0].queueItemId, queue[1].queueItemId);
  assert.equal(createQueueItem(duplicate, new Set([queue[0].queueItemId]), () => 'queue-3').queueItemId, 'queue-3');
});

test('reordering validates queue identity and next-track consumption preserves exact order', () => {
  const queue = normalizeQueueItems([makeTrack('a'), makeTrack('b'), makeTrack('c')]);
  const reordered = [queue[2], queue[0], queue[1]];
  const result = reorderQueueItems(queue, reordered);

  assert.equal(result.valid, true);
  assert.equal(result.changed, true);
  assert.deepEqual(result.queue.map((item) => item.id), ['c', 'a', 'b']);
  assert.equal(reorderQueueItems(queue, [queue[0], queue[0], queue[2]]).valid, false);
  const next = takeNextQueueItem(result.queue);
  assert.deepEqual(next, {
    track: queue[2],
    queue: [queue[0], queue[1]]
  });
  assert.equal(getEndedPlaybackAction({
    repeatMode: 'off',
    currentTrack: queue[0],
    queue: result.queue,
    repeatSequence: queue
  }).track, queue[2]);
  assert.deepEqual(next.queue.map((item) => item.id), ['a', 'b']);
});

test('end transitions implement repeat-one, queue priority, repeat-all and repeat-off', () => {
  const [current, first, second] = normalizeQueueItems([
    makeTrack('current'), makeTrack('first'), makeTrack('second')
  ]);
  const sequence = [current, first, second];

  const repeatOne = getEndedPlaybackAction({
    repeatMode: 'one', currentTrack: current, queue: [first], repeatSequence: sequence
  });
  assert.equal(repeatOne.type, 'repeat-one');
  assert.equal(repeatOne.track, current);
  assert.deepEqual(repeatOne.queue, [first]);

  const repeatAllWithQueue = getEndedPlaybackAction({
    repeatMode: 'all', currentTrack: current, queue: [first, second], repeatSequence: sequence
  });
  assert.equal(repeatAllWithQueue.type, 'queue');
  assert.equal(repeatAllWithQueue.track, first);
  assert.deepEqual(repeatAllWithQueue.queue, [second]);

  const repeatAllAtEnd = getEndedPlaybackAction({
    repeatMode: 'all', currentTrack: second, queue: [], repeatSequence: sequence
  });
  assert.equal(repeatAllAtEnd.type, 'repeat-all');
  assert.equal(repeatAllAtEnd.track, current);
  assert.deepEqual(repeatAllAtEnd.queue, [first, second]);

  const repeatOff = getEndedPlaybackAction({
    repeatMode: 'off', currentTrack: second, queue: [], repeatSequence: sequence
  });
  assert.equal(repeatOff.type, 'autoplay');
  assert.deepEqual(repeatOff.queue, []);
});

test('an ended media event dispatches repeat-one, reordered queue, repeat-all and repeat-off behavior', async () => {
  const makeAudio = () => {
    const audio = new EventTarget();
    audio.currentTime = 17;
    audio.playCalls = 0;
    audio.play = () => {
      audio.playCalls += 1;
      return Promise.resolve();
    };
    return audio;
  };
  const [current, first, second] = normalizeQueueItems([
    makeTrack('current'), makeTrack('first'), makeTrack('second')
  ]);

  const repeatOneAudio = makeAudio();
  repeatOneAudio.addEventListener('ended', () => (
    handleAudioEnded(repeatOneAudio, true, () => assert.fail('repeat-one must not advance'), assert.fail)
  ));
  repeatOneAudio.dispatchEvent(new Event('ended'));
  await Promise.resolve();
  assert.equal(repeatOneAudio.currentTime, 0);
  assert.equal(repeatOneAudio.playCalls, 1);

  for (const { mode, active, queue, expectedType, expectedTrackId } of [
    { mode: 'off', active: current, queue: [second, first], expectedType: 'queue', expectedTrackId: 'second' },
    { mode: 'all', active: second, queue: [], expectedType: 'repeat-all', expectedTrackId: 'current' },
    { mode: 'off', active: second, queue: [], expectedType: 'autoplay', expectedTrackId: undefined }
  ]) {
    const audio = makeAudio();
    let action;
    audio.addEventListener('ended', () => handleAudioEnded(audio, false, () => {
      action = getEndedPlaybackAction({
        repeatMode: mode,
        currentTrack: active,
        queue,
        repeatSequence: [current, first, second]
      });
    }));
    audio.dispatchEvent(new Event('ended'));
    assert.equal(action.type, expectedType);
    assert.equal(action.track?.id, expectedTrackId);
  }
});

test('autoplay accepts the production recommendations schema and only returns playable catalog tracks', () => {
  const current = makeTrack('current');
  const valid = makeTrack('valid');
  const catalog = [current, valid, makeTrack('no-audio', { audioUrl: '' }), makeTrack('unavailable', { available: false })];
  const result = selectAutoplayTracks({
    recommendationResponse: {
      enabled: true,
      recommendations: [
        { id: 'valid' },
        { id: 'valid' },
        { id: 'no-audio' },
        makeTrack('outside-catalog')
      ]
    },
    catalog,
    endedTrack: current
  });

  assert.deepEqual(result.map((track) => track.id), ['valid']);
  assert.ok(result.every(isPlayableQueueTrack));
});

test('autoplay accepts the backend tracks schema and falls back across the published catalog', () => {
  const current = makeTrack('current', { genre: undefined });
  const recommended = makeTrack('recommended', { artist: 'Another Artist', genreId: 'pop' });
  const unrelatedCatalogTrack = makeTrack('catalog-fallback', { artist: 'Catalog Artist', genreId: 'rock' });
  const unpublished = makeTrack('unpublished', { status: 'Draft' });
  const response = { enabled: true, tracks: [recommended] };

  assert.deepEqual(getRecommendationTracks(response), [recommended]);
  assert.deepEqual(
    selectAutoplayTracks({
      recommendationResponse: response,
      catalog: [current, recommended, unrelatedCatalogTrack, unpublished],
      endedTrack: current
    }).map((track) => track.id),
    ['recommended', 'catalog-fallback']
  );
});

test('empty or failed recommendations fall back to related catalog tracks without replaying excluded IDs', () => {
  const current = makeTrack('current', { artist: 'Current Artist', genre: 'ambient' });
  const related = makeTrack('related', { artist: 'Other Artist', genre: 'ambient' });
  const sameArtist = makeTrack('same-artist', { artist: 'Current Artist', genre: 'ambient' });
  const catalog = [current, related, sameArtist];

  assert.deepEqual(selectAutoplayTracks({
    recommendationResponse: { enabled: true, recommendations: [] },
    catalog,
    endedTrack: current
  }).map((track) => track.id), ['related', 'same-artist']);
  assert.deepEqual(selectAutoplayTracks({
    recommendationResponse: undefined,
    catalog,
    endedTrack: current,
    excludedIds: ['related', 'same-artist']
  }), []);
  assert.deepEqual(selectAutoplayTracks({
    recommendationResponse: { enabled: false, recommendations: [related] },
    catalog,
    endedTrack: current
  }).map((track) => track.id), ['related', 'same-artist']);
});

test('failed or unavailable tracks are rejected before queue success can be reported', () => {
  assert.equal(isPlayableQueueTrack(makeTrack('valid')), true);
  assert.equal(isPlayableQueueTrack(makeTrack('missing-audio', { audioUrl: null })), false);
  assert.equal(isPlayableQueueTrack(makeTrack('unavailable', { isAvailable: false })), false);
  assert.equal(isPlayableQueueTrack(makeTrack('deleted', { deleted: true })), false);
});

test('autoplay tries later candidates after failures and stops after one bounded pass', async () => {
  const candidates = [makeTrack('broken-a'), makeTrack('broken-b'), makeTrack('playable')];
  const attempts = [];
  const result = await tryAutoplayCandidates(
    candidates,
    () => true,
    async (track) => {
      attempts.push(track.id);
      return track.id === 'playable';
    }
  );

  assert.deepEqual(attempts, ['broken-a', 'broken-b', 'playable']);
  assert.equal(result.track, candidates[2]);
  assert.deepEqual(result.failedIds, ['broken-a', 'broken-b']);

  let failedAttemptCount = 0;
  const allFailed = await tryAutoplayCandidates(
    candidates,
    () => true,
    async () => {
      failedAttemptCount += 1;
      return false;
    }
  );
  assert.equal(failedAttemptCount, candidates.length);
  assert.equal(allFailed.track, null);
  assert.deepEqual(allFailed.failedIds, candidates.map((track) => track.id));
});

test('ended transitions suppress concurrent work and release the guard after completion or failure', async () => {
  const lock = { current: false };
  let resolveTransition;
  let calls = 0;
  const transition = () => {
    calls += 1;
    return new Promise((resolve) => {
      resolveTransition = resolve;
    });
  };

  const inFlight = runEndedTransition(lock, transition);
  const duplicate = await runEndedTransition(lock, transition);
  assert.equal(duplicate, false);
  assert.equal(calls, 1);
  assert.equal(lock.current, true);
  resolveTransition('played');
  assert.equal(await inFlight, 'played');
  assert.equal(lock.current, false);

  await assert.rejects(runEndedTransition(lock, async () => {
    throw new Error('transition failed');
  }), /transition failed/);
  assert.equal(lock.current, false);
  assert.equal(await runEndedTransition(lock, async () => 'retry'), 'retry');
});

test('empty-queue ended event fetches a playable recommendation and starts it', async () => {
  const [current] = normalizeQueueItems([makeTrack('current')]);
  const recommended = makeTrack('recommended', { artist: 'Another Artist' });
  const audio = new EventTarget();
  const lock = { current: false };
  let activeTrack = current;
  let queue = [];
  let recommendationCalls = 0;
  let isPlaying = false;
  let transitionPromise;

  audio.addEventListener('ended', () => {
    transitionPromise = runEndedTransition(lock, async () => {
      const action = getEndedPlaybackAction({
        repeatMode: 'off',
        currentTrack: activeTrack,
        queue,
        repeatSequence: [current]
      });
      assert.equal(action.type, 'autoplay');
      recommendationCalls += 1;
      const response = { enabled: true, recommendations: [recommended] };
      const candidates = selectAutoplayTracks({
        recommendationResponse: response,
        catalog: [current, recommended],
        endedTrack: current
      });
      const attempt = await tryAutoplayCandidates(
        candidates,
        () => true,
        async (track) => {
          activeTrack = track;
          isPlaying = true;
          return true;
        }
      );
      assert.equal(attempt.track, recommended);
    });
  });

  audio.dispatchEvent(new Event('ended'));
  await transitionPromise;
  assert.equal(recommendationCalls, 1);
  assert.equal(activeTrack.id, 'recommended');
  assert.deepEqual(queue, []);
  assert.equal(isPlaying, true);
});

test('recommendation API errors retain diagnostics and use published catalog fallback', async () => {
  const current = makeTrack('current');
  const fallback = makeTrack('fallback', { artist: 'Another Artist', genre: undefined });
  const result = await loadAutoplayCandidates({
    fetchRecommendations: async () => {
      const error = new Error('Recommendation request failed with HTTP 401');
      error.status = 401;
      throw error;
    },
    fetchCatalog: async () => ({ tracks: [current, fallback] }),
    endedTrack: current
  });

  assert.equal(result.recommendationError.status, 401);
  assert.equal(result.catalogError, null);
  assert.deepEqual(result.candidates.map((track) => track.id), ['fallback']);
});

test('complete playable recommendations remain usable when catalog refresh fails', async () => {
  const current = makeTrack('current');
  const recommendation = makeTrack('recommended');
  const result = await loadAutoplayCandidates({
    fetchRecommendations: async () => ({
      enabled: true,
      recommendations: [recommendation]
    }),
    fetchCatalog: async () => {
      throw new Error('catalog unavailable');
    },
    endedTrack: current
  });

  assert.ok(result.catalogError);
  assert.deepEqual(result.candidates, [recommendation]);
});

test('autoplay disabled prevents automatic transition and recommendation requests', async () => {
  let recommendationRequests = 0;
  const autoplayPreference = false;
  assert.equal(isAutoplayEnabled(autoplayPreference), false);
  assert.equal(isAutoplayEnabled(true), true);
  if (isAutoplayEnabled(autoplayPreference)) {
    recommendationRequests += 1;
  }
  assert.equal(recommendationRequests, 0);
});

test('no valid catalog candidates is distinct from a failed recommendation or catalog request', async () => {
  const current = makeTrack('current');
  const empty = await loadAutoplayCandidates({
    fetchRecommendations: async () => ({ enabled: true, recommendations: [] }),
    fetchCatalog: async () => ({ tracks: [current, makeTrack('draft', { status: 'Draft' })] }),
    endedTrack: current
  });
  assert.deepEqual(empty.candidates, []);
  assert.equal(empty.recommendationError, null);
  assert.equal(empty.catalogError, null);
  assert.equal(empty.publishedCatalogCount, 1);

  const unavailable = await loadAutoplayCandidates({
    fetchRecommendations: async () => ({ enabled: true, recommendations: [] }),
    fetchCatalog: async () => { throw new Error('catalog offline'); },
    fallbackCatalog: [],
    endedTrack: current
  });
  assert.deepEqual(unavailable.candidates, []);
  assert.equal(unavailable.catalogError.message, 'catalog offline');
});

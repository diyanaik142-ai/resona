import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createQueueItem,
  handleAudioEnded,
  getEndedPlaybackAction,
  isPlayableQueueTrack,
  normalizeQueueItems,
  reorderQueueItems,
  selectAutoplayTracks,
  takeNextQueueItem,
  tryAutoplayCandidates
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

test('empty or failed recommendations fall back to related catalog tracks without replaying excluded IDs', () => {
  const current = makeTrack('current', { artist: 'Current Artist', genre: 'ambient' });
  const related = makeTrack('related', { artist: 'Other Artist', genre: 'ambient' });
  const sameArtist = makeTrack('same-artist', { artist: 'Current Artist', genre: 'ambient' });
  const catalog = [current, related, sameArtist];

  assert.deepEqual(selectAutoplayTracks({
    recommendationResponse: { enabled: true, recommendations: [] },
    catalog,
    endedTrack: current
  }).map((track) => track.id), ['related']);
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
  }), []);
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

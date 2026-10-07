import assert from 'node:assert/strict';
import test from 'node:test';
import { UserStatusTracker } from './userStatusTracker.js';

test('listening activity is exposed only while its heartbeat is current', async () => {
  const tracker = new UserStatusTracker(15);
  tracker.setListeningActivity('user-1', {
    id: 'track-1',
    title: 'Real Track',
    artist: 'Real Artist'
  }, true);

  assert.deepEqual(
    (({ trackId, title, artist }) => ({ trackId, title, artist }))(tracker.getListeningActivity('user-1')),
    { trackId: 'track-1', title: 'Real Track', artist: 'Real Artist' }
  );

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(tracker.getListeningActivity('user-1'), null);
});

test('paused playback clears listening activity immediately', () => {
  const tracker = new UserStatusTracker();
  tracker.setListeningActivity('user-1', { id: 'track-1', title: 'Real Track' }, true);
  tracker.setListeningActivity('user-1', null, false);

  assert.equal(tracker.getListeningActivity('user-1'), null);
});

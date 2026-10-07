import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlaylistItems, PlaylistInputError } from './adminPlaylistItems.js';

const catalogTrackIds = new Set(['tu', 'tum-tum']);

test('normalizes unique catalog tracks into ordered playlist items', () => {
  const items = normalizePlaylistItems([
    { trackId: 'tu', playlistItemId: 'item-1' },
    { trackId: 'tum-tum', playlistItemId: 'item-2' }
  ], catalogTrackIds);

  assert.deepEqual(items.map(({ trackId, order }) => [trackId, order]), [
    ['tu', 0], ['tum-tum', 1]
  ]);
  assert.equal(new Set(items.map((item) => item.playlistItemId)).size, 2);
});

test('generates an occurrence ID for every item without one', () => {
  const items = normalizePlaylistItems([{ trackId: 'tu' }, { trackId: 'tum-tum' }], catalogTrackIds);

  assert.notEqual(items[0].playlistItemId, items[1].playlistItemId);
  assert.deepEqual(items.map((item) => item.order), [0, 1]);
});

test('rejects duplicate track IDs within a playlist', () => {
  assert.throws(
    () => normalizePlaylistItems([
      { trackId: 'tu', playlistItemId: 'item-1' },
      { trackId: 'tu', playlistItemId: 'item-2' }
    ], catalogTrackIds),
    (error) => error instanceof PlaylistInputError && error.statusCode === 400
  );
});

test('allows the same catalog track in separate playlists', () => {
  const firstPlaylist = normalizePlaylistItems([{ trackId: 'tu' }], catalogTrackIds);
  const secondPlaylist = normalizePlaylistItems([{ trackId: 'tu' }], catalogTrackIds);

  assert.equal(firstPlaylist[0].trackId, secondPlaylist[0].trackId);
  assert.notEqual(firstPlaylist[0].playlistItemId, secondPlaylist[0].playlistItemId);
});

test('rejects malformed items and unknown catalog tracks as client input errors', () => {
  assert.throws(() => normalizePlaylistItems('[', catalogTrackIds), PlaylistInputError);
  assert.throws(() => normalizePlaylistItems([{ trackId: 'missing' }], catalogTrackIds), PlaylistInputError);
  assert.throws(() => normalizePlaylistItems([{ trackId: 'tu', playlistItemId: 'same' }, { trackId: 'tum-tum', playlistItemId: 'same' }], catalogTrackIds), PlaylistInputError);
});

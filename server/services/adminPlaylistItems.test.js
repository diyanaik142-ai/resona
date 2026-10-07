import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlaylistItems, PlaylistInputError } from './adminPlaylistItems.js';

const catalogTrackIds = new Set(['tu', 'tum-tum']);

test('normalizes duplicate catalog occurrences into distinct ordered playlist items', () => {
  const items = normalizePlaylistItems([
    { trackId: 'tu', playlistItemId: 'item-1' },
    { trackId: 'tum-tum', playlistItemId: 'item-2' },
    { trackId: 'tu', playlistItemId: 'item-3' },
    { trackId: 'tum-tum', playlistItemId: 'item-4' },
    { trackId: 'tu', playlistItemId: 'item-5' }
  ], catalogTrackIds);

  assert.deepEqual(items.map(({ trackId, order }) => [trackId, order]), [
    ['tu', 0], ['tum-tum', 1], ['tu', 2], ['tum-tum', 3], ['tu', 4]
  ]);
  assert.equal(new Set(items.map((item) => item.playlistItemId)).size, 5);
});

test('generates a separate occurrence ID for every item without one', () => {
  const items = normalizePlaylistItems([{ trackId: 'tu' }, { trackId: 'tu' }], catalogTrackIds);

  assert.notEqual(items[0].playlistItemId, items[1].playlistItemId);
  assert.deepEqual(items.map((item) => item.order), [0, 1]);
});

test('rejects malformed items and unknown catalog tracks as client input errors', () => {
  assert.throws(() => normalizePlaylistItems('[', catalogTrackIds), PlaylistInputError);
  assert.throws(() => normalizePlaylistItems([{ trackId: 'missing' }], catalogTrackIds), PlaylistInputError);
  assert.throws(() => normalizePlaylistItems([{ trackId: 'tu', playlistItemId: 'same' }, { trackId: 'tu', playlistItemId: 'same' }], catalogTrackIds), PlaylistInputError);
});

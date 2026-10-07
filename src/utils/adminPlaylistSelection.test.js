import assert from 'node:assert/strict';
import test from 'node:test';
import { addCatalogTrackToPlaylist, removePlaylistItem } from './adminPlaylistSelection.js';

const tu = { id: 'tu', title: 'Tu' };
const tumTum = { id: 'tum-tum', title: 'Tum Tum' };
const createPlaylistItemId = (() => {
  let id = 0;
  return () => `item-${++id}`;
})();

test('adds one catalog track and ignores another add for the same track', () => {
  const oneTrack = addCatalogTrackToPlaylist([], tu, createPlaylistItemId);
  const duplicate = addCatalogTrackToPlaylist(oneTrack, tu, createPlaylistItemId);

  assert.equal(oneTrack.length, 1);
  assert.strictEqual(duplicate, oneTrack);
  assert.equal(duplicate[0].trackId, 'tu');
});

test('removing a track makes it available to add again', () => {
  const added = addCatalogTrackToPlaylist([], tu, createPlaylistItemId);
  const removed = removePlaylistItem(added, added[0].playlistItemId);
  const addedAgain = addCatalogTrackToPlaylist(removed, tu, createPlaylistItemId);

  assert.deepEqual(removed, []);
  assert.equal(addedAgain.length, 1);
  assert.notEqual(addedAgain[0].playlistItemId, added[0].playlistItemId);
});

test('allows the same track in a separate playlist', () => {
  const firstPlaylist = addCatalogTrackToPlaylist([], tu, createPlaylistItemId);
  const secondPlaylist = addCatalogTrackToPlaylist([], tu, createPlaylistItemId);

  assert.equal(firstPlaylist[0].trackId, secondPlaylist[0].trackId);
  assert.notEqual(firstPlaylist[0].playlistItemId, secondPlaylist[0].playlistItemId);
});

test('adds multiple different catalog songs to the same playlist', () => {
  const playlist = addCatalogTrackToPlaylist(
    addCatalogTrackToPlaylist([], tu, createPlaylistItemId),
    tumTum,
    createPlaylistItemId
  );

  assert.deepEqual(playlist.map(item => item.trackId), ['tu', 'tum-tum']);
});

export function addCatalogTrackToPlaylist(items, track, createPlaylistItemId) {
  if (items.some(item => item.trackId === track.id)) return items;
  return [...items, {
    playlistItemId: createPlaylistItemId(),
    trackId: track.id,
    track
  }];
}

export function removePlaylistItem(items, playlistItemId) {
  return items.filter(item => item.playlistItemId !== playlistItemId);
}

import { randomUUID } from 'node:crypto';

export class PlaylistInputError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PlaylistInputError';
    this.statusCode = 400;
  }
}

export function normalizePlaylistItems(rawItems, catalogTrackIds) {
  let items = rawItems;
  if (items === undefined || items === null || items === '') items = [];
  if (typeof items === 'string') {
    try {
      items = JSON.parse(items);
    } catch {
      throw new PlaylistInputError('trackItems must contain valid JSON.');
    }
  }
  if (!Array.isArray(items)) {
    throw new PlaylistInputError('trackItems must be an array.');
  }

  const playlistItemIds = new Set();
  return items.map((item, order) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new PlaylistInputError(`Playlist item ${order + 1} is invalid.`);
    }

    const trackId = typeof item.trackId === 'string' ? item.trackId.trim() : '';
    if (!trackId) {
      throw new PlaylistInputError(`Playlist item ${order + 1} must include a trackId.`);
    }
    if (!catalogTrackIds.has(trackId)) {
      throw new PlaylistInputError(`Playlist item ${order + 1} references an unknown catalog track.`);
    }

    const playlistItemId = typeof item.playlistItemId === 'string' && item.playlistItemId.trim()
      ? item.playlistItemId.trim()
      : `pi_${randomUUID()}`;
    if (playlistItemIds.has(playlistItemId)) {
      throw new PlaylistInputError(`Playlist item ID "${playlistItemId}" is duplicated.`);
    }
    playlistItemIds.add(playlistItemId);

    return { playlistItemId, trackId, order };
  });
}

import { usePlayer } from '../../context/PlayerContext';
import React, { useState } from 'react';
import { Library, Plus, Heart, Music, Disc, Folder, Search, Play } from 'lucide-react';
import Avatar from '../Avatar';

import { resolveMediaUrl } from '../../services/api';
export default function MobileShelfView({
  shelf,
  catalog = [],
  
  onOpenTrackActions,
  onNavigate
}) {
  const {
    currentTrack, isPlaying, currentTime, duration, volume, isMuted, isShuffle, isLoop,
    queue: playQueue,
    playTrack: onPlayTrack,
    playTrack: handlePlayTrack,
    togglePlay: onTogglePlay,
    togglePlay: handleTogglePlay,
    playNext: onNextTrack,
    playPrevious: onPrevTrack,
    seekTo: onSeek,
    setVolume: onVolumeChange,
    toggleMute: onToggleMute,
    toggleShuffle: onToggleShuffle,
    toggleLoop: onToggleLoop,
    addToQueue: onAddToQueue,
    removeFromQueue: onRemoveFromQueue,
    setQueue: onReorderQueue,
    setQueue
  } = usePlayer();
  const onClearQueue = () => setQueue([]);

  const [activeSegment, setActiveSegment] = useState('Playlists'); // Playlists | Liked | Artists
  const [playlistSearch, setPlaylistSearch] = useState('');

  const playlists = shelf?.playlists || [];
  const likedTrackIds = shelf?.likedTrackIds || [];
  const likedTracks = catalog.filter((t) => likedTrackIds.includes(t.id));

  // Extract unique artists from catalog
  const uniqueArtists = Array.from(
    new Set(catalog.map((t) => t.artist).filter(Boolean))
  ).map((artistName) => {
    const artistTracks = catalog.filter((t) => t.artist === artistName);
    return {
      name: artistName,
      trackCount: artistTracks.length,
      cover: artistTracks[0]?.cover
    };
  });

  return (
    <div className="space-y-4 pb-6 pt-2 px-4 w-full max-w-full overflow-hidden">
      {/* Segmented Navigation Chips */}
      <div className="w-full max-w-full flex gap-2 overflow-x-auto pb-1 no-scrollbar overscroll-x-contain">
        {['Playlists', 'Liked Songs', 'Artists'].map((seg) => (
          <button
            key={seg}
            onClick={() => setActiveSegment(seg)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
              activeSegment === seg
                ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                : 'glass-card text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            {seg} {seg === 'Playlists' ? `(${playlists.length})` : seg === 'Liked Songs' ? `(${likedTracks.length})` : `(${uniqueArtists.length})`}
          </button>
        ))}
      </div>

      {/* SEGMENT 1: PLAYLISTS */}
      {activeSegment === 'Playlists' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Your Playlists
            </p>
          </div>

          {playlists.length === 0 ? (
            <div className="p-8 rounded-3xl glass-card border border-dashed border-white/10 text-center space-y-3">
              <Folder className="w-10 h-10 text-slate-500 mx-auto opacity-50" />
              <h3 className="font-bold text-white text-sm">No Playlists Yet</h3>
              <p className="text-xs text-slate-400">Create collections of your favorite master recordings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  className="p-3 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-95 group"
                >
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2 bg-slate-800 shadow-md">
                    {pl.cover ? (
                      <img src={resolveMediaUrl(pl.cover)} alt={pl.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-slate-900 to-teal-950/40 text-teal-400">
                        <Disc className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                  <h4 className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                    {pl.name}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    {pl.tracks?.length || 0} tracks
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEGMENT 2: LIKED SONGS */}
      {activeSegment === 'Liked Songs' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Favorite Tracks ({likedTracks.length})
            </p>
          </div>

          {likedTracks.length === 0 ? (
            <div className="p-8 rounded-3xl glass-card border border-dashed border-white/10 text-center space-y-3">
              <Heart className="w-10 h-10 text-rose-500/40 mx-auto" />
              <h3 className="font-bold text-white text-sm">No Liked Songs</h3>
              <p className="text-xs text-slate-400">Heart songs from Pulse or Seek to save them here.</p>
              <button
                onClick={() => onNavigate('seek')}
                className="py-2.5 px-5 rounded-xl glass-button-primary text-xs font-bold"
              >
                Discover Music
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {likedTracks.map((t) => (
                <div
                  key={`liked_${t.id}`}
                  onClick={() => onPlayTrack(t)}
                  className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <img
                      src={resolveMediaUrl(t.cover)}
                      alt={t.title}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-md group-hover:scale-105 transition"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {t.artist}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <Heart className="w-4 h-4 fill-rose-500 text-rose-500 mr-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEGMENT 3: ARTISTS */}
      {activeSegment === 'Artists' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Artists in Catalog ({uniqueArtists.length})
          </p>

          <div className="space-y-2">
            {uniqueArtists.map((art) => (
              <div
                key={art.name}
                className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar
                    user={{ name: art.name, avatar: art.cover }}
                    className="w-12 h-12 rounded-full shrink-0 border border-teal-500/30 shadow-md"
                  />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                      {art.name}
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {art.trackCount} {art.trackCount === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { usePlayer } from '../../context/PlayerContext';
import React from 'react';
import { Play, Pause, Heart, Music, Radio } from 'lucide-react';

import { resolveMediaUrl } from '../../services/api';
export default function MobileMiniPlayer({
  
  
  
  onOpenOnAir,
  isLiked,
  onToggleLike,
  activeHuddle,
  onOpenHuddleRoom
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

  if (!currentTrack && !activeHuddle) return null;

  return (
    <div
      onClick={onOpenOnAir}
      className={`fixed bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] left-2.5 right-2.5 z-30 glass-panel border ${activeHuddle ? 'border-teal-400/50' : 'border-teal-500/30'} bg-slate-950/95 backdrop-blur-2xl rounded-2xl p-2 flex items-center justify-between shadow-2xl cursor-pointer hover:border-teal-400/60 transition duration-200 select-none active:scale-[0.99] group`}
      role="region"
      aria-label="Now Playing Mini Player"
    >
      {/* Artwork + Title + Artist */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`relative w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 border border-white/10 ${activeHuddle && !currentTrack ? 'bg-teal-500/20' : 'bg-slate-900'} flex items-center justify-center`}>
          {currentTrack?.cover ? (
            <img
              src={resolveMediaUrl(currentTrack.cover)}
              alt={currentTrack.title}
              className="w-full h-full object-cover group-hover:scale-105 transition"
            />
          ) : activeHuddle ? (
            <Radio className="w-5 h-5 text-teal-400 animate-pulse" />
          ) : (
            <Music className="w-5 h-5 text-slate-500" />
          )}
        </div>
        <div className="min-w-0 flex-1 pr-1">
          <p className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition leading-snug">
            {currentTrack?.title || activeHuddle?.name || 'Huddle Active'}
          </p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5 leading-tight">
            {currentTrack?.artist || 'Tap to open Studio'}
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div
        className="flex items-center gap-1 shrink-0 ml-2"
        onClick={(e) => e.stopPropagation()}
      >
        {activeHuddle && (
          <button
            onClick={onOpenHuddleRoom}
            className="p-2.5 rounded-full text-teal-400 hover:text-white transition active:scale-90"
            title="Return to Huddle"
          >
            <Radio className="w-4 h-4 animate-pulse" />
          </button>
        )}

        {currentTrack && (
          <>
            <button
              onClick={() => onToggleLike && onToggleLike(currentTrack.id)}
              className={`p-2.5 rounded-full transition active:scale-90 ${
                isLiked ? 'text-rose-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Like Track"
              aria-label="Like Track"
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-rose-400' : ''}`} />
            </button>

            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-teal-500/25 active:scale-90 transition hover:brightness-110"
              title={isPlaying ? 'Pause' : 'Play'}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

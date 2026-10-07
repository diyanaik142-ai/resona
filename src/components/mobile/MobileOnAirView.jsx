import { usePlayer } from '../../context/PlayerContext';
import React, { useState } from 'react';
import {
  ChevronDown, MoreVertical, Play, Pause, SkipBack, SkipForward,
  Shuffle, Repeat, Heart, ListMusic, Share2, Plus, QrCode, Music
} from 'lucide-react';
import MobileQueueSheet from './MobileQueueSheet';
import BeatCodeQR from '../BeatCodeQR';

import { resolveMediaUrl } from '../../services/api';
export default function MobileOnAirView({
  
  
  
  onNext,
  onPrev,
  onClose,
      
  isLiked,
  onToggleLike,
  
  
  
  
  onToast,
  onNavigate,
    
  
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

  const [showQueue, setShowQueue] = useState(false);
  const [showBeatCode, setShowBeatCode] = useState(false);
  const [activeTab, setActiveTab] = useState('Player'); // 'Player' | 'Lyrics'

  if (!currentTrack) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70dvh] p-8 text-center space-y-4">
        <Music className="w-12 h-12 text-slate-500 opacity-50" />
        <h3 className="font-bold text-white text-base">No Track Playing</h3>
        <p className="text-xs text-slate-400">Choose a track from Pulse or Seek to start listening.</p>
        <button
          onClick={onClose}
          className="py-2.5 px-6 rounded-xl glass-button-primary text-xs font-bold"
        >
          Return to Library
        </button>
      </div>
    );
  }

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#06070B] text-slate-100 flex flex-col justify-between p-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] overflow-y-auto custom-scrollbar">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-teal-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* TOP BAR: [Back] [Contextual Title] [More] */}
      <div className="relative z-10 flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            if (onClose) return onClose();
            if (onNavigate) {
              onNavigate('BACK');
            } else {
              window.history.back();
            }
          }}
          className="w-10 h-10 rounded-full glass-card border border-white/10 flex items-center justify-center text-slate-300 hover:text-white active:scale-90 transition"
          aria-label="Minimize Player"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-[10px] uppercase font-bold tracking-widest text-teal-400">Now Playing</p>
          <p className="text-xs font-semibold text-slate-300 truncate max-w-[200px]">{currentTrack.album || 'Resona Master'}</p>
        </div>

        <button
          onClick={() => setShowBeatCode(true)}
          className="w-10 h-10 rounded-full glass-card border border-white/10 flex items-center justify-center text-teal-300 hover:text-white active:scale-90 transition"
          title="Beat Code"
          aria-label="Beat Code"
        >
          <QrCode className="w-4 h-4" />
        </button>
      </div>

      {/* CENTER: LARGE ARTWORK */}
      <div className="relative z-10 my-auto py-2 flex flex-col items-center justify-center">
        <div className="relative aspect-square w-full max-w-[280px] sm:max-w-[320px] rounded-3xl overflow-hidden glass-panel border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <img
            src={resolveMediaUrl(currentTrack.cover)}
            alt={currentTrack.title}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* BOTTOM CONTROLS SECTION */}
      <div className="relative z-10 space-y-4 shrink-0 max-w-md mx-auto w-full">
        {/* Track Title + Artist + Like */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black text-white leading-tight truncate">
              {currentTrack.title}
            </h1>
            <p className="text-sm font-semibold text-slate-400 truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
          <button
            onClick={() => onToggleLike && onToggleLike(currentTrack.id)}
            className={`p-3 rounded-full glass-card border border-white/10 transition active:scale-90 ${
              isLiked ? 'text-rose-500 bg-rose-500/10 border-rose-500/30' : 'text-slate-300'
            }`}
            aria-label="Like Track"
          >
            <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="space-y-1.5">
          <div
            onClick={(e) => {
              if (!onSeek || !duration) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              onSeek(pos * duration);
            }}
            className="relative w-full h-2 bg-slate-800 rounded-full cursor-pointer overflow-hidden py-0.5"
          >
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Primary Playback Controls */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={onToggleShuffle}
            className={`p-2 transition active:scale-90 ${
              isShuffle ? 'text-teal-400' : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Shuffle"
          >
            <Shuffle className="w-5 h-5" />
          </button>

          <button
            onClick={onPrev}
            className="p-2 text-slate-200 hover:text-white transition active:scale-90"
            aria-label="Previous Track"
          >
            <SkipBack className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={onTogglePlay}
            className="w-16 h-16 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-xl shadow-teal-500/30 active:scale-95 hover:brightness-110 transition"
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-7 h-7 fill-slate-950" />
            ) : (
              <Play className="w-7 h-7 fill-slate-950 ml-1" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 text-slate-200 hover:text-white transition active:scale-90"
            aria-label="Next Track"
          >
            <SkipForward className="w-7 h-7 fill-current" />
          </button>

          <button
            onClick={onToggleLoop}
            className={`p-2 transition active:scale-90 ${
              isLoop ? 'text-teal-400' : 'text-slate-400 hover:text-white'
            }`}
            aria-label="Repeat"
          >
            <Repeat className="w-5 h-5" />
          </button>
        </div>

        {/* Secondary Utility Controls: Queue, Lyrics toggle */}
        <div className="flex items-center justify-center gap-4 pt-1">
          <button
            onClick={() => setShowQueue(true)}
            className="flex items-center gap-2 py-2 px-4 rounded-xl glass-card text-xs font-bold text-slate-300 hover:text-white border border-white/10 active:scale-95 transition"
          >
            <ListMusic className="w-4 h-4 text-teal-400" />
            <span>Up Next Queue</span>
          </button>
        </div>
      </div>

      {/* Queue Bottom Sheet */}
      <MobileQueueSheet
        isOpen={showQueue}
        onClose={() => setShowQueue(false)}
        currentTrack={currentTrack}
        queue={playQueue}
        onPlayTrack={onSeek ? (t) => onSeek(0) : undefined}
        onRemoveFromQueue={onRemoveFromQueue}
        onClearQueue={onClearQueue}
        onReorderQueue={onReorderQueue}
      />

      {/* Beat Code Modal */}
      {showBeatCode && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-slate-900 border border-teal-500/40 rounded-3xl p-5 space-y-4 shadow-2xl text-center">
            <h3 className="font-extrabold text-white text-base">Song Beat Code</h3>
            <p className="text-xs text-slate-400">Scan to play {currentTrack.title}</p>
            <div className="p-3 bg-white rounded-2xl mx-auto w-48 h-48 flex items-center justify-center">
              <BeatCodeQR
                trackId={currentTrack.id}
                cover={currentTrack.cover}
                title={currentTrack.title}
                artist={currentTrack.artist}
                size={160}
              />
            </div>
            <div className="flex flex-col gap-2 w-full mt-4">
              <button
                onClick={async () => {
                  const url = `https://resona.anchorlyhms.com/song/${currentTrack.id}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: `Listen to ${currentTrack.title} on Resona`,
                        text: `Listen to ${currentTrack.title} by ${currentTrack.artist} on Resona`,
                        url
                      });
                      if (onToast) onToast('Shared successfully');
                    } catch (err) {
                      console.log('Share canceled', err);
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(url);
                      if (onToast) onToast('Link copied');
                    } catch (err) {
                      if (onToast) onToast("Couldn't copy link");
                    }
                  }
                }}
                className="w-full py-2.5 rounded-xl glass-button-primary text-xs font-bold"
              >
                Share Beat Code
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const url = `https://resona.anchorlyhms.com/song/${currentTrack.id}`;
                    try {
                      await navigator.clipboard.writeText(url);
                      if (onToast) onToast('Link copied');
                    } catch (err) {
                      if (onToast) onToast("Couldn't copy link");
                    }
                  }}
                  className="flex-1 py-2.5 rounded-xl glass-card border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                >
                  Copy Link
                </button>
                <button
                  onClick={() => {
                    const svg = document.getElementById('beatcode-qr-svg');
                    if (!svg) return;
                    const svgData = new XMLSerializer().serializeToString(svg);
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");
                    const img = new Image();
                    img.onload = () => {
                      canvas.width = img.width;
                      canvas.height = img.height;
                      ctx.fillStyle = "#ffffff";
                      ctx.fillRect(0, 0, canvas.width, canvas.height);
                      ctx.drawImage(img, 0, 0);
                      const pngFile = canvas.toDataURL("image/png");
                      const downloadLink = document.createElement("a");
                      downloadLink.download = `Resona-BeatCode-${currentTrack.id}.png`;
                      downloadLink.href = pngFile;
                      downloadLink.click();
                      if (onToast) onToast('Beat Code saved');
                    };
                    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                  }}
                  className="flex-1 py-2.5 rounded-xl glass-card border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                >
                  Save Beat Code
                </button>
              </div>
              <button
                onClick={() => setShowBeatCode(false)}
                className="w-full py-2.5 mt-2 rounded-xl text-slate-400 text-xs font-bold hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

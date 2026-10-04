import React from 'react';
import { Play, ListPlus, Radio, Heart, Share2, Plus, QrCode, X, Music } from 'lucide-react';

export default function MobileTrackActionSheet({
  track,
  isOpen,
  onClose,
  onPlay,
  onPlayNext,
  onAddToQueue,
  isLiked,
  onToggleLike,
  onShareBeatCode
}) {
  if (!isOpen || !track) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative z-10 w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[85dvh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Track Options"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-2" />

        {/* Track header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <img
              src={track.cover}
              alt={track.title}
              className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-md shrink-0"
            />
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white text-sm truncate">{track.title}</h3>
              <p className="text-xs text-slate-400 truncate mt-0.5">{track.artist}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full glass-card shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action List */}
        <div className="space-y-1 text-sm font-semibold">
          <button
            onClick={() => {
              onPlay(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-white transition text-left active:bg-white/15"
          >
            <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Play className="w-4 h-4 fill-current ml-0.5" />
            </div>
            <span>Play Now</span>
          </button>

          <button
            onClick={() => {
              onPlayNext && onPlayNext(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-slate-200 transition text-left active:bg-white/15"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
              <ListPlus className="w-4 h-4" />
            </div>
            <span>Play Next</span>
          </button>

          <button
            onClick={() => {
              onAddToQueue && onAddToQueue(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-slate-200 transition text-left active:bg-white/15"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4" />
            </div>
            <span>Add to Queue</span>
          </button>

          <button
            onClick={() => {
              onToggleLike && onToggleLike(track.id);
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-slate-200 transition text-left active:bg-white/15"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isLiked ? 'bg-rose-500/20 text-rose-400' : 'bg-white/5 text-slate-400'}`}>
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </div>
            <span>{isLiked ? 'Remove from Liked Songs' : 'Save to Liked Songs'}</span>
          </button>

          <button
            onClick={() => {
              onShareBeatCode && onShareBeatCode(track);
              onClose();
            }}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 text-slate-200 transition text-left active:bg-white/15"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 text-pink-400 flex items-center justify-center shrink-0">
              <QrCode className="w-4 h-4" />
            </div>
            <span>Share Beat Code</span>
          </button>
        </div>
      </div>
    </div>
  );
}

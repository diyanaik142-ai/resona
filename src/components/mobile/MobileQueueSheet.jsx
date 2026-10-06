import React from 'react';
import { X, Play, Music, Trash2, Radio, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

function DraggableQueueItem({ t, idx, onPlayTrack, onClose, onRemoveFromQueue }) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={t}
      dragListener={false}
      dragControls={controls}
      className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-white/10 transition group"
    >
      <div 
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white px-2 py-1 -ml-2" 
        title="Drag to reorder"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="w-5 h-5" />
      </div>
      
      <div
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer ml-1"
        onClick={() => {
          onPlayTrack(t);
          if (onClose) onClose();
        }}
      >
        <img
          src={t.cover || t.artwork}
          alt={t.title}
          className="w-10 h-10 rounded-xl object-cover shrink-0"
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
        {onRemoveFromQueue && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(t.queueItemId || t.id); }}
            className="p-1.5 text-slate-400 hover:text-rose-400"
            title="Remove"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}

export default function MobileQueueSheet({
  isOpen,
  onClose,
  currentTrack,
  queue = [],
  onPlayTrack,
  onRemoveFromQueue,
  onClearQueue,
  onReorderQueue
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[85dvh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label="Playback Queue"
      >
        {/* Drag handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

        {/* Sheet Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-teal-400 animate-pulse" />
            <h3 className="font-extrabold text-white text-base">Up Next Queue</h3>
          </div>
          <div className="flex items-center gap-2">
            {onClearQueue && queue.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear the upcoming queue?")) {
                    onClearQueue();
                  }
                }}
                className="px-3 py-1 text-[10px] font-bold text-rose-400 border border-rose-500/30 rounded-full bg-rose-500/10 hover:bg-rose-500/20 uppercase tracking-wider"
              >
                Clear
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-full glass-card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 custom-scrollbar">
          {/* Now Playing Section */}
          {currentTrack && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">
                Now Playing
              </span>
              <div className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-teal-500/30 bg-teal-500/10">
                <img
                  src={currentTrack.cover}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-white text-sm truncate">{currentTrack.title}</h4>
                  <p className="text-xs text-teal-300 font-medium truncate mt-0.5">{currentTrack.artist}</p>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping shrink-0 mr-1" />
              </div>
            </div>
          )}

          {/* Up Next List */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Up Next ({queue.length})
            </span>

            {queue.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 border border-dashed border-white/10 rounded-2xl p-4">
                No tracks in queue. Add songs from Seek or Pulse.
              </div>
            ) : (
              <Reorder.Group axis="y" values={queue} onReorder={onReorderQueue} className="space-y-2">
                {queue.map((t, idx) => (
                  <DraggableQueueItem
                    key={t.queueItemId || t.id || idx}
                    t={t}
                    idx={idx}
                    onPlayTrack={onPlayTrack}
                    onClose={onClose}
                    onRemoveFromQueue={onRemoveFromQueue}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

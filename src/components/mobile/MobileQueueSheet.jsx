import { usePlayer } from '../../context/PlayerContext';
import React, { useState } from 'react';
import { X, Trash2, Radio, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

import { resolveMediaUrl } from '../../services/api';
const formatDuration = (value) => {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  }
  return value || '';
};

function DraggableQueueItem({ t, onPlayTrack, onRemoveFromQueue, onBeginDrag, onEndDrag }) {
  const controls = useDragControls();
  const wasDraggedRef = React.useRef(false);

  const handleDragEnd = (...args) => {
    onEndDrag(...args);
    window.setTimeout(() => { wasDraggedRef.current = false; }, 0);
  };

  return (
    <Reorder.Item
      value={t}
      dragListener={false}
      dragControls={controls}
      onDragStart={onBeginDrag}
      onDrag={() => { wasDraggedRef.current = true; }}
      onDragEnd={handleDragEnd}
      className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-white/10 transition group"
    >
      <div
        onPointerDown={(e) => {
          onBeginDrag();
          controls.start(e);
        }}
        onPointerUp={() => window.setTimeout(onEndDrag, 0)}
        onPointerCancel={() => window.setTimeout(onEndDrag, 0)}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white px-2 py-1 -ml-2"
        title="Drag to reorder"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div
        className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer ml-1"
        onClick={() => {
          if (wasDraggedRef.current) return;
          onPlayTrack(t);
        }}
      >
        <img
          src={resolveMediaUrl(t.cover || t.coverUrl || t.artwork)}
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
        <span className="text-[10px] text-slate-500 tabular-nums">
          {formatDuration(t.durationSeconds ?? t.duration)}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        {onRemoveFromQueue && (
          <button
            onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(t.queueItemId || t.id); }}
            className="p-1.5 text-slate-400 hover:text-rose-400"
            title="Remove"
            aria-label={`Remove ${t.title} from queue`}
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
  onClose
}) {
  const {
    currentTrack,
    isPlaying,
    queue,
    playQueuedTrack: onPlayTrack,
    removeFromQueue: onRemoveFromQueue,
    reorderQueue: onReorderQueue,
    beginQueueReorder,
    finishQueueReorder,
    clearQueue
  } = usePlayer();
  const [confirmClear, setConfirmClear] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md flex flex-col justify-end md:items-end md:justify-end md:bg-slate-950/50 md:p-6 md:pb-28 animate-in fade-in duration-200">
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative z-10 w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-4 sm:p-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[85dvh] flex flex-col md:w-[min(28rem,calc(100vw-3rem))] md:max-h-[min(75dvh,44rem)] md:rounded-3xl md:border md:pb-5"
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
            {queue.length > 0 && (
              <button
                onClick={() => setConfirmClear(true)}
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
                  src={resolveMediaUrl(currentTrack.cover)}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover shadow-md shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-white text-sm truncate">{currentTrack.title}</h4>
                  <p className="text-xs text-teal-300 font-medium truncate mt-0.5">{currentTrack.artist}</p>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 mr-1 ${isPlaying ? 'bg-teal-400 animate-pulse' : 'bg-slate-500'}`} />
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
                    onPlayTrack={onPlayTrack}
                    onRemoveFromQueue={onRemoveFromQueue}
                    onBeginDrag={beginQueueReorder}
                    onEndDrag={finishQueueReorder}
                  />
                ))}
              </Reorder.Group>
            )}
          </div>
        </div>

        {confirmClear && (
          <div className="absolute inset-0 z-20 flex items-center justify-center rounded-t-3xl bg-slate-950/80 p-4 md:rounded-3xl" role="alertdialog" aria-modal="true" aria-labelledby="clear-queue-title">
            <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl">
              <h4 id="clear-queue-title" className="text-sm font-bold text-white">Clear upcoming queue?</h4>
              <p className="mt-1 text-xs text-slate-400">The current track will keep playing.</p>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setConfirmClear(false)} className="rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/10">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    clearQueue();
                    setConfirmClear(false);
                  }}
                  className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-bold text-rose-300 hover:bg-rose-500/25"
                >
                  Clear queue
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

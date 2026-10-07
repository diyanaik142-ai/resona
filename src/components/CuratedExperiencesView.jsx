import { usePlayer } from '../context/PlayerContext';
import React, { useState } from 'react';
import { resolveMediaUrl,  api } from '../services/api';
import { Play, Disc, Sparkles, SkipForward } from 'lucide-react';

export default function CuratedExperiencesView({ }) {
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

  const [activeTab, setActiveTab] = useState('Daily Dose');
  const [state, setState] = React.useState({ loading: true, error: '', data: null });

  React.useEffect(() => {
    let alive = true;
    api.user.getDailyDose()
      .then((data) => alive && setState({ loading: false, error: '', data }))
      .catch((err) => alive && setState({ loading: false, error: err.message, data: null }));
    return () => { alive = false; };
  }, []);

  const mixes = state.data?.mixes || [];
  const selectedMix = mixes[0];

  return (
    <div className="space-y-6 pb-24 w-full max-w-screen-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Curated Experiences</h1>
        <p className="text-xs text-slate-400 mt-1">Daily Dose is generated from your real listening behavior.</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['Daily Dose', 'Fresh Drops', 'Endless Radio'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab ? 'bg-teal-400 text-slate-950 font-bold' : 'glass-card text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Daily Dose' && (
        <div className="space-y-4">
          <div className="relative rounded-3xl overflow-hidden glass-panel p-6 border border-teal-500/20 shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-900/60 via-slate-900/80 to-purple-900/60 pointer-events-none" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Updated Daily</span>
                <h2 className="text-2xl font-black text-white">{selectedMix?.title || 'Daily Dose'}</h2>
                <p className="text-xs text-slate-300">{selectedMix?.subtitle || 'Your Daily Dose is getting ready.'}</p>
              </div>
              <button
                onClick={() => selectedMix?.tracks?.[0] && onPlayTrack(selectedMix.tracks[0])}
                disabled={!selectedMix?.tracks?.length}
                className="px-5 py-2.5 rounded-2xl glass-button-primary font-bold text-xs flex items-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-slate-950" /> Play
              </button>
            </div>
          </div>

          {state.loading ? (
            <EmptyState title="Loading Daily Dose..." />
          ) : state.error ? (
            <EmptyState title="Could not load Daily Dose." message={state.error} tone="error" />
          ) : !state.data?.personalized || mixes.length === 0 ? (
            <EmptyState title="Your Daily Dose is getting ready" message={state.data?.message || 'Listen to a few songs and Resona will start personalizing your mixes.'} />
          ) : (
            <div className="space-y-5">
              {mixes.map((mix) => (
                <section key={mix.id} className="space-y-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{mix.title}</h3>
                    <p className="text-xs text-slate-400">{mix.subtitle}</p>
                  </div>
                  <div className="space-y-2">
                    {mix.tracks.map((track) => (
                      <TrackRow key={`${mix.id}_${track.id}`} track={track} onPlayTrack={onPlayTrack} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'Fresh Drops' && (
        <EmptyState title="Fresh Drops is general discovery" message="Personalized recommendations are shown in Daily Dose and Tuned for You." />
      )}

      {activeTab === 'Endless Radio' && (
        <div className="flex flex-col items-center justify-center p-6 rounded-3xl glass-panel border border-cyan-500/30 text-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-950/40 via-slate-950/80 to-teal-950/40 pointer-events-none" />
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-500/20 px-3 py-1 rounded-full">
              Non-Stop Station
            </span>
            <h2 className="text-3xl font-black text-white mt-2">Endless</h2>
            <p className="text-xs text-slate-400">Radio playback follows the catalog queue.</p>
          </div>
          <div className="flex items-center gap-4 z-10 pt-2">
            <button
              onClick={() => selectedMix?.tracks?.[0] && onPlayTrack(selectedMix.tracks[0])}
              disabled={!selectedMix?.tracks?.length}
              className="w-12 h-12 rounded-full glass-button-primary flex items-center justify-center disabled:opacity-50"
            >
              <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
            </button>
            <button
              onClick={() => selectedMix?.tracks?.[1] && onPlayTrack(selectedMix.tracks[1])}
              disabled={!selectedMix?.tracks?.[1]}
              className="p-3 rounded-full glass-card text-slate-300 hover:text-white disabled:opacity-50"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function TrackRow({ track, onPlayTrack }) {
  return (
    <div
      onClick={() => onPlayTrack(track)}
      className="p-3 rounded-2xl glass-card glass-card-hover flex items-center justify-between cursor-pointer group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
        <div className="min-w-0">
          <h4 className="text-xs font-bold text-white group-hover:text-teal-300 truncate">{track.title}</h4>
          <p className="text-[11px] text-slate-400 truncate">{track.reason || track.artist}</p>
        </div>
      </div>
      <button className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-teal-400 group-hover:text-slate-950 flex items-center justify-center transition shrink-0">
        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
      </button>
    </div>
  );
}

function EmptyState({ title, message, tone = 'default' }) {
  return (
    <div className={`p-8 text-center glass-card rounded-2xl w-full border border-dashed ${tone === 'error' ? 'border-rose-500/30' : 'border-slate-700'} mt-4`}>
      <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-3 opacity-50" />
      <p className="text-slate-200 font-bold">{title}</p>
      {message && <p className="text-xs text-slate-400 mt-1">{message}</p>}
    </div>
  );
}

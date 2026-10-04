import React from 'react';
import { api } from '../services/api';
import { Play, Sparkles, Sliders } from 'lucide-react';

export default function TunedForYouView({ onPlayTrack }) {
  const [state, setState] = React.useState({ loading: true, error: '', data: null });

  React.useEffect(() => {
    let alive = true;
    api.user.getRecommendations({ limit: 16 })
      .then((data) => alive && setState({ loading: false, error: '', data }))
      .catch((err) => alive && setState({ loading: false, error: err.message, data: null }));
    return () => { alive = false; };
  }, []);

  const recommendations = state.data?.recommendations || [];

  return (
    <div className="space-y-6 pb-24 w-full max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Tuned for You</h1>
          <p className="text-xs text-slate-400 mt-1">Made from your real listening activity</p>
        </div>
        <button className="p-2.5 rounded-full glass-card text-slate-300 hover:text-white">
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {state.loading ? (
        <EmptyState title="Loading your listening profile..." />
      ) : state.error ? (
        <EmptyState title="Could not load recommendations." message={state.error} tone="error" />
      ) : !state.data?.personalized || recommendations.length === 0 ? (
        <EmptyState
          title="Listen to some music to personalize your recommendations."
          message={state.data?.message || 'We need more listening data to build your Tuned mixes.'}
        />
      ) : (
        <>
          <div className="relative rounded-3xl overflow-hidden glass-panel p-8 border border-purple-500/30 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/80 via-indigo-900/50 to-pink-900/60 pointer-events-none" />
            <div className="relative z-10 flex flex-col justify-between h-48">
              <div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-300 bg-purple-500/30 px-3 py-1 rounded-full mb-3">
                  <Sparkles className="w-3 h-3" /> {recommendations[0].reason}
                </span>
                <h2 className="text-3xl font-black text-white">{recommendations[0].title}</h2>
                <p className="text-xs text-purple-200 mt-1">{recommendations[0].artist} • {recommendations[0].genre || 'Resona catalog'}</p>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-mono">Personalized from listening history</span>
                <button
                  onClick={() => onPlayTrack(recommendations[0])}
                  className="w-12 h-12 rounded-full glass-button-primary flex items-center justify-center shadow-lg hover:scale-105 transition"
                >
                  <Play className="w-5 h-5 fill-slate-950 text-slate-950 ml-0.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg text-white">More for you</h3>
            <div className="space-y-3">
              {recommendations.slice(1).map((track) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="p-4 rounded-2xl glass-card border border-teal-500/20 flex items-center justify-between cursor-pointer hover:bg-white/10 transition group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-white text-sm group-hover:text-teal-300 truncate">{track.title}</h4>
                      <p className="text-xs text-slate-400 truncate">{track.reason}</p>
                    </div>
                  </div>
                  <button className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-teal-400 group-hover:text-slate-950 flex items-center justify-center transition shrink-0">
                    <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState({ title, message, tone = 'default' }) {
  return (
    <div className={`p-10 text-center glass-card rounded-3xl w-full border border-dashed ${tone === 'error' ? 'border-rose-500/30' : 'border-slate-700'} mt-6`}>
      <Sparkles className="w-10 h-10 text-slate-500 mx-auto mb-4 opacity-50" />
      <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
      {message && <p className="text-sm text-slate-400">{message}</p>}
    </div>
  );
}

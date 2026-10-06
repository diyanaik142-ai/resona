import React from 'react';
import { Play, Pause, MoreVertical, Music, Sparkles, Clock, Compass, Disc } from 'lucide-react';

export default function MobilePulseView({
  catalog = [],
  currentTrack,
  isPlaying,
  onPlayTrack,
  onOpenTrackActions,
  onNavigate,
  user
}) {
  const hasTracks = Array.isArray(catalog) && catalog.length > 0;
  
  // Categorize real catalog into curated mobile rails
  const continueListeningTracks = hasTracks ? catalog.slice(0, 4) : [];
  const tunedForYouTracks = hasTracks ? catalog.slice(0, 6) : [];
  const freshDropsTracks = hasTracks ? [...catalog].reverse().slice(0, 6) : [];
  const dailyDoseTracks = hasTracks ? catalog.slice(2, 8) : [];

  return (
    <div className="space-y-6 pb-6 pt-2">
      {/* Welcome greeting */}
      <div className="px-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
          Personal Audio Space
        </p>
        <h1 className="text-xl font-black text-white tracking-tight truncate mt-0.5">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name || 'Listener'}
        </h1>
      </div>

      {!hasTracks ? (
        <div className="mx-4 p-8 rounded-3xl glass-card border border-dashed border-white/10 text-center space-y-3">
          <Music className="w-10 h-10 text-slate-500 mx-auto opacity-40" />
          <h3 className="font-bold text-white text-sm">Library is Quiet</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            No published tracks available in the catalog yet. Connect to creator releases or explore genres.
          </p>
          <button
            onClick={() => onNavigate('seek')}
            className="py-2.5 px-5 rounded-xl glass-button-primary text-xs font-bold"
          >
            Explore Genres
          </button>
        </div>
      ) : (
        <>
          {/* SECTION 1: CONTINUE LISTENING (Compact 2-Column Grid) */}
          <div className="px-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                <span>Continue Listening</span>
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {continueListeningTracks.map((t) => {
                const isThisPlaying = currentTrack?.id === t.id && isPlaying;
                return (
                  <div
                    key={`cont_${t.id}`}
                    onClick={() => onPlayTrack(t)}
                    className="flex items-center gap-2.5 p-2 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-95 group relative overflow-hidden"
                  >
                    <img
                      src={t.cover}
                      alt={t.title}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 shadow-md group-hover:scale-105 transition"
                    />
                    <div className="min-w-0 flex-1 pr-1">
                      <p className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {t.artist}
                      </p>
                    </div>
                    {isThisPlaying && (
                      <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0 mr-1" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: TUNED FOR YOU (Horizontal Media Rail) */}
          <div className="space-y-3">
            <div className="px-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                <span>Tuned for You</span>
              </h2>
              <span className="text-[11px] text-teal-400 font-semibold font-mono">Hi-Fi</span>
            </div>

            <div className="w-full max-w-full flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar overscroll-x-contain">
              {tunedForYouTracks.map((t) => {
                const isThisPlaying = currentTrack?.id === t.id && isPlaying;
                return (
                  <div
                    key={`tuned_${t.id}`}
                    className="w-32 shrink-0 group space-y-2 cursor-pointer"
                    onClick={() => onPlayTrack(t)}
                  >
                    <div className="relative aspect-square w-full rounded-2xl overflow-hidden glass-card border border-white/10 shadow-lg group-hover:border-teal-400/50 transition">
                      <img
                        src={t.cover}
                        alt={t.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTrackActions && onOpenTrackActions(t);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white backdrop-blur-md opacity-80 hover:opacity-100"
                        title="Options"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-1.5 right-1.5 w-8 h-8 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center shadow-lg active:scale-90 transition">
                        {isThisPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-slate-950" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                        )}
                      </div>
                    </div>
                    <div className="px-0.5">
                      <p className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                        {t.title}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {t.artist}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: FRESH DROPS (Horizontal Media Rail) */}
          <div className="space-y-3">
            <div className="px-4 flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                <span>Fresh Drops</span>
              </h2>
            </div>

            <div className="w-full max-w-full flex gap-3 overflow-x-auto px-4 pb-2 no-scrollbar overscroll-x-contain">
              {freshDropsTracks.map((t) => (
                <div
                  key={`fresh_${t.id}`}
                  className="w-32 shrink-0 group space-y-2 cursor-pointer"
                  onClick={() => onPlayTrack(t)}
                >
                  <div className="relative aspect-square w-full rounded-2xl overflow-hidden glass-card border border-white/10 shadow-lg group-hover:border-purple-400/50 transition">
                    <img
                      src={t.cover}
                      alt={t.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTrackActions && onOpenTrackActions(t);
                      }}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white backdrop-blur-md opacity-80 hover:opacity-100"
                      title="Options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="px-0.5">
                    <p className="font-bold text-white text-xs truncate group-hover:text-purple-300 transition">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {t.artist}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 4: DAILY DOSE (List Rows) */}
          {dailyDoseTracks.length > 0 && (
            <div className="px-4 space-y-2">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <Disc className="w-3.5 h-3.5 text-cyan-400" />
                <span>Daily Dose</span>
              </h2>

              <div className="space-y-1.5">
                {dailyDoseTracks.slice(0, 4).map((t, idx) => (
                  <div
                    key={`daily_${t.id}_${idx}`}
                    onClick={() => onPlayTrack(t)}
                    className="flex items-center justify-between p-2.5 rounded-2xl glass-card hover:bg-white/10 transition cursor-pointer active:scale-[0.99] group border border-white/5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="font-mono text-xs text-slate-500 w-4 text-center shrink-0">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <img
                        src={t.cover}
                        alt={t.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-md group-hover:scale-105 transition"
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
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenTrackActions && onOpenTrackActions(t);
                      }}
                      className="p-2 text-slate-400 hover:text-white rounded-full shrink-0 ml-2"
                      title="More"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

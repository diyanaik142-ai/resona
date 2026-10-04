import React, { useState } from 'react';
import { Search, X, MoreVertical, Play, Sparkles, Music, Disc } from 'lucide-react';

export default function MobileSeekView({
  catalog = [],
  onPlayTrack,
  onOpenTrackActions,
  currentTrack,
  isPlaying
}) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = [
    { id: 'All', label: 'All Audio' },
    { id: 'Electronic', label: 'Electronic' },
    { id: 'Ambient', label: 'Ambient' },
    { id: 'Lo-Fi', label: 'Lo-Fi' },
    { id: 'Pop', label: 'Pop' },
    { id: 'Indie', label: 'Indie' },
    { id: 'Rock', label: 'Rock' }
  ];

  // Filter catalog by query and category
  const filteredTracks = catalog.filter((track) => {
    const matchesQuery = query.trim() === '' ||
      track.title?.toLowerCase().includes(query.toLowerCase()) ||
      track.artist?.toLowerCase().includes(query.toLowerCase()) ||
      track.genre?.toLowerCase().includes(query.toLowerCase());

    const matchesCategory = activeCategory === 'All' ||
      track.genre?.toLowerCase() === activeCategory.toLowerCase();

    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-4 pb-6 pt-2 px-4">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search songs, artists, genres..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-10 pr-9 py-3 rounded-2xl glass-card border border-white/10 text-white text-base placeholder:text-slate-500 focus:outline-none focus:border-teal-400/60 shadow-lg"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categories / Genres Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar touch-pan-y overscroll-x-contain">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
              activeCategory === cat.id
                ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                : 'glass-card text-slate-300 hover:bg-white/10 border border-white/5'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {query ? `Results for "${query}"` : `${activeCategory} Tracks`} ({filteredTracks.length})
        </p>
      </div>

      {/* Results List */}
      {filteredTracks.length === 0 ? (
        <div className="p-8 rounded-3xl glass-card border border-dashed border-white/10 text-center space-y-2 mt-4">
          <Music className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
          <p className="text-sm font-bold text-white">No tracks found</p>
          <p className="text-xs text-slate-400">Try searching with a different artist, title, or genre.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTracks.map((t) => {
            const isThisPlaying = currentTrack?.id === t.id && isPlaying;
            return (
              <div
                key={t.id}
                onClick={() => onPlayTrack(t)}
                className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-[0.99] group"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden shrink-0 shadow-md">
                    <img
                      src={t.cover}
                      alt={t.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition"
                    />
                    {isThisPlaying && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="w-3 h-3 rounded-full bg-teal-400 animate-ping" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-teal-300 transition">
                      {t.title}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {t.artist} {t.genre ? `• ${t.genre}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTrackActions && onOpenTrackActions(t);
                    }}
                    className="p-2 text-slate-400 hover:text-white rounded-full active:scale-90"
                    title="Track actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { usePlayer } from '../../context/PlayerContext';
import React, { useState, useEffect } from 'react';
import { Search, X, MoreVertical, Play, Sparkles, Music, Disc } from 'lucide-react';
import { resolveMediaUrl,  api } from '../../services/api';
import Avatar from '../Avatar';

export default function MobileSeekView({
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

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  const [searchResults, setSearchResults] = useState({ songs: [], accounts: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [featuredPlaylists, setFeaturedPlaylists] = useState([]);

  useEffect(() => {
    api.tracks.getPlaylists().then(setFeaturedPlaylists).catch(() => {});
  }, []);

  const categories = [
    { id: 'All', label: 'All Audio' },
    { id: 'Electronic', label: 'Electronic' },
    { id: 'Ambient', label: 'Ambient' },
    { id: 'Lo-Fi', label: 'Lo-Fi' },
    { id: 'Pop', label: 'Pop' },
    { id: 'Indie', label: 'Indie' },
    { id: 'Rock', label: 'Rock' }
  ];

  // Debounced search for accounts and server-side results
  useEffect(() => {
    let timer;
    if (!query || !query.trim()) {
      if (searchResults.songs.length > 0 || searchResults.accounts.length > 0) {
        setSearchResults({ songs: [], accounts: [] });
      }
      setIsSearching(false);
    } else {
      setIsSearching(true);
      timer = setTimeout(async () => {
        try {
          const data = await api.search.query(query.trim());
          setSearchResults({ songs: data.songs || [], accounts: data.accounts || [] });
        } catch (err) {
          console.error('Search error:', err);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [query]);

  // Filter catalog by query and category (for fast local filter as fallback or base)
  const filteredTracks = catalog.filter((track) => {
    const matchesQuery = query.trim() === '' ||
      track.title?.toLowerCase().includes(query.toLowerCase()) ||
      track.artist?.toLowerCase().includes(query.toLowerCase()) ||
      track.genre?.toLowerCase().includes(query.toLowerCase());

    const matchesCategory = activeCategory === 'All' ||
      track.genre?.toLowerCase() === activeCategory.toLowerCase();

    return matchesQuery && matchesCategory;
  });

  // Decide what songs to show
  // If we have a query, use searchResults.songs (which includes server matches)
  // otherwise use filteredTracks
  const displaySongs = query.trim() ? searchResults.songs : filteredTracks;
  const displayAccounts = query.trim() ? searchResults.accounts : [];

  return (
    <div className="space-y-4 pb-6 pt-2 px-4">
      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search songs, artists, accounts..."
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

      {/* Categories / Genres Chips (Only show if not searching or if no accounts) */}
      {!query.trim() && (
        <div className="w-full max-w-full flex gap-2 overflow-x-auto pb-1 no-scrollbar overscroll-x-contain overflow-hidden">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition active:scale-95 ${
                activeCategory === cat.id
                  ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'glass-card text-slate-300 hover:bg-white/10 border border-white/5'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Featured Playlists */}
      {!query.trim() && featuredPlaylists.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider px-1">Featured Playlists</h3>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar overscroll-x-contain px-1">
            {featuredPlaylists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onNavigate(`playlist/${pl.id}`)}
                className="w-32 shrink-0 space-y-2 cursor-pointer active:scale-95 transition"
              >
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-slate-800 relative shadow-lg border border-white/5">
                  {pl.coverUrl ? (
                    <img src={resolveMediaUrl(pl.coverUrl)} alt={pl.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-teal-500/10">
                      <Disc className="w-8 h-8 text-teal-500/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-teal-500/90 flex items-center justify-center text-slate-950 shadow-xl backdrop-blur-md">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white text-xs truncate">{pl.name}</h4>
                  <p className="text-[10px] text-slate-400 truncate">Resona Curated</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between pt-1">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {query ? `Results for "${query}"` : `${activeCategory} Tracks`} {(!query && `(${filteredTracks.length})`)}
        </p>
      </div>

      {isSearching && query.trim() ? (
        <p className="text-sm text-slate-400 text-center py-4">Searching...</p>
      ) : displaySongs.length === 0 && displayAccounts.length === 0 ? (
        <div className="p-8 rounded-3xl glass-card border border-dashed border-white/10 text-center space-y-2 mt-4">
          <Music className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
          <p className="text-sm font-bold text-white">No results found</p>
          <p className="text-xs text-slate-400">Try searching with a different artist, title, or account name.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Accounts Section */}
          {displayAccounts.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Accounts</h4>
              {displayAccounts.map((account) => (
                <div
                  key={account.id}
                  onClick={() => onNavigate(`profile/${account.handle}`)}
                  className="p-3 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 flex items-center justify-between cursor-pointer active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <Avatar user={account} className="w-10 h-10 rounded-full" />
                    <div>
                      <h4 className="text-sm font-bold text-white">{account.name}</h4>
                      <p className="text-xs text-teal-400">@{account.handle}</p>
                    </div>
                  </div>
                  <button className="px-3 py-1.5 rounded-full bg-white/10 text-xs font-bold text-white active:bg-white/20">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Songs Section */}
          {displaySongs.length > 0 && (
            <div className="space-y-2">
              {query.trim() && displayAccounts.length > 0 && (
                <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">Songs</h4>
              )}
              {displaySongs.map((t) => {
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
                          src={resolveMediaUrl(t.cover)}
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
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Search, Flame, TrendingUp, Play, Mic, Music, Disc } from 'lucide-react';
import { api } from '../services/api';

export default function SeekView({ onPlayTrack, query: propQuery, setQuery: propSetQuery }) {
  const [internalQuery, setInternalQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  
  const [searchResults, setSearchResults] = useState([]);
  const [genres, setGenres] = useState([]);
  const [trending, setTrending] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState(null);
  const [genreTracks, setGenreTracks] = useState([]);

  const query = propQuery !== undefined ? propQuery : internalQuery;
  const setQuery = propSetQuery !== undefined ? propSetQuery : setInternalQuery;

  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [genresData, trendingData] = await Promise.all([
          api.search.getGenres(),
          api.search.getTrending()
        ]);
        setGenres(genresData);
        setTrending(trendingData);
      } catch (err) {
        console.error('Failed to load search data:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Debounced search
  useEffect(() => {
    let timer;
    if (!query || !query.trim()) {
      if (searchResults.length > 0) {
          setSearchResults([]);
      }
    } else {
        timer = setTimeout(async () => {
          setIsLoading(true);
          try {
            const data = await api.search.query(query.trim());
            // Filter by active tab if needed
            if (activeTab !== 'All') {
              // Implement filtering based on tab, for now just show tracks
              setSearchResults(data.songs || []);
            } else {
              setSearchResults(data.songs || []); // Just showing tracks for now
            }
          } catch (err) {
            console.error('Search error:', err);
          } finally {
            setIsLoading(false);
          }
        }, 300);
    }

    return () => { if (timer) clearTimeout(timer); };
  }, [query, activeTab]);

  const loadGenre = async (genreId) => {
    try {
      setIsLoading(true);
      const data = await api.search.getGenre(genreId);
      setSelectedGenre(data.genre);
      setGenreTracks(data.tracks);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedGenre) {
    return (
      <div className="space-y-6 pb-24 w-full max-w-screen-2xl mx-auto">
        <button onClick={() => setSelectedGenre(null)} className="text-sm font-bold text-teal-400 hover:underline mb-4 block">
          &larr; Back to Explore
        </button>
        <div className={`h-40 rounded-3xl p-8 bg-gradient-to-br ${selectedGenre.color || 'from-slate-500 to-slate-700'} flex flex-col justify-end shadow-2xl`}>
          <h1 className="text-4xl font-black text-white drop-shadow-lg">{selectedGenre.name}</h1>
        </div>
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-white">Tracks</h3>
          {isLoading ? (
            <p className="text-sm text-slate-400">Loading...</p>
          ) : genreTracks.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl w-full border border-dashed border-slate-700">
              <p className="text-slate-400 font-medium">No tracks available in this genre yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {genreTracks.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="p-3 rounded-2xl glass-card hover:bg-white/10 flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <img src={track.cover} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-300">{track.title}</h4>
                      <p className="text-xs text-slate-400">{track.artist}</p>
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-teal-400 opacity-0 group-hover:opacity-100 transition" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 w-full max-w-screen-2xl mx-auto">
      {/* Header & Search Bar */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight mb-3">Explore & Search</h1>
        <div className="relative max-w-xl">
          <Search className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Artists, songs, albums, playlists..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-3 pl-11 pr-4 rounded-2xl glass-panel border border-white/10 text-white text-base sm:text-sm focus:outline-none focus:border-teal-400 placeholder:text-slate-500 shadow-xl"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Songs', 'Artists', 'Albums', 'Playlists'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab
                ? 'bg-teal-400 text-slate-950 font-bold'
                : 'glass-card text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Search Results (if searching) */}
      {query.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-400 uppercase tracking-wider">Search Results</h3>
          {isLoading ? (
            <p className="text-sm text-slate-400">Searching...</p>
          ) : searchResults.length === 0 ? (
            <p className="text-sm text-slate-400">No results found for "{query}"</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map((track) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="p-3 rounded-2xl glass-card hover:bg-white/10 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{track.title}</h4>
                      <p className="text-[11px] text-slate-400">{track.artist}</p>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-teal-400" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Browse All Categories Grid */}
      {query.length === 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-white">Browse all</h3>
          {genres.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl w-full border border-dashed border-slate-700">
              <p className="text-slate-400 font-medium">No genres found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {genres.map((genre) => (
                <div
                  key={genre.id}
                  onClick={() => loadGenre(genre.id)}
                  className={`h-24 rounded-2xl p-4 bg-gradient-to-br ${genre.color || 'from-slate-500 to-slate-700'} flex flex-col justify-between shadow-lg cursor-pointer hover:scale-105 transition`}
                >
                  <h4 className="font-extrabold text-white text-base leading-tight">{genre.name}</h4>
                  <div className="self-end opacity-40">
                    <Disc className="w-8 h-8 text-white" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Trending Now List */}
      {query.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="font-bold text-lg text-white">Trending Now</h3>
            </div>
            {trending.length > 0 && <span className="text-xs text-teal-400 font-semibold cursor-pointer">See all</span>}
          </div>

          {trending.length === 0 ? (
            <div className="p-8 text-center glass-card rounded-2xl w-full border border-dashed border-slate-700">
              <p className="text-slate-400 font-medium">No trending tracks yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {trending.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="p-3 rounded-2xl glass-card glass-card-hover flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-black text-slate-500 w-4 text-center">{idx + 1}</span>
                    <img src={track.cover} alt={track.title} className="w-11 h-11 rounded-xl object-cover shadow" />
                    <div>
                      <h4 className="text-xs font-bold text-white group-hover:text-teal-300">{track.title}</h4>
                      <p className="text-[11px] text-slate-400">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono">{track.duration}</span>
                    <button className="w-8 h-8 rounded-full bg-white/10 group-hover:bg-teal-400 group-hover:text-slate-950 flex items-center justify-center transition">
                      <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

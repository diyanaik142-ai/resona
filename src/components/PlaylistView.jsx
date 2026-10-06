import React, { useState, useEffect } from 'react';
import { Play, Pause, Shuffle, Heart, MoreVertical, ListPlus, ChevronLeft, Disc } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PlaylistView({ playlistId, onPlayTrack, onPlayPlaylist, isPlaying, currentTrack, onNavigate }) {
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!playlistId) return;
    setLoading(true);
    api.tracks.getPlaylist(playlistId)
      .then(data => {
        setPlaylist(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [playlistId]);

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold">Loading playlist...</p>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-4">
        <Disc className="w-16 h-16 text-slate-600 mb-2" />
        <h2 className="text-xl font-bold text-white">Playlist not found</h2>
        <p className="text-slate-400">{error}</p>
        <button onClick={() => onNavigate('pulse')} className="px-6 py-2 rounded-full bg-white/10 text-white font-bold hover:bg-white/20">Go Home</button>
      </div>
    );
  }

  const tracks = playlist.tracks || [];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <button onClick={() => onNavigate('BACK')} className="flex items-center gap-2 text-slate-400 hover:text-white transition w-fit group">
        <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
        <span className="font-bold text-sm">Back</span>
      </button>

      <div className="flex flex-col md:flex-row gap-8 items-center md:items-end">
        <div className="w-48 h-48 md:w-64 md:h-64 shrink-0 rounded-2xl shadow-2xl overflow-hidden bg-slate-800">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-teal-500/10">
              <Disc className="w-16 h-16 text-teal-500/50" />
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left space-y-4">
          <p className="text-xs font-black tracking-widest text-teal-400 uppercase">Playlist</p>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight">{playlist.name}</h1>
          <p className="text-slate-300 text-sm md:text-base max-w-2xl leading-relaxed">{playlist.description}</p>
          <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-slate-400 font-medium">
            <span>Resona Admin</span>
            <span>•</span>
            <span>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
        <button 
          onClick={() => onPlayPlaylist(tracks, false)}
          disabled={tracks.length === 0}
          className="w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-400 text-slate-950 flex items-center justify-center shadow-lg hover:shadow-teal-500/50 transition-all hover:scale-105 disabled:opacity-50"
        >
          <Play className="w-6 h-6 fill-current" />
        </button>
        <button 
          onClick={() => onPlayPlaylist(tracks, true)}
          disabled={tracks.length === 0}
          className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105 disabled:opacity-50"
          title="Shuffle Play"
        >
          <Shuffle className="w-6 h-6" />
        </button>
        <button className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all hover:scale-105">
          <Heart className="w-6 h-6" />
        </button>
      </div>

      <div className="space-y-2 mt-8">
        <div className="hidden md:grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5 mb-4">
          <div className="w-8 text-center">#</div>
          <div>Title</div>
          <div className="w-12 text-center">Time</div>
        </div>

        {tracks.length === 0 ? (
          <div className="text-center py-12 text-slate-500 font-medium">This playlist is empty.</div>
        ) : (
          tracks.map((track, idx) => {
            const isPlayingThis = currentTrack?.id === track.id && isPlaying;
            return (
              <div 
                key={track.id + idx}
                onClick={() => onPlayTrack(track)}
                className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition"
              >
                <div className="w-8 text-center text-sm font-bold text-slate-500 group-hover:text-white transition">
                  {isPlayingThis ? <Play className="w-4 h-4 text-teal-400 inline fill-current" /> : (idx + 1)}
                </div>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <img src={track.cover} alt={track.title} className="w-10 h-10 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className={`font-bold text-sm truncate ${isPlayingThis ? 'text-teal-400' : 'text-white'}`}>{track.title}</p>
                    <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                  </div>
                </div>
                <div className="w-12 text-center text-xs font-mono text-slate-500">
                  {/* format seconds if duration exists */}
                  --:--
                </div>
                <button className="p-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white transition">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
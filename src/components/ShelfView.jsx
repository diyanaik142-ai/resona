import { usePlayer } from '../context/PlayerContext';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Radio, Download, Clock, UploadCloud, ChevronRight, Plus, Music, Trash2, X, FolderLock, Play } from 'lucide-react';

import { resolveMediaUrl } from '../services/api';
export default function ShelfView({  onNavigate }) {
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

  const { shelf, creatorData, createPlaylist, deletePlaylist, user , catalog} = useAuth();
  const [activeTab, setActiveTab] = useState('Playlists');
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const likedCount = shelf?.likedTrackIds ? shelf.likedTrackIds.length : 0;
  const userPlaylists = shelf?.playlists || [];
  const likedTracks = catalog.filter((t) => shelf?.likedTrackIds?.includes(t.id));

  const isApprovedCreator = creatorData?.isCreator || creatorData?.status === 'approved';
  const isPendingCreator = creatorData?.status === 'pending';

  const shelfCards = [
    {
      id: 'liked',
      title: 'Liked Songs',
      subtitle: `${likedCount} songs in your account`,
      icon: Heart,
      color: 'from-pink-500 to-purple-600',
      action: () => setActiveTab('Liked')
    },
    {
      id: 'playlists',
      title: 'Your Playlists',
      subtitle: `${userPlaylists.length} playlists created`,
      icon: Music,
      color: 'from-teal-500 to-emerald-600',
      action: () => setActiveTab('Playlists')
    },
    {
      id: 'uploads',
      title: isApprovedCreator ? 'Your Uploads' : isPendingCreator ? 'Creator Application' : 'Become a Creator',
      subtitle: isApprovedCreator 
        ? `${creatorData?.uploads?.length || 0} original releases` 
        : isPendingCreator 
          ? 'Application under review' 
          : 'Apply to release music',
      icon: UploadCloud,
      color: 'from-purple-600 to-pink-500',
      action: () => onNavigate('creator')
    },
    {
      id: 'recent',
      title: 'Recently Played',
      subtitle: `${shelf?.recentlyPlayed?.length || 0} tracks recorded`,
      icon: Clock,
      color: 'from-amber-500 to-orange-600',
      action: () => setActiveTab('Playlists')
    }
  ];

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsCreating(true);
    try {
      await createPlaylist(newTitle.trim(), newDesc.trim());
      setNewTitle('');
      setNewDesc('');
      setShowNewPlaylistModal(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (e, playlistId) => {
    e.stopPropagation();
    if (confirm('Delete this playlist from your account?')) {
      await deletePlaylist(playlistId);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Your Library</h1>
        </div>
        <button
          onClick={() => setShowNewPlaylistModal(true)}
          className="py-2.5 px-5 rounded-2xl glass-button-primary text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-teal-500/20 hover:scale-105 transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Playlist</span>
        </button>
      </div>

      {/* Primary Feature Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {shelfCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              onClick={card.action}
              className="p-5 rounded-2xl glass-card glass-card-hover flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-tr ${card.color} flex items-center justify-center shadow-lg text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm group-hover:text-teal-300 transition">{card.title}</h3>
                  <p className="text-xs text-slate-400">{card.subtitle}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        {['Playlists', 'Liked', isApprovedCreator ? 'Uploads' : 'Creator'].map((tab) => (
          <button
            key={tab}
            onClick={() => {
              if (tab === 'Uploads' || tab === 'Creator') onNavigate('creator');
              else setActiveTab(tab);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === tab
                ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                : 'glass-card text-slate-300 hover:bg-white/10'
            }`}
          >
            {tab === 'Liked' ? `Liked Songs (${likedCount})` : tab}
          </button>
        ))}
      </div>

      {/* PLAYLISTS VIEW */}
      {activeTab === 'Playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Your Custom Playlists ({userPlaylists.length})</h3>
            <button
              onClick={() => setShowNewPlaylistModal(true)}
              className="text-xs font-bold text-teal-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Playlist
            </button>
          </div>

          {userPlaylists.length === 0 ? (
            <div className="p-12 rounded-3xl glass-card border border-white/5 text-center space-y-3">
              <Music className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="font-bold text-white text-sm">No custom playlists yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create custom playlists to organize your favorite soundscapes. Everything is saved to your account partition.
              </p>
              <button
                onClick={() => setShowNewPlaylistModal(true)}
                className="mt-2 py-2 px-4 rounded-xl glass-button-primary text-xs font-bold"
              >
                Create First Playlist
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userPlaylists.map((playlist, i) => (
                <div
                  key={playlist.id || i}
                  onClick={() => onPlayTrack(catalog.length > 0 ? catalog[i % catalog.length] : null)}
                  className="p-5 rounded-2xl glass-card glass-card-hover flex flex-col justify-between h-36 cursor-pointer relative group border border-white/10"
                >
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                      <Music className="w-5 h-5" />
                    </div>
                    <button
                      onClick={(e) => handleDelete(e, playlist.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm truncate group-hover:text-teal-300">{playlist.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{playlist.description || 'Personal Mix'}</p>
                    <span className="text-[10px] text-teal-400/80 font-mono mt-2 block">
                      {playlist.trackIds?.length || 0} tracks
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LIKED SONGS VIEW */}
      {activeTab === 'Liked' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-white">Liked Songs ({likedCount})</h3>
          </div>

          {likedTracks.length === 0 ? (
            <div className="p-12 rounded-3xl glass-card text-center space-y-2">
              <Heart className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-white">No liked songs in your account yet</p>
              <p className="text-xs text-slate-400">Click the heart icon on any track to save it here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {likedTracks.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => onPlayTrack(track)}
                  className="p-3.5 rounded-2xl glass-card glass-card-hover flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-500 w-4">{idx + 1}</span>
                    <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-11 h-11 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-white text-xs group-hover:text-teal-300">{track.title}</h4>
                      <p className="text-[11px] text-slate-400">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-slate-400">{track.duration}</span>
                    <button className="w-8 h-8 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow">
                      <Play className="w-3.5 h-3.5 fill-slate-950 ml-0.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showNewPlaylistModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-teal-500/30 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base">New Playlist</h3>
              <button
                onClick={() => setShowNewPlaylistModal(false)}
                className="p-1.5 rounded-full glass-card text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlaylist} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midnight Beats"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl glass-card border border-white/10 text-white text-base sm:text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Vibe for late night coding"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl glass-card border border-white/10 text-white text-base sm:text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  className="flex-1 py-2.5 rounded-xl glass-card text-xs font-semibold text-slate-300 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-2.5 rounded-xl glass-button-primary text-xs font-bold disabled:opacity-50"
                >
                  {isCreating ? 'Saving...' : 'Create Playlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

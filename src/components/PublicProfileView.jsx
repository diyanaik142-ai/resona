import { usePlayer } from '../context/PlayerContext';
import React, { useState, useEffect } from 'react';
import { Play, UserPlus, Check, ChevronLeft, MapPin } from 'lucide-react';
import { resolveMediaUrl,  getAuthHeaders, getApiBaseUrl } from '../services/api';
import Avatar from './Avatar';
import { useAuth } from '../context/AuthContext';

import { FollowersModal, FollowingModal } from './mobile/FollowersFollowingModals';

export default function PublicProfileView({ username,  onNavigate }) {
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

  const { refreshAccountData } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const headers = await getAuthHeaders();
      
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(username)}`, { headers });
      if (!res.ok) {
        throw new Error('Profile not found');
      }
      const data = await res.json();
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [username]);

  const toggleFollow = async () => {
    if (!profile) return;
    const isFollowing = profile.isFollowing;
    const method = isFollowing ? 'DELETE' : 'POST';
    
    // Optimistic update
    setProfile(prev => ({
      ...prev,
      isFollowing: !isFollowing,
      followersCount: prev.followersCount + (isFollowing ? -1 : 1)
    }));

    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(username)}/follow`, {
        method,
        headers
      });
      if (!res.ok) throw new Error('Failed to update follow status');
      if (refreshAccountData) {
        refreshAccountData().catch(console.error);
      }
    } catch (err) {
      console.error(err);
      // Revert optimistic update
      setProfile(prev => ({
        ...prev,
        isFollowing,
        followersCount: prev.followersCount + (isFollowing ? 1 : -1)
      }));
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Loading profile...</div>;
  if (error || !profile) return <div className="p-8 text-center text-rose-400">{error || 'Profile not found'}</div>;

  return (
    <div className="flex-1 overflow-y-auto pb-32">
      <div className="p-6 md:p-8 space-y-6">
        <button 
          onClick={() => onNavigate('BACK')} 
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center hover:bg-white/10 transition mb-4"
        >
          <ChevronLeft className="w-5 h-5 text-slate-300" />
        </button>
        
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <Avatar user={profile} className="w-32 h-32 rounded-full shadow-2xl ring-4 ring-teal-400/20 shrink-0" />
          <div className="text-center md:text-left space-y-3 flex-1">
            <h1 className="text-3xl font-black text-white">{profile.name}</h1>
            <p className="text-teal-400 font-mono text-sm">@{profile.handle}</p>
            <div className="flex gap-4 items-center justify-center md:justify-start text-sm text-slate-400 mt-2">
              <div onClick={() => setShowFollowers(true)} className="cursor-pointer hover:text-white transition">
                <strong className="text-white">{profile.followersCount || 0}</strong> Followers
              </div>
              <div onClick={() => setShowFollowing(true)} className="cursor-pointer hover:text-white transition">
                <strong className="text-white">{profile.followingCount || 0}</strong> Following
              </div>
            </div>
            <div className="flex justify-center md:justify-start gap-4 mt-4">
              <button 
                onClick={toggleFollow}
                className={`px-6 py-2 rounded-full font-bold hover:scale-105 transition flex items-center gap-2 ${
                  profile.isFollowing 
                    ? 'bg-white/10 text-white' 
                    : 'bg-teal-400 text-slate-950'
                }`}
              >
                {profile.isFollowing ? <><Check className="w-4 h-4" /> Following</> : <><UserPlus className="w-4 h-4" /> Follow</>}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <h3 className="font-bold text-lg text-white mb-4">Uploaded Tracks</h3>
          {profile.tracks && profile.tracks.length > 0 ? (
            <div className="space-y-2">
              {profile.tracks.map((track) => (
                <div key={track.id} onClick={() => onPlayTrack(track)} className="p-3 rounded-2xl glass-card hover:bg-white/10 flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-12 h-12 rounded-xl object-cover" />
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-teal-300">{track.title}</h4>
                      <p className="text-xs text-slate-400">{track.artist}</p>
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-teal-400" />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center glass-card rounded-2xl border border-dashed border-slate-700">
              <p className="text-slate-400">No tracks uploaded.</p>
            </div>
          )}
        </div>
      </div>
      {showFollowers && (
        <FollowersModal
          user={profile}
          onClose={() => setShowFollowers(false)}
          onRefresh={loadProfile}
          onNavigate={onNavigate}
        />
      )}
      
      {showFollowing && (
        <FollowingModal
          user={profile}
          onClose={() => setShowFollowing(false)}
          onRefresh={loadProfile}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

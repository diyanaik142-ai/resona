import { usePlayer } from '../context/PlayerContext';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import PlanBadge from './PlanBadge';
import BeatCodeQR from './BeatCodeQR';
import StartHuddleModal from './StartHuddleModal';
import FeatureUnavailable from './FeatureUnavailable';
import Avatar from './Avatar';
import { resolveMediaUrl,  api } from '../services/api';
import { subscribeHuddleEvent } from '../services/huddleSocket';
import { Users, QrCode, Share2, Radio, MessageCircle, Heart, X, Copy, Send, Check, ChevronRight, Layers, Image as ImageIcon, Camera, MoreHorizontal, Download, Plus, Bell, LogOut, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';

export default function SocialView({  onNavigate, activeHuddle, setActiveHuddle, setShowHuddleRoom, fusionsList = [], setFusionsList }) {
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

  const { user, shelf , catalog} = useAuth();
  const hasHuddle = user?.features?.huddle === true;
  const hasFusion = user?.features?.fusion === true;
  const [activeSubTab, setActiveSubTab] = useState('Friends & Profile');
  const [showStartHuddleModal, setShowStartHuddleModal] = useState(false);
  const [showCreateHuddleModal, setShowCreateHuddleModal] = useState(false);
  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsError, setFriendsError] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [isFetchingFriends, setIsFetchingFriends] = useState(false);
  const [huddleName, setHuddleName] = useState(`${user?.name || 'Listener'}'s Huddle`);
  const [huddleMode, setHuddleMode] = useState('HOST_CONTROLLED');
  const [joinHuddleId, setJoinHuddleId] = useState('');
  const [isSubmittingHuddle, setIsSubmittingHuddle] = useState(false);
  const [showBeatCodeModal, setShowBeatCodeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [beatColorHex, setBeatColorHex] = useState('#06b6d4');
  const [copied, setCopied] = useState(false);
  const [showCreateFusionModal, setShowCreateFusionModal] = useState(false);
  const [fusionSearchQuery, setFusionSearchQuery] = useState('');
  const [fusionSearchUsers, setFusionSearchUsers] = useState([]);
  const [fusionSelectedUser, setFusionSelectedUser] = useState(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isCreatingFusion, setIsCreatingFusion] = useState(false);

  const track = catalog.length > 0 ? catalog[0] : null;

  const triggerNotification = (msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  // Load fusions from backend on mount
  useEffect(() => {
    const loadFusions = async () => {
      try {
        const res = await api.social.getFusions();
        if (res.fusions && setFusionsList) {
          setFusionsList(res.fusions);
        }
      } catch (err) {
        console.warn('Could not load fusions:', err.message);
      }
    };
    loadFusions();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadFriends = async () => {
      try {
        setIsFetchingFriends(true);
        const res = await api.social.getFriends();
        if (isMounted) {
          setFriendsList(Array.isArray(res.friends) ? res.friends : []);
          setFriendsError('');
        }
      } catch (err) {
        if (isMounted) setFriendsError(err.message || 'Could not load your connections.');
        console.warn('[Social] Failed to fetch friends:', err.message);
      } finally {
        if (isMounted) setIsFetchingFriends(false);
      }
    };
    loadFriends();
    const unsubscribeActivity = subscribeHuddleEvent('listening_activity_updated', loadFriends);
    const refreshInterval = window.setInterval(loadFriends, 30_000);
    return () => {
      isMounted = false;
      unsubscribeActivity();
      window.clearInterval(refreshInterval);
    };
  }, [user?.id]);

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToHuddle = async () => {
    setShowShareModal(false);
    if (!activeHuddle) {
      triggerNotification('No active Huddle room running. Start a Huddle first!');
      return;
    }
    const trackToShare = track;
    if (!trackToShare) {
      triggerNotification('No track selected to share.');
      return;
    }
    try {
      const isHost = activeHuddle.hostId === user?.id || user?.role === 'admin';
      const isCollab = activeHuddle.mode === 'COLLABORATIVE';
      if (isHost || isCollab) {
        await api.huddle.addToQueue(activeHuddle.id, { trackId: trackToShare.id });
        triggerNotification(`Added "${trackToShare.title}" to Huddle Queue! 🎧`);
      } else {
        await api.huddle.recommend(activeHuddle.id, trackToShare.id);
        triggerNotification(`Recommended "${trackToShare.title}" for Huddle! 🎧`);
      }
    } catch (err) {
      triggerNotification(`Share error: ${err.message}`);
    }
  };

  const handleInitiateHuddle = (e) => {
    if (e) e.preventDefault();
    if (!hasHuddle) return;
    setShowStartHuddleModal(true);
  };

  const handleCreateHuddle = async (e) => {
    if (e) e.preventDefault();
    setIsSubmittingHuddle(true);
    try {
      const res = await api.huddle.create({
        name: huddleName.trim() || `${user?.name || 'Listener'}'s Huddle`,
        mode: huddleMode,
        invitedFriendIds: selectedFriendIds
      });
      if (res.huddle) {
        if (setActiveHuddle) setActiveHuddle(res.huddle);
        setShowCreateHuddleModal(false);
        if (setShowHuddleRoom) setShowHuddleRoom(true);
        triggerNotification(`Huddle "${res.huddle.name}" started! 🎧`);
      }
    } catch (err) {
      triggerNotification(`Failed to create Huddle: ${err.message}`);
    } finally {
      setIsSubmittingHuddle(false);
    }
  };

  const handleJoinHuddle = async (e) => {
    if (e) e.preventDefault();
    if (!joinHuddleId.trim()) return;
    setIsSubmittingHuddle(true);
    try {
      const res = await api.huddle.join(joinHuddleId.trim());
      if (res.huddle) {
        if (setActiveHuddle) setActiveHuddle(res.huddle);
        setShowCreateHuddleModal(false);
        if (setShowHuddleRoom) setShowHuddleRoom(true);
        triggerNotification(`Joined Huddle "${res.huddle.name}"! 🎧`);
      }
    } catch (err) {
      triggerNotification(`Failed to join Huddle: ${err.message}`);
    } finally {
      setIsSubmittingHuddle(false);
    }
  };

  const handleLeaveOrEndHuddle = async () => {
    if (!activeHuddle) return;
    try {
      const isHost = activeHuddle.hostId === user?.id || user?.role === 'admin';
      if (isHost) {
        await api.huddle.endHuddle(activeHuddle.id);
        triggerNotification('Huddle ended.');
      } else {
        await api.huddle.leave(activeHuddle.id);
        triggerNotification('Left Huddle.');
      }
      if (setActiveHuddle) setActiveHuddle(null);
    } catch (err) {
      triggerNotification(`Action error: ${err.message}`);
    }
  };

  const handleSearchFusionUsers = async (query) => {
    setFusionSearchQuery(query);
    if (!query.trim()) {
      setFusionSearchUsers([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const res = await api.social.searchUsers(query);
      if (res.users) {
        setFusionSearchUsers(res.users);
      }
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleCreateFusion = async () => {
    if (!fusionSelectedUser) {
      triggerNotification('Please select a friend to create a Fusion with.');
      return;
    }
    setIsCreatingFusion(true);
    try {
      const res = await api.social.createFusion([user.id, fusionSelectedUser.id]);
      if (res.fusion) {
        if (setFusionsList) setFusionsList(prev => [...prev, res.fusion]);
        setShowCreateFusionModal(false);
        setFusionSelectedUser(null);
        setFusionSearchQuery('');
        setFusionSearchUsers([]);
        triggerNotification(`Created Fusion with ${fusionSelectedUser.name}! ✨`);
      }
    } catch (err) {
      triggerNotification(`Failed to create Fusion: ${err.message}`);
    } finally {
      setIsCreatingFusion(false);
    }
  };

  const beatColors = [
    { id: 'c1', hex: '#06b6d4' },
    { id: 'c2', hex: '#10b981' },
    { id: 'c3', hex: '#8b5cf6' },
    { id: 'c4', hex: '#ec4899' },
    { id: 'c5', hex: '#f97316' },
    { id: 'c6', hex: '#f43f5e' }
  ];

  const sendMessage = () => {
    if (!inputMsg.trim()) return;
    setHuddleMessages([...huddleMessages, { sender: user?.name || 'You', text: inputMsg }]);
    setInputMsg('');
  };

  return (
    <div className="space-y-6 pb-24 relative max-w-5xl mx-auto">
      {/* IN-APP TOAST NOTIFICATION */}
      {notificationMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm glass-panel border border-teal-400/50 bg-slate-900/90 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Bell className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <p className="text-xs font-bold text-white leading-tight">{notificationMsg}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Social & Connect</h1>
        <p className="text-xs text-slate-400 mt-1">Connect, share Beat Codes, and listen together in real-time rooms.</p>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
        {['Friends & Profile', 'Friend Activity', 'Fusion (Shared Mix)', 'Huddle & Sharing'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`relative py-2 px-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeSubTab === tab ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {activeSubTab === tab && (
              <motion.div
                layoutId="desktopSocialTabActive"
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                initial={false}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* SUB TAB 1: FRIENDS & PROFILE */}
      {activeSubTab === 'Friends & Profile' && (
        <div className="space-y-4">
          <div className="p-4 sm:p-6 rounded-3xl glass-panel border border-white/10 flex items-center gap-4 sm:gap-5">
            <Avatar
              user={user}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-teal-400 shadow-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-black text-white text-lg sm:text-xl truncate">{user?.name || 'Listener'}</h2>
                <span className="text-[10px] font-bold text-teal-400 bg-teal-500/20 px-2 py-0.5 rounded-full shrink-0">
                  <PlanBadge plan={user?.plan ?? user?.planId} />
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {user?.email} • Verified Resona Account
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs font-semibold text-teal-300">
                <span>{shelf?.playlists?.length || 0} Playlists</span>
                <span>{shelf?.likedTrackIds?.length || 0} Liked Songs</span>
                <span className="text-slate-400">Followers: Not measured</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-bold text-lg text-white">Friends & Following</h3>
            {isFetchingFriends && friendsList.length === 0 ? (
              <div className="p-8 rounded-2xl glass-card text-center text-xs text-slate-400">Loading your connections...</div>
            ) : friendsError ? (
              <div className="p-8 rounded-2xl glass-card border border-white/5 text-center text-xs text-slate-400">
                {friendsError}
              </div>
            ) : friendsList.length === 0 ? (
              <div className="p-8 rounded-2xl glass-card border border-white/5 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="font-bold text-white text-xs">No friends yet</p>
                <p className="text-[11px] text-slate-400">Follow people to see their activity here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {friendsList.map((friend) => (
                  <div key={friend.id} className="p-3 rounded-2xl glass-card border border-white/5 flex items-center gap-3">
                    <Avatar user={{ avatar: friend.avatar, name: friend.name }} className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{friend.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">
                        {friend.listeningActivity
                          ? `Listening to ${friend.listeningActivity.title}${friend.listeningActivity.artist ? ` · ${friend.listeningActivity.artist}` : ''}`
                          : friend.statusText || 'Offline'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {!hasHuddle ? (
              <div className="flex-1">
                <FeatureUnavailable title="Huddle" />
              </div>
            ) : activeHuddle ? (
              <button
                onClick={() => setShowHuddleRoom(true)}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-teal-500 to-indigo-600 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 hover:brightness-110 transition animate-pulse"
              >
                <Radio className="w-4 h-4 text-white" /> Open Active Huddle ({activeHuddle.name})
              </button>
            ) : (
              <button
                onClick={handleInitiateHuddle}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 hover:brightness-110 transition"
              >
                <Radio className="w-4 h-4" /> Start Listening Huddle
              </button>
            )}
            <button
              onClick={() => setShowBeatCodeModal(true)}
              className="py-3.5 px-6 rounded-2xl glass-card font-bold text-xs text-teal-300 flex items-center justify-center gap-2 hover:bg-white/10 border border-teal-500/20 transition w-full sm:w-auto"
            >
              <QrCode className="w-4 h-4" /> Beat Code
            </button>
          </div>
        </div>
      )}

      {/* SUB TAB 2: FRIEND ACTIVITY FEED */}
      {activeSubTab === 'Friend Activity' && (
        <div className="space-y-3">
          <h3 className="font-bold text-lg text-white">Friend Activity</h3>
          {isFetchingFriends && friendsList.length === 0 ? (
            <div className="p-8 rounded-2xl glass-card border border-white/5 text-center text-xs text-slate-400">
              Loading friend activity...
            </div>
          ) : friendsError ? (
            <div className="p-8 rounded-2xl glass-card border border-white/5 text-center text-xs text-slate-400">
              {friendsError}
            </div>
          ) : friendsList.filter((friend) => friend.listeningActivity).length === 0 ? (
            <div className="p-8 rounded-2xl glass-card border border-white/5 text-center space-y-2">
              <Users className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="font-bold text-white text-xs">No friends are listening right now.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {friendsList.filter((friend) => friend.listeningActivity).map((friend) => (
                <div key={friend.id} className="p-3 rounded-2xl glass-card border border-white/5 flex items-center gap-3">
                  <Avatar user={{ avatar: friend.avatar, name: friend.name }} className="w-10 h-10 rounded-xl shrink-0" />
                  <p className="text-xs text-white">
                    <span className="font-bold text-teal-300">{friend.name}</span>
                    {' is listening to '}
                    <span>{friend.listeningActivity.title}</span>
                    {friend.listeningActivity.artist ? ` by ${friend.listeningActivity.artist}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}


      {/* SUB TAB 3: FUSION (SHARED MIX) */}
      {activeSubTab === 'Fusion (Shared Mix)' && (
        !hasFusion ? <FeatureUnavailable title="Fusion" /> :
        <div className="space-y-4">
          <div className="p-6 rounded-3xl glass-panel border border-teal-500/30 text-center space-y-4">
            <div className="flex justify-center -space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 font-bold border-2 border-slate-900 shadow-xl">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white">Create Fusion</h2>
              <p className="text-xs text-slate-400">Blend your music tastes with friends and discover something new together.</p>
            </div>

            <button
              onClick={() => {
                setShowCreateFusionModal(true);
                setFusionSelectedUser(null);
                setFusionSearchQuery('');
                setFusionSearchUsers([]);
              }}
              className="w-full py-3.5 rounded-2xl glass-button-primary font-bold text-sm shadow-lg"
            >
              Create New Fusion
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-sm text-slate-400 uppercase">Your Active Fusions</h4>
            {fusionsList.length > 0 ? fusionsList.map((fusion) => (
              <div key={fusion.id} className="p-3.5 rounded-2xl glass-card flex items-center justify-between cursor-pointer hover:bg-white/10">
                <div>
                  <span className="text-xs font-bold text-white block">
                    {fusion.participantsData?.filter(p => p.id !== user?.id).map(p => p.name).join(', ') || 'Shared Fusion'}
                  </span>
                  <span className="text-[10px] text-slate-400">Shared Mix</span>
                </div>
                <Share2 className="w-4 h-4 text-teal-400" />
              </div>
            )) : (
              <div className="text-xs text-slate-400 text-center py-4">No Fusions yet. Create one above!</div>
            )}
          </div>
        </div>
      )}

      {/* SUB TAB 4: HUDDLE & SHARING QUICK BUTTONS */}
      {activeSubTab === 'Huddle & Sharing' && (
        !hasHuddle ? <FeatureUnavailable title="Huddle" /> :
        <div className="space-y-4">
          {activeHuddle && activeHuddle.status === 'active' ? (
            <div className="p-6 rounded-3xl glass-panel border border-teal-500/30 bg-slate-900/60 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
                    <Radio className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-white text-lg">{activeHuddle.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                        {activeHuddle.mode === 'COLLABORATIVE' ? 'Collaborative' : 'Host Controlled'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Host: <span className="text-slate-200 font-medium">{activeHuddle.hostName}</span> • {activeHuddle.participants?.length || 1} participants
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleLeaveOrEndHuddle}
                  className="px-3 py-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-bold transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {activeHuddle.hostId === user?.id || user?.role === 'admin' ? 'End Huddle' : 'Leave'}
                </button>
              </div>

              {/* Now Playing card */}
              <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {activeHuddle.nowPlaying ? (
                    <img
                      src={resolveMediaUrl(activeHuddle.nowPlaying.artwork)}
                      alt={activeHuddle.nowPlaying.title}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-slate-500">
                      <Radio className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block">Now Playing</span>
                    <p className="font-bold text-white text-sm">
                      {activeHuddle.nowPlaying ? activeHuddle.nowPlaying.title : 'Playback paused'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {activeHuddle.nowPlaying ? activeHuddle.nowPlaying.artist : 'Add songs to start listening together'}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold text-slate-300 block">
                    {activeHuddle.queue?.length || 0} in Up Next
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {activeHuddle.recommendations?.filter(r => r.status === 'pending')?.length || 0} pending recs
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowHuddleRoom(true)}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-indigo-600 font-bold text-xs text-white shadow-lg shadow-teal-500/20 hover:brightness-110 transition flex items-center justify-center gap-2"
                >
                  <Radio className="w-4 h-4" /> Open Huddle Queue & Room
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setShowCreateHuddleModal(true)}
                className="p-5 rounded-3xl glass-panel border border-purple-500/30 cursor-pointer hover:scale-[1.02] transition space-y-2"
              >
                <Radio className="w-8 h-8 text-purple-400" />
                <h3 className="font-bold text-white text-base">Start or Join Huddle</h3>
                <p className="text-xs text-slate-400">Real-time synchronized listening room with shared queue and voting.</p>
              </div>

              <div
                onClick={() => setShowShareModal(true)}
                className="p-5 rounded-3xl glass-panel border border-teal-500/30 cursor-pointer hover:scale-[1.02] transition space-y-2"
              >
                <Share2 className="w-8 h-8 text-teal-400" />
                <h3 className="font-bold text-white text-base">Share Track</h3>
                <p className="text-xs text-slate-400">Generate links, beat codes or social stories.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FRIEND SELECTION MODAL */}
      {showInviteFriendsModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-white/10 p-6 space-y-5 relative shadow-2xl">
            <button
              onClick={() => {
                setShowInviteFriendsModal(false);
                setSelectedFriendIds([]);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Start a Huddle</h3>
                <p className="text-xs text-slate-400">Select friends to invite</p>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
              {isFetchingFriends ? (
                <div className="text-xs text-slate-400 text-center py-4">Loading friends...</div>
              ) : friendsList.length === 0 ? (
                <div className="text-xs text-slate-400 text-center py-4">No friends found.</div>
              ) : (
                friendsList.map(friend => (
                  <div key={friend.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50 border border-white/5">
                    <Avatar user={{ name: friend.name, avatar: friend.avatar }} className="w-10 h-10 rounded-xl shrink-0 object-cover" />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">{friend.name}</div>
                      <div className="text-[10px] text-slate-400">{friend.statusText || 'Offline'}</div>
                    </div>
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only"
                        checked={selectedFriendIds.includes(friend.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFriendIds(prev => [...prev, friend.id]);
                          } else {
                            setSelectedFriendIds(prev => prev.filter(id => id !== friend.id));
                          }
                        }}
                      />
                      <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${selectedFriendIds.includes(friend.id) ? 'bg-teal-500 border-teal-500' : 'border-white/20'}`}>
                        {selectedFriendIds.includes(friend.id) && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                disabled={selectedFriendIds.length === 0}
                onClick={() => {
                  setShowInviteFriendsModal(false);
                  setShowCreateHuddleModal(true);
                }}
                className="w-full py-3 rounded-2xl bg-teal-500 font-bold text-xs text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {selectedFriendIds.length === 0 ? 'Select at least 1 friend to continue' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REAL CREATE / JOIN HUDDLE MODAL */}
      {showCreateHuddleModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-white/10 p-6 space-y-5 relative shadow-2xl">
            <button
              onClick={() => setShowCreateHuddleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Huddle Listening Room</h3>
                <p className="text-xs text-slate-400">Synchronized playback & real-time shared queue</p>
              </div>
            </div>

            {/* CREATE FORM */}
            <form onSubmit={handleCreateHuddle} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Huddle Name</label>
                <input
                  type="text"
                  value={huddleName}
                  onChange={(e) => setHuddleName(e.target.value)}
                  placeholder="E.g. Late Night Vibes"
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Queue Permission Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHuddleMode('HOST_CONTROLLED')}
                    className={`p-3 rounded-xl text-left border transition ${
                      huddleMode === 'HOST_CONTROLLED'
                        ? 'border-teal-400 bg-teal-500/10 text-white'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 mb-1 text-teal-400" />
                    <span className="text-xs font-bold block">Host Controlled</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Participants can only recommend tracks</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHuddleMode('COLLABORATIVE')}
                    className={`p-3 rounded-xl text-left border transition ${
                      huddleMode === 'COLLABORATIVE'
                        ? 'border-indigo-400 bg-indigo-500/10 text-white'
                        : 'border-white/5 bg-slate-800/40 text-slate-400 hover:bg-white/5'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-1 text-indigo-400" />
                    <span className="text-xs font-bold block">Collaborative</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Anyone can add tracks and vote</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingHuddle}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-xs text-white shadow-lg shadow-purple-600/20 hover:brightness-110 disabled:opacity-50 transition"
              >
                {isSubmittingHuddle ? 'Creating...' : 'Create Huddle Session'}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-slate-900 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest absolute">
                Or Join Existing
              </span>
            </div>

            {/* JOIN BY ID */}
            <form onSubmit={handleJoinHuddle} className="flex gap-2">
              <input
                type="text"
                value={joinHuddleId}
                onChange={(e) => setJoinHuddleId(e.target.value)}
                placeholder="Enter Huddle ID..."
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800/80 border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
              />
              <button
                type="submit"
                disabled={isSubmittingHuddle || !joinHuddleId.trim()}
                className="px-4 py-2 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs hover:bg-teal-300 disabled:opacity-50 transition flex items-center gap-1"
              >
                Join <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BEAT CODES */}
      {showBeatCodeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl border border-teal-500/30 p-6 text-center space-y-5 relative shadow-2xl">
            <button onClick={() => setShowBeatCodeModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-black text-white text-xl">Beat Codes</h3>
              <p className="text-xs text-slate-400 mt-1">Share music instantly.</p>
            </div>

            <div className="mx-auto flex items-center justify-center p-2 rounded-3xl glass-panel border border-pink-500/30">
              {track ? <BeatCodeQR trackId={track.id} cover={track.cover} primaryColor={beatColorHex} /> : <div className="w-32 h-32 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-500">No Track</div>}
            </div>

              <div className="flex flex-col gap-2 w-full mt-4">
                <button
                  onClick={async () => {
                    const url = `https://resona.anchorlyhms.com/song/${track.id}`;
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: `Listen to ${track.title} on Resona`,
                          text: `Listen to ${track.title} by ${track.artist} on Resona`,
                          url
                        });
                        triggerNotification('Shared successfully');
                      } catch (err) {
                        console.log('Share canceled', err);
                      }
                    } else {
                      try {
                        await navigator.clipboard.writeText(url);
                        triggerNotification('Link copied');
                      } catch (err) {
                        triggerNotification("Couldn't copy link");
                      }
                    }
                  }}
                  className="w-full py-2.5 rounded-xl glass-button-primary text-xs font-bold"
                >
                  Share Beat Code
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      const url = `https://resona.anchorlyhms.com/song/${track.id}`;
                      try {
                        await navigator.clipboard.writeText(url);
                        triggerNotification('Link copied');
                      } catch (err) {
                        triggerNotification("Couldn't copy link");
                      }
                    }}
                    className="flex-1 py-2.5 rounded-xl glass-card border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                  >
                    Copy Link
                  </button>
                  <button
                    onClick={() => {
                      const svg = document.getElementById('beatcode-qr-svg');
                      if (!svg) return;
                      const svgData = new XMLSerializer().serializeToString(svg);
                      const canvas = document.createElement("canvas");
                      const ctx = canvas.getContext("2d");
                      const img = new Image();
                      img.onload = () => {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        ctx.drawImage(img, 0, 0);
                        const pngFile = canvas.toDataURL("image/png");
                        const downloadLink = document.createElement("a");
                        downloadLink.download = `Resona-BeatCode-${track.id}.png`;
                        downloadLink.href = pngFile;
                        downloadLink.click();
                        triggerNotification('Beat Code saved');
                      };
                      img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                    }}
                    className="flex-1 py-2.5 rounded-xl glass-card border border-white/10 text-xs font-bold text-white hover:bg-white/5"
                  >
                    Save Beat Code
                  </button>
                </div>
              </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => triggerNotification('Beat Code saved to gallery!')}
                className="flex-1 py-3 rounded-2xl glass-card border border-white/10 text-xs font-bold text-white flex flex-col items-center justify-center gap-1 hover:bg-white/10"
              >
                <Download className="w-4 h-4 text-teal-400" />
                <span>Download</span>
              </button>

              <button
                onClick={() => {
                  setShowBeatCodeModal(false);
                  setShowShareModal(true);
                }}
                className="flex-1 py-3 rounded-2xl glass-button-primary text-xs font-bold flex flex-col items-center justify-center gap-1"
              >
                <Share2 className="w-4 h-4 text-slate-950" />
                <span>Share</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN SHARE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl border border-white/10 p-5 space-y-4 relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-xl">Share</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-4">
              <p className="text-xs text-slate-400 font-semibold text-center">Share this track</p>

              <div className="flex items-center justify-between p-2.5 rounded-2xl glass-card">
                <div className="flex items-center gap-3">
                  {track && <img src={resolveMediaUrl(track.cover)} alt="Track" className="w-10 h-10 rounded-xl object-cover" />}
                  <div>
                    {track && <p className="font-bold text-white text-xs">{track.title}</p>}
                    {track && <p className="text-[10px] text-slate-400">{track.artist}</p>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <button onClick={handleCopyLink} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-full glass-card border border-white/10 flex items-center justify-center text-white group-hover:bg-white/20 transition">
                    {copied ? <Check className="w-5 h-5 text-teal-400" /> : <Copy className="w-5 h-5" />}
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium">{copied ? 'Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShowBeatCodeModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full glass-card border border-white/10 flex items-center justify-center text-teal-400 group-hover:bg-white/20 transition">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium">Beat Code</span>
                </button>

                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShowStoryCardModal(true);
                  }}
                  className="flex flex-col items-center gap-1.5 group"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium">Instagram</span>
                </button>

                <button onClick={() => triggerNotification('Native share menu opened')} className="flex flex-col items-center gap-1.5 group">
                  <div className="w-12 h-12 rounded-full glass-card border border-white/10 flex items-center justify-center text-slate-300 group-hover:bg-white/20 transition">
                    <MoreHorizontal className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] text-slate-300 font-medium">More</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div
                onClick={handleShareToHuddle}
                className="p-3.5 rounded-2xl glass-card border border-purple-500/20 flex items-center justify-between cursor-pointer hover:bg-purple-500/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 group-hover:scale-105 transition">
                    <Radio className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs group-hover:text-teal-300">Share to Huddle</h4>
                    <p className="text-[10px] text-slate-400">
                      {activeHuddle ? 'Share to ongoing Huddle room' : 'Invite friends to listen'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>


              <div
                onClick={() => {
                  setShowShareModal(false);
                  setShowStoryCardModal(true);
                }}
                className="p-3.5 rounded-2xl glass-card border border-blue-500/20 flex items-center justify-between cursor-pointer hover:bg-blue-500/10 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 group-hover:scale-105 transition">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xs group-hover:text-teal-300">Share to Story</h4>
                    <p className="text-[10px] text-slate-400">Generate story card image</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* CREATE FUSION MODAL */}
      {showCreateFusionModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl border border-pink-500/30 p-5 space-y-4 relative shadow-2xl">
            <button
              onClick={() => {
                setShowCreateFusionModal(false);
                setFusionSelectedUser(null);
                setFusionSearchQuery('');
                setFusionSearchUsers([]);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-pink-500/20 text-pink-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-lg">Create Fusion</h3>
                <p className="text-xs text-slate-400">Select a friend to blend mixes with</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users to fuse with..."
                  value={fusionSearchQuery}
                  onChange={(e) => handleSearchFusionUsers(e.target.value)}
                  className="w-full py-2.5 pl-3 pr-10 rounded-xl glass-card text-white text-sm border border-white/10 focus:outline-none focus:border-pink-400 transition"
                />
                {isSearchingUsers && (
                  <div className="absolute right-3 top-2.5 w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                )}
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
                {fusionSearchUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setFusionSelectedUser(u)}
                    className={`p-3 rounded-2xl glass-card flex items-center justify-between cursor-pointer transition ${
                      fusionSelectedUser?.id === u.id ? 'border border-pink-500 bg-pink-500/10' : 'hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar user={{ name: u.name, avatar: u.avatar }} className="w-8 h-8 rounded-full shrink-0" />
                      <div>
                        <p className="font-bold text-white text-xs">{u.name}</p>
                        <p className="text-[10px] text-slate-400">{u.handle}</p>
                      </div>
                    </div>
                    {fusionSelectedUser?.id === u.id && <Check className="w-4 h-4 text-pink-400" />}
                  </div>
                ))}
                {fusionSearchQuery && fusionSearchUsers.length === 0 && !isSearchingUsers && (
                  <div className="text-center py-4 text-xs text-slate-400">No users found.</div>
                )}
              </div>

              <button
                onClick={handleCreateFusion}
                disabled={!fusionSelectedUser || isCreatingFusion}
                className="w-full py-3 rounded-2xl glass-button-primary font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingFusion ? 'Creating...' : 'Create Fusion Mix'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: STORY CARD MODAL WITH DOWNLOAD */}
      {showStoryCardModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl border border-blue-500/30 p-5 text-center space-y-4 relative shadow-2xl">
            <button onClick={() => setShowStoryCardModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-extrabold text-white text-lg">Story Card Preview</h3>
              <p className="text-xs text-slate-400">Ready for Instagram / Snapchat stories</p>
            </div>

            <div className="mx-auto w-56 h-80 rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 p-4 border border-white/20 shadow-2xl flex flex-col justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-teal-500/20 to-transparent pointer-events-none" />

              <span className="text-[10px] font-black text-teal-300 uppercase tracking-widest bg-teal-500/20 px-3 py-1 rounded-full z-10">
                RESONA MUSIC
              </span>

              {track && <img src={resolveMediaUrl(track.cover)} alt="Story Artwork" className="w-32 h-32 rounded-2xl object-cover shadow-2xl z-10 border border-white/30" />}

              <div className="z-10 text-center">
                <h4 className="font-black text-white text-base leading-tight">{track ? track.title : "No Track"}</h4>
                <p className="text-xs text-slate-300 font-semibold">{track ? track.artist : ""}</p>
                <p className="text-[9px] text-teal-400 mt-1">Listen on resona.app</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => triggerNotification('Story card image downloaded to gallery! 📸')}
                className="flex-1 py-3 rounded-2xl glass-button-primary font-bold text-xs flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-slate-950" /> Download Card
              </button>
              <button onClick={() => setShowStoryCardModal(false)} className="py-3 px-4 rounded-2xl glass-card text-xs font-semibold">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* START HUDDLE MODAL (FRIEND SELECTION & REAL-TIME INVITATIONS) */}
      <StartHuddleModal
        isOpen={hasHuddle && showStartHuddleModal}
        onClose={() => setShowStartHuddleModal(false)}
        mode="create"
        activeHuddle={activeHuddle}
        currentTrack={track}
        onHuddleCreated={(newHuddle) => {
          if (setActiveHuddle) setActiveHuddle(newHuddle);
          if (setShowHuddleRoom) setShowHuddleRoom(true);
          triggerNotification(`Huddle "${newHuddle.name}" started! 🎧`);
        }}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Users, Radio, Pin, PinOff, Sparkles, MessageCircle, MoreVertical,
  Plus, Disc, Heart, Play, Share2, ChevronRight, X, UserCheck, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { api, resolveMediaUrl } from '../../services/api';
import StartHuddleModal from '../StartHuddleModal';
import Avatar from '../Avatar';

export default function MobileSocialView({
  user,
  catalog = [],
  activeHuddle,
  setActiveHuddle,
  setShowHuddleRoom,
  currentTrack,
  onInitiateHuddle,
  onOpenHuddleRoom,
  fusionsList = [],
  setFusionsList,
  onPlayTrack
}) {
  const [activeTab, setActiveTab] = useState('Friends & Following'); // 'Friends & Following' | 'Activity' | 'Shared With' | 'Fusion' | 'Huddle'
  const [showStartHuddleModal, setShowStartHuddleModal] = useState(false);
  const [friends, setFriends] = useState([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [pinnedFriendIds, setPinnedFriendIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('resona_pinned_friends') || '[]');
    } catch {
      return [];
    }
  });
  const [nicknames, setNicknames] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('resona_friend_nicknames') || '{}');
    } catch {
      return {};
    }
  });

  // Selected friend for profile sheet
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showCreateFusion, setShowCreateFusion] = useState(false);
  const [fusionSearchQuery, setFusionSearchQuery] = useState('');
  const [fusionSearchUsers, setFusionSearchUsers] = useState([]);
  const [fusionSelectedUser, setFusionSelectedUser] = useState(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isCreatingFusion, setIsCreatingFusion] = useState(false);

  // Load real friends
  useEffect(() => {
    let isMounted = true;
    const loadFriends = async () => {
      try {
        setLoadingFriends(true);
        const res = await api.social.getFriends();
        if (isMounted) {
          const list = Array.isArray(res.friends) ? res.friends : Array.isArray(res) ? res : [];
          setFriends(list);
        }
      } catch (err) {
        console.warn('[MobileSocial] Failed to fetch friends:', err.message);
      } finally {
        if (isMounted) setLoadingFriends(false);
      }
    };
    loadFriends();
    return () => { isMounted = false; };
  }, []);

  // Load fusions from backend on mount
  useEffect(() => {
    const loadFusions = async () => {
      try {
        const res = await api.social.getFusions();
        if (res.fusions && setFusionsList) {
          setFusionsList(res.fusions);
        }
      } catch (err) {
        console.warn('[MobileSocial] Could not load fusions:', err.message);
      }
    };
    loadFusions();
  }, []);

  const togglePinFriend = (friendId) => {
    const updated = pinnedFriendIds.includes(friendId)
      ? pinnedFriendIds.filter(id => id !== friendId)
      : [...pinnedFriendIds, friendId];
    setPinnedFriendIds(updated);
    localStorage.setItem('resona_pinned_friends', JSON.stringify(updated));
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
    if (!fusionSelectedUser) return;
    setIsCreatingFusion(true);
    try {
      const res = await api.social.createFusion([user.id, fusionSelectedUser.id]);
      if (res.fusion) {
        if (setFusionsList) setFusionsList([res.fusion, ...fusionsList]);
        setShowCreateFusion(false);
        setFusionSelectedUser(null);
        setFusionSearchQuery('');
        setFusionSearchUsers([]);
      }
    } catch (err) {
      console.error('Failed to create Fusion:', err.message);
    } finally {
      setIsCreatingFusion(false);
    }
  };

  // Sort: pinned first
  const sortedFriends = [...friends].sort((a, b) => {
    const aPinned = pinnedFriendIds.includes(a.id);
    const bPinned = pinnedFriendIds.includes(b.id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return 0;
  });

  return (
    <div className="space-y-4 pb-6 pt-2 px-4 w-full max-w-full overflow-hidden">
      {/* Horizontal Category Switcher */}
      <div className="w-full max-w-full flex gap-4 overflow-x-auto pb-2 no-scrollbar overscroll-x-contain snap-x">
        {['Friends & Following', 'Activity', 'Shared With', 'Fusion', 'Huddle'].map((tab) => (
          <button
            key={tab}
            onClick={(e) => {
              setActiveTab(tab);
              // Ensure tab scrolls into view (centered)
              e.target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }}
            className={`shrink-0 relative py-2 px-1 text-xs font-bold whitespace-nowrap transition-colors snap-center ${
              activeTab === tab
                ? 'text-teal-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="mobileSocialTabActive"
                className="absolute -bottom-1 left-0 right-0 h-[3px] bg-teal-400 rounded-full shadow-[0_0_8px_rgba(45,212,191,0.6)]"
                initial={false}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: FRIENDS */}
      {activeTab === 'Friends & Following' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Friends & Following ({friends.length})
            </h3>
          </div>

          {loadingFriends ? (
            <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
              Syncing friend roster...
            </div>
          ) : friends.length === 0 ? (
            <div className="p-8 rounded-3xl glass-card border border-dashed border-white/10 text-center space-y-3">
              <Users className="w-10 h-10 text-slate-500 mx-auto opacity-50" />
              <h4 className="font-bold text-white text-sm">No Friends Yet</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Connect with listeners on Resona to listen together in live Huddles and create shared Fusions.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sortedFriends.map((f) => {
                const isPinned = pinnedFriendIds.includes(f.id);
                const nickname = nicknames[f.id];
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      setSelectedFriend(f);
                      setShowProfileSheet(true);
                    }}
                    className="flex items-center justify-between p-3 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-[0.99] group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="relative w-12 h-12 rounded-2xl overflow-hidden shrink-0 shadow-md border border-white/10 bg-slate-800">
                        <Avatar user={{ avatar: f.avatar || f.photoURL, name: f.name }} className="w-full h-full" />
                        <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-teal-400 border-2 border-slate-950" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-white text-sm truncate group-hover:text-teal-300 transition">
                            {nickname || f.name}
                          </h4>
                          {isPinned && (
                            <Pin className="w-3 h-3 text-teal-400 fill-teal-400 shrink-0" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {f.handle || `@${(f.name || 'user').toLowerCase().replace(/\s+/g, '')}`}
                          {' · '}
                          <span className="text-teal-300 font-medium">Listening now</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => togglePinFriend(f.id)}
                        className={`p-2 rounded-xl glass-card transition active:scale-90 ${
                          isPinned ? 'text-teal-400 border-teal-500/30' : 'text-slate-500 hover:text-white'
                        }`}
                        title={isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        onClick={() => {
                          if (onInitiateHuddle) onInitiateHuddle();
                        }}
                        className="p-2 rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition border border-purple-500/30 active:scale-90"
                        title="Start Huddle"
                      >
                        <Radio className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: ACTIVITY */}
      {activeTab === 'Activity' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Activity</p>
          {friends.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 rounded-2xl glass-card border border-white/5">
              No friend activity to display.
            </div>
          ) : (
            <div className="space-y-2">
              {friends.slice(0, 5).map((f, idx) => (
                <div key={`act_${f.id}_${idx}`} className="p-3 rounded-2xl glass-card border border-white/5 flex items-center gap-3">
                  <Avatar user={{ avatar: f.avatar, name: f.name || 'User' }} className="w-10 h-10 rounded-xl shrink-0 object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white">
                      <span className="font-bold text-teal-300">{f.name}</span> started listening to a master stream
                    </p>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">15m ago</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SHARED WITH */}
      {activeTab === 'Shared With' && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shared Library Overview</p>
          <div className="p-4 rounded-3xl glass-card border border-teal-500/20 space-y-3">
            <h4 className="font-bold text-white text-sm">Factual Connection Metrics</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-slate-400 text-[10px]">Active Friends</p>
                <p className="text-base font-black text-white mt-0.5">{friends.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-slate-400 text-[10px]">Shared Fusions</p>
                <p className="text-base font-black text-teal-300 mt-0.5">{fusionsList.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-slate-400 text-[10px]">Catalog Tracks</p>
                <p className="text-base font-black text-white mt-0.5">{catalog.length}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                <p className="text-slate-400 text-[10px]">Huddle Audio Mode</p>
                <p className="text-base font-black text-purple-300 mt-0.5">Lossless Master</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FUSION */}
      {activeTab === 'Fusion' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Fusions</p>
            <button
              onClick={() => setShowCreateFusion(true)}
              className="py-1.5 px-3 rounded-xl glass-button-primary text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Fusion</span>
            </button>
          </div>

          {showCreateFusion && (
            <div className="p-4 rounded-2xl glass-card border border-teal-500/30 space-y-3">
              <h4 className="font-bold text-white text-xs">Create Fusion Mix</h4>
              <p className="text-[10px] text-slate-400">Search for a friend to blend your music tastes with.</p>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={fusionSearchQuery}
                  onChange={(e) => handleSearchFusionUsers(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl glass-card text-white text-base border border-white/10 focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 no-scrollbar">
                {fusionSearchUsers.map((u) => (
                  <div
                    key={u.id}
                    onClick={() => setFusionSelectedUser(u)}
                    className={`flex items-center gap-3 p-2 rounded-xl border transition ${
                      fusionSelectedUser?.id === u.id ? 'border-teal-400 bg-teal-500/10' : 'border-white/5 bg-slate-800'
                    }`}
                  >
                    <Avatar user={{ avatar: u.avatar, name: u.name }} className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-white truncate">{u.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.handle}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCreateFusion}
                  disabled={!fusionSelectedUser || isCreatingFusion}
                  className="flex-1 py-2.5 rounded-xl glass-button-primary text-xs font-bold disabled:opacity-50"
                >
                  {isCreatingFusion ? 'Creating...' : 'Generate Mix'}
                </button>
                <button
                  onClick={() => setShowCreateFusion(false)}
                  className="py-2.5 px-4 rounded-xl glass-card text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {fusionsList.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 rounded-2xl glass-card border border-white/5 space-y-2">
              <Disc className="w-8 h-8 text-slate-500 mx-auto opacity-50" />
              <p className="font-bold text-white text-sm">No Fusion Mixes</p>
              <p>Create a shared mix blending your sonic taste with a friend.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {fusionsList.map((fus) => (
                <div
                  key={fus.id}
                  className="p-3 rounded-2xl glass-card border border-white/5 flex items-center justify-between group hover:border-teal-500/30 transition cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                      <Disc className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs">
                        Fusion: {fus.participantsData?.filter(p => p.id !== user?.id).map(p => p.name).join(', ') || 'Unknown'}
                      </h4>
                      <p className="text-[10px] text-slate-400">Shared Mix</p>
                    </div>
                  </div>
                  <button
                    onClick={() => catalog.length > 0 && onPlayTrack && onPlayTrack(catalog[0])}
                    className="w-8 h-8 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center shadow-md active:scale-90"
                    title="Play Fusion"
                  >
                    <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: HUDDLE */}
      {activeTab === 'Huddle' && (
        <div className="space-y-3">
          {activeHuddle ? (
            <div className="p-4 rounded-3xl glass-card border border-teal-500/40 bg-teal-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="font-black text-white text-sm">{activeHuddle.name}</h4>
                    <p className="text-[11px] text-slate-400">Code: #{activeHuddle.code || activeHuddle.id}</p>
                  </div>
                </div>
                <button
                  onClick={onOpenHuddleRoom}
                  className="py-2 px-4 rounded-xl glass-button-primary text-xs font-bold shadow-lg"
                >
                  Open Room
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-3xl glass-card border border-purple-500/30 text-center space-y-3">
              <Radio className="w-10 h-10 text-purple-400 mx-auto" />
              <h4 className="font-black text-white text-base">Start a Listening Huddle</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Listen to master tracks simultaneously with synchronized playback, live chat, and democratic voting.
              </p>
              <button
                onClick={() => onInitiateHuddle ? onInitiateHuddle() : setShowStartHuddleModal(true)}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-xs text-white shadow-lg shadow-purple-600/20 active:scale-95 transition"
              >
                Start a Huddle
              </button>
            </div>
          )}
        </div>
      )}

      {/* FRIEND PROFILE BOTTOM SHEET */}
      {showProfileSheet && selectedFriend && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in duration-200">
          <div className="fixed inset-0" onClick={() => setShowProfileSheet(false)} aria-hidden="true" />
          <div className="relative z-10 w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[85dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <Avatar
                  user={{ avatar: selectedFriend.avatar || selectedFriend.photoURL, name: selectedFriend.name }}
                  className="w-14 h-14 rounded-2xl border-2 border-teal-400 shadow-md shrink-0"
                />
                <div>
                  <h3 className="font-black text-white text-base">{selectedFriend.name}</h3>
                  <p className="text-xs text-slate-400">{selectedFriend.handle || '@user'}</p>
                  <span className="text-[10px] text-teal-400 font-bold">Mutual Friend</span>
                </div>
              </div>
              <button
                onClick={() => setShowProfileSheet(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full glass-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Actions: [Message] [Huddle] [Fusion] */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setShowProfileSheet(false);
                  if (onInitiateHuddle) onInitiateHuddle();
                  else setShowStartHuddleModal(true);
                }}
                className="py-2.5 px-3 rounded-xl bg-purple-500/20 text-purple-300 font-bold text-xs flex flex-col items-center gap-1 border border-purple-500/30 active:scale-95"
              >
                <Radio className="w-4 h-4" />
                <span>Huddle</span>
              </button>
              <button
                onClick={() => {
                  setShowProfileSheet(false);
                  setActiveTab('Fusion');
                }}
                className="py-2.5 px-3 rounded-xl bg-teal-500/20 text-teal-300 font-bold text-xs flex flex-col items-center gap-1 border border-teal-500/30 active:scale-95"
              >
                <Disc className="w-4 h-4" />
                <span>Fusion</span>
              </button>
              <button
                onClick={() => togglePinFriend(selectedFriend.id)}
                className="py-2.5 px-3 rounded-xl glass-card text-slate-300 font-bold text-xs flex flex-col items-center gap-1 border border-white/10 active:scale-95"
              >
                <Pin className="w-4 h-4 text-teal-400" />
                <span>{pinnedFriendIds.includes(selectedFriend.id) ? 'Pinned' : 'Pin'}</span>
              </button>
            </div>

            {/* Factual Information */}
            <div className="space-y-2 text-xs text-slate-300 pt-2">
              <div className="p-3 rounded-2xl glass-card space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Playback Status</span>
                <p className="font-semibold text-white">Active in Resona Studio</p>
                <p className="text-slate-400 text-[11px]">Synced to Master Audio Stream</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* START HUDDLE FRIEND SELECTION MODAL */}
      <StartHuddleModal
        isOpen={showStartHuddleModal}
        onClose={() => setShowStartHuddleModal(false)}
        mode="create"
        activeHuddle={activeHuddle}
        currentTrack={currentTrack}
        onHuddleCreated={(newHuddle) => {
          if (setActiveHuddle) setActiveHuddle(newHuddle);
          if (setShowHuddleRoom) setShowHuddleRoom(true);
          if (onOpenHuddleRoom) onOpenHuddleRoom();
        }}
      />
    </div>
  );
}

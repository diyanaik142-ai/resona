import { usePlayer } from '../context/PlayerContext';
import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  Search, 
  Radio, 
  Clock, 
  AlertCircle, 
  Loader2, 
  ArrowRight,
  ShieldCheck,
  Disc3
} from 'lucide-react';

/**
 * StartHuddleModal - Compact, polished Friend Selection Interface for Starting or Inviting to a Huddle
 * Enforces requirement: Minimum 1 friend must be selected to create a Huddle.
 * Distinguishes INVITED vs PARTICIPANT.
 */
export default function StartHuddleModal({
  isOpen,
  onClose,
  mode = 'create', // 'create' | 'invite_more'
  activeHuddle = null,
  onHuddleCreated,
  onInvited
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

  const [friends, setFriends] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [huddleName, setHuddleName] = useState('');
  const [huddleMode, setHuddleMode] = useState('HOST_CONTROLLED');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationWarning, setValidationWarning] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tab for "No friends yet" -> find & add real users
  const [showAddFriendFlow, setShowAddFriendFlow] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [addingFriendId, setAddingFriendId] = useState(null);

  // Active Huddle conflict state
  const [huddleConflict, setHuddleConflict] = useState(null);
  const [featureConflict, setFeatureConflict] = useState(null);

  // Load real friends
  const loadFriends = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.social.getFriends();
      const list = res.friends || [];
      setFriends(list);
    } catch (err) {
      console.error('[StartHuddleModal] Failed to load friends:', err);
      setErrorMessage(err.message || 'Failed to load friends');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedFriendIds([]);
      setErrorMessage('');
      setValidationWarning('');
      setHuddleConflict(null);
      setFeatureConflict(null);
      setShowAddFriendFlow(false);
      setSearchQuery('');
      if (mode === 'create') {
        setHuddleName('');
        setHuddleMode('HOST_CONTROLLED');
      }
      loadFriends();
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  // Filter out friends:
  // If in 'invite_more' mode, exclude existing participants and already invited pending friends
  const existingParticipantIds = new Set(
    activeHuddle?.participants?.map(p => p.id) || []
  );
  const existingInvitedIds = new Set(
    activeHuddle?.invitations?.filter(inv => inv.status === 'pending')?.map(inv => inv.recipientId) || []
  );

  const eligibleFriends = friends.filter(friend => {
    if (mode === 'invite_more') {
      if (existingParticipantIds.has(friend.id)) return false;
      if (existingInvitedIds.has(friend.id)) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      friend.name?.toLowerCase().includes(q) ||
      friend.handle?.toLowerCase().includes(q)
    );
  });

  const toggleSelectFriend = (friendId) => {
    setValidationWarning('');
    setSelectedFriendIds(prev => {
      if (prev.includes(friendId)) {
        return prev.filter(id => id !== friendId);
      } else {
        return [...prev, friendId];
      }
    });
  };

  const handleSelectAll = () => {
    setValidationWarning('');
    if (selectedFriendIds.length === eligibleFriends.length) {
      setSelectedFriendIds([]);
    } else {
      setSelectedFriendIds(eligibleFriends.map(f => f.id));
    }
  };

  // Search real users to add as friends
  const handleSearchUsers = async (query) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const res = await api.social.searchUsers(query);
      setUserSearchResults(res.users || []);
    } catch (err) {
      console.error('[StartHuddleModal] User search failed:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  const handleAddFriend = async (friendId) => {
    setAddingFriendId(friendId);
    try {
      const res = await api.social.addFriend(friendId);
      if (res.friend) {
        // Add to friends list and automatically select them
        setFriends(prev => [res.friend, ...prev.filter(f => f.id !== res.friend.id)]);
        setSelectedFriendIds(prev => [...prev, res.friend.id]);
        setShowAddFriendFlow(false);
        setSearchQuery('');
        setValidationWarning('');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to add friend');
    } finally {
      setAddingFriendId(null);
    }
  };

  // Submission handler
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    // Requirement 3: Minimum invitation requirement (≥1 friend)
    if (selectedFriendIds.length === 0) {
      setValidationWarning('Select at least one friend to start a Huddle.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');
    setHuddleConflict(null);
    setFeatureConflict(null);

    try {
      if (mode === 'create') {
        const payload = {
          name: huddleName.trim() || undefined,
          mode: huddleMode,
          initialTrackId: currentTrack?.id,
          invitedFriendIds: selectedFriendIds
        };
        const res = await api.huddle.create(payload);
        if (res.huddle) {
          onClose();
          if (onHuddleCreated) onHuddleCreated(res.huddle);
        }
      } else {
        // Invite more friends to existing Huddle
        const res = await api.huddle.inviteFriends(activeHuddle.id, selectedFriendIds);
        if (res.huddle) {
          onClose();
          if (onInvited) onInvited(res.huddle);
        }
      }
    } catch (err) {
      if (err.code === 'ALREADY_IN_HUDDLE') {
        setHuddleConflict({
          message: "You're already in an active Huddle.",
          activeHuddle: err.activeHuddle
        });
      } else if (err.code === 'RECIPIENT_FEATURE_NOT_ENABLED') {
        setFeatureConflict({
          message: err.message
        });
      } else {
        setErrorMessage(err.message || 'Failed to start Huddle');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Leave active huddle and retry creating new one
  const handleLeaveAndCreate = async () => {
    if (!huddleConflict?.activeHuddle) return;
    setIsSubmitting(true);
    try {
      await api.huddle.leave(huddleConflict.activeHuddle.id);
      setHuddleConflict(null);
      // Re-trigger submit
      handleSubmit();
    } catch (err) {
      setErrorMessage(`Failed to leave active Huddle: ${err.message}`);
      setIsSubmitting(false);
    }
  };

  const selectedFriends = friends.filter(f => selectedFriendIds.includes(f.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#121216] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90dvh] sm:max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                {mode === 'create' ? 'Start a Huddle' : 'Invite Friends'}
              </h3>
              <p className="text-xs text-white/50">
                {mode === 'create' ? 'Select friends to invite to your session' : `Invite more friends to ${activeHuddle?.name || 'Huddle'}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Feature Entitlement Conflict Banner */}
          {featureConflict && (
            <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <div className="text-xs text-purple-200/90 leading-relaxed">
                  <span className="font-semibold text-purple-300 block">Invitation Unavailable</span>
                  {featureConflict.message}
                </div>
              </div>
            </div>
          )}

          {/* Active Huddle Conflict Banner */}
          {huddleConflict && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-semibold text-amber-300 block">{huddleConflict.message}</span>
                  You are participating in "{huddleConflict.activeHuddle?.name || 'another Huddle'}". Resona allows only one active Huddle at a time.
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-500/20">
                <button
                  type="button"
                  onClick={() => setHuddleConflict(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLeaveAndCreate}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  Leave Current & Start New
                </button>
              </div>
            </div>
          )}

          {/* Validation Warning */}
          {validationWarning && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{validationWarning}</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Optional Name & Mode Configuration (Create Mode Only) */}
          {mode === 'create' && (
            <div className="space-y-3 pb-3 border-b border-white/5">
              <div>
                <label className="text-xs font-medium text-white/60 block mb-1.5">
                  Huddle Name <span className="text-white/30 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Late Night Vibes, Synthwave Deep Dive"
                  value={huddleName}
                  onChange={(e) => setHuddleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-base sm:text-sm text-white placeholder-white/20 focus:outline-none focus:border-cyan-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-white/60 block mb-1.5">
                  Queue Permission
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setHuddleMode('HOST_CONTROLLED')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      huddleMode === 'HOST_CONTROLLED'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Host Controlled</div>
                    <div className="text-[10px] opacity-70">Host approves or adds all tracks</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHuddleMode('COLLABORATIVE')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      huddleMode === 'COLLABORATIVE'
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-300'
                        : 'bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10'
                    }`}
                  >
                    <div className="font-semibold mb-0.5">Collaborative</div>
                    <div className="text-[10px] opacity-70">All participants add & vote tracks</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Friends Selection Header & Search */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                Select friends to invite
                <span className="text-cyan-400 font-normal lowercase">({selectedFriendIds.length} selected)</span>
              </label>

              {eligibleFriends.length > 1 && !showAddFriendFlow && (
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-xs text-white/40 hover:text-cyan-400 transition-colors"
                >
                  {selectedFriendIds.length === eligibleFriends.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>

            {/* Selected Chips Preview */}
            {selectedFriends.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white/[0.02] border border-white/5 max-h-20 overflow-y-auto">
                {selectedFriends.map(f => (
                  <span 
                    key={f.id} 
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-xs text-cyan-300 font-medium animate-fade-in"
                  >
                    <span className="truncate max-w-[120px]">{f.name}</span>
                    <button 
                      type="button" 
                      onClick={() => toggleSelectFriend(f.id)}
                      className="hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Search filter if user has multiple friends */}
            {friends.length > 3 && !showAddFriendFlow && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/40"
                />
              </div>
            )}
          </div>

          {/* Friends List Area */}
          {isLoading ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-white/40">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="text-xs">Loading friends...</span>
            </div>
          ) : showAddFriendFlow ? (
            /* Add Friends Search Flow (Real Users across Resona) */
            <div className="space-y-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">Connect with Real Resona Users</span>
                <button
                  type="button"
                  onClick={() => { setShowAddFriendFlow(false); setSearchQuery(''); }}
                  className="text-xs text-white/40 hover:text-white"
                >
                  Back to list
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-white/30 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user by name or handle..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.05] border border-white/10 text-base sm:text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {isSearchingUsers ? (
                  <div className="py-4 text-center text-xs text-white/40">Searching...</div>
                ) : userSearchResults.length === 0 ? (
                  <div className="py-4 text-center text-xs text-white/40">
                    {searchQuery ? 'No users found matching query' : 'Type a name to discover users'}
                  </div>
                ) : (
                  userSearchResults.map(u => (
                    <div 
                      key={u.id}
                      className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-semibold text-cyan-300 overflow-hidden">
                          {u.avatar ? (
                            <img src={u.avatar} alt={u.name} className="w-full h-full object-cover" />
                          ) : (
                            u.name?.charAt(0) || 'U'
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-white">{u.name}</div>
                          <div className="text-[10px] text-white/40">
                            {u.handle ? (u.handle.startsWith('@') ? u.handle : `@${u.handle}`) : `@${u.id?.slice(0, 8)}`}
                          </div>
                        </div>
                      </div>
                      {u.isFriend ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Friend
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddFriend(u.id)}
                          disabled={addingFriendId === u.id}
                          className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-cyan-500 text-black hover:bg-cyan-400 transition-colors flex items-center gap-1"
                        >
                          {addingFriendId === u.id ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <UserPlus className="w-2.5 h-2.5" />}
                          Add & Invite
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : friends.length === 0 ? (
            /* Requirement 16: "If the user has no friends: show: 'No friends to invite yet.' and provide the appropriate path to find/add friends." */
            <div className="py-8 px-4 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40 mx-auto">
                <Users className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">No friends to invite yet.</h4>
                <p className="text-xs text-white/50 max-w-xs mx-auto">
                  A Huddle is a real-time collaborative listening room that requires at least one friend.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowAddFriendFlow(true); handleSearchUsers(''); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Find & Add Friends
              </button>
            </div>
          ) : eligibleFriends.length === 0 ? (
            <div className="py-6 text-center text-xs text-white/40 space-y-2">
              <p>No eligible friends available to invite.</p>
              {mode === 'invite_more' && (
                <p className="text-[11px] text-white/30">All your friends are already participants or have pending invitations.</p>
              )}
            </div>
          ) : (
            /* Requirement 2: Display user's real friends list with Profile picture, Display name, Username, Online/active status, Checkbox */
            <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
              {eligibleFriends.map(friend => {
                const isSelected = selectedFriendIds.includes(friend.id);
                return (
                  <div
                    key={friend.id}
                    onClick={() => toggleSelectFriend(friend.id)}
                    className={`group p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10 text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar with live status dot */}
                      <div className="relative">
                        <div className="w-9 h-9 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-semibold text-cyan-300 text-xs overflow-hidden">
                          {friend.avatar ? (
                            <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
                          ) : (
                            friend.name?.charAt(0) || 'F'
                          )}
                        </div>
                        {/* Live Status indicator */}
                        <span 
                          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-[#121216] ${
                            friend.isOnline ? 'bg-emerald-400' : 'bg-white/30'
                          }`}
                        />
                      </div>

                      {/* Info */}
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          {friend.name}
                          {friend.handle && (
                            <span className="text-[10px] text-white/40 font-normal">
                              {friend.handle.startsWith('@') ? friend.handle : `@${friend.handle}`}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/50 flex items-center gap-1 mt-0.5">
                          {friend.isOnline ? (
                            <span className="text-emerald-400 font-medium">Active now</span>
                          ) : (
                            <span>{friend.statusText || 'Offline'}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div 
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                        isSelected 
                          ? 'bg-cyan-500 border-cyan-500 text-black' 
                          : 'border-white/20 group-hover:border-white/40'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Prompt to add more friends if user already has some */}
          {friends.length > 0 && !showAddFriendFlow && (
            <div className="pt-2 flex items-center justify-between text-[11px] text-white/40 border-t border-white/5">
              <span>Looking for someone else?</span>
              <button
                type="button"
                onClick={() => { setShowAddFriendFlow(true); handleSearchUsers(''); }}
                className="text-cyan-400 hover:underline flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" />
                Add more friends
              </button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
          <div className="text-xs text-white/50">
            Selected: <span className="font-semibold text-cyan-400">{selectedFriendIds.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 min-h-[42px] rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
            >
              Cancel
            </button>

            {/* Requirement 3: Minimum invitation requirement:
                "At least ONE friend must be selected.
                 Before any friend is selected: 'Start Huddle' must be disabled.
                 If user attempts to proceed without selecting anyone, show 'Select at least one friend to start a Huddle.'
                 Do not create an empty Huddle."
            */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedFriendIds.length === 0 || isSubmitting}
              className={`px-5 py-2 min-h-[42px] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                selectedFriendIds.length === 0 || isSubmitting
                  ? 'bg-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-lg shadow-cyan-500/20 active:scale-[0.98]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{mode === 'create' ? 'Starting...' : 'Inviting...'}</span>
                </>
              ) : (
                <>
                  <Radio className="w-3.5 h-3.5" />
                  <span>{mode === 'create' ? 'Start Huddle' : 'Send Invitations'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

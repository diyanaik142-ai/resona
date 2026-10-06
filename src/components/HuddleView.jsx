import React, { useState, useEffect, useRef } from 'react';
import { resolveMediaUrl,  api } from '../services/api';
import { joinHuddleRoom, leaveHuddleRoom, subscribeHuddleEvent } from '../services/huddleSocket';
import StartHuddleModal from './StartHuddleModal';
import Avatar from './Avatar';
import {
  Radio, Users, UserPlus, Plus, Play, MoreVertical, GripVertical, Check, X,
  Vote, HelpCircle, History, ListMusic, Music, ArrowUp, ArrowDown,
  Trash2, FastForward, Clock, Shield, Sparkles, AlertCircle, Share2,
  Lock, RefreshCw, ChevronRight, ChevronDown, BarChart2, Layers, Copy
} from 'lucide-react';

export default function HuddleView({
  huddleId,
  currentHuddle: initialHuddle,
  onClose,
  onPlayTrack,
  catalog = [],
  user
}) {
  const [huddle, setHuddle] = useState(initialHuddle || null);
  const [loading, setLoading] = useState(!initialHuddle);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'recommendations' | 'polls' | 'history'
  const [mobilePanel, setMobilePanel] = useState('chat'); // 'chat' | 'queue'
  const [notification, setNotification] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [huddle?.history]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    try {
      await api.huddle.sendChatMessage(huddle.id, chatMessage);
      setChatMessage('');
    } catch (err) {
      triggerToast(err.message || 'Failed to send message', true);
    }
  };


  // Modals & Panels
  const [showCatalogSearch, setShowCatalogSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [catalogAction, setCatalogAction] = useState('add_to_queue'); // 'add_to_queue' | 'play_next' | 'recommend'

  const [showCreatePollModal, setShowCreatePollModal] = useState(false);
  const [pollType, setPollType] = useState('single'); // 'single' | 'multi'
  const [pollQuestion, setPollQuestion] = useState('');
  const [selectedPollTracks, setSelectedPollTracks] = useState([]);

  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRecapModal, setShowRecapModal] = useState(false);
  const [recapData, setRecapData] = useState(null);

  const [activeMenuQueueId, setActiveMenuQueueId] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const isHost = huddle?.hostId === user?.id || user?.role === 'admin';
  const isCollaborative = huddle?.mode === 'COLLABORATIVE';

  const triggerToast = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 3500);
  };

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    const codeToCopy = huddle?.code || huddle?.id;
    if (!codeToCopy) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(codeToCopy);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = codeToCopy;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      triggerToast('Room code copied! 📋');
    } catch (err) {
      triggerToast('Failed to copy room code', true);
    }
  };

  // Fetch authoritative state
  const refreshHuddle = async (id = huddleId || huddle?.id) => {
    if (!id) return;
    try {
      const res = await api.huddle.getById(id);
      if (res.huddle) {
        setHuddle(res.huddle);
        if (res.huddle.status === 'ended' && res.huddle.recap) {
          setRecapData(res.huddle.recap);
          setShowRecapModal(true);
        }
      }
    } catch (err) {
      console.warn('[Huddle] Failed to load huddle state:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Socket.IO Room Joining & Event Subscriptions
  useEffect(() => {
    const targetId = huddleId || huddle?.id;
    if (!targetId) return;

    joinHuddleRoom(targetId);
    refreshHuddle(targetId);

    const unsubState = subscribeHuddleEvent('huddle_state_updated', (updated) => {
      setHuddle(updated);
      if (updated.status === 'ended' && updated.recap) {
        setRecapData(updated.recap);
        setShowRecapModal(true);
      }
    });

    const unsubEnded = subscribeHuddleEvent('huddle_ended', (updated) => {
      setHuddle(updated);
      setRecapData(updated.recap || updated);
      setShowRecapModal(true);
      triggerToast('This Huddle session has ended.');
    });

    return () => {
      unsubState();
      unsubEnded();
      leaveHuddleRoom(targetId);
    };
  }, [huddleId]);

  // Catalog search filtering
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(catalog.slice(0, 10));
      return;
    }
    const q = searchQuery.toLowerCase().trim();
    const filtered = catalog.filter(t =>
      t.title?.toLowerCase().includes(q) || t.artist?.toLowerCase().includes(q)
    );
    setSearchResults(filtered);
  }, [searchQuery, catalog]);

  // Handle Add Track / Play Next / Recommend from Catalog
  const handleCatalogSelect = async (track, actionOverride) => {
    if (!huddle) return;
    const action = actionOverride || catalogAction;

    try {
      if (action === 'recommend') {
        await api.huddle.recommend(huddle.id, track.id);
        triggerToast(`Recommended "${track.title}" for the Huddle! 🎧`);
      } else {
        await api.huddle.addToQueue(huddle.id, {
          trackId: track.id,
          action: action === 'play_next' ? 'play_next' : 'add_to_queue'
        });
        triggerToast(
          action === 'play_next'
            ? `Set "${track.title}" to Play Next! ⚡`
            : `Added "${track.title}" to Up Next! 🎶`
        );
      }
      setShowCatalogSearch(false);
      setSearchQuery('');
    } catch (err) {
      triggerToast(err.message || 'Action failed', true);
    }
  };

  // Reorder Handler (Drag & Drop or Manual Buttons)
  const handleReorder = async (fromIdx, toIdx) => {
    if (!huddle?.upNext || fromIdx === toIdx || !isHost) return;
    const items = [...huddle.upNext];
    const [moved] = items.splice(fromIdx, 1);
    items.splice(toIdx, 0, moved);

    // Optimistically update
    setHuddle({ ...huddle, upNext: items });

    try {
      const itemIds = items.map(i => i.queueId);
      await api.huddle.reorderQueue(huddle.id, itemIds);
    } catch (err) {
      triggerToast(err.message || 'Failed to reorder queue', true);
      refreshHuddle();
    }
  };

  // Drag and Drop listeners
  const onDragStart = (e, index) => {
    if (!isHost) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e, index) => {
    if (!isHost) return;
    e.preventDefault();
    setDragOverIndex(index);
  };

  const onDrop = (e, index) => {
    if (!isHost) return;
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      handleReorder(draggedIndex, index);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const onDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Play Next queued item
  const handlePlayNext = async (queueId, trackTitle) => {
    setActiveMenuQueueId(null);
    try {
      await api.huddle.playNext(huddle.id, queueId);
      triggerToast(`Moved "${trackTitle}" to Play Next! ⚡`);
    } catch (err) {
      triggerToast(err.message || 'Failed to move to Play Next', true);
    }
  };

  // Remove queued item
  const handleRemoveQueueItem = async (queueId, trackTitle) => {
    setActiveMenuQueueId(null);
    try {
      await api.huddle.removeFromQueue(huddle.id, queueId);
      triggerToast(`Removed "${trackTitle}" from queue.`);
    } catch (err) {
      triggerToast(err.message || 'Failed to remove track', true);
    }
  };

  // Advance / Skip Track
  const handleAdvancePlayback = async () => {
    try {
      await api.huddle.advancePlayback(huddle.id, 'skip');
      triggerToast('Advanced to next track.');
    } catch (err) {
      triggerToast(err.message || 'Failed to skip track', true);
    }
  };

  // Mode Toggle
  const handleToggleMode = async () => {
    if (!isHost) return;
    const nextMode = huddle.mode === 'HOST_CONTROLLED' ? 'COLLABORATIVE' : 'HOST_CONTROLLED';
    try {
      await api.huddle.setMode(huddle.id, nextMode);
      triggerToast(`Switched Huddle to ${nextMode} mode.`);
    } catch (err) {
      triggerToast(err.message || 'Failed to switch mode', true);
    }
  };

  // Recommendations: Accept / Dismiss
  const handleAcceptRecommendation = async (recId, trackTitle, action = 'add_to_queue') => {
    try {
      await api.huddle.acceptRecommendation(huddle.id, recId, action);
      triggerToast(`Added "${trackTitle}" to the queue! 🎧`);
    } catch (err) {
      triggerToast(err.message || 'Failed to accept recommendation', true);
    }
  };

  const handleDismissRecommendation = async (recId) => {
    try {
      await api.huddle.dismissRecommendation(huddle.id, recId);
      triggerToast('Recommendation dismissed.');
    } catch (err) {
      triggerToast(err.message || 'Failed to dismiss recommendation', true);
    }
  };

  // Create Poll
  const handleCreatePoll = async () => {
    if (selectedPollTracks.length === 0) {
      triggerToast('Please select at least one song for the poll.', true);
      return;
    }
    try {
      await api.huddle.createPoll(huddle.id, {
        type: pollType,
        question: pollQuestion.trim() || undefined,
        trackIds: selectedPollTracks.map(t => t.id)
      });
      setShowCreatePollModal(false);
      setSelectedPollTracks([]);
      setPollQuestion('');
      setActiveTab('polls');
      triggerToast('Huddle Poll created! 🗳️');
    } catch (err) {
      triggerToast(err.message || 'Failed to create poll', true);
    }
  };

  // Cast Vote
  const handleVote = async (pollId, optionIndex) => {
    try {
      await api.huddle.votePoll(huddle.id, pollId, optionIndex);
      triggerToast('Vote recorded! 🗳️');
    } catch (err) {
      triggerToast(err.message || 'Failed to record vote', true);
    }
  };

  // End Poll
  const handleEndPoll = async (pollId) => {
    try {
      await api.huddle.endPoll(huddle.id, pollId);
      triggerToast('Poll concluded.');
    } catch (err) {
      triggerToast(err.message || 'Failed to end poll', true);
    }
  };

  // Resolve Poll Winner
  const handleResolvePoll = async (pollId, action) => {
    try {
      await api.huddle.resolvePoll(huddle.id, pollId, action);
      triggerToast(`Poll winner added to queue (${action === 'play_next' ? 'Play Next' : 'Up Next'})! 🏆`);
    } catch (err) {
      triggerToast(err.message || 'Failed to add poll winner', true);
    }
  };

  // End Huddle
  const handleEndHuddle = async () => {
    if (!window.confirm('Are you sure you want to end this Huddle for everyone?')) return;
    try {
      const res = await api.huddle.endHuddle(huddle.id);
      setRecapData(res.recap);
      setShowRecapModal(true);
      triggerToast('Huddle session ended.');
    } catch (err) {
      triggerToast(err.message || 'Failed to end Huddle', true);
    }
  };

  // Leave Huddle
  const handleLeaveHuddle = async () => {
    try {
      await api.huddle.leave(huddle.id);
      if (onClose) onClose();
    } catch (err) {
      triggerToast(err.message || 'Failed to leave Huddle', true);
    }
  };

  // Save Playlist
  const handleSavePlaylist = async (type) => {
    try {
      const res = await api.huddle.savePlaylist(huddle.id, {
        type,
        title: `${huddle.name} (${type === 'played' ? 'Played' : 'Queue'})`
      });
      triggerToast(`Saved "${res.playlist.title}" to your Library Shelf! 📚`);
    } catch (err) {
      triggerToast(err.message || 'Failed to save playlist', true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-teal-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">Connecting to real-time Huddle Queue...</p>
      </div>
    );
  }

  if (!huddle) {
    return (
      <div className="p-8 rounded-3xl glass-panel border border-white/10 text-center space-y-4 max-w-lg mx-auto my-12">
        <Radio className="w-12 h-12 text-slate-500 mx-auto" />
        <h3 className="text-xl font-black text-white">No Active Huddle</h3>
        <p className="text-xs text-slate-400">
          You are not currently in an active Huddle session. Start a new room or join an invite!
        </p>
        <button
          onClick={onClose}
          className="py-2.5 px-6 rounded-xl glass-button-primary text-xs font-bold"
        >
          Return to Social
        </button>
      </div>
    );
  }

  const pendingRecs = (huddle.recommendations || []).filter(r => r.status === 'pending');
  const activePolls = (huddle.polls || []).filter(p => p.status === 'active');

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100dvh-135px)] md:h-[85vh] max-w-[1400px] mx-auto relative select-none">
      {/* Toast Alert */}
      {notification && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl glass-panel border shadow-2xl flex items-center gap-2.5 animate-bounce ${
          notification.isError ? 'border-rose-500/60 bg-rose-950/90 text-rose-200' : 'border-teal-400/60 bg-slate-900/90 text-teal-200'
        }`}>
          {notification.isError ? <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" /> : <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />}
          <p className="text-xs font-bold leading-tight">{notification.msg}</p>
        </div>
      )}

      {/* MOBILE SEGMENT SELECTOR (Hidden on PC/Desktop) */}
      <div className="flex md:hidden items-center bg-slate-900/90 p-1 rounded-2xl border border-white/10 shrink-0 shadow-lg backdrop-blur-md">
        <button
          onClick={() => setMobilePanel('chat')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobilePanel === 'chat'
              ? 'bg-teal-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Room Chat</span>
        </button>
        <button
          onClick={() => setMobilePanel('queue')}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            mobilePanel === 'queue'
              ? 'bg-teal-400 text-slate-950 shadow-md font-extrabold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <ListMusic className="w-3.5 h-3.5" />
          <span>Queue & Controls</span>
        </button>
      </div>

      {/* MAIN COLUMN: CHAT & HEADER */}
      <div className={`flex-1 flex flex-col glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl bg-slate-900/50 backdrop-blur-md ${
        mobilePanel === 'chat' ? 'flex' : 'hidden md:flex'
      }`}>
        
        {/* HEADER */}
        <div className="p-4 md:p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 shadow-inner">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{huddle.name}</h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">
                  {huddle.mode === 'COLLABORATIVE' ? 'Collaborative' : 'Host Controlled'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hosted by <span className="text-white font-semibold">{huddle.hostName}</span> ·{' '}
                <button
                  onClick={() => setShowParticipantsModal(true)}
                  className="hover:text-teal-300 underline font-medium transition"
                >
                  {huddle.participants?.length || 1} listener{huddle.participants?.length === 1 ? '' : 's'}
                </button>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Room Code Badge & 1-Click Copy */}
            <button
              onClick={handleCopyCode}
              title="Copy room code to clipboard"
              className="py-1.5 px-2.5 rounded-xl glass-card border border-teal-500/30 hover:border-teal-400 text-teal-300 text-[11px] font-mono font-bold flex items-center gap-1.5 transition active:scale-95"
            >
              <span>#{huddle.code || huddle.id}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              {copiedCode && <span className="text-[10px] text-teal-300 font-sans font-semibold">Copied</span>}
            </button>

            {isHost && (
              <button
                onClick={() => setShowInviteModal(true)}
                title="Invite more friends to this session"
                className="py-1.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Invite</span>
              </button>
            )}

            {isHost && (
              <button
                onClick={handleToggleMode}
                title="Toggle queue control mode"
                className="py-1.5 px-3 rounded-xl glass-card border border-white/10 hover:border-teal-500/40 text-[11px] font-semibold text-slate-300 flex items-center gap-1.5 transition"
              >
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>{huddle.mode === 'COLLABORATIVE' ? 'Switch to Host-Only' : 'Enable Collab'}</span>
              </button>
            )}

            {isHost ? (
              <button
                onClick={handleEndHuddle}
                className="py-1.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> End Huddle
              </button>
            ) : (
              <button
                onClick={handleLeaveHuddle}
                className="py-1.5 px-4 rounded-xl glass-card text-slate-300 border border-white/10 hover:bg-white/10 text-[11px] font-semibold transition flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Leave
              </button>
            )}

            {onClose && (
              <button
                onClick={onClose}
                className="py-1.5 px-3 rounded-xl glass-card text-slate-400 hover:text-white transition text-[11px] font-semibold ml-1"
              >
                Minimize
              </button>
            )}
          </div>
        </div>

        {/* CHAT LOG */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
          {huddle.history && huddle.history.length > 0 ? (
            huddle.history.map((hist) => {
              const isChat = hist.type === 'chat';
              const isMe = hist.userId === user?.id;
              
              if (isChat) {
                return (
                  <div key={hist.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1 max-w-[85%] ${isMe ? 'ml-auto' : ''}`}>
                    <span className="text-[10px] font-semibold text-slate-400 px-1">
                      {hist.userName}
                    </span>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-teal-500/20 text-teal-100 rounded-br-sm' : 'bg-white/5 text-slate-200 border border-white/5 rounded-bl-sm'}`}>
                      {hist.text}
                    </div>
                  </div>
                );
              }

              // System Event
              return (
                <div key={hist.id} className="flex justify-center my-4">
                  <div className="px-3 py-1 rounded-full glass-card border border-white/5 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    <span className="text-[10px] font-medium text-slate-400">{hist.text}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center space-y-3 opacity-50">
              <Users className="w-12 h-12 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">Welcome to the Huddle</p>
              <p className="text-xs text-slate-500">Say hi to start the conversation!</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* CHAT INPUT */}
        <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 shrink-0">
          <div className="relative flex items-center">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Say something to the room..."
              className="w-full bg-slate-900/60 border border-white/10 rounded-full py-3 pl-4 pr-12 text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/50 transition"
            />
            <button
              type="submit"
              disabled={!chatMessage.trim()}
              className="absolute right-2 p-2 rounded-full bg-teal-500 hover:bg-teal-400 disabled:opacity-50 disabled:hover:bg-teal-500 text-slate-950 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </form>
      </div>

      {/* SIDEBAR COLUMN: PLAYBACK & CONTROLS */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col gap-4 shrink-0 ${
        mobilePanel === 'queue' ? 'flex flex-1' : 'hidden md:flex'
      }`}>
        
        {/* NOW PLAYING CARD */}
        <div className="p-4 rounded-3xl glass-panel border border-teal-500/20 bg-gradient-to-br from-teal-950/30 to-slate-900/50 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Now Playing
            </span>
            {isHost && huddle.nowPlaying && (
              <button
                onClick={handleAdvancePlayback}
                title="Skip to next track"
                className="py-1 px-2 rounded-lg hover:bg-white/10 text-[10px] font-bold text-slate-300 flex items-center gap-1 transition"
              >
                Skip <FastForward className="w-3 h-3" />
              </button>
            )}
          </div>

          {huddle.nowPlaying ? (
            <div className="flex gap-3">
              <div className="relative shrink-0">
                <img
                  src={resolveMediaUrl(huddle.nowPlaying.artwork || huddle.nowPlaying.cover)}
                  alt={huddle.nowPlaying.title}
                  className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white/10"
                />
              </div>
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <h3 className="font-bold text-white text-sm truncate leading-tight">
                  {huddle.nowPlaying.title}
                </h3>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {huddle.nowPlaying.artist}
                </p>
                <div className="mt-1.5">
                  <span className="text-[9px] text-teal-300 font-medium bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/10">
                    {huddle.nowPlaying.source === 'poll_winner'
                      ? 'Poll Winner 🏆'
                      : huddle.nowPlaying.source === 'recommendation'
                      ? `Rec by ${huddle.nowPlaying.addedBy?.name || 'Listener'}`
                      : `Added by ${huddle.nowPlaying.addedBy?.name || 'Host'}`}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-3 text-center opacity-70">
              <Music className="w-6 h-6 text-slate-500 mx-auto mb-1" />
              <p className="text-[11px] font-semibold text-slate-300">Nothing playing</p>
            </div>
          )}
        </div>

        {/* SIDEBAR TABS & CONTENT */}
        <div className="flex-1 flex flex-col glass-panel rounded-3xl border border-white/10 overflow-hidden bg-slate-900/30">
          <div className="flex p-2 gap-1 border-b border-white/5 bg-black/10 shrink-0">
            <button
              onClick={() => setActiveTab('queue')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === 'queue' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" /> Queue
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 relative ${
                activeTab === 'recommendations' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Recs
              {pendingRecs.length > 0 && (
                <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-pink-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('polls')}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 relative ${
                activeTab === 'polls' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Vote className="w-3.5 h-3.5" /> Polls
              {activePolls.length > 0 && (
                <span className="absolute top-0 right-1 w-2.5 h-2.5 rounded-full bg-purple-500" />
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* QUEUE TAB */}
            {activeTab === 'queue' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Up Next ({huddle.upNext?.length || 0})</span>
                  <div className="flex gap-1.5">
                    {(isHost || isCollaborative) && (
                      <button
                        onClick={() => {
                          setCatalogAction('add_to_queue');
                          setShowCatalogSearch(true);
                        }}
                        className="py-1 px-2 rounded-lg glass-button-primary text-[10px] font-bold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3 text-slate-950" /> Add
                      </button>
                    )}
                    {isHost && (
                      <button
                        onClick={() => {
                          setCatalogAction('play_next');
                          setShowCatalogSearch(true);
                        }}
                        className="py-1 px-2 rounded-lg glass-card text-teal-300 border border-teal-500/20 text-[10px] font-semibold hover:bg-white/10"
                      >
                        Play Next
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {huddle.upNext && huddle.upNext.length > 0 ? (
                    huddle.upNext.map((item, index) => {
                      const isOwner = item.addedBy?.id === user?.id;
                      const canDelete = isHost || (isCollaborative && isOwner);
                      const isDragging = draggedIndex === index;
                      const isOver = dragOverIndex === index;
                      return (
                        <div
                          key={item.queueId || item.trackId + index}
                          draggable={isHost}
                          onDragStart={(e) => onDragStart(e, index)}
                          onDragOver={(e) => onDragOver(e, index)}
                          onDrop={(e) => onDrop(e, index)}
                          onDragEnd={onDragEnd}
                          className={`group p-2 rounded-xl glass-card border transition flex items-center gap-2.5 ${
                            isDragging ? 'opacity-40 border-teal-400' : 'border-white/5 hover:border-white/20'
                          } ${isOver ? 'border-t-2 border-t-teal-400' : ''}`}
                        >
                          {isHost && (
                            <GripVertical className="w-3 h-3 text-slate-600 cursor-grab active:cursor-grabbing hover:text-teal-400 shrink-0" />
                          )}
                          <img src={resolveMediaUrl(item.artwork || item.cover)} alt={item.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-[11px] truncate leading-tight">{item.title}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <p className="text-[9px] text-slate-400 truncate">{item.artist}</p>
                              <p className="text-[8px] text-teal-400/70 truncate border-l border-white/10 pl-1.5">Added by {item.addedBy?.name || 'Host'}</p>
                            </div>
                            <p className="text-[7px] text-slate-600 font-mono mt-0.5 truncate">{item.queueId || item.queueItemId}</p>
                          </div>
                          
                          <div className="relative shrink-0">
                            <button
                              onClick={() => setActiveMenuQueueId(activeMenuQueueId === item.queueId ? null : item.queueId)}
                              className="p-1 rounded-md hover:bg-white/10 text-slate-400"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {activeMenuQueueId === item.queueId && (
                              <div className="absolute right-0 top-6 w-36 glass-panel border border-white/20 rounded-xl p-1.5 shadow-2xl z-30 bg-slate-900">
                                {isHost && (
                                  <>
                                    <button onClick={() => handlePlayNext(item.queueId, item.title)} className="w-full py-1.5 px-2 rounded-lg hover:bg-white/10 text-left text-[10px] text-teal-300">Play Next</button>
                                    <button onClick={() => {setActiveMenuQueueId(null); handleReorder(index, 0);}} className="w-full py-1.5 px-2 rounded-lg hover:bg-white/10 text-left text-[10px] text-slate-200">Move to Top</button>
                                  </>
                                )}
                                {canDelete && (
                                  <button onClick={() => handleRemoveQueueItem(item.queueId, item.title)} className="w-full py-1.5 px-2 rounded-lg hover:bg-rose-500/20 text-left text-[10px] text-rose-400 mt-1">Remove</button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-[11px] text-slate-500">Queue is empty</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RECS TAB */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Recommendations</span>
                  <button onClick={() => { setCatalogAction('recommend'); setShowCatalogSearch(true); }} className="py-1 px-2 rounded-lg glass-button-primary text-[10px] font-bold">
                    Recommend
                  </button>
                </div>

                <div className="space-y-2">
                  {huddle.recommendations && huddle.recommendations.length > 0 ? (
                    huddle.recommendations.map(rec => (
                      <div key={rec.id} className="p-2.5 rounded-xl glass-card border border-white/5 space-y-2">
                        <div className="flex items-center gap-2.5">
                          <img src={resolveMediaUrl(rec.artwork || rec.cover)} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-white text-[11px] truncate">{rec.title}</p>
                            <p className="text-[9px] text-teal-400 truncate">by {rec.recommender?.name}</p>
                          </div>
                        </div>
                        {rec.status === 'pending' && isHost && (
                          <div className="flex gap-1.5 pt-1 border-t border-white/5">
                            <button onClick={() => handleAcceptRecommendation(rec.id, rec.title, 'add_to_queue')} className="flex-1 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 text-[9px] font-bold transition">Accept</button>
                            <button onClick={() => handleDismissRecommendation(rec.id)} className="flex-1 py-1 rounded glass-card hover:bg-white/5 text-rose-300 text-[9px] font-bold transition">Dismiss</button>
                          </div>
                        )}
                        {rec.status !== 'pending' && (
                          <div className="pt-1">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${rec.status === 'accepted' ? 'bg-teal-500/20 text-teal-300' : 'bg-white/5 text-slate-500'}`}>
                              {rec.status === 'accepted' ? 'Accepted' : 'Dismissed'}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[11px] text-slate-500">No recommendations yet.</div>
                  )}
                </div>
              </div>
            )}

            {/* POLLS TAB */}
            {activeTab === 'polls' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Polls</span>
                  {isHost && (
                    <button onClick={() => { setSelectedPollTracks([]); setPollQuestion(''); setShowCreatePollModal(true); }} className="py-1 px-2 rounded-lg glass-button-primary text-[10px] font-bold">
                      Create Poll
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {huddle.polls && huddle.polls.length > 0 ? (
                    huddle.polls.map(poll => (
                      <div key={poll.id} className="p-3 rounded-xl glass-card border border-white/5 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-[11px] font-bold text-white leading-tight">{poll.question}</p>
                          {poll.status === 'active' && isHost && (
                            <button onClick={() => handleEndPoll(poll.id)} className="text-[9px] text-rose-400 font-bold shrink-0 hover:underline">End</button>
                          )}
                        </div>
                        <div className="space-y-1">
                          {poll.options.map((opt, idx) => (
                            <div key={idx} onClick={() => poll.status === 'active' && handleVote(poll.id, idx)} className={`relative p-1.5 rounded-lg border ${poll.userVoteIndex === idx ? 'border-teal-400 bg-teal-500/10' : 'border-white/5 cursor-pointer hover:bg-white/5'} overflow-hidden flex items-center justify-between`}>
                              <div className="absolute left-0 top-0 bottom-0 bg-teal-500/15 pointer-events-none transition-all" style={{ width: `${opt.percentage}%` }} />
                              <span className="text-[10px] text-white z-10 truncate pl-1">{opt.text}</span>
                              <span className="text-[9px] text-teal-300 font-bold z-10 pr-1">{opt.percentage}%</span>
                            </div>
                          ))}
                        </div>
                        {poll.status === 'ended' && poll.winner && !poll.actionTaken && isHost && (
                          <div className="pt-2 border-t border-white/5 flex gap-1.5">
                            <button onClick={() => handleResolvePoll(poll.id, 'play_next')} className="flex-1 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 transition text-teal-300 text-[9px] font-bold">Play Next</button>
                            <button onClick={() => handleResolvePoll(poll.id, 'add_to_queue')} className="flex-1 py-1 rounded glass-card hover:bg-white/5 transition text-slate-300 text-[9px] font-bold">Add Queue</button>
                          </div>
                        )}
                        {poll.status === 'ended' && poll.actionTaken && (
                           <div className="text-[9px] text-teal-400 font-medium">Added to Queue: {poll.actionTaken === 'play_next' ? 'Play Next' : 'Up Next'}</div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-[11px] text-slate-500">No active polls.</div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
      
      {/* ============================================================ */}
      {/* MODAL 1: REAL CATALOG SEARCH & ADD */}
      {/* ============================================================ */}
      {showCatalogSearch && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 rounded-3xl border border-white/10 p-5 space-y-4 relative shadow-2xl max-h-[88dvh] sm:max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowCatalogSearch(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-black text-white text-lg">
                {catalogAction === 'recommend'
                  ? 'Recommend a Track'
                  : catalogAction === 'play_next'
                  ? 'Select Song to Play Next'
                  : 'Add Track to Queue'}
              </h3>
              <p className="text-xs text-slate-400">Search Resona's published music catalog</p>
            </div>

            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by title or artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 px-4 rounded-xl glass-card border border-white/10 text-white text-base sm:text-xs focus:outline-none focus:border-teal-400"
              autoFocus
            />

            {/* Results List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {searchResults.length > 0 ? (
                searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="p-3 rounded-2xl glass-card border border-white/5 flex items-center justify-between gap-3 hover:bg-white/10 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={resolveMediaUrl(track.cover)}
                        alt={track.title}
                        className="w-10 h-10 rounded-xl object-cover shrink-0 shadow"
                      />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate">{track.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isHost ? (
                        <>
                          <button
                            onClick={() => handleCatalogSelect(track, 'play_next')}
                            className="py-1.5 px-2.5 rounded-xl glass-card text-teal-300 text-xs font-semibold hover:bg-white/10"
                            title="Play Next"
                          >
                            Play Next
                          </button>
                          <button
                            onClick={() => handleCatalogSelect(track, 'add_to_queue')}
                            className="py-1.5 px-3 rounded-xl glass-button-primary text-xs font-bold"
                          >
                            Add to Queue
                          </button>
                        </>
                      ) : isCollaborative ? (
                        <>
                          <button
                            onClick={() => handleCatalogSelect(track, 'add_to_queue')}
                            className="py-1.5 px-3 rounded-xl glass-button-primary text-xs font-bold"
                          >
                            Add to Queue
                          </button>
                          <button
                            onClick={() => handleCatalogSelect(track, 'recommend')}
                            className="py-1.5 px-2.5 rounded-xl glass-card text-teal-300 text-xs font-semibold hover:bg-white/10"
                          >
                            Recommend
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleCatalogSelect(track, 'recommend')}
                          className="py-1.5 px-4 rounded-xl glass-button-primary text-xs font-bold"
                        >
                          Recommend
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-xs text-slate-400">
                  No matching tracks found in the catalog.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 2: CREATE POLL */}
      {/* ============================================================ */}
      {showCreatePollModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-white/10 p-5 space-y-4 relative shadow-2xl max-h-[88dvh] sm:max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowCreatePollModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="font-black text-white text-lg">Create Huddle Poll</h3>
              <p className="text-xs text-slate-400">Choose single-song approval or multiple choices</p>
            </div>

            {/* Type selector */}
            <div className="flex gap-2">
              <button
                onClick={() => setPollType('single')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  pollType === 'single' ? 'bg-teal-400 text-slate-950' : 'glass-card text-slate-300'
                }`}
              >
                Single Song (Yes / No)
              </button>
              <button
                onClick={() => setPollType('multi')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
                  pollType === 'multi' ? 'bg-teal-400 text-slate-950' : 'glass-card text-slate-300'
                }`}
              >
                Multiple Choice
              </button>
            </div>

            {/* Question Input */}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Poll Question</label>
              <input
                type="text"
                placeholder={pollType === 'single' ? 'Should we play this song next?' : 'Choose the next song'}
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                className="w-full mt-1 py-2 px-3 rounded-xl glass-card text-white text-base sm:text-xs border border-white/10 focus:outline-none focus:border-teal-400"
              />
            </div>

            {/* Track Selector */}
            <div className="space-y-1.5 flex-1 overflow-y-auto custom-scrollbar">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                Select {pollType === 'single' ? 'Track' : 'Up to 4 Tracks'} ({selectedPollTracks.length})
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {catalog.map((t) => {
                  const isSelected = selectedPollTracks.some(st => st.id === t.id);
                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (pollType === 'single') {
                          setSelectedPollTracks([t]);
                        } else {
                          if (isSelected) {
                            setSelectedPollTracks(selectedPollTracks.filter(st => st.id !== t.id));
                          } else if (selectedPollTracks.length < 4) {
                            setSelectedPollTracks([...selectedPollTracks, t]);
                          }
                        }
                      }}
                      className={`p-2 rounded-xl glass-card flex items-center justify-between cursor-pointer transition ${
                        isSelected ? 'border-teal-400 bg-teal-500/10' : 'border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img src={resolveMediaUrl(t.cover)} alt={t.title} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <p className="font-bold text-white text-xs">{t.title}</p>
                          <p className="text-[10px] text-slate-400">{t.artist}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-teal-400" />}
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleCreatePoll}
              className="w-full py-3 rounded-2xl glass-button-primary font-bold text-xs shadow-lg"
            >
              Launch Poll
            </button>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 3: PARTICIPANTS & HOST TRANSFER */}
      {/* ============================================================ */}
      {showParticipantsModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-md bg-slate-900 rounded-3xl border border-white/10 p-5 space-y-4 relative shadow-2xl max-h-[88dvh] sm:max-h-[85vh] flex flex-col">
            <button
              onClick={() => setShowParticipantsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between pr-8">
              <div>
                <h3 className="font-black text-white text-lg">Huddle Members & Invites</h3>
                <p className="text-xs text-slate-400">
                  {huddle.participants?.length || 1} joined listener{huddle.participants?.length === 1 ? '' : 's'}
                </p>
              </div>

              {isHost && (
                <button
                  onClick={() => {
                    setShowParticipantsModal(false);
                    setShowInviteModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite</span>
                </button>
              )}
            </div>

            <div className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {/* SECTION 1: PARTICIPANTS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                    Active Participants ({huddle.participants?.length || 1})
                  </span>
                </div>

                <div className="space-y-1.5">
                  {huddle.participants?.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-teal-500/30 flex items-center justify-center text-white font-bold text-xs">
                          {p.name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{p.name}</p>
                          <p className="text-[10px] text-teal-400 font-medium">
                            {p.isHost ? '👑 Room Host' : '● Joined'}
                          </p>
                        </div>
                      </div>

                      {isHost && !p.isHost && (
                        <button
                          onClick={async () => {
                            if (window.confirm(`Transfer host authority to ${p.name}?`)) {
                              await api.huddle.transferHost(huddle.id, p.id);
                              triggerToast(`Transferred host to ${p.name}`);
                              setShowParticipantsModal(false);
                            }
                          }}
                          className="py-1 px-2.5 rounded-lg glass-card text-[10px] text-teal-300 font-bold hover:bg-white/10"
                        >
                          Make Host
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 2: INVITED FRIENDS (Requirement 13: Host view while waiting) */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                    Invited ({huddle.invitations?.length || 0})
                  </span>
                  <span className="text-[9px] text-white/40 italic">
                    Invitation sent ≠ Joined
                  </span>
                </div>

                {!huddle.invitations || huddle.invitations.length === 0 ? (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-dashed border-white/5 text-center text-xs text-white/40">
                    No pending invitations
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {huddle.invitations.map((inv) => {
                      const isPending = inv.status === 'pending';
                      const isAccepted = inv.status === 'accepted';
                      const isDeclined = inv.status === 'declined';

                      return (
                        <div
                          key={inv.id}
                          className="p-2.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              user={{ avatar: inv.recipientAvatar, name: inv.recipientName }}
                              className="w-8 h-8 rounded-full border border-cyan-500/20 shrink-0"
                            />
                            <div>
                              <p className="font-semibold text-white text-xs">{inv.recipientName}</p>
                              <div className="text-[10px] flex items-center gap-1 mt-0.5">
                                {isPending ? (
                                  <span className="text-amber-400 font-medium">● Invitation sent</span>
                                ) : isAccepted ? (
                                  <span className="text-emerald-400 font-medium">● Joined</span>
                                ) : isDeclined ? (
                                  <span className="text-white/40">● Declined</span>
                                ) : (
                                  <span className="text-white/40">● {inv.status}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <span className="text-[10px] font-mono text-white/30">
                            {isPending ? 'Waiting...' : isAccepted ? 'Active' : ''}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL 4: HUDDLE RECAP */}
      {/* ============================================================ */}
      {showRecapModal && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl border border-teal-500/30 p-6 space-y-5 relative shadow-2xl text-center max-h-[88dvh] overflow-y-auto custom-scrollbar">
            <div>
              <span className="text-[10px] font-black tracking-widest text-teal-400 uppercase bg-teal-500/10 px-3 py-1 rounded-full">
                HUDDLE RECAP
              </span>
              <h2 className="text-2xl font-black text-white mt-2">{huddle.name}</h2>
              <p className="text-xs text-slate-400">Session Summary</p>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-left">
              <div className="p-3 rounded-2xl glass-card border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Duration</span>
                <p className="text-lg font-black text-white">{recapData?.durationFormatted || 'Not measured'}</p>
              </div>

              <div className="p-3 rounded-2xl glass-card border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Listeners</span>
                <p className="text-lg font-black text-white">{recapData?.participantsCount || 'Not measured'}</p>
              </div>

              <div className="p-3 rounded-2xl glass-card border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Tracks Played</span>
                <p className="text-lg font-black text-white">{recapData?.tracksPlayedCount || 0}</p>
              </div>

              <div className="p-3 rounded-2xl glass-card border border-white/5 space-y-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">Recommendations</span>
                <p className="text-lg font-black text-white">{recapData?.recommendationsCount || 0}</p>
              </div>
            </div>

            {/* Save Playlists Options */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => handleSavePlaylist('played')}
                className="w-full py-3 rounded-2xl glass-button-primary font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
              >
                <Music className="w-4 h-4 text-slate-950" /> Save Played Tracks as Playlist
              </button>

              {recapData?.remainingQueueCount > 0 && (
                <button
                  onClick={() => handleSavePlaylist('queue')}
                  className="w-full py-3 rounded-2xl glass-card border border-teal-500/20 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10"
                >
                  <ListMusic className="w-4 h-4" /> Save Remaining Queue as Playlist
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setShowRecapModal(false);
                if (onClose) onClose();
              }}
              className="text-xs text-slate-400 hover:text-white transition font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* INVITE FRIENDS MODAL (MODE: INVITE_MORE) */}
      <StartHuddleModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        mode="invite_more"
        activeHuddle={huddle}
        onInvited={(updatedHuddle) => {
          setHuddle(updatedHuddle);
          triggerToast('Invitations sent! ✉️');
        }}
      />
    </div>
  );
}

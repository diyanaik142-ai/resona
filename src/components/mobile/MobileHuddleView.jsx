import React, { useState, useEffect, useRef } from 'react';
import {
  Radio, Users, X, Send, Copy, Check, Sparkles, AlertCircle,
  Vote, Music, Plus, Play, Pause, Trash2, ArrowUp, ArrowDown,
  Smile, UserPlus, Shield, ChevronDown
} from 'lucide-react';
import { api } from '../../services/api';
import Avatar from '../Avatar';

const EMOJI_LIST = ['🔥', '✨', '🎧', '🙌', '💜', '⚡', '🎉', '👏', '🎶', '🌊', '🚀', '💯'];

export default function MobileHuddleView({
  huddle: propHuddle,
  currentHuddle,
  user,
  catalog = [],
  onClose,
  onPlayTrack,
  onRefreshHuddle
}) {
  const huddle = propHuddle || currentHuddle;
  const [activePanel, setActivePanel] = useState('chat'); // 'chat' | 'queue' | 'player' | 'people'
  const [copiedCode, setCopiedCode] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMusicSearch, setShowMusicSearch] = useState(false);
  const [musicSearchQuery, setMusicSearchQuery] = useState('');
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollSelectedTracks, setPollSelectedTracks] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const chatEndRef = useRef(null);

  const isHost = huddle?.hostId === user?.id || user?.role === 'admin';
  const participants = huddle?.participants || [];
  const queue = huddle?.upNext || [];
  const nowPlaying = huddle?.nowPlaying;
  const history = huddle?.history || [];
  const polls = (huddle?.polls || []).filter(p => p.status === 'active');

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  useEffect(() => {
    if (chatEndRef.current && activePanel === 'chat') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, activePanel]);

  const handleCopyCode = async () => {
    const code = huddle?.code || huddle?.id;
    if (!code) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const ta = document.createElement('textarea');
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      triggerToast('Room code copied! 📋');
    } catch {
      triggerToast('Failed to copy code');
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!chatMessage.trim()) return;
    const msg = chatMessage.trim();
    setChatMessage('');
    setShowEmojiPicker(false);
    try {
      await api.huddle.sendChatMessage(huddle.id, msg);
    } catch (err) {
      triggerToast(`Send failed: ${err.message}`);
    }
  };

  const handleAddEmoji = (emoji) => {
    setChatMessage(prev => prev + emoji);
  };

  const handleSelectTrackForQueue = async (track) => {
    setShowMusicSearch(false);
    try {
      if (isHost || huddle?.mode === 'COLLABORATIVE') {
        await api.huddle.addToQueue(huddle.id, track.id);
        triggerToast(`Added "${track.title}" to Queue! 🎧`);
      } else {
        await api.huddle.recommend(huddle.id, track.id);
        triggerToast(`Recommended "${track.title}"! ✨`);
      }
    } catch (err) {
      triggerToast(`Queue error: ${err.message}`);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    try {
      await api.huddle.castVote(huddle.id, pollId, optionIndex);
      triggerToast('Vote counted! 🗳️');
    } catch (err) {
      triggerToast(`Vote failed: ${err.message}`);
    }
  };

  const handleEndOrLeaveHuddle = async () => {
    try {
      if (isHost) {
        await api.huddle.endHuddle(huddle.id);
        triggerToast('Huddle ended.');
      } else {
        await api.huddle.leave(huddle.id);
        triggerToast('Left Huddle.');
      }
      if (onClose) onClose();
    } catch (err) {
      triggerToast(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06070B] text-slate-100 flex flex-col justify-between">
      {/* Toast feedback */}
      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl glass-panel border border-teal-400 bg-slate-900/95 text-teal-300 text-xs font-bold shadow-2xl animate-bounce">
          {toastMsg}
        </div>
      )}

      {/* TOP HEADER: Huddle Name + Active Listeners + Real Code Copy + Leave */}
      <div className="shrink-0 bg-slate-950/95 backdrop-blur-2xl border-b border-white/10 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] pb-3 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="font-black text-white text-base truncate leading-tight">
                {huddle.name}
              </h2>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                Host: <span className="text-white font-semibold">{huddle.hostName}</span> · {participants.length} listener{participants.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Real Room Code + Copy button */}
            <button
              onClick={handleCopyCode}
              title="Copy Room Code"
              className="py-1 px-2.5 rounded-xl glass-card border border-teal-500/30 text-teal-300 text-[11px] font-mono font-bold flex items-center gap-1 active:scale-90 transition"
            >
              <span>#{huddle.code || huddle.id?.slice(-6).toUpperCase()}</span>
              {copiedCode ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            </button>

            <button
              onClick={handleEndOrLeaveHuddle}
              className="p-1.5 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 active:scale-90 transition text-xs font-bold"
              title={isHost ? 'End Huddle' : 'Leave Room'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Compact Top Navigation Selector: [Chat] [Queue] [Now Playing] [People] */}
        <div className="flex bg-slate-900/90 p-1 rounded-xl border border-white/5 text-xs font-bold">
          {[
            { id: 'chat', label: 'Chat' },
            { id: 'queue', label: `Queue (${queue.length})` },
            { id: 'player', label: 'Player' },
            { id: 'people', label: `People (${participants.length})` }
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setActivePanel(p.id)}
              className={`flex-1 py-1.5 rounded-lg transition text-center ${
                activePanel === p.id
                  ? 'bg-teal-400 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* PANEL 1: LIVE CHAT (Primary View) */}
      {activePanel === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 relative">
          {/* Chat Messages Feed */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
            {history.length === 0 ? (
              <div className="text-center py-16 text-xs text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 text-teal-400/40 mx-auto" />
                <p className="font-bold text-slate-300">Welcome to #{huddle.name}</p>
                <p>Chat with listeners and recommend tracks.</p>
              </div>
            ) : (
              history.map((ev, idx) => {
                const isMe = ev.userId === user?.id || ev.userName === user?.name;
                const isSystem = ev.type === 'system' || !ev.userId;

                if (isSystem) {
                  return (
                    <div key={`ev_${ev.id || idx}`} className="text-center py-1">
                      <span className="text-[10px] text-teal-400/80 bg-teal-500/10 px-2.5 py-0.5 rounded-full font-mono">
                        {ev.text || ev.message}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={`ev_${ev.id || idx}`}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1 font-medium">
                      {ev.userName} · {ev.timeStr || ''}
                    </span>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs font-medium leading-relaxed ${
                        isMe
                          ? 'bg-teal-500 text-slate-950 font-semibold rounded-br-sm'
                          : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-white/5'
                      }`}
                    >
                      {ev.text}
                    </div>
                  </div>
                );
              })
            )}

            {/* In-Chat Polls */}
            {polls.map((poll) => (
              <div
                key={poll.id}
                className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-950/40 to-slate-900 border border-purple-500/40 space-y-2.5 shadow-xl my-2"
              >
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white text-xs">Live Poll: {poll.question}</span>
                </div>
                <div className="space-y-1.5">
                  {(poll.options || []).map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => handleVote(poll.id, oIdx)}
                      className="w-full flex items-center justify-between p-2 rounded-xl glass-card hover:bg-white/10 text-xs font-semibold text-slate-200 border border-white/5 transition"
                    >
                      <span>{opt.text || opt.title}</span>
                      <span className="text-teal-400 font-mono text-[11px] font-bold">{opt.votes || 0} votes</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div ref={chatEndRef} />
          </div>

          {/* Emoji Quick Picker popup */}
          {showEmojiPicker && (
            <div className="p-2 mx-4 bg-slate-900 border border-white/10 rounded-2xl w-full max-w-full flex gap-2 overflow-x-auto shadow-2xl mb-1">
              {EMOJI_LIST.map((em) => (
                <button
                  key={em}
                  onClick={() => handleAddEmoji(em)}
                  className="text-lg p-1 hover:scale-125 transition active:scale-95"
                >
                  {em}
                </button>
              ))}
            </div>
          )}

          {/* Chat Composer */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
          >
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-slate-400 hover:text-white rounded-full glass-card shrink-0"
              title="Emoji"
            >
              <Smile className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setShowMusicSearch(true)}
              className="p-2 text-teal-300 hover:text-white rounded-full glass-card shrink-0"
              title="Recommend Music"
            >
              <Music className="w-4 h-4" />
            </button>

            <input
              type="text"
              placeholder="Message in Huddle..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              className="flex-1 py-2.5 px-3.5 rounded-xl glass-card border border-white/10 text-white text-base focus:outline-none focus:border-teal-400"
            />

            <button
              type="submit"
              disabled={!chatMessage.trim()}
              className="w-10 h-10 rounded-xl bg-teal-400 text-slate-950 flex items-center justify-center font-bold disabled:opacity-40 transition active:scale-90 shrink-0"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* PANEL 2: QUEUE */}
      {activePanel === 'queue' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20 custom-scrollbar">
          {nowPlaying && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Now Playing</span>
              <div className="flex items-center gap-3 p-3 rounded-2xl glass-card border border-teal-500/30 bg-teal-500/10">
                <img src={nowPlaying.artwork} alt={nowPlaying.title} className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md" />
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-white text-sm truncate">{nowPlaying.title}</h4>
                  <p className="text-xs text-teal-300 truncate mt-0.5">{nowPlaying.artist}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Up Next ({queue.length})</span>
            {queue.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 rounded-2xl glass-card border border-dashed border-white/10 p-4">
                Queue is empty. Recommend a track using the music icon below!
              </div>
            ) : (
              queue.map((t, idx) => (
                <div key={t.queueId || idx} className="flex items-center justify-between p-2.5 rounded-2xl glass-card border border-white/5">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="text-xs font-mono text-slate-500 w-4 text-center shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                    <img src={t.artwork} alt={t.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white text-xs truncate">{t.title}</p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{t.artist}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* PANEL 3: PLAYER CONTEXT */}
      {activePanel === 'player' && (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center space-y-4 pb-20">
          <div className="w-48 h-48 rounded-3xl overflow-hidden glass-panel border border-white/15 shadow-2xl">
            <img
              src={nowPlaying?.artwork || (catalog[0]?.cover)}
              alt="Track Artwork"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <h3 className="font-black text-white text-lg">{nowPlaying?.title || 'No Track Active'}</h3>
            <p className="text-xs text-slate-400 mt-1">{nowPlaying?.artist || 'Huddle Queue Standby'}</p>
          </div>
          {isHost && (
            <button
              onClick={async () => {
                try {
                  await api.huddle.advancePlayback(huddle.id, 'skip');
                  triggerToast('Skipped to next track');
                } catch (e) {
                  triggerToast(e.message);
                }
              }}
              className="py-2.5 px-6 rounded-xl glass-button-primary text-xs font-bold"
            >
              Skip Track (Host Control)
            </button>
          )}
        </div>
      )}

      {/* PANEL 4: PEOPLE */}
      {activePanel === 'people' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-20">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Connected Listeners ({participants.length})
          </p>
          {participants.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl glass-card border border-white/5">
              <div className="flex items-center gap-3">
                <Avatar
                  user={p}
                  className="w-10 h-10 rounded-full border border-teal-500/40 shrink-0"
                />
                <div>
                  <h4 className="font-bold text-white text-xs">{p.name}</h4>
                  <span className="text-[10px] text-teal-400 font-medium">{p.isHost ? 'Host' : 'Listener'}</span>
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Music Search Sheet for Recommending / Adding Tracks */}
      {showMusicSearch && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col justify-end">
          <div className="fixed inset-0" onClick={() => setShowMusicSearch(false)} aria-hidden="true" />
          <div className="relative z-10 w-full bg-slate-900 border-t border-white/10 rounded-t-3xl p-5 pb-8 space-y-3 max-h-[80dvh] flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Select Track to Recommend</h3>
              <button onClick={() => setShowMusicSearch(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Search catalog tracks..."
              value={musicSearchQuery}
              onChange={(e) => setMusicSearchQuery(e.target.value)}
              className="w-full py-2.5 px-3.5 rounded-xl glass-card text-white text-base border border-white/10 focus:outline-none focus:border-teal-400"
            />
            <div className="overflow-y-auto space-y-2 flex-1 custom-scrollbar">
              {catalog
                .filter(t => t.title?.toLowerCase().includes(musicSearchQuery.toLowerCase()) || t.artist?.toLowerCase().includes(musicSearchQuery.toLowerCase()))
                .map(t => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTrackForQueue(t)}
                    className="flex items-center justify-between p-2 rounded-xl glass-card hover:bg-white/10 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={t.cover} alt={t.title} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <p className="font-bold text-white text-xs truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{t.artist}</p>
                      </div>
                    </div>
                    <Plus className="w-4 h-4 text-teal-400 shrink-0" />
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

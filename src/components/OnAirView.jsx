import { useAuth } from '../context/AuthContext';
import React, { useState } from 'react';
import BeatCodeQR from './BeatCodeQR';
import { api } from '../services/api';
import { Play, Pause, SkipBack, SkipForward, Heart, Repeat, Shuffle, Share2, X, Copy, Check, QrCode, Camera, MoreHorizontal, Radio, Layers, Image as ImageIcon, Download, ChevronRight, Plus, Bell, AlertCircle, Trash2, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

function DraggableQueueItem({ t, idx, onPlayTrack, onRemoveFromQueue }) {
  const controls = useDragControls();

  return (
    <Reorder.Item 
      value={t} 
      dragListener={false}
      dragControls={controls}
      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5 group transition-colors"
    >
      <div 
        onPointerDown={(e) => controls.start(e)}
        className="flex items-center gap-1 cursor-grab active:cursor-grabbing text-slate-500 hover:text-white px-1"
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-2 flex-1 cursor-pointer ml-1" onClick={() => { if(onPlayTrack) onPlayTrack(t); }}>
        <img src={t.cover || t.artwork} alt={t.title} className="w-8 h-8 rounded-md object-cover" />
        <div className="min-w-0">
          <p className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">{t.title}</p>
          <p className="text-[10px] text-slate-400 truncate">{t.artist}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
        {onRemoveFromQueue && (
          <button onClick={(e) => { e.stopPropagation(); onRemoveFromQueue(t.queueItemId || t.id); }} className="p-1 text-slate-400 hover:text-rose-400" title="Remove">
            <Trash2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </Reorder.Item>
  );
}
export default function OnAirView({ currentTrack, isPlaying, currentTime = 0, duration = 0, onTogglePlay, onNext, onPrev, onSeek, onNavigate, activeHuddle, setShowHuddleRoom, playQueue = [], onRemoveFromQueue, onClearQueue, onReorderQueue, onPlayTrack }) {
  const { user, catalog } = useAuth();
  const track = currentTrack || (catalog.length > 0 ? catalog[0] : null);
  if (!track) return <div className="p-8 text-center text-slate-400 mt-20">No track playing</div>;
  const [activeTab, setActiveTab] = useState('Lyrics'); // Lyrics, About, Related
  const [isLiked, setIsLiked] = useState(track.liked || false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showBeatCodeModal, setShowBeatCodeModal] = useState(false);
  const [showStoryCardModal, setShowStoryCardModal] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');
  const [beatColorHex, setBeatColorHex] = useState('#ec4899');
  const [copied, setCopied] = useState(false);

  const triggerNotification = (msg) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(''), 3000);
  };

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareToHuddle = async () => {
    setShowShareModal(false);
    if (!activeHuddle) {
      triggerNotification('No active Huddle room running. Start a Huddle in Social!');
      return;
    }
    try {
      const isHost = activeHuddle.hostId === user?.id || user?.role === 'admin';
      const isCollab = activeHuddle.mode === 'COLLABORATIVE';
      if (isHost || isCollab) {
        await api.huddle.addToQueue(activeHuddle.id, { trackId: track.id });
        triggerNotification(`Added "${track.title}" to Huddle Queue! 🎧`);
      } else {
        await api.huddle.recommend(activeHuddle.id, track.id);
        triggerNotification(`Recommended "${track.title}" for Huddle! 🎧`);
      }
    } catch (err) {
      triggerNotification(`Share error: ${err.message}`);
    }
  };



  const beatColors = [
    { id: 'c1', hex: '#f97316' },
    { id: 'c2', hex: '#ec4899' },
    { id: 'c3', hex: '#8b5cf6' },
    { id: 'c4', hex: '#64748b' },
    { id: 'c5', hex: '#06b6d4' },
    { id: 'c6', hex: '#f43f5e' }
  ];

  return (
    <div className="flex flex-col justify-between max-w-md mx-auto space-y-4 pb-6 md:pb-4 relative">
      {/* Background Ambient Glow */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

      {/* IN-APP TOAST NOTIFICATION */}
      {notificationMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm glass-panel border border-teal-400/50 bg-slate-900/90 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Bell className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <p className="text-xs font-bold text-white leading-tight">{notificationMsg}</p>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between z-10">
        {activeHuddle ? (
          <button
            onClick={() => setShowHuddleRoom && setShowHuddleRoom(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 text-teal-300 text-[11px] font-bold hover:bg-teal-500/30 transition animate-pulse"
          >
            <Radio className="w-3.5 h-3.5 text-teal-400" />
            <span>Huddle: {activeHuddle.name}</span>
          </button>
        ) : (
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400">On Air • Now Playing</span>
        )}
        <button
          onClick={() => setShowShareModal(true)}
          className="p-2 rounded-full glass-card text-slate-300 hover:text-white transition hover:scale-105"
        >
          <Share2 className="w-4 h-4 text-teal-400" />
        </button>
      </div>

      {/* MAIN SHARE MODAL OVERLAY */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-950 rounded-3xl border border-white/10 p-5 space-y-4 relative shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-xl">Share</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 rounded-full text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Top Share Card Container */}
            <div className="p-4 rounded-3xl glass-panel border border-white/10 space-y-4">
              <p className="text-xs text-slate-400 font-semibold text-center">Share this track</p>

              <div className="flex items-center justify-between p-2.5 rounded-2xl glass-card">
                <div className="flex items-center gap-3">
                  <img src={track.cover} alt="Track" className="w-10 h-10 rounded-xl object-cover" />
                  <div>
                    <p className="font-bold text-white text-xs">{track.title}</p>
                    <p className="text-[10px] text-slate-400">{track.artist}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </div>

              {/* Quick Action Circular Buttons */}
              <div className="grid grid-cols-4 gap-2 text-center">
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

            {/* List Share Options */}
            <div className="space-y-2">
              {/* Share to Huddle (Shares directly or shows no active huddle notification) */}
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


              {/* Share to Story (Opens Story Card Modal with Download button) */}
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

            {/* Story Card Image Visual */}
            <div className="mx-auto w-56 h-80 rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 p-4 border border-white/20 shadow-2xl flex flex-col justify-between items-center relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-teal-500/20 to-transparent pointer-events-none" />

              <span className="text-[10px] font-black text-teal-300 uppercase tracking-widest bg-teal-500/20 px-3 py-1 rounded-full z-10">
                RESONA MUSIC
              </span>

              <img src={track.cover} alt="Story Artwork" className="w-32 h-32 rounded-2xl object-cover shadow-2xl z-10 border border-white/30" />

              <div className="z-10 text-center">
                <h4 className="font-black text-white text-base leading-tight">{track.title}</h4>
                <p className="text-xs text-slate-300 font-semibold">{track.artist}</p>
                <p className="text-[9px] text-teal-400 mt-1">Listen on resona.app</p>
              </div>
            </div>

            {/* Action Download & Close Buttons */}
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

      {/* BEAT CODES MODAL */}
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
              <BeatCodeQR trackId={track.id} cover={track.cover} primaryColor={beatColorHex} />
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

      {/* Main Cover Art Card */}
      <div className="relative z-10 rounded-3xl overflow-hidden glass-panel border border-white/10 p-4 shadow-2xl aspect-square flex flex-col justify-end">
        <img src={track.cover} alt={track.title} className="absolute inset-0 w-full h-full object-cover rounded-3xl transition duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-white leading-tight">{track.title}</h2>
            <p className="text-sm font-semibold text-slate-300">{track.artist}</p>
          </div>
          <button
            onClick={() => setIsLiked(!isLiked)}
            className={`p-3 rounded-full glass-card transition ${isLiked ? 'text-rose-500 bg-rose-500/10' : 'text-slate-300'}`}
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>
        </div>
      </div>

      {/* Progress & Scrub Bar */}
      <div className="space-y-1.5 z-10 px-1">
        <div 
          onClick={(e) => {
            if (!onSeek || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            onSeek(pos * duration);
          }}
          className="relative w-full h-1.5 bg-slate-800 rounded-full cursor-pointer overflow-hidden py-0.5"
        >
          <div className="h-full bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full transition-all duration-100" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-slate-400">
          <span>{Math.floor(currentTime / 60)}:{(Math.floor(currentTime % 60)).toString().padStart(2, '0')}</span>
          <span>{duration ? `${Math.floor(duration / 60)}:${(Math.floor(duration % 60)).toString().padStart(2, '0')}` : (track.duration || '0:00')}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between px-4 z-10">
        <button className="text-slate-400 hover:text-white transition">
          <Shuffle className="w-5 h-5" />
        </button>
        <button onClick={onPrev} className="text-slate-200 hover:text-white transition p-2">
          <SkipBack className="w-7 h-7 fill-current" />
        </button>
        <button
          onClick={onTogglePlay}
          className="w-16 h-16 rounded-full glass-button-primary flex items-center justify-center shadow-xl shadow-teal-500/30 hover:scale-105 transition"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 fill-slate-950 text-slate-950" />
          ) : (
            <Play className="w-7 h-7 fill-slate-950 text-slate-950 ml-1" />
          )}
        </button>
        <button onClick={onNext} className="text-slate-200 hover:text-white transition p-2">
          <SkipForward className="w-7 h-7 fill-current" />
        </button>
        <button className="text-slate-400 hover:text-white transition">
          <Repeat className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Selectors for Lyrics / Queue / About */}
      <div className="z-10 bg-slate-900/60 p-1 rounded-2xl glass-card flex border border-white/10">
        {['Lyrics', 'Queue', 'About'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === tab ? 'bg-teal-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="z-10 p-4 rounded-2xl glass-card border border-white/10 min-h-[140px] text-xs">
        {activeTab === 'Lyrics' && (
          <div className="space-y-2 text-center text-slate-300 leading-relaxed font-medium">
            {track?.lyrics ? (
              <p className="whitespace-pre-line">{track.lyrics}</p>
            ) : (
              <p className="text-slate-500 italic">Lyrics unavailable</p>
            )}
          </div>
        )}

        {activeTab === 'Queue' && (
          <div className="space-y-2">
            {activeHuddle ? (
              <>
                <div className="flex items-center justify-between pb-1 border-b border-white/5">
                  <span className="text-[10px] text-teal-400 uppercase font-bold flex items-center gap-1.5">
                    <Radio className="w-3 h-3 animate-pulse" />
                    Up Next in {activeHuddle.name}
                  </span>
                  {setShowHuddleRoom && (
                    <button
                      onClick={() => setShowHuddleRoom(true)}
                      className="text-[10px] font-bold text-teal-400 hover:underline"
                    >
                      Open Room
                    </button>
                  )}
                </div>

                {activeHuddle.queue && activeHuddle.queue.length > 0 ? (
                  activeHuddle.queue.map((item, idx) => (
                    <div key={item.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-500 w-4">{String(idx + 1).padStart(2, '0')}</span>
                        <img src={item.artwork || '/cover-default.jpg'} alt={item.title} className="w-8 h-8 rounded-md object-cover" />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate">{item.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {item.artist} • <span className="text-teal-400">
                              {item.source === 'host_add' ? 'Host' : item.source === 'poll_winner' ? 'Poll Winner' : item.source === 'recommendation' ? `Rec by ${item.addedByName || 'friend'}` : `Added by ${item.addedByName || 'friend'}`}
                            </span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center space-y-1">
                    <p className="text-xs text-slate-400">Huddle queue is empty</p>
                    {setShowHuddleRoom && (
                      <button
                        onClick={() => setShowHuddleRoom(true)}
                        className="text-[10px] font-bold text-teal-400 hover:underline"
                      >
                        Add songs to queue
                      </button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between pb-1 border-b border-white/5 mb-2">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Up Next Queue ({playQueue.length})</span>
                  {onClearQueue && playQueue.length > 0 && (
                    <button
                      onClick={() => {
                        if (window.confirm("Are you sure you want to clear the upcoming queue?")) {
                          onClearQueue();
                        }
                      }}
                      className="px-2 py-0.5 text-[9px] font-bold text-rose-400 border border-rose-500/30 rounded bg-rose-500/10 hover:bg-rose-500/20 uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {playQueue.length > 0 ? (
                  <Reorder.Group axis="y" values={playQueue} onReorder={onReorderQueue} className="space-y-1">
                  {playQueue.map((t, idx) => (
                    <DraggableQueueItem
                      key={t.queueItemId || t.id || idx}
                      t={t}
                      idx={idx}
                      onPlayTrack={onPlayTrack}
                      onRemoveFromQueue={onRemoveFromQueue}
                    />
                  ))}
                  </Reorder.Group>
                ) : (
                  <div className="py-4 text-center">
                    <p className="text-xs text-slate-400">No tracks in queue.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'About' && (
          <div className="space-y-2">
            <h4 className="font-bold text-white text-sm">About {track.artist}</h4>
            <p className="text-slate-400 text-xs">
              Album: <span className="text-slate-200">{track.album || 'Original Master'}</span>
            </p>
            <div className="flex gap-4 pt-1 text-teal-400 font-semibold text-[11px]">
              <span>Genre: {track.genre || 'Electronic'}</span>
              <span>•</span>
              <span>24-bit Lossless Master</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

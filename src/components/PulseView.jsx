import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveMediaUrl,  api } from '../services/api';
import { Search, Bell, Play, Sparkles, X, ShieldCheck, Database, Music, Heart, Radio } from 'lucide-react';

export default function PulseView({ onPlayTrack, onNavigate, onOpenNotifications, unreadCount = 0 }) {
  const { user, shelf , catalog} = useAuth();
  const [activeChip, setActiveChip] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [recommendationState, setRecommendationState] = useState({ loading: true, data: null, error: '' });

  React.useEffect(() => {
    if (!onOpenNotifications) {
      api.social.getSocial().then(res => {
        setNotifications(res.notifications || []);
      }).catch(err => console.error(err));
    }
  }, [onOpenNotifications]);

  React.useEffect(() => {
    let alive = true;
    api.user.getRecommendations({ limit: 6 })
      .then((data) => alive && setRecommendationState({ loading: false, data, error: '' }))
      .catch((err) => alive && setRecommendationState({ loading: false, data: null, error: err.message }));
    return () => { alive = false; };
  }, [shelf?.recommendationVersion, shelf?.likedTrackIds?.length]);

  const handleNotificationAction = async (n, action) => {
    setIsProcessingAction(true);
    try {
      await fetch(`${import.meta.env?.VITE_API_URL || window.location.origin}/api/social/notifications/${n.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('resona_token')}`
        },
        body: JSON.stringify({ action })
      });
      setNotifications(prev => prev.filter(notif => notif.id !== n.id));
      if (action === 'accept' && n.type === 'huddle_invite') {
        try {
          await api.huddle.join(n.huddleId);
          onNavigate('social'); // Will show active huddle room
        } catch (err) {
          console.error("Failed to join huddle:", err);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 w-full max-w-screen-2xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight truncate">
            Good evening, {user?.name || 'Listener'}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            Your personalized audio workspace • Connected as <span className="text-teal-300 font-mono">{user?.email}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onNavigate('seek')} className="p-2.5 rounded-full glass-card text-slate-300 hover:text-white transition">
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenNotifications ? onOpenNotifications() : setShowNotifications(true)}
            className="p-2.5 rounded-full glass-card text-slate-300 hover:text-white relative transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {(onOpenNotifications ? unreadCount > 0 : notifications.length > 0) && (
              <>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* NOTIFICATION DRAWER / MODAL */}
      {showNotifications && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-3xl border border-teal-500/30 p-5 space-y-4 relative shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-teal-400" />
                <h3 className="font-extrabold text-white text-base">Account Telemetry</h3>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1.5 rounded-full glass-card text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No new notifications</div>
              ) : (
                notifications.map((n) => {
                  if (n.type === 'huddle_invite') {
                    return (
                      <div key={n.id} className="p-3 rounded-2xl glass-card flex items-start gap-3 hover:bg-white/10 transition border border-teal-500/30">
                        <div className="p-2.5 rounded-xl text-teal-400 bg-teal-500/20 flex-shrink-0">
                          <Radio className="w-4 h-4 animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-xs leading-snug">Huddle Invitation</h4>
                          <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            <span className="font-semibold text-teal-300">{n.senderName}</span> invited you to join <span className="font-semibold text-white">{n.huddleName}</span>.
                          </p>
                          <span className="text-[10px] text-teal-400 mt-1 block font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                          <div className="flex gap-2 mt-2">
                            <button
                              disabled={isProcessingAction}
                              onClick={() => handleNotificationAction(n, 'accept')}
                              className="flex-1 py-1.5 rounded-lg bg-teal-500 text-slate-900 font-bold text-[10px] hover:brightness-110 disabled:opacity-50"
                            >
                              Join
                            </button>
                            <button
                              disabled={isProcessingAction}
                              onClick={() => handleNotificationAction(n, 'decline')}
                              className="flex-1 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-bold text-[10px] hover:bg-slate-700 disabled:opacity-50"
                            >
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Generic
                  const Icon = n.icon || Bell;
                  return (
                    <div key={n.id} className="p-3 rounded-2xl glass-card flex items-start gap-3 hover:bg-white/10 transition">
                      <div className={`p-2.5 rounded-xl ${n.color || 'text-slate-400 bg-slate-800'} flex-shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-xs leading-snug">{n.title || n.type}</h4>
                        <p className="text-[11px] text-slate-400 leading-tight mt-0.5 break-all">{n.desc || n.message}</p>
                        <span className="text-[10px] text-teal-400 mt-1 block font-mono">{n.time || (n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : '')}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <button
              onClick={() => setShowNotifications(false)}
              className="w-full py-2.5 rounded-xl glass-button-primary font-bold text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Music', 'Ambient', 'Electronic', 'Lo-Fi'].map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveChip(chip)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
              activeChip === chip
                ? 'bg-teal-400 text-slate-950 font-bold shadow-md shadow-teal-500/20'
                : 'glass-card text-slate-300 hover:bg-white/10'
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Hero Banner: Tuned for You */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-900/50 border border-teal-500/20 p-5 sm:p-6 md:p-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/60 via-indigo-900/40 to-teal-900/60 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="max-w-lg">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-500/20 px-2.5 py-1 rounded-full mb-3">
              <Sparkles className="w-3 h-3" /> Personalized Blend
            </span>
            <h2 className="text-3xl font-black text-white leading-tight mb-2">Tuned for Your Workflow</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              {recommendationState.data?.personalized
                ? recommendationState.data.recommendations?.[0]?.reason || 'Matched to your recent listening.'
                : recommendationState.loading
                ? 'Loading your listening profile.'
                : recommendationState.data?.message || 'Listen to a few songs and Resona will start personalizing your mixes.'}
            </p>
          </div>
          <button
            onClick={() => onPlayTrack(recommendationState.data?.recommendations?.[0] || null)}
            disabled={!recommendationState.data?.recommendations?.[0]}
            className="w-14 h-14 rounded-full glass-button-primary flex items-center justify-center shadow-xl hover:scale-105 transition self-start md:self-auto shrink-0"
            title="Play Tuned Mix"
          >
            <Play className="w-6 h-6 fill-slate-950 text-slate-950 ml-0.5" />
          </button>
        </div>
      </div>

      {/* Section: Featured Tracks */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-white">Daily Catalog</h3>
            <p className="text-xs text-slate-400">High-resolution master tracks available in your library</p>
          </div>
          <button onClick={() => onNavigate('seek')} className="text-xs text-teal-400 font-semibold hover:underline">
            View All Catalog →
          </button>
        </div>

        {catalog.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl w-full border border-dashed border-slate-700">
            <Music className="w-8 h-8 text-slate-500 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 font-medium">No tracks have been published yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {catalog.slice(0, 4).map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="p-4 rounded-2xl glass-card glass-card-hover flex items-center gap-3.5 cursor-pointer group"
              >
                <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-14 h-14 rounded-xl object-cover shadow-lg" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-bold text-white truncate group-hover:text-teal-300 transition">{track.title}</h4>
                  <p className="text-xs text-slate-400 truncate">{track.artist}</p>
                  <span className="text-[10px] text-teal-400/80 font-mono mt-1 block">{track.duration}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Section: Fresh Releases */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-xl text-white">Sonic Spectrum</h3>
            <p className="text-xs text-slate-400">Click any track to stream instantly through master audio engine</p>
          </div>
        </div>

        {catalog.length === 0 ? (
          <div className="p-8 text-center glass-card rounded-2xl w-full border border-dashed border-slate-700 mt-4">
            <Sparkles className="w-8 h-8 text-slate-500 mx-auto mb-3 opacity-50" />
            <p className="text-slate-400 font-medium">Your music collection will appear here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {catalog.map((track) => (
              <div
                key={track.id}
                onClick={() => onPlayTrack(track)}
                className="p-3 rounded-2xl glass-card hover:bg-white/10 transition cursor-pointer group flex flex-col"
              >
                <div className="relative mb-2.5 rounded-xl overflow-hidden glass-card aspect-square">
                  <img src={resolveMediaUrl(track.cover)} alt={track.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                  <button className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-teal-400 text-slate-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg hover:scale-110">
                    <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
                  </button>
                </div>
                <h4 className="text-xs font-bold text-white truncate group-hover:text-teal-300">{track.title}</h4>
                <p className="text-[11px] text-slate-400 truncate">{track.artist}</p>
                <span className="text-[10px] text-slate-500 font-mono mt-1">{track.genre || 'Electronic'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

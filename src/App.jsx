import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { initPushNotifications } from './services/pushService';
import PlanBadge from './components/PlanBadge';
import OnboardingView from './components/OnboardingView';
import LoginView from './components/LoginView';
import PulseView from './components/PulseView';
import SeekView from './components/SeekView';
import ShelfView from './components/ShelfView';
import OnAirView from './components/OnAirView';
import TunedForYouView from './components/TunedForYouView';
import CuratedExperiencesView from './components/CuratedExperiencesView';
import SocialView from './components/SocialView';
import CreatorHubView from './components/CreatorHubView';
import SettingsView from './components/SettingsView';
import AuthModal from './components/AuthModal';
import LoginTransition from './components/LoginTransition';
import AdminDashboard from './components/AdminDashboard';
import MaintenanceScreen from './components/MaintenanceScreen';
import HuddleView from './components/HuddleView';
import NotificationDrawer from './components/NotificationDrawer';
import { joinHuddleRoom, leaveHuddleRoom, subscribeHuddleEvent, registerSocketUser } from './services/huddleSocket';
import { resolveMediaUrl,  api } from './services/api';

// Dedicated Mobile Experience (< 768px)
import MobileHeader from './components/mobile/MobileHeader';
import MobileBottomNav from './components/mobile/MobileBottomNav';
import MobileMiniPlayer from './components/mobile/MobileMiniPlayer';
import MobilePulseView from './components/mobile/MobilePulseView';
import MobileSeekView from './components/mobile/MobileSeekView';
import MobileOnAirView from './components/mobile/MobileOnAirView';
import MobileShelfView from './components/mobile/MobileShelfView';
import MobileSocialView from './components/mobile/MobileSocialView';
import MobileCreatorHubView from './components/mobile/MobileCreatorHubView';
import MobileSettingsView from './components/mobile/MobileSettingsView';
import MobileHuddleView from './components/mobile/MobileHuddleView';
import MobileNotificationsSheet from './components/mobile/MobileNotificationsSheet';
import MobileTrackActionSheet from './components/mobile/MobileTrackActionSheet';
import MobileQueueSheet from './components/mobile/MobileQueueSheet';
import MobileProfileView from './components/mobile/MobileProfileView';
import PublicProfileView from './components/PublicProfileView';
import PlaylistView from './components/PlaylistView';
import Avatar from './components/Avatar';

import {
  Sparkles, Search, Library, Radio, User, Settings, Disc, Play, Pause,
  SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Heart,
  Flame, Plus, ChevronLeft, ChevronRight, LogOut, ShieldCheck,
  Maximize2, Bell, Music
} from 'lucide-react';


export default function App() {
  const { user, shelf, creatorData, isAuthenticated, loading, logout, toggleLikeTrack, catalog } = useAuth();

  // Platform Global Config (Maintenance, Registration policy, Branding)
  const [platformConfig, setPlatformConfig] = useState(null);

  const fetchPlatformConfig = async () => {
    try {
      const cfg = await api.platform.getConfig();
      setPlatformConfig(cfg);
    } catch (err) {
      console.warn('[Platform Config]', err.message);
    }
  };

  useEffect(() => {
    fetchPlatformConfig();
    const interval = setInterval(fetchPlatformConfig, 15000);
    return () => clearInterval(interval);
  }, []);

  // First time on device check
  const [deviceSeen, setDeviceSeen] = useState(() => {
    return localStorage.getItem('resona_device_seen') === 'true';
  });

  // Navigation State with Browser History synchronization
  const getInitialTab = () => {
    if (typeof window === 'undefined' || !window.location) return 'pulse';
    const rawPath = window.location.pathname.replace(/^\/+/, '');
    if (rawPath.startsWith('song/')) return 'onair';
    const path = rawPath.split('/')[0].toLowerCase();
    const validTabs = ['pulse', 'seek', 'onair', 'shelf', 'social', 'creator', 'settings', 'profile', 'tuned', 'curated', 'playlist'];
    return validTabs.includes(path) ? path : 'pulse';
  };

  const [activeTab, setActiveTabState] = useState(getInitialTab);
  const tabHistoryRef = useRef([getInitialTab()]);

  const setActiveTab = (tab, pushHistory = true) => {
    if (tab === 'BACK') {
      if (tabHistoryRef.current.length > 1) {
        tabHistoryRef.current.pop();
        const prevTab = tabHistoryRef.current[tabHistoryRef.current.length - 1];
        setActiveTabState(prevTab);
        if (typeof window !== 'undefined' && window.history) {
           window.history.back(); // let the browser popstate handle it visually if we want, or just let popstate be a fallback
        }
      } else {
        setActiveTabState('pulse');
      }
      return;
    }

    if (tabHistoryRef.current[tabHistoryRef.current.length - 1] !== tab) {
      tabHistoryRef.current.push(tab);
    }
    
    setActiveTabState(tab);
    if (pushHistory && typeof window !== 'undefined' && window.history) {
      const newPath = tab === 'pulse' ? '/' : `/${tab}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ tab }, '', newPath);
      }
    }
  };

  useEffect(() => {
    const onPopState = (event) => {
      const tab = event.state?.tab || getInitialTab();
      setActiveTabState(tab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Transition State
  const [showTransition, setShowTransition] = useState(false);
  const [wasAuthenticated, setWasAuthenticated] = useState(isAuthenticated);

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticated) {
      setShowTransition(true);
    }
    setWasAuthenticated(isAuthenticated);
  }, [isAuthenticated, wasAuthenticated]);

  // Audio Playback State
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(225);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLoop, setIsLoop] = useState(false);
  const [activeHuddle, setActiveHuddle] = useState(null);
  const [showHuddleRoom, setShowHuddleRoom] = useState(false);
  const [fusionsList, setFusionsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [mobileTrackAction, setMobileTrackAction] = useState(null);
  const [showMobileQueue, setShowMobileQueue] = useState(false);
  const [playQueue, setPlayQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('resona_play_queue');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('resona_play_queue', JSON.stringify(playQueue));
  }, [playQueue]);
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const deepLinkResolvedRef = useRef(false);

  useEffect(() => {
    if (catalog.length > 0 && typeof window !== 'undefined' && !deepLinkResolvedRef.current) {
      deepLinkResolvedRef.current = true;
      const path = window.location.pathname.replace(/^\/+/, '');
      if (path.startsWith('song/')) {
        const trackId = path.split('/')[1];
        const t = catalog.find(tr => tr.id === trackId);
        if (t) {
          handlePlayTrack(t);
        } else {
          showToast('Song unavailable');
          setActiveTab('pulse');
        }
        // clear the URL so it doesn't loop
        window.history.replaceState({ tab: 'onair' }, '', '/onair');
      }
    }
  });

  const handleAddToQueue = (track) => {
    if (!track) return;
    
    try {
      const queuedTrack = { ...track, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` };
      setPlayQueue(prev => [...prev, queuedTrack]);
      showToast(`Added to queue — ${track.title}`);
    } catch (err) {
      showToast("Couldn't add to queue");
    }
  };

  const handleAddToHuddleQueue = async (track) => {
    if (!track || !activeHuddle) return;
    try {
      await api.huddle.addToQueue(activeHuddle.id, { trackId: track.id });
      showToast(`Added to Huddle Queue — ${track.title}`);
      setMobileTrackAction(null);
    } catch (err) {
      showToast("Couldn't add to Huddle Queue");
    }
  };

  const handleRemoveFromQueue = (identifier) => {
    setPlayQueue(prev => {
      const next = prev.filter(t => (t.queueItemId || t.id) !== identifier);
      if (next.length !== prev.length) {
        showToast("Removed from queue");
      }
      return next;
    });
  };

  const handleClearQueue = () => {
    setPlayQueue([]);
    showToast("Queue cleared");
  };

  const handleReorderQueue = (newQueue) => {
    setPlayQueue(newQueue);
  };

  const audioRef = useRef(null);
  const playbackSessionRef = useRef({ trackId: null, startedAt: null, completed: false });

  const recordActivity = (event) => {
    if (!isAuthenticated || user?.role === 'admin' || !event?.trackId) return;
    api.user.recordActivity(event).catch((err) => {
      console.warn('[Recommendations] Could not record activity:', err.message);
    });
  };

  // Synchronize Real-time Notifications & Presence
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user?.role === 'admin') {
      setNotifications([]);
      return;
    }

    // Register user presence & personal room
    registerSocketUser(user.id);
    
    // Initialize native push notifications (Capacitor)
    initPushNotifications();

    // Fetch initial notifications
    api.notifications.getNotifications().then(res => {
      setNotifications(res.notifications || []);
    }).catch(err => console.warn('[App] Could not load notifications:', err.message));

    // Listen to real-time events
    const unsubNotif = subscribeHuddleEvent('notification_received', (newNotif) => {
      setNotifications(prev => [newNotif, ...prev.filter(n => n.id !== newNotif.id)]);
    });

    const unsubInvite = subscribeHuddleEvent('huddle_invitation', (inviteData) => {
      setNotifications(prev => {
        const notif = {
          id: inviteData.notificationId || `notif_${Date.now()}`,
          type: 'huddle_invite',
          huddleId: inviteData.huddleId,
          huddleName: inviteData.huddleName,
          invitationId: inviteData.invitationId,
          senderId: inviteData.senderId,
          senderName: inviteData.senderName,
          senderAvatar: inviteData.senderAvatar,
          message: `${inviteData.senderName || 'A friend'} invited you to join a Huddle.`,
          timestamp: inviteData.timestamp || new Date().toISOString(),
          read: false,
          status: 'pending'
        };
        return [notif, ...prev.filter(n => n.id !== notif.id && n.invitationId !== inviteData.invitationId)];
      });
    });

    const unsubCancelled = subscribeHuddleEvent('invitation_cancelled', (data) => {
      setNotifications(prev => prev.map(n => {
        if (n.invitationId === data.invitationId || n.huddleId === data.huddleId) {
          return { ...n, status: 'cancelled' };
        }
        return n;
      }));
    });

    return () => {
      unsubNotif();
      unsubInvite();
      unsubCancelled();
    };
  }, [isAuthenticated, user?.id, user?.role]);

  const unreadNotificationsCount = notifications.filter(n => !n.read && n.status === 'pending').length;

  // Synchronize Active Huddle Session from Backend
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'admin') {
      setActiveHuddle(null);
      return;
    }

    const checkActiveHuddle = async () => {
      try {
        const res = await api.huddle.getActive();
        if (res.huddle) {
          setActiveHuddle(res.huddle);
          // If Huddle has a nowPlaying track and current player is empty, sync it
          if (res.huddle.nowPlaying && (!currentTrack || currentTrack.id !== res.huddle.nowPlaying.trackId)) {
            setCurrentTrack(res.huddle.nowPlaying);
            setIsPlaying(true);
          }
        } else {
          setActiveHuddle(null);
        }
      } catch (err) {
        console.warn('[App] Could not fetch active huddle:', err.message);
      }
    };

    checkActiveHuddle();
  }, [isAuthenticated, user?.id]);

  // Real-time synchronization for active Huddle
  useEffect(() => {
    if (!activeHuddle?.id) return;

    joinHuddleRoom(activeHuddle.id);

    const unsubState = subscribeHuddleEvent('huddle_state_updated', (updated) => {
      setActiveHuddle(updated);
    });

    const unsubTrack = subscribeHuddleEvent('track_changed', (updated) => {
      setActiveHuddle(updated);
      if (updated.nowPlaying) {
        setCurrentTrack(updated.nowPlaying);
        setIsPlaying(true);
      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    });

    const unsubEnded = subscribeHuddleEvent('huddle_ended', (updated) => {
      setActiveHuddle(updated);
    });

    return () => {
      unsubState();
      unsubTrack();
      unsubEnded();
      leaveHuddleRoom(activeHuddle.id);
    };
  }, [activeHuddle?.id]);

  // Handle Track Play
  const handlePlayTrack = (track) => {
    if (!track) return;
    if (currentTrack?.id === track.id && playbackSessionRef.current.trackId === track.id) {
      recordActivity({ trackId: track.id, type: 'REPLAY', position: currentTime, duration });
    }
    playbackSessionRef.current = { trackId: track.id, startedAt: Date.now(), completed: false };
    recordActivity({ trackId: track.id, type: 'PLAY_STARTED' });
    setCurrentTrack(track);
    setIsPlaying(true);
  };

  // Synchronize Audio Element Playback State
  useEffect(() => {
    if (audioRef.current && currentTrack && isPlaying) {
      audioRef.current.play().catch(err => {
        console.warn('Playback prevented or failed:', err);
      });
    }
  }, [currentTrack]);

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (!audioRef.current || !currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => { });
      setIsPlaying(true);
    }
  };

  // Next Track
  const handleNextTrack = (reason = 'skip') => {
    if (reason === 'skip' && currentTrack?.id && isPlaying) {
      const completedRatio = duration ? Math.min(1, currentTime / duration) : 0;
      recordActivity({ trackId: currentTrack.id, type: 'SKIP', position: currentTime, duration, completedRatio });
    }
    if (playQueue.length > 0) {
      const nextTrack = playQueue[0];
      setPlayQueue(prev => prev.slice(1));
      handlePlayTrack(nextTrack);
    } else {
      if (catalog.length === 0) return;
      const idx = catalog.findIndex((t) => t.id === currentTrack?.id);
      let nextIdx;
      if (isShuffle || idx === -1) {
        nextIdx = Math.floor(Math.random() * catalog.length);
      } else {
        nextIdx = (idx + 1) % catalog.length;
      }
      handlePlayTrack(catalog[nextIdx]);
    }
  };

  // Previous Track
  const handlePrevTrack = () => {
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      setCurrentTime(0);
      return;
    }
    if (currentTrack?.id && isPlaying) {
      const completedRatio = duration ? Math.min(1, currentTime / duration) : 0;
      recordActivity({ trackId: currentTrack.id, type: 'SKIP', position: currentTime, duration, completedRatio });
    }
    if (catalog.length === 0) return;
    const idx = catalog.findIndex((t) => t.id === currentTrack?.id);
    if (idx === -1) return;
    const prevIdx = (idx - 1 + catalog.length) % catalog.length;
    handlePlayTrack(catalog[prevIdx]);
  };

  // Audio Time Update Event
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // Audio Loaded Metadata Event
  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setDuration(audioRef.current.duration);
    }
  };

  // Audio Track Ended Event
  const handleTrackEnded = () => {
    if (currentTrack?.id && !playbackSessionRef.current.completed) {
      playbackSessionRef.current.completed = true;
      recordActivity({ trackId: currentTrack.id, type: 'PLAY_COMPLETED', position: duration, duration, completedRatio: 1 });
    }
    if (activeHuddle && activeHuddle.status === 'active') {
      api.huddle.advancePlayback(activeHuddle.id, 'track_ended').catch(err => {
        console.warn('[Huddle] Failed to advance track on ended:', err.message);
      });
      return;
    }

    if (isLoop) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => { });
      }
    } else {
      handleNextTrack('ended');
    }
  };


  // Seek Slider Event
  const handleSeek = (valueOrEvent) => {
    const newTime = typeof valueOrEvent === 'number' ? valueOrEvent : parseFloat(valueOrEvent.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // Volume Change Event
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) setIsMuted(true);
    else setIsMuted(false);
  };

  // Toggle Mute
  const handleToggleMute = () => {
    if (isMuted) {
      setIsMuted(false);
      if (audioRef.current) audioRef.current.volume = volume || 0.8;
    } else {
      setIsMuted(true);
      if (audioRef.current) audioRef.current.volume = 0;
    }
  };

  // Format seconds to mm:ss
  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isCurrentLiked = currentTrack && shelf?.likedTrackIds?.includes(currentTrack.id);

  // 1. Loading Splash
  if (loading) {
    return (
      <div className="h-[100dvh] w-full bg-[#08090E] flex flex-col items-center justify-center space-y-4 select-none">
        <img src={`${window.location.origin}/branding/resona-icon.png`} alt="Resona" className="w-16 h-16 object-contain drop-shadow-[0_10px_15px_rgba(45,212,191,0.2)] animate-pulse" />
        <p className="text-xs font-bold text-teal-400 tracking-widest uppercase">Initializing Resona Studio...</p>
      </div>
    );
  }

  // 2. Admin Flow (always bypasses maintenance mode)
  if (user?.role === 'admin') {
    return (
      <div className="min-h-[100dvh] w-full bg-[#06070B]">
        <AdminDashboard />
      </div>
    );
  }

  // 3. Maintenance Mode Flow (blocks all non-admin users)
  if (platformConfig?.maintenanceMode) {
    return (
      <MaintenanceScreen
        maintenanceMessage={platformConfig.maintenanceMessage}
        onRefreshStatus={fetchPlatformConfig}
        onAdminLoginSuccess={() => window.location.reload()}
      />
    );
  }

  // 4. Unauthenticated Flows
  if (!deviceSeen) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#06070B] text-slate-100 flex flex-col relative select-none font-sans bg-gradient-to-b from-slate-950/60 to-[#08090E]">
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <OnboardingView
          onComplete={() => setDeviceSeen(true)}
          onOpenLogin={() => setDeviceSeen(true)}
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#06070B] text-slate-100 flex flex-col relative select-none font-sans bg-gradient-to-b from-slate-950/60 to-[#08090E]">
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />
        <LoginView
          onGoToGetStarted={() => setDeviceSeen(false)}
        />
      </div>
    );
  }

  // Active Viewport Resolver:
  const renderCurrentView = () => {
    switch (activeTab) {
      case 'pulse':
        return <PulseView onPlayTrack={handlePlayTrack} onNavigate={setActiveTab} onOpenNotifications={() => setShowNotificationDrawer(true)} unreadCount={unreadNotificationsCount} />;
      case 'seek':
        return (
          <SeekView
            onPlayTrack={handlePlayTrack}
            query={searchQuery}
            setQuery={setSearchQuery}
            onNavigate={setActiveTab}
          />
        );
      case 'shelf':
        return <ShelfView onPlayTrack={handlePlayTrack} onNavigate={setActiveTab} />;
      case 'onair':
        return (
          <OnAirView
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={handleTogglePlay}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onSeek={handleSeek}
            onNavigate={setActiveTab}
            activeHuddle={activeHuddle}
            setShowHuddleRoom={setShowHuddleRoom}
            playQueue={playQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
            onReorderQueue={handleReorderQueue}
            onPlayTrack={handlePlayTrack}
          />
        );
      case 'tuned':
        return <TunedForYouView onPlayTrack={handlePlayTrack} />;
      case 'curated':
        return <CuratedExperiencesView onPlayTrack={handlePlayTrack} />;
      case 'social':
        return (
          <SocialView
            onPlayTrack={handlePlayTrack}
            onNavigate={setActiveTab}
            activeHuddle={activeHuddle}
            setActiveHuddle={setActiveHuddle}
            setShowHuddleRoom={setShowHuddleRoom}
            fusionsList={fusionsList}
            setFusionsList={setFusionsList}
          />
        );

      case 'creator':
        return <CreatorHubView onPlayTrack={handlePlayTrack} />;
      case 'settings':
      case 'profile':
        return <SettingsView onNavigate={setActiveTab} />;
      default:
        if (activeTab.startsWith('profile/')) {
          const username = activeTab.split('/')[1];
          return <PublicProfileView username={username} onPlayTrack={handlePlayTrack} onNavigate={setActiveTab} />;
        }
        if (activeTab.startsWith('playlist/')) {
          const pId = activeTab.split('/')[1];
          return (
            <PlaylistView 
              playlistId={pId}
              onPlayTrack={handlePlayTrack}
              onPlayPlaylist={(tracks, shuffle) => {
                if (!tracks || tracks.length === 0) return;
                let toPlay = [...tracks];
                if (shuffle) toPlay = toPlay.sort(() => 0.5 - Math.random());
                handlePlayTrack(toPlay[0]);
                setPlayQueue(toPlay.map(t => ({ ...t, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })));
              }}
              isPlaying={isPlaying}
              currentTrack={currentTrack}
              onNavigate={setActiveTab}
            />
          );
        }
        return <PulseView onPlayTrack={handlePlayTrack} onNavigate={setActiveTab} onOpenNotifications={() => setShowNotificationDrawer(true)} unreadCount={unreadNotificationsCount} />;
    }
  };

  // Dedicated Mobile Viewport Resolver (< 768px):
  const renderMobileView = () => {
    switch (activeTab) {
      case 'pulse':
        return (
          <MobilePulseView
            catalog={catalog}
            onPlayTrack={handlePlayTrack}
            onNavigate={setActiveTab}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
          />
        );
      case 'seek':
        return (
          <MobileSeekView
            catalog={catalog}
            onPlayTrack={handlePlayTrack}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
            query={searchQuery}
            setQuery={setSearchQuery}
            onNavigate={setActiveTab}
          />
        );
      case 'shelf':
        return (
          <MobileShelfView
            shelf={shelf}
            catalog={catalog}
            onPlayTrack={handlePlayTrack}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
            onNavigate={setActiveTab}
          />
        );
      case 'onair':
        return (
          <MobileOnAirView
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={handleTogglePlay}
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onSeek={handleSeek}
            onNavigate={setActiveTab}
            isCurrentLiked={isCurrentLiked}
            onToggleLike={() => currentTrack && toggleLikeTrack(currentTrack.id)}
            isShuffle={isShuffle}
            onToggleShuffle={() => setIsShuffle(!isShuffle)}
            isLoop={isLoop}
            onToggleLoop={() => setIsLoop(!isLoop)}
            onOpenQueue={() => setShowMobileQueue(true)}
            activeHuddle={activeHuddle}
            onOpenHuddle={() => setShowHuddleRoom(true)}
            onToast={showToast}
            playQueue={playQueue}
            onRemoveFromQueue={handleRemoveFromQueue}
            onClearQueue={handleClearQueue}
            onReorderQueue={handleReorderQueue}
          />
        );
      case 'social':
        return (
          <MobileSocialView
            user={user}
            catalog={catalog}
            activeHuddle={activeHuddle}
            setActiveHuddle={setActiveHuddle}
            setShowHuddleRoom={setShowHuddleRoom}
            currentTrack={currentTrack}
            onOpenHuddleRoom={() => setShowHuddleRoom(true)}
            fusionsList={fusionsList}
            setFusionsList={setFusionsList}
            onPlayTrack={handlePlayTrack}
          />
        );
      case 'creator':
        return <MobileCreatorHubView onPlayTrack={handlePlayTrack} />;
      case 'settings':
        return (
          <MobileSettingsView
            user={user}
            onNavigate={setActiveTab}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        );
      case 'profile':
        return (
          <MobileProfileView
            shelf={shelf}
            onNavigate={setActiveTab}
            onOpenAuthModal={() => setShowAuthModal(true)}
          />
        );
      case 'tuned':
      case 'curated':
      default:
        if (activeTab.startsWith('profile/')) {
          const username = activeTab.split('/')[1];
          return <PublicProfileView username={username} onPlayTrack={handlePlayTrack} onNavigate={setActiveTab} />;
        }
        if (activeTab.startsWith('playlist/')) {
          const pId = activeTab.split('/')[1];
          return (
            <PlaylistView 
              playlistId={pId}
              onPlayTrack={handlePlayTrack}
              onPlayPlaylist={(tracks, shuffle) => {
                if (!tracks || tracks.length === 0) return;
                let toPlay = [...tracks];
                if (shuffle) toPlay = toPlay.sort(() => 0.5 - Math.random());
                handlePlayTrack(toPlay[0]);
                setPlayQueue(toPlay.map(t => ({ ...t, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` })));
              }}
              isPlaying={isPlaying}
              currentTrack={currentTrack}
              onNavigate={setActiveTab}
            />
          );
        }
        return (
          <MobilePulseView
            catalog={catalog}
            onPlayTrack={handlePlayTrack}
            onNavigate={setActiveTab}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
          />
        );
    }
  };

  return (
    <div className="min-h-[100dvh] w-full md:overflow-x-clip bg-[#06070B] text-slate-100 flex flex-col relative font-sans bg-gradient-to-b from-slate-950/60 to-[#08090E]">
      {showTransition && (
        <LoginTransition onComplete={() => setShowTransition(false)} />
      )}

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 md:w-[450px] md:h-[450px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 md:w-[450px] md:h-[450px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none z-0" />

      {/* HTML5 Master Audio Element */}
      <audio
        ref={audioRef}
        src={currentTrack?.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleTrackEnded}
      />

      {/* ============================================================ */}
      {/* DESKTOP EXPERIENCE (>= 768px) - 100% FROZEN & UNCHANGED       */}
      {/* ============================================================ */}
      <div className="hidden md:flex flex-col min-h-[100dvh] w-full relative">
        {/* DESKTOP HEADER (Fixed top) */}
        <header className="hidden md:flex fixed top-0 left-0 h-14 w-full glass-panel border-b border-white/5 px-6 items-center justify-between z-50 backdrop-blur-2xl bg-slate-950/80">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setActiveTab('pulse')}>
              <img src={`${window.location.origin}/branding/resona-icon.png`} alt="Resona" className="w-8 h-8 object-contain drop-shadow-[0_4px_6px_rgba(45,212,191,0.2)]" />
              <span className="font-black text-base tracking-wider text-white">RESONA</span>
              <span className="text-[10px] text-teal-400 font-mono px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                STUDIO PRO
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('pulse')}
                className="p-1.5 rounded-full glass-card text-slate-400 hover:text-white transition"
                title="Home"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTab('seek')}
                className="p-1.5 rounded-full glass-card text-slate-400 hover:text-white transition"
                title="Explore"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center: Global Search Bar */}
          <div className="max-w-md w-full mx-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search songs, artists, soundscapes..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeTab !== 'seek') setActiveTab('seek');
                }}
                className="w-full py-1.5 pl-10 pr-4 rounded-full glass-card border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-400 transition"
              />
            </div>
          </div>

          {/* Right: Notification Bell & Authenticated User Profile Chip & Menu */}
          <div className="relative flex items-center gap-3">
            <button
              onClick={() => setShowNotificationDrawer(true)}
              className="p-2 rounded-full glass-card border border-white/10 hover:border-cyan-500/40 text-slate-400 hover:text-white transition relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <>
                  <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-cyan-400 rounded-full" />
                </>
              )}
            </button>

            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-full glass-card border border-white/10 hover:border-teal-500/40 transition group"
            >
              <Avatar
                user={user}
                className="w-7 h-7 rounded-full border border-teal-400/80"
              />
              <div className="text-left">
                <p className="text-xs font-bold text-white group-hover:text-teal-300 transition leading-tight">
                  {user?.name || 'Listener'}
                </p>
                <p className="text-[10px] text-teal-400 font-mono leading-tight"><PlanBadge plan={user?.plan ?? user?.planId} /></p>
              </div>
            </button>

            {/* User Profile Dropdown Menu */}
            {showProfileMenu && (
              <div className="absolute right-0 top-12 w-64 glass-panel border border-teal-500/30 rounded-2xl p-3 shadow-2xl space-y-2 z-50">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                  <p className="text-xs font-bold text-white">{user?.name}</p>
                  <p className="text-[10px] text-slate-400">{user?.email}</p>
                  <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-400 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Bcrypt Encrypted</span>
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-white/5 text-xs">
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setActiveTab('settings');
                    }}
                    className="w-full py-2 px-3 rounded-xl hover:bg-white/10 text-left text-slate-200 flex items-center gap-2 transition"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    <span>Account & Settings</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowAuthModal(true);
                    }}
                    className="w-full py-2 px-3 rounded-xl hover:bg-white/10 text-left text-teal-300 flex items-center gap-2 transition"
                  >
                    <User className="w-4 h-4 text-teal-400" />
                    <span>Switch Account</span>
                  </button>

                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await logout();
                    }}
                    className="w-full py-2 px-3 rounded-xl hover:bg-rose-500/10 text-left text-rose-400 flex items-center gap-2 transition font-bold"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* MAIN WORKSPACE */}
        <div className="w-full flex-1 relative">
          {/* DESKTOP SIDEBAR (Fixed left) */}
          <aside className="hidden md:flex fixed top-14 left-0 bottom-0 w-64 glass-panel border-r border-white/5 flex-col justify-between p-4 overflow-y-auto no-scrollbar z-40 backdrop-blur-2xl bg-slate-950/80 pb-6">
            <div className="space-y-6">
              <div className="space-y-1">
                {[
                  { id: 'pulse', label: 'Home / Pulse', icon: Sparkles },
                  { id: 'seek', label: 'Explore & Search', icon: Search },
                  { id: 'onair', label: 'On Air Studio', icon: Radio },
                  { id: 'shelf', label: 'Your Shelf', icon: Library },
                  { id: 'tuned', label: 'Tuned For You', icon: Disc },
                  { id: 'curated', label: 'Curated Mixes', icon: Flame },
                  { id: 'social', label: 'Social & Huddle', icon: User }
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full py-2.5 px-3.5 rounded-2xl flex items-center gap-3.5 transition text-xs font-bold ${isActive
                        ? 'bg-teal-400 text-slate-950 shadow-md shadow-teal-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Library Section */}
              <div className="space-y-2 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between px-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                    Your Library
                  </span>
                  <button
                    onClick={() => setActiveTab('shelf')}
                    className="p-1 rounded-lg text-slate-400 hover:text-teal-400 transition"
                    title="View Library"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => setActiveTab('shelf')}
                  className={`w-full py-2 px-3 rounded-xl flex items-center gap-3 transition text-xs ${activeTab === 'shelf'
                    ? 'text-teal-300 font-bold bg-white/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shrink-0">
                    <Heart className="w-3 h-3 fill-white" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-white text-xs truncate">Liked Songs</p>
                    <p className="text-[10px] text-slate-500">{shelf?.likedTrackIds?.length || 0} Tracks</p>
                  </div>
                </button>

                <div className="space-y-0.5 max-h-40 overflow-y-auto no-scrollbar">
                  {shelf?.playlists?.map((pl) => (
                    <button
                      key={pl.id}
                      onClick={() => {
                        setActiveTab('shelf');
                        handlePlayTrack(catalog.length > 0 ? catalog[0] : null);
                      }}
                      className="w-full py-1.5 px-3 rounded-xl flex items-center gap-2.5 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition truncate text-left"
                    >
                      <Library className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate">{pl.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Creator Studio & Settings */}
            <div className="space-y-2 pt-4 border-t border-white/5">
              {(() => {
                const isApprovedCreator = creatorData?.isCreator || creatorData?.status === 'approved';
                const isPending = creatorData?.status === 'pending';
                return (
                  <button
                    onClick={() => setActiveTab('creator')}
                    className={`w-full p-3 rounded-2xl glass-card flex items-center gap-3 transition text-left border ${activeTab === 'creator'
                      ? 'border-purple-400 bg-purple-500/20 text-white'
                      : 'border-purple-500/20 hover:bg-purple-500/10 text-purple-300'
                      }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">
                        {isApprovedCreator ? 'Creator Studio' : isPending ? 'Creator Application' : 'Become a Creator'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {isApprovedCreator 
                          ? `${creatorData?.uploads?.length || 0} Releases` 
                          : isPending 
                            ? 'Under Review' 
                            : 'Apply to publish'}
                      </p>
                    </div>
                  </button>
                );
              })()}

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full py-2 px-3 rounded-xl flex items-center gap-3 transition text-xs font-semibold ${activeTab === 'settings'
                  ? 'bg-teal-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings & Account</span>
              </button>
            </div>
          </aside>

          {/* MAIN CONTENT AREA */}
          <main className={`w-full min-h-[100dvh] relative custom-scrollbar p-3.5 sm:p-4 pt-[calc(4.25rem+env(safe-area-inset-top,0px))] md:p-8 md:pt-[88px] md:pl-[288px] ${!deviceSeen || !isAuthenticated ? 'pb-4' : activeTab === 'onair' ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] md:pb-4' : 'pb-[calc(10rem+env(safe-area-inset-bottom,0px))] md:pb-[128px]'}`}>
            {renderCurrentView()}
          </main>

          {/* DESKTOP MASTER AUDIO PLAYER DOCK (Fixed bottom) */}
          {deviceSeen && isAuthenticated && (
            <footer className="hidden md:flex fixed bottom-0 md:left-64 right-0 h-24 glass-panel border-t border-l border-white/10 px-6 items-center justify-between z-40 bg-slate-950/95 backdrop-blur-2xl">
              <div className="flex items-center gap-4 min-w-[220px] max-w-xs">
                <div className="relative group cursor-pointer" onClick={() => currentTrack && setActiveTab('onair')}>
                  {currentTrack ? (
                    <img
                      src={resolveMediaUrl(currentTrack.cover)}
                      alt={currentTrack.title}
                      className="w-14 h-14 rounded-2xl object-cover shadow-xl border border-white/10 group-hover:scale-105 transition"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-slate-800 shadow-xl border border-white/10 flex items-center justify-center">
                      <Music className="w-6 h-6 text-slate-600" />
                    </div>
                  )}
                  {currentTrack && (
                    <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <Maximize2 className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h4
                    onClick={() => currentTrack && setActiveTab('onair')}
                    className={`font-bold text-sm truncate transition ${currentTrack ? 'text-white hover:text-teal-300 cursor-pointer' : 'text-slate-500'}`}
                  >
                    {currentTrack ? currentTrack.title : 'No Track Selected'}
                  </h4>
                  <p className="text-xs text-slate-400 truncate">{currentTrack ? currentTrack.artist : '---'}</p>
                </div>

                <button
                  onClick={() => currentTrack && toggleLikeTrack(currentTrack.id)}
                  disabled={!currentTrack}
                  className={`p-2 rounded-full hover:scale-110 transition ${!currentTrack ? 'text-slate-700 cursor-not-allowed' :
                    isCurrentLiked ? 'text-pink-400' : 'text-slate-500 hover:text-white'
                    }`}
                  title="Like Track"
                >
                  <Heart className={`w-4 h-4 ${isCurrentLiked ? 'fill-pink-400' : ''}`} />
                </button>
              </div>

              <div className="flex flex-col items-center gap-1.5 flex-1 max-w-xl px-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsShuffle(!isShuffle)}
                    className={`p-1.5 transition ${!currentTrack ? 'text-slate-700 cursor-not-allowed' : isShuffle ? 'text-teal-400' : 'text-slate-500 hover:text-white'}`}
                    title="Shuffle"
                    disabled={!currentTrack}
                  >
                    <Shuffle className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handlePrevTrack}
                    className={`p-1.5 transition ${!currentTrack ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:scale-110'}`}
                    title="Previous"
                    disabled={!currentTrack}
                  >
                    <SkipBack className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={handleTogglePlay}
                    disabled={!currentTrack}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition ${!currentTrack ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20 hover:scale-105'
                      }`}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 fill-current" />
                    ) : (
                      <Play className="w-5 h-5 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    onClick={handleNextTrack}
                    className={`p-1.5 transition ${!currentTrack ? 'text-slate-700 cursor-not-allowed' : 'text-slate-300 hover:text-white hover:scale-110'}`}
                    title="Next"
                    disabled={!currentTrack}
                  >
                    <SkipForward className="w-5 h-5 fill-current" />
                  </button>

                  <button
                    onClick={() => setIsLoop(!isLoop)}
                    className={`p-1.5 transition ${!currentTrack ? 'text-slate-700 cursor-not-allowed' : isLoop ? 'text-teal-400' : 'text-slate-500 hover:text-white'}`}
                    title="Repeat"
                    disabled={!currentTrack}
                  >
                    <Repeat className="w-4 h-4" />
                  </button>
                </div>

                <div className="w-full flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.5"
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={!currentTrack}
                    className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${!currentTrack ? 'bg-slate-800/50 accent-slate-700' : 'bg-slate-800 accent-teal-400'}`}
                  />
                  <span className="text-[10px] font-mono text-slate-400 w-8">
                    {formatTime(duration)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-[200px] justify-end">
                {activeHuddle && activeHuddle.status === 'active' && (
                  <button
                    onClick={() => setShowHuddleRoom(true)}
                    className="flex items-center gap-2 py-1 px-3 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/25 transition shadow-sm"
                    title="Open active Huddle Queue"
                  >
                    <Radio className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                    <span className="truncate max-w-[120px]">{activeHuddle.name}</span>
                  </button>
                )}

                {isPlaying && (
                  <div className="hidden lg:flex items-center gap-1 h-5">
                    <span className="w-1 bg-teal-400 rounded-full animate-bounce h-3" />
                    <span className="w-1 bg-teal-300 rounded-full animate-bounce h-5 [animation-delay:0.15s]" />
                    <span className="w-1 bg-teal-400 rounded-full animate-bounce h-2 [animation-delay:0.3s]" />
                    <span className="w-1 bg-teal-500 rounded-full animate-bounce h-4 [animation-delay:0.45s]" />
                  </div>
                )}


                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleMute}
                    className="text-slate-400 hover:text-white transition"
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX className="w-4 h-4 text-rose-400" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1.5 rounded-lg appearance-none bg-slate-800 accent-teal-400 cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setActiveTab('onair')}
                  className={`p-2 rounded-xl transition ${activeTab === 'onair' ? 'text-teal-400 bg-teal-500/20' : 'text-slate-400 hover:text-white glass-card'
                    }`}
                  title="Expand Studio Mode"
                >
                  <Radio className="w-4 h-4" />
                </button>
              </div>
            </footer>
          )}
        </div>

        {/* Real Huddle Room Overlay */}
        {showHuddleRoom && activeHuddle && (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xl p-2 sm:p-4 md:p-6 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] md:pt-8 overflow-y-auto custom-scrollbar flex items-start justify-center">
            <div className="w-full max-w-[1400px] relative">
              <HuddleView
                huddleId={activeHuddle.id}
                currentHuddle={activeHuddle}
                onClose={() => {
                  setShowHuddleRoom(false);
                  if (activeHuddle && activeHuddle.status === 'ended') setActiveHuddle(null);
                }}
                onPlayTrack={handlePlayTrack}
                catalog={catalog}
                user={user}
              />
            </div>
          </div>
        )}

        {/* Real-time Resona Notification Drawer */}
        <NotificationDrawer
          isOpen={showNotificationDrawer}
          onClose={() => setShowNotificationDrawer(false)}
          notifications={notifications}
          setNotifications={setNotifications}
          activeHuddle={activeHuddle}
          setActiveHuddle={setActiveHuddle}
          setShowHuddleRoom={setShowHuddleRoom}
          onNavigate={setActiveTab}
        />
      </div>

      {/* ============================================================ */}
      {/* PURPOSE-BUILT MOBILE EXPERIENCE (< 768px)                    */}
      {/* ============================================================ */}
      <div className="flex md:hidden flex-col min-h-[100dvh] w-full max-w-[100vw] overflow-x-clip overscroll-x-none relative bg-[#07080c] text-white">
        {/* Mobile Top Bar */}
        <MobileHeader
          activeTab={activeTab}
          onNavigate={setActiveTab}
          unreadCount={unreadNotificationsCount}
          onOpenNotifications={() => setShowNotificationDrawer(true)}
          onOpenProfile={() => setActiveTab('profile')}
          user={user}
        />

        {/* Mobile Scrollable Page Content */}
        <main
          id="mobile-main-content"
          className={`w-full max-w-[100vw] overflow-x-clip overscroll-x-none min-h-[calc(100dvh-3.5rem)] pt-[calc(3.5rem+env(safe-area-inset-top,0px))] ${
            activeTab === 'onair'
              ? 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
              : currentTrack
              ? 'pb-[calc(10.5rem+env(safe-area-inset-bottom,0px))]'
              : 'pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          {renderMobileView()}
        </main>

        {/* Mobile Mini Player (Immediately above bottom nav) */}
        {(currentTrack || (activeHuddle && activeHuddle.status === 'active')) && activeTab !== 'onair' && (
          <MobileMiniPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            onTogglePlay={handleTogglePlay}
            onOpenOnAir={() => setActiveTab('onair')}
            isLiked={isCurrentLiked}
            onToggleLike={() => currentTrack && toggleLikeTrack(currentTrack.id)}
            activeHuddle={activeHuddle}
            onOpenHuddleRoom={() => setShowHuddleRoom(true)}
          />
        )}

        {/* Mobile 5-Item Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          onNavigate={setActiveTab}
        />

        {/* Mobile Notifications Sheet */}
        <MobileNotificationsSheet
          isOpen={showNotificationDrawer}
          onClose={() => setShowNotificationDrawer(false)}
          notifications={notifications}
          setNotifications={setNotifications}
          activeHuddle={activeHuddle}
          setActiveHuddle={setActiveHuddle}
          setShowHuddleRoom={setShowHuddleRoom}
          onNavigate={setActiveTab}
        />

        {/* Mobile Huddle Room View */}
        {showHuddleRoom && activeHuddle && (
          <div className="fixed inset-0 z-50 bg-[#07080c]">
            <MobileHuddleView
              currentHuddle={activeHuddle}
              huddle={activeHuddle}
              user={user}
              catalog={catalog}
              onClose={() => {
                setShowHuddleRoom(false);
                if (activeHuddle && activeHuddle.status === 'ended') setActiveHuddle(null);
              }}
              onPlayTrack={handlePlayTrack}
              onRefreshHuddle={fetchPlatformConfig}
            />
          </div>
        )}

        {/* Mobile Queue Bottom Sheet */}
        <MobileQueueSheet
          isOpen={showMobileQueue}
          onClose={() => setShowMobileQueue(false)}
          currentTrack={currentTrack}
          queue={playQueue.length > 0 ? playQueue : catalog}
          onPlayTrack={handlePlayTrack}
          onRemoveFromQueue={handleRemoveFromQueue}
          onClearQueue={handleClearQueue}
          onReorderQueue={handleReorderQueue}
        />

        {/* Mobile Track Action Sheet */}
        <MobileTrackActionSheet
          isOpen={!!mobileTrackAction}
          onClose={() => setMobileTrackAction(null)}
          track={mobileTrackAction}
          onPlayTrack={(t) => { handlePlayTrack(t); setMobileTrackAction(null); }}
          onAddToQueue={handleAddToQueue}
          activeHuddle={activeHuddle}
          onAddToHuddleQueue={handleAddToHuddleQueue}
          isLiked={mobileTrackAction ? shelf?.likedTrackIds?.includes(mobileTrackAction.id) : false}
          onToggleLike={() => { if (mobileTrackAction) toggleLikeTrack(mobileTrackAction.id); }}
        />
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-white/10 shadow-2xl px-4 py-2 rounded-xl flex items-center justify-center animate-in slide-in-from-bottom-2 fade-in duration-300">
          <span className="text-white text-xs font-bold whitespace-nowrap">{toastMsg}</span>
        </div>
      )}

      {/* Switch Account Modal (Common) */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}

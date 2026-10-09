import { usePlayer } from './context/PlayerContext';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { initPushNotifications } from './services/pushService';
import { App as CapacitorApp } from '@capacitor/app';
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
import AccountSwitcherModal from './components/AccountSwitcherModal';
import LoginTransition from './components/LoginTransition';
import AdminDashboard from './components/AdminDashboard';
import MaintenanceScreen from './components/MaintenanceScreen';
import HuddleView from './components/HuddleView';
import NotificationDrawer from './components/NotificationDrawer';
import { joinHuddleRoom, leaveHuddleRoom, subscribeHuddleEvent, registerSocketUser } from './services/huddleSocket';
import { resolveMediaUrl, api } from './services/api';

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
import NotificationBell from './components/NotificationBell';
import FeatureUnavailable from './components/FeatureUnavailable';
import { isNotificationUnread, mergeNotifications } from './utils/notifications';

import {
  Sparkles, Search, Library, Radio, User, Settings, Disc, Play, Pause,
  SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, Heart,
  Flame, Plus, ChevronLeft, ChevronRight, LogOut, ShieldCheck,
  Maximize2, Music
} from 'lucide-react';


export default function App() {
  const {
    currentTrack, queue: playQueue, isPlaying, currentTime, duration, volume, isMuted, isShuffle, isLoop, isRepeatAll,
    playTrack, addToQueue, addNextToQueue, togglePlay, playNext, playPrevious, seekTo, setVolume,
    toggleMute, toggleShuffle, toggleLoop
  } = usePlayer();

  const { user, shelf, creatorData, isAuthenticated, loading, logout, toggleLikeTrack, catalog, refreshPlan } = useAuth();

  const [activeHuddle, setActiveHuddle] = useState(null);
  const [showHuddleRoom, setShowHuddleRoom] = useState(false);
  const [fusionsList, setFusionsList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [inAppUnreadCount, setInAppUnreadCount] = useState(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const notificationsRef = useRef(notifications);
  const notificationPanelSyncRef = useRef({ userId: null, promise: null });
  const notificationReadInFlightRef = useRef(new Set());
  useEffect(() => {
    notificationsRef.current = notifications;
  }, [notifications]);
  const notificationUserIdRef = useRef(user?.id);
  useEffect(() => {
    notificationUserIdRef.current = user?.id;
  }, [user?.id]);

  const loadNotifications = useCallback(async () => {
    const requestedUserId = user?.id;
    const [inAppResult, socialResult] = await Promise.allSettled([
      api.notifications.getNotifications(),
      api.social.getNotifications()
    ]);

    if (notificationUserIdRef.current !== requestedUserId) return;

    if (inAppResult.status === 'rejected') {
      console.warn('[App] Could not load in-app notifications:', inAppResult.reason?.message);
    }
    if (socialResult.status === 'rejected') {
      console.warn('[App] Could not load social notifications:', socialResult.reason?.message);
    }

    if (inAppResult.status === 'rejected' && socialResult.status === 'rejected') {
      throw inAppResult.reason;
    }

    if (inAppResult.status === 'fulfilled') {
      setInAppUnreadCount(Math.max(0, Number(inAppResult.value?.unreadCount) || 0));
    }

    const currentNotifications = notificationsRef.current;
    const mergedNotifications = mergeNotifications(
      inAppResult.status === 'fulfilled'
        ? (Array.isArray(inAppResult.value?.notifications) ? inAppResult.value.notifications : [])
          .map((notification) => ({ ...notification, notificationSource: 'inApp' }))
        : currentNotifications.filter((notification) => notification.notificationSource === 'inApp'),
      socialResult.status === 'fulfilled'
        ? (Array.isArray(socialResult.value?.notifications) ? socialResult.value.notifications : [])
          .map((notification) => ({ ...notification, notificationSource: 'social' }))
        : currentNotifications.filter((notification) => notification.notificationSource === 'social')
    );
    notificationsRef.current = mergedNotifications;
    setNotifications(mergedNotifications);
    return {
      notifications: mergedNotifications,
      inAppUnreadCount: inAppResult.status === 'fulfilled'
        ? Math.max(0, Number(inAppResult.value?.unreadCount) || 0)
        : null
    };
  }, [user?.id]);

  const markNotificationsAsRead = useCallback(async (
    notificationIds,
    candidates = notificationsRef.current,
    { markAllInApp = false } = {}
  ) => {
    const ids = new Set(notificationIds);
    const pendingIds = notificationReadInFlightRef.current;
    const unreadNotifications = candidates.filter(
      (notification) => ids.has(notification.id) &&
        !pendingIds.has(notification.id) &&
        isNotificationUnread(notification)
    );
    const inAppIds = unreadNotifications
      .filter((notification) => notification.notificationSource !== 'social')
      .map((notification) => notification.id);
    const socialIds = unreadNotifications
      .filter((notification) => notification.notificationSource === 'social')
      .map((notification) => notification.id);
    const requestIds = [
      ...new Set([
        ...inAppIds,
        ...socialIds,
        ...(markAllInApp
          ? candidates
            .filter((notification) => (
              notification.notificationSource !== 'social' && isNotificationUnread(notification)
            ))
            .map((notification) => notification.id)
          : [])
      ])
    ];
    requestIds.forEach((id) => pendingIds.add(id));

    try {
      if (markAllInApp) {
        await api.notifications.markAllAsRead();
        const readAt = new Date().toISOString();
        notificationsRef.current = notificationsRef.current.map((notification) => (
          notification.notificationSource !== 'social'
            ? { ...notification, read: true, readAt }
            : notification
        ));
        setNotifications((current) => current.map((notification) => (
          notification.notificationSource !== 'social'
            ? { ...notification, read: true, readAt }
            : notification
        )));
        setInAppUnreadCount(0);
      } else if (inAppIds.length > 0) {
        await api.notifications.markAsRead(inAppIds);
        const readAt = new Date().toISOString();
        notificationsRef.current = notificationsRef.current.map((notification) => (
          inAppIds.includes(notification.id)
            ? { ...notification, read: true, readAt }
            : notification
        ));
        setNotifications((current) => current.map((notification) => (
          inAppIds.includes(notification.id)
            ? { ...notification, read: true, readAt }
            : notification
        )));
        setInAppUnreadCount((count) => Math.max(0, count - inAppIds.length));
      }

      if (socialIds.length > 0) {
        await api.social.markNotificationsAsRead(socialIds);
        const readAt = new Date().toISOString();
        notificationsRef.current = notificationsRef.current.map((notification) => (
          socialIds.includes(notification.id)
            ? { ...notification, read: true, readAt }
            : notification
        ));
        setNotifications((current) => current.map((notification) => (
          socialIds.includes(notification.id)
            ? { ...notification, read: true, readAt }
            : notification
        )));
      }
    } finally {
      requestIds.forEach((id) => pendingIds.delete(id));
    }
  }, []);

  const [mobileTrackAction, setMobileTrackAction] = useState(null);
  const [showMobileQueue, setShowMobileQueue] = useState(false);

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
  const [activeTab, setActiveTabState] = useState('pulse');
  const [activeSubTab, setActiveSubTabState] = useState(null);
  const tabHistoryRef = useRef([{ tab: 'pulse', subTab: null }]);

  // Global Navigation Rule: Enforce Pulse on Startup / Account Switch
  const startupHandledRef = useRef(false);

  useEffect(() => {
    // 1. App Startup Rule
    if (!loading && isAuthenticated && !startupHandledRef.current) {
      startupHandledRef.current = true;
      if (user?.role === 'admin') {
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({ tab: 'admin', subTab: null }, '', '/admin');
        }
      } else {
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({ tab: 'pulse', subTab: null }, '', '/pulse');
        }
      }
    }
  }, [loading, isAuthenticated, user]);

  useEffect(() => {
    // 2. Account Switch Rule
    const handleAccountSwitched = () => {
      if (user?.role === 'admin') {
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({ tab: 'admin', subTab: null }, '', '/admin');
        }
      } else {
        setActiveTabState('pulse');
        setActiveSubTabState(null);
        tabHistoryRef.current = [{ tab: 'pulse', subTab: null }];
        if (typeof window !== 'undefined' && window.history) {
          window.history.replaceState({ tab: 'pulse', subTab: null }, '', '/pulse');
        }
      }
    };
    window.addEventListener('resona:account-switched', handleAccountSwitched);
    return () => window.removeEventListener('resona:account-switched', handleAccountSwitched);
  }, [user]);

  const setActiveTab = (tab, pushHistory = true) => {
    if (tab === 'BACK') {
      if (tabHistoryRef.current.length > 1) {
        tabHistoryRef.current.pop();
        const prev = tabHistoryRef.current[tabHistoryRef.current.length - 1];
        setActiveTabState(prev.tab);
        setActiveSubTabState(prev.subTab);
        if (typeof window !== 'undefined' && window.history) {
          window.history.back();
        }
      } else {
        setActiveTabState('pulse');
        setActiveSubTabState(null);
      }
      return;
    }

    let mainTab = tab;
    let subTab = null;
    if (tab.includes('/')) {
      const parts = tab.split('/');
      mainTab = parts[0];
      subTab = parts[1];
    }

    const current = tabHistoryRef.current[tabHistoryRef.current.length - 1];
    if (current.tab !== mainTab || current.subTab !== subTab) {
      tabHistoryRef.current.push({ tab: mainTab, subTab });
    }

    setActiveTabState(mainTab);
    setActiveSubTabState(subTab);

    if (pushHistory && typeof window !== 'undefined' && window.history) {
      const newPath = mainTab === 'pulse' && !subTab ? '/' : `/${mainTab}${subTab ? `/${subTab}` : ''}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState({ tab: mainTab, subTab }, '', newPath);
      }
    }
  };

  useEffect(() => {
    const onPopState = (event) => {
      const tab = event.state?.tab || 'pulse';
      const subTab = event.state?.subTab || null;
      setActiveTabState(tab);
      setActiveSubTabState(subTab);
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
  const [toastMsg, setToastMsg] = useState(null);
  const [toastKind, setToastKind] = useState('success');
  const toastTimeoutRef = useRef(null);

  const showToast = (msg) => {
    setToastKind('success');
    setToastMsg(msg);
    window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const handlePlayerFeedback = (event) => {
      const { message, kind = 'success' } = event.detail || {};
      if (!message) return;
      setToastKind(kind);
      setToastMsg(message);
      window.clearTimeout(toastTimeoutRef.current);
      toastTimeoutRef.current = window.setTimeout(() => setToastMsg(null), 3000);
    };
    window.addEventListener('resona:player-feedback', handlePlayerFeedback);
    return () => {
      window.removeEventListener('resona:player-feedback', handlePlayerFeedback);
      window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  const recordActivity = (event) => {
    api.user.recordActivity(event).catch(err => {
      console.warn('[Activity] Could not record listening activity:', err.message);
    });
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
          playTrack(t);
        } else {
          showToast('Song unavailable');
          setActiveTab('pulse');
        }
        // clear the URL so it doesn't loop
        window.history.replaceState({ tab: 'onair' }, '', '/onair');
      }
    }
  });

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

  // Synchronize Real-time Notifications & Presence
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user?.role === 'admin') {
      setNotifications([]);
      setInAppUnreadCount(0);
      return;
    }

    // Register user presence & personal room
    registerSocketUser(user.id);

    // Initialize native push notifications (Capacitor)
    initPushNotifications();

    loadNotifications().catch(err => console.warn('[App] Could not load notifications:', err.message));

    // Listen to real-time events
    const unsubNotif = subscribeHuddleEvent('notification_received', (newNotif) => {
      if (newNotif?.id) {
        const source = newNotif.type === 'huddle_invite' ? 'social' : 'inApp';
        setNotifications((previous) => mergeNotifications(
          previous,
          [{ ...newNotif, notificationSource: source }]
        ));
      }
      if (['PLAN_CHANGED', 'plan_change', 'plan_changed'].includes(newNotif?.type)) {
        refreshPlan().then((entitlements) => {
          if (!entitlements.features.huddle) {
            setActiveHuddle(null);
            setShowHuddleRoom(false);
          }
        }).catch(err => console.warn('[App] Could not refresh plan entitlements:', err.message));
      }
      loadNotifications().catch(err => console.warn('[App] Could not sync notifications:', err.message));
    });
    const unsubPlanChanged = subscribeHuddleEvent('plan_entitlements_changed', ({ planId } = {}) => {
      refreshPlan().then((entitlements) => {
        if (!entitlements.features.huddle) {
          setActiveHuddle(null);
          setShowHuddleRoom(false);
        }
      }).catch(err => console.warn(`[App] Could not refresh plan ${planId || ''}:`, err.message));
    });

    const unsubInvite = subscribeHuddleEvent('huddle_invitation', (inviteData) => {
      const notificationId = inviteData.notificationId || inviteData.id || inviteData.invitationId;
      if (notificationId) {
        const notif = {
          id: notificationId,
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
          status: 'pending',
          notificationSource: 'social'
        };
        setNotifications((previous) => mergeNotifications(previous, [notif]));
      }
      loadNotifications().catch(err => console.warn('[App] Could not sync notifications:', err.message));
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
      unsubPlanChanged();
      unsubInvite();
      unsubCancelled();
    };
  }, [isAuthenticated, user?.id, user?.role, loadNotifications, refreshPlan]);

  useEffect(() => {
    if (!showNotificationDrawer || !isAuthenticated || user?.role === 'admin' || !user?.id) return;
    const activeSync = notificationPanelSyncRef.current;
    if (activeSync.userId === user.id && activeSync.promise) return;

    const syncPromise = loadNotifications()
      .then(async (currentNotifications) => {
        if (!currentNotifications) return;
        const unreadIds = currentNotifications.notifications
          .filter(isNotificationUnread)
          .map((notification) => notification.id);
        const listedInAppUnreadCount = currentNotifications.notifications
          .filter((notification) => (
            notification.notificationSource !== 'social' && isNotificationUnread(notification)
          )).length;
        const markAllInApp = currentNotifications.inAppUnreadCount !== null &&
          currentNotifications.inAppUnreadCount > listedInAppUnreadCount;
        if (unreadIds.length > 0 || markAllInApp) {
          await markNotificationsAsRead(unreadIds, currentNotifications.notifications, { markAllInApp });
        }
      })
      .catch((err) => {
        console.warn('[App] Could not sync notifications on panel open:', err.message);
      })
      .finally(() => {
        if (notificationPanelSyncRef.current.promise === syncPromise) {
          notificationPanelSyncRef.current.promise = null;
        }
      });
    notificationPanelSyncRef.current = { userId: user.id, promise: syncPromise };
  }, [showNotificationDrawer, isAuthenticated, user?.id, user?.role, loadNotifications, markNotificationsAsRead]);

  useEffect(() => {
    if (!isAuthenticated || !user?.id || user?.role === 'admin') return;

    let active = true;
    let appStateListener;
    const sync = () => {
      loadNotifications().catch(err => console.warn('[App] Could not sync notifications:', err.message));
      refreshPlan().then((entitlements) => {
        if (!entitlements.features.huddle) {
          setActiveHuddle(null);
          setShowHuddleRoom(false);
        }
      }).catch(err => console.warn('[App] Could not refresh plan entitlements:', err.message));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') sync();
    };
    const handlePushNotification = () => sync();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pageshow', sync);
    window.addEventListener('resona:notification-sync', handlePushNotification);
    if (window.Capacitor?.isNativePlatform?.()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) sync();
      }).then((listener) => {
        if (active) {
          appStateListener = listener;
        } else {
          listener.remove();
        }
      }).catch((err) => console.warn('[App] Could not subscribe to app foreground events:', err.message));
    }

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pageshow', sync);
      window.removeEventListener('resona:notification-sync', handlePushNotification);
      appStateListener?.remove();
    };
  }, [isAuthenticated, user?.id, user?.role, loadNotifications, refreshPlan]);

  const unreadNotificationsCount = inAppUnreadCount + notifications.filter(
    (notification) => notification.notificationSource === 'social' && isNotificationUnread(notification)
  ).length;

  // Synchronize Active Huddle Session from Backend
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'admin') {
      setActiveHuddle(null);
      return;
    }
    if (user?.features?.huddle === false) {
      setActiveHuddle(null);
      setShowHuddleRoom(false);
      return;
    }

    const checkActiveHuddle = async () => {
      try {
        const res = await api.huddle.getActive();
        if (res.huddle) {
          setActiveHuddle(res.huddle);
          // If Huddle has a nowPlaying track and current player is empty, sync it
          if (res.huddle.nowPlaying && (!currentTrack || currentTrack.id !== res.huddle.nowPlaying.trackId)) {
            playTrack(res.huddle.nowPlaying);
          }
        } else {
          setActiveHuddle(null);
        }
      } catch (err) {
        console.warn('[App] Could not fetch active huddle:', err.message);
      }
    };

    checkActiveHuddle();
  }, [isAuthenticated, user?.id, user?.features?.huddle]);

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
        playTrack(updated.nowPlaying);
      } else if (isPlaying) {
        togglePlay();
      }
    });

    const unsubEnded = subscribeHuddleEvent('huddle_ended', (updated) => {
      setActiveHuddle(updated);
    });
    const unsubAccessRevoked = subscribeHuddleEvent('huddle_access_revoked', () => {
      setActiveHuddle(null);
      setShowHuddleRoom(false);
      refreshPlan().catch(err => console.warn('[App] Could not refresh plan entitlements:', err.message));
    });

    return () => {
      unsubState();
      unsubTrack();
      unsubEnded();
      unsubAccessRevoked();
      leaveHuddleRoom(activeHuddle.id);
    };
  }, [activeHuddle?.id, refreshPlan]);

  // Handle Track Play
  const handlePlayTrack = (track, queue = null) => {
    if (!track) return;
    recordActivity({ trackId: track.id, type: 'PLAY_STARTED' });
    playTrack(track, queue);
  };

  // Toggle Play / Pause
  const handleTogglePlay = () => {
    if (currentTrack) togglePlay();
  };

  // Next Track
  const handleNextTrack = (reason = 'skip') => {
    if (reason === 'skip' && currentTrack?.id && isPlaying) {
      const completedRatio = duration ? Math.min(1, currentTime / duration) : 0;
      recordActivity({ trackId: currentTrack.id, type: 'SKIP', position: currentTime, duration, completedRatio });
    }
    playNext();
  };

  // Previous Track
  const handlePrevTrack = () => {
    if (currentTime <= 3 && currentTrack?.id && isPlaying) {
      const completedRatio = duration ? Math.min(1, currentTime / duration) : 0;
      recordActivity({ trackId: currentTrack.id, type: 'SKIP', position: currentTime, duration, completedRatio });
    }
    playPrevious();
  };

  // Seek Slider Event
  const handleSeek = (valueOrEvent) => {
    const newTime = typeof valueOrEvent === 'number' ? valueOrEvent : parseFloat(valueOrEvent.target.value);
    seekTo(newTime);
  };

  // Volume Change Event
  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if ((val === 0) !== isMuted) toggleMute();
  };

  // Toggle Mute
  const handleToggleMute = () => {
    toggleMute();
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
        return <PulseView onNavigate={setActiveTab} onOpenNotifications={() => setShowNotificationDrawer(true)} unreadCount={unreadNotificationsCount} />;
      case 'seek':
        return (
          <SeekView
            query={searchQuery}
            setQuery={setSearchQuery}
            onNavigate={setActiveTab}
          />
        );
      case 'shelf':
        return <ShelfView activeSubTab={activeSubTab} onNavigate={setActiveTab} />;
      case 'onair':
        return (
          <OnAirView
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onNavigate={setActiveTab}
            activeHuddle={activeHuddle}
            setShowHuddleRoom={setShowHuddleRoom}
          />
        );
      case 'tuned':
        return <TunedForYouView />;
      case 'curated':
        return <CuratedExperiencesView />;
      case 'social':
        return (
          <SocialView
            activeSubTab={activeSubTab}
            onNavigate={setActiveTab}
            activeHuddle={activeHuddle}
            setActiveHuddle={setActiveHuddle}
            setShowHuddleRoom={setShowHuddleRoom}
            fusionsList={fusionsList}
            setFusionsList={setFusionsList}
          />
        );

      case 'creator':
        return user?.features?.creator_hub === true
          ? <CreatorHubView />
          : <FeatureUnavailable title="Creator Hub" />;
      case 'settings':
      case 'profile':
        return <SettingsView onNavigate={setActiveTab} />;
      default:
        if (activeTab.startsWith('profile/')) {
          const username = activeTab.split('/')[1];
          return <PublicProfileView username={username} onNavigate={setActiveTab} />;
        }
        if (activeTab.startsWith('playlist/')) {
          const pId = activeTab.split('/')[1];
          return (
            <PlaylistView
              playlistId={pId}
              onPlayPlaylist={(tracks, shuffle) => {
                if (!tracks || tracks.length === 0) return;
                let toPlay = [...tracks];
                if (shuffle) toPlay = toPlay.sort(() => 0.5 - Math.random());
                handlePlayTrack(toPlay[0], toPlay);
              }}
              onNavigate={setActiveTab}
            />
          );
        }
        return <PulseView onNavigate={setActiveTab} onOpenNotifications={() => setShowNotificationDrawer(true)} unreadCount={unreadNotificationsCount} />;
    }
  };

  // Dedicated Mobile Viewport Resolver (< 768px):
  const renderMobileView = () => {
    switch (activeTab) {
      case 'pulse':
        return (
          <MobilePulseView
            catalog={catalog}
            onNavigate={setActiveTab}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
          />
        );
      case 'seek':
        return (
          <MobileSeekView
            catalog={catalog}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
            query={searchQuery}
            setQuery={setSearchQuery}
            onNavigate={setActiveTab}
          />
        );
      case 'shelf':
        return (
          <MobileShelfView
            activeSubTab={activeSubTab}
            shelf={shelf}
            catalog={catalog}
            onOpenTrackActions={(track) => setMobileTrackAction(track)}
            onNavigate={setActiveTab}
          />
        );
      case 'onair':
        return (
          <MobileOnAirView
            onNext={handleNextTrack}
            onPrev={handlePrevTrack}
            onNavigate={setActiveTab}
            isCurrentLiked={isCurrentLiked}
            onToggleLike={() => currentTrack && toggleLikeTrack(currentTrack.id)}
            onToggleShuffle={toggleShuffle}
            onToggleLoop={toggleLoop}
            onOpenQueue={() => setShowMobileQueue(true)}
            activeHuddle={activeHuddle}
            onOpenHuddle={() => setShowHuddleRoom(true)}
            onToast={showToast}
          />
        );
      case 'social':
        return (
          <MobileSocialView
            activeSubTab={activeSubTab}
            user={user}
            catalog={catalog}
            activeHuddle={activeHuddle}
            setActiveHuddle={setActiveHuddle}
            setShowHuddleRoom={setShowHuddleRoom}
            onOpenHuddleRoom={() => setShowHuddleRoom(true)}
            fusionsList={fusionsList}
            setFusionsList={setFusionsList}
            onNavigate={setActiveTab}
          />
        );
      case 'creator':
        return user?.features?.creator_hub === true
          ? <MobileCreatorHubView />
          : <FeatureUnavailable title="Creator Hub" />;
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
          return <PublicProfileView username={username} onNavigate={setActiveTab} />;
        }
        if (activeTab.startsWith('playlist/')) {
          const pId = activeTab.split('/')[1];
          return (
            <PlaylistView
              playlistId={pId}
              onPlayPlaylist={(tracks, shuffle) => {
                if (!tracks || tracks.length === 0) return;
                let toPlay = [...tracks];
                if (shuffle) toPlay = toPlay.sort(() => 0.5 - Math.random());
                handlePlayTrack(toPlay[0], toPlay);
              }}
              onNavigate={setActiveTab}
            />
          );
        }
        return (
          <MobilePulseView
            catalog={catalog}
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
            <NotificationBell
              onClick={() => setShowNotificationDrawer(true)}
              unreadCount={unreadNotificationsCount}
              className="rounded-full glass-card border border-white/10 text-slate-400 hover:border-cyan-500/40 hover:text-white transition"
            />

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
            <footer className="hidden md:flex fixed bottom-0 md:left-64 right-0 h-24 bg-[#06070B] border-t border-l border-white/10 px-6 items-center justify-between z-50">
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
                    onClick={toggleShuffle}
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
                    onClick={toggleLoop}
                    className={`relative p-1.5 transition ${!currentTrack ? 'text-slate-700 cursor-not-allowed' : isLoop || isRepeatAll ? 'text-teal-400' : 'text-slate-500 hover:text-white'}`}
                    title={isLoop ? 'Repeat one' : isRepeatAll ? 'Repeat all' : 'Repeat off'}
                    disabled={!currentTrack}
                  >
                    <Repeat className="w-4 h-4" />
                    {isLoop && <span className="absolute -right-0.5 -top-0.5 text-[7px] font-black">1</span>}
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
                    onClick={() => setShowMobileQueue(true)}
                    className="relative p-2 rounded-xl text-slate-400 hover:text-white transition glass-card"
                    title="Open queue"
                    aria-label="Open queue"
                  >
                    <Music className="w-4 h-4" />
                    {playQueue?.length > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[1.1rem] h-4 px-1 flex items-center justify-center rounded-full bg-teal-400 text-[9px] font-black text-slate-950">
                        {playQueue.length > 99 ? '99+' : playQueue.length}
                      </span>
                    )}
                  </button>

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
          onMarkAsRead={markNotificationsAsRead}
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
          unreadNotificationsCount={unreadNotificationsCount}
          onOpenNotifications={() => setShowNotificationDrawer(true)}
          onOpenProfile={() => setActiveTab('profile')}
          user={user}
        />

        {/* Mobile Scrollable Page Content */}
        <main
          id="mobile-main-content"
          className={`w-full max-w-[100vw] overflow-x-clip overscroll-x-none min-h-[calc(100dvh-3.5rem)] pt-[calc(3.5rem+env(safe-area-inset-top,0px))] ${activeTab === 'onair'
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
            onOpenOnAir={() => setActiveTab('onair')}
            onOpenQueue={() => setShowMobileQueue(true)}
            isLiked={isCurrentLiked}
            onToggleLike={() => currentTrack && toggleLikeTrack(currentTrack.id)}
            activeHuddle={activeHuddle}
            onOpenHuddleRoom={() => setShowHuddleRoom(true)}
          />
        )}

        {/* Mobile 5-Item Bottom Navigation */}
        <MobileBottomNav
          activeTab={activeTab}
          activeSubTab={activeSubTab}
          onNavigate={setActiveTab}
        />

        {/* Mobile Notifications Sheet */}
        <MobileNotificationsSheet
          isOpen={showNotificationDrawer}
          onClose={() => setShowNotificationDrawer(false)}
          notifications={notifications}
          setNotifications={setNotifications}
          unreadCount={unreadNotificationsCount}
          onMarkAsRead={markNotificationsAsRead}
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
              onRefreshHuddle={fetchPlatformConfig}
            />
          </div>
        )}

        {/* Mobile Queue Bottom Sheet */}
        {/* Mobile Track Action Sheet */}
        <MobileTrackActionSheet
          isOpen={!!mobileTrackAction}
          onClose={() => setMobileTrackAction(null)}
          track={mobileTrackAction}
          onPlayTrack={(t) => { playTrack(t); setMobileTrackAction(null); }}
          onPlayNext={addNextToQueue}
          onAddToQueue={addToQueue}
          activeHuddle={activeHuddle}
          onAddToHuddleQueue={handleAddToHuddleQueue}
          isLiked={mobileTrackAction ? shelf?.likedTrackIds?.includes(mobileTrackAction.id) : false}
          onToggleLike={() => { if (mobileTrackAction) toggleLikeTrack(mobileTrackAction.id); }}
        />
      </div>

      <MobileQueueSheet
        isOpen={showMobileQueue}
        onClose={() => setShowMobileQueue(false)}
      />

      {/* Toast Notification */}
      {toastMsg && (
        <div role={toastKind === 'error' ? 'alert' : 'status'} aria-live={toastKind === 'error' ? 'assertive' : 'polite'} className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] border shadow-2xl px-4 py-2 rounded-xl flex items-center justify-center animate-in slide-in-from-bottom-2 fade-in duration-300 ${toastKind === 'error' ? 'bg-rose-950 border-rose-400/30' : 'bg-slate-900 border-white/10'}`}>
          <span className="text-white text-xs font-bold whitespace-nowrap">{toastMsg}</span>
        </div>
      )}

      {/* Switch Account Modal (Common) */}
      {isAuthenticated ? (
        <AccountSwitcherModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      ) : (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

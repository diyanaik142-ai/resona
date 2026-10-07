import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { api, resolveMediaUrl } from '../services/api';

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
  
  // Safe persistence helper
  const loadPersisted = (key, fallback) => {
    try {
      const saved = localStorage.getItem(`resona_player_${key}`);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const savePersisted = (key, value) => {
    try {
      localStorage.setItem(`resona_player_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn('Failed to save player state', e);
    }
  };

  // State
  const [currentTrack, setCurrentTrack] = useState(() => loadPersisted('currentTrack', null));
  const [queue, setQueue] = useState(() => loadPersisted('queue', []));
  const [queueIndex, setQueueIndex] = useState(() => loadPersisted('queueIndex', 0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => loadPersisted('volume', 0.85));
  const [isMuted, setIsMuted] = useState(() => loadPersisted('isMuted', false));
  const [isShuffle, setIsShuffle] = useState(() => loadPersisted('isShuffle', false));
  const [isLoop, setIsLoop] = useState(() => loadPersisted('isLoop', false));
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [networkState, setNetworkState] = useState(navigator.onLine ? 'ONLINE' : 'OFFLINE');
  
  // Ref to track current track without stale closures
  const trackRef = useRef(currentTrack);
  useEffect(() => { trackRef.current = currentTrack; }, [currentTrack]);
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);
  const indexRef = useRef(queueIndex);
  useEffect(() => { indexRef.current = queueIndex; }, [queueIndex]);

  // Network listeners
  useEffect(() => {
    const handleOnline = () => setNetworkState('ONLINE');
    const handleOffline = () => setNetworkState('OFFLINE');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Save state on change
  useEffect(() => { savePersisted('currentTrack', currentTrack); }, [currentTrack]);
  useEffect(() => { savePersisted('queue', queue); }, [queue]);
  useEffect(() => { savePersisted('queueIndex', queueIndex); }, [queueIndex]);
  useEffect(() => { savePersisted('volume', volume); audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { savePersisted('isMuted', isMuted); audioRef.current.muted = isMuted; }, [isMuted]);
  useEffect(() => { savePersisted('isShuffle', isShuffle); }, [isShuffle]);
  useEffect(() => { savePersisted('isLoop', isLoop); }, [isLoop]);

  // Audio element setup
  useEffect(() => {
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handlePlay = () => { setIsPlaying(true); setIsLoading(false); setIsBuffering(false); setError(null); };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => {
      if (isLoop) {
        audio.currentTime = 0;
        audio.play().catch(e => console.error(e));
      } else {
        playNext();
      }
    };
    const handleError = (e) => {
      console.error('Audio playback error', e);
      setIsLoading(false);
      setIsBuffering(false);
      // Determine if offline error vs 404
      if (!navigator.onLine) {
        setError('Network disconnected. Track not cached.');
      } else {
        setError('Failed to play media.');
      }
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [isLoop]);

  // Check offline cache helper
  const checkCache = async (url) => {
    if (!('caches' in window)) return url;
    try {
      const cache = await caches.open('resona-offline-audio');
      const response = await cache.match(url);
      if (response) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.error('Cache check failed', err);
    }
    return url;
  };

  // Preload next track
  const preloadNext = async () => {
    const q = queueRef.current;
    const idx = indexRef.current;
    if (q.length > 0 && idx < q.length - 1) {
      const nextTrack = q[idx + 1];
      if (nextTrack?.audioUrl) {
        const url = resolveMediaUrl(nextTrack.audioUrl);
        // We could initiate a fetch to cache it if needed, or create a background Audio element to preload.
        // For simplicity and avoiding double downloading, rely on browser cache or Cache API.
        if ('caches' in window && navigator.onLine) {
          try {
            const cache = await caches.open('resona-offline-audio');
            const match = await cache.match(url);
            if (!match) {
              // Optionally fetch and cache here if product permits.
              // We'll leave it to standard browser cache for now unless explicitly requested to download.
            }
          } catch (e) {}
        }
      }
    }
  };

  const loadAndPlayTrack = async (track, shouldPlay = true) => {
    if (!track) return;
    try {
      setIsLoading(true);
      setError(null);
      setCurrentTrack(track);

      const { user } = await import('./AuthContext').then(m => m.useAuth ? m.useAuth() : { user: null }).catch(() => ({ user: null }));
      if (user?.id && user?.role !== 'admin') {
         api.user.recordActivity({ trackId: track.id, type: 'PLAY_STARTED' }).catch(err => {
            console.warn('[Recommendations] Could not record activity:', err.message);
         });
      }
      
      const rawUrl = resolveMediaUrl(track.audioUrl);
      const urlToPlay = await checkCache(rawUrl);
      
      audioRef.current.src = urlToPlay;
      audioRef.current.load();
      if (shouldPlay) {
        await audioRef.current.play();
      }
      preloadNext();
      
      // Update Media Session API for background/lockscreen controls
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new window.MediaMetadata({
          title: track.title || 'Unknown Title',
          artist: track.artist || 'Unknown Artist',
          album: track.album || 'Resona',
          artwork: track.coverUrl ? [
            { src: resolveMediaUrl(track.coverUrl), sizes: '96x96', type: 'image/jpeg' },
            { src: resolveMediaUrl(track.coverUrl), sizes: '256x256', type: 'image/jpeg' },
            { src: resolveMediaUrl(track.coverUrl), sizes: '512x512', type: 'image/jpeg' }
          ] : []
        });
        
        navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
        navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
        navigator.mediaSession.setActionHandler('nexttrack', () => playNext());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevious());
        navigator.mediaSession.setActionHandler('seekto', (details) => seekTo(details.seekTime));
      }
    } catch (err) {
      console.error('Playback failed', err);
      setError('Playback failed');
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const playNext = useCallback(() => {
    const q = queueRef.current;
    if (q.length === 0) return;
    
    let nextIndex = indexRef.current + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * q.length);
    }
    
    if (nextIndex < q.length) {
      setQueueIndex(nextIndex);
      loadAndPlayTrack(q[nextIndex], true);
    } else {
      setIsPlaying(false);
      audioRef.current.pause();
    }
  }, [isShuffle]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }
    const q = queueRef.current;
    if (q.length === 0) return;
    
    let prevIndex = indexRef.current - 1;
    if (prevIndex >= 0) {
      setQueueIndex(prevIndex);
      loadAndPlayTrack(q[prevIndex], true);
    }
  }, [currentTime]);

  const togglePlay = useCallback(() => {
    if (audioRef.current.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => {
          console.error(e);
          setError('Failed to resume playback.');
        });
      }
    } else if (currentTrack) {
      loadAndPlayTrack(currentTrack, true);
    }
  }, [isPlaying, currentTrack]);

  const seekTo = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => setIsMuted(m => !m);
  const toggleShuffle = () => setIsShuffle(s => !s);
  const toggleLoop = () => setIsLoop(l => !l);

  // Play a specific track and optionally set a new queue
  const playTrack = (track, newQueue = null) => {
    if (newQueue) {
      // Assign unique queueItemIds
      const q = newQueue.map(t => ({ ...t, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substring(2)}` }));
      setQueue(q);
      const idx = q.findIndex(t => t.id === track.id);
      setQueueIndex(idx >= 0 ? idx : 0);
      loadAndPlayTrack(q[idx >= 0 ? idx : 0], true);
    } else {
      // Just play the track, append to queue if not present
      const q = [...queueRef.current];
      const newTrack = { ...track, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substring(2)}` };
      q.splice(indexRef.current + 1, 0, newTrack);
      setQueue(q);
      setQueueIndex(indexRef.current + 1);
      loadAndPlayTrack(newTrack, true);
    }
  };

  const addToQueue = (track) => {
    const newTrack = { ...track, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substring(2)}` };
    setQueue(q => [...q, newTrack]);
  };

  const removeFromQueue = (queueItemId) => {
    setQueue(q => {
      const idx = q.findIndex(t => t.queueItemId === queueItemId);
      if (idx === -1) return q;
      const newQ = [...q];
      newQ.splice(idx, 1);
      
      if (idx < indexRef.current) {
        setQueueIndex(i => i - 1);
      } else if (idx === indexRef.current) {
        // Current track removed
        if (isPlaying) {
          playNext();
        }
      }
      return newQ;
    });
  };

  const value = {
    currentTrack,
    queue,
    queueIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isShuffle,
    isLoop,
    isLoading,
    isBuffering,
    error,
    networkState,
    setVolume,
    togglePlay,
    playNext,
    playPrevious,
    seekTo,
    toggleMute,
    toggleShuffle,
    toggleLoop,
    playTrack,
    addToQueue,
    removeFromQueue,
    setQueue,
    setQueueIndex,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

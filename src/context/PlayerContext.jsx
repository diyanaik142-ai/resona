import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { api, resolveMediaUrl } from '../services/api';
import { useAuth } from './AuthContext';
import {
  createQueueItem,
  getEndedPlaybackAction,
  normalizeQueueItems,
  reorderQueueItems,
  isPlayableQueueTrack,
  selectAutoplayTracks,
  takeNextQueueItem,
  tryAutoplayCandidates,
  handleAudioEnded
} from './playerQueue';

const PlayerContext = createContext(null);

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
  const { catalog, preferences, user } = useAuth();

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
  const [queue, setQueueState] = useState(() => normalizeQueueItems(loadPersisted('queue', [])));
  const [queueIndex, setQueueIndex] = useState(() => loadPersisted('queueIndex', 0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => loadPersisted('volume', 0.85));
  const [isMuted, setIsMuted] = useState(() => loadPersisted('isMuted', false));
  const [isShuffle, setIsShuffle] = useState(() => loadPersisted('isShuffle', false));
  const [repeatMode, setRepeatMode] = useState(() => (
    loadPersisted('repeatMode', loadPersisted('isLoop', false) ? 'one' : 'off')
  ));
  const isLoop = repeatMode === 'one';
  const isRepeatAll = repeatMode === 'all';
  const [isLoading, setIsLoading] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [error, setError] = useState(null);
  const [networkState, setNetworkState] = useState(navigator.onLine ? 'ONLINE' : 'OFFLINE');
  const activityUpdateRef = useRef(Promise.resolve());
  const playbackHistoryRef = useRef([]);
  const repeatSequenceRef = useRef(currentTrack ? [currentTrack, ...queue] : queue);
  const recentAutoplayIdsRef = useRef([]);
  const endedTransitionRef = useRef(false);
  const playRequestRef = useRef(0);
  const playNextRef = useRef(null);
  const playPreviousRef = useRef(null);
  const seekToRef = useRef(null);
  const repeatOneRef = useRef(isLoop);
  const queueDragStartRef = useRef(null);
  const queueDragFeedbackRef = useRef(false);

  // Ref to track current track without stale closures
  const trackRef = useRef(currentTrack);
  useEffect(() => { trackRef.current = currentTrack; }, [currentTrack]);
  const queueRef = useRef(queue);
  useEffect(() => { queueRef.current = queue; }, [queue]);

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

  useEffect(() => {
    let active = true;
    const syncListeningActivity = (forceInactive = false) => {
      const hasUserSession = !localStorage.getItem('adminToken') &&
        Boolean(localStorage.getItem('authToken') || localStorage.getItem('resona_token'));
      if (!hasUserSession) return;

      const shouldShareActivePlayback = !forceInactive &&
        document.visibilityState === 'visible' &&
        isPlaying &&
        currentTrack?.id;
      const update = {
        isPlaying: Boolean(shouldShareActivePlayback),
        trackId: shouldShareActivePlayback ? String(currentTrack.id) : null
      };
      activityUpdateRef.current = activityUpdateRef.current
        .catch(() => { })
        .then(() => active ? api.social.updateListeningActivity(update) : undefined)
        .catch((err) => console.warn('[ListeningActivity] Could not sync playback status:', err.message));
    };
    const handleVisibilityChange = () => syncListeningActivity();
    const handlePageHide = () => syncListeningActivity(true);

    syncListeningActivity();
    const heartbeat = window.setInterval(() => syncListeningActivity(), 30_000);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      active = false;
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      const hasUserSession = !localStorage.getItem('adminToken') &&
        Boolean(localStorage.getItem('authToken') || localStorage.getItem('resona_token'));
      if (hasUserSession) {
        activityUpdateRef.current = activityUpdateRef.current
          .catch(() => { })
          .then(() => api.social.updateListeningActivity({ isPlaying: false }))
          .catch((err) => console.warn('[ListeningActivity] Could not clear playback status:', err.message));
      }
    };
  }, [currentTrack?.id, isPlaying]);

  // Save state on change
  useEffect(() => { savePersisted('currentTrack', currentTrack); }, [currentTrack]);
  useEffect(() => { savePersisted('queue', queue); }, [queue]);
  useEffect(() => { savePersisted('queueIndex', queueIndex); }, [queueIndex]);
  useEffect(() => { savePersisted('volume', volume); audioRef.current.volume = volume; }, [volume]);
  useEffect(() => { savePersisted('isMuted', isMuted); audioRef.current.muted = isMuted; }, [isMuted]);
  useEffect(() => { savePersisted('isShuffle', isShuffle); }, [isShuffle]);
  useEffect(() => {
    savePersisted('repeatMode', repeatMode);
    savePersisted('isLoop', isLoop);
    repeatOneRef.current = isLoop;
  }, [repeatMode, isLoop]);

  const publishQueueFeedback = (message, kind = 'success') => {
    window.dispatchEvent(new CustomEvent('resona:player-feedback', {
      detail: { message, kind }
    }));
  };

  const setQueue = useCallback((nextQueue) => {
    const resolvedQueue = typeof nextQueue === 'function'
      ? nextQueue(queueRef.current)
      : nextQueue;
    const normalizedQueue = normalizeQueueItems(resolvedQueue);
    queueRef.current = normalizedQueue;
    setQueueState(normalizedQueue);
    return normalizedQueue;
  }, []);

  const reorderQueue = useCallback((nextQueue) => {
    const result = reorderQueueItems(queueRef.current, nextQueue);
    if (!result.valid) {
      publishQueueFeedback("Couldn't reorder queue. Try again.", 'error');
      return false;
    }
    if (!result.changed) return false;
    setQueue(result.queue);
    if (!queueDragFeedbackRef.current) {
      publishQueueFeedback('Moved in queue');
      queueDragFeedbackRef.current = true;
    }
    const currentId = trackRef.current?.queueItemId;
    const nextIds = new Set(result.queue.map((track) => track.queueItemId));
    const alreadyPlayed = repeatSequenceRef.current.filter(
      (track) => track.queueItemId !== currentId && !nextIds.has(track.queueItemId)
    );
    repeatSequenceRef.current = [trackRef.current, ...result.queue, ...alreadyPlayed].filter(Boolean);
    return true;
  }, [setQueue]);

  const beginQueueReorder = () => {
    queueDragFeedbackRef.current = false;
    queueDragStartRef.current = queueRef.current.map((track) => track.queueItemId);
  };

  const finishQueueReorder = () => {
    const initialOrder = queueDragStartRef.current;
    queueDragStartRef.current = null;
    if (!initialOrder) {
      queueDragFeedbackRef.current = false;
      return;
    }
    const finalOrder = queueRef.current.map((track) => track.queueItemId);
    if (initialOrder.some((id, index) => id !== finalOrder[index]) && !queueDragFeedbackRef.current) {
      publishQueueFeedback('Moved in queue');
    }
    queueDragFeedbackRef.current = false;
  };

  // Audio element setup
  useEffect(() => {
    const audio = audioRef.current;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handlePlay = () => {
      endedTransitionRef.current = false;
      setIsPlaying(true);
      setIsLoading(false);
      setIsBuffering(false);
      setError(null);
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsBuffering(true);
    const handlePlaying = () => setIsBuffering(false);
    const handleEnded = () => {
      handleAudioEnded(
        audio,
        repeatOneRef.current,
        (fromEnded) => playNextRef.current?.(fromEnded),
        (err) => {
          console.error('Could not repeat track', err);
          setError('Failed to repeat playback.');
        }
      );
    };
    const handleError = (event) => {
      console.error('Audio playback error', event);
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
  }, []);

  // Check offline cache helper
  const checkCache = useCallback(async (url) => {
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
  }, []);

  const loadAndPlayTrack = useCallback(async (track, shouldPlay = true) => {
    if (!track?.id || !track.audioUrl) {
      setError('This track is unavailable.');
      setIsLoading(false);
      setIsPlaying(false);
      return false;
    }
    playRequestRef.current += 1;
    trackRef.current = track;
    try {
      setIsLoading(true);
      setError(null);
      setCurrentTrack(track);
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
        navigator.mediaSession.setActionHandler('nexttrack', () => playNextRef.current?.());
        navigator.mediaSession.setActionHandler('previoustrack', () => playPreviousRef.current?.());
        navigator.mediaSession.setActionHandler('seekto', (details) => seekToRef.current?.(details.seekTime));
      }
      return true;
    } catch (err) {
      console.error('Playback failed', err);
      setError('Playback failed');
      setIsLoading(false);
      setIsPlaying(false);
      return false;
    }
  }, [checkCache, user?.id, user?.role]);

  const findAutoplayTracks = useCallback(async (endedTrack) => {
    if (preferences?.autoplay === false || user?.role === 'admin') return [];

    let recommendationResponse;
    if (user?.id) {
      try {
        recommendationResponse = await api.user.getRecommendations({ limit: 30 });
      } catch (err) {
        console.warn('[Autoplay] Recommendation API unavailable; using related catalog tracks:', err.message);
      }
    }

    const unavailableIds = new Set([
      ...playbackHistoryRef.current.slice(-8).map((track) => String(track.id)),
      ...recentAutoplayIdsRef.current
    ]);
    return selectAutoplayTracks({
      recommendationResponse,
      catalog,
      endedTrack,
      excludedIds: [...unavailableIds]
    });
  }, [catalog, preferences?.autoplay, user?.id, user?.role]);

  const playNext = useCallback(async (fromEnded = false) => {
    if (fromEnded && endedTransitionRef.current) return;
    if (fromEnded) endedTransitionRef.current = true;

    const transition = fromEnded
      ? getEndedPlaybackAction({
        repeatMode: isLoop ? 'one' : isRepeatAll ? 'all' : 'off',
        currentTrack: trackRef.current,
        queue: queueRef.current,
        repeatSequence: repeatSequenceRef.current
      })
      : (() => {
        const next = takeNextQueueItem(queueRef.current);
        if (next) return { type: 'queue', ...next };
        return isRepeatAll
        ? getEndedPlaybackAction({
          repeatMode: 'all',
          currentTrack: trackRef.current,
          queue: [],
          repeatSequence: repeatSequenceRef.current
        })
          : { type: 'stop', queue: [] };
      })();
    if (transition.type === 'repeat-all') {
        setQueue(transition.queue);
        playbackHistoryRef.current = [...playbackHistoryRef.current.slice(-20), trackRef.current].filter(Boolean);
        const started = await loadAndPlayTrack(transition.track, true);
        if (!started) publishQueueFeedback("Couldn't repeat queue track.", 'error');
        return;
    }
    if (transition.type !== 'queue') {
      if (!fromEnded) {
        setIsPlaying(false);
        audioRef.current.pause();
        return;
      }
      if (preferences?.autoplay === false) {
        setIsPlaying(false);
        return;
      }

      const endedTrack = trackRef.current;
      const requestId = playRequestRef.current;
      try {
        const recommendations = await findAutoplayTracks(endedTrack);
        if (
          requestId !== playRequestRef.current ||
          trackRef.current?.id !== endedTrack?.id
        ) return;
        if (recommendations.length === 0) {
          setIsPlaying(false);
          setError(null);
          publishQueueFeedback('No more tracks to play.', 'status');
          return;
        }

        let expectedRequestId = requestId;
        let expectedTrackId = endedTrack?.id;
        const attempt = await tryAutoplayCandidates(
          recommendations,
          () => (
            expectedRequestId === playRequestRef.current &&
            trackRef.current?.id === expectedTrackId
          ),
          async (candidate) => {
            const started = await loadAndPlayTrack(candidate, true);
            expectedRequestId = playRequestRef.current;
            expectedTrackId = candidate.id;
            return started;
          }
        );
        recentAutoplayIdsRef.current = [
          ...recentAutoplayIdsRef.current,
          ...attempt.failedIds,
          ...(attempt.track ? [String(attempt.track.id)] : [])
        ].slice(-30);
        if (attempt.aborted) return;
        if (!attempt.track) {
          setIsPlaying(false);
          setError("Couldn't continue playback. Try another track.");
          publishQueueFeedback("Couldn't continue playback. Try another track.", 'error');
          return;
        }
        setQueue(recommendations.slice(attempt.index + 1));
        repeatSequenceRef.current = [attempt.track, ...recommendations.slice(attempt.index + 1)];
      } catch (err) {
        console.warn('[Autoplay] Could not load related tracks:', err.message);
        if (requestId === playRequestRef.current && trackRef.current?.id === endedTrack?.id) {
          setIsPlaying(false);
          setError("Couldn't load related tracks.");
          publishQueueFeedback("Couldn't load related tracks.", 'error');
        }
      }
      return;
    }

    const { track: nextTrack, queue: remainingQueue } = transition;
    playbackHistoryRef.current = [...playbackHistoryRef.current.slice(-20), trackRef.current].filter(Boolean);
    setQueue(remainingQueue);
    setQueueIndex(0);
    const started = await loadAndPlayTrack(nextTrack, true);
    if (!started) publishQueueFeedback("Couldn't play queued track.", 'error');
  }, [findAutoplayTracks, isLoop, isRepeatAll, loadAndPlayTrack, preferences?.autoplay, setQueue]);

  const playPrevious = useCallback(() => {
    if (currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const previousTrack = playbackHistoryRef.current.pop();
    if (!previousTrack) return;

    const currentTrackSnapshot = trackRef.current;
    const updatedQueue = [currentTrackSnapshot, ...queueRef.current].filter(Boolean);
    setQueue(updatedQueue);
    setQueueIndex(0);
    setCurrentTrack(previousTrack);
    loadAndPlayTrack(previousTrack, true);
  }, [currentTime, loadAndPlayTrack, setQueue]);

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
  }, [currentTrack, isPlaying, loadAndPlayTrack]);

  const seekTo = (time) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  useEffect(() => {
    playNextRef.current = playNext;
    playPreviousRef.current = playPrevious;
    seekToRef.current = seekTo;
  }, [playNext, playPrevious, seekTo]);

  const toggleMute = () => setIsMuted(m => !m);
  const updateShuffle = (enabled) => {
    if (enabled && !isShuffle && queueRef.current.length > 1) {
      const shuffled = [...queueRef.current];
      for (let index = shuffled.length - 1; index > 0; index -= 1) {
        const target = Math.floor(Math.random() * (index + 1));
        [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
      }
      setQueue(shuffled);
      repeatSequenceRef.current = [trackRef.current, ...shuffled].filter(Boolean);
    }
    setIsShuffle(Boolean(enabled));
  };
  const setShuffle = (value) => updateShuffle(value);
  const toggleShuffle = () => updateShuffle(!isShuffle);
  const toggleLoop = () => setRepeatMode((mode) => (
    mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'
  ));

  const playTrack = (track, newQueue = null) => {
    if (!track) return;

    const sourceQueue = Array.isArray(newQueue) ? normalizeQueueItems(newQueue) : queueRef.current;
    const sourceIndex = sourceQueue.findIndex((item) => (
      track.queueItemId
        ? item.queueItemId === track.queueItemId
        : Array.isArray(newQueue) && item.id === track.id
    ));
    const nextCurrent = sourceIndex >= 0
      ? sourceQueue[sourceIndex]
      : { ...track, queueItemId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };

    if (currentTrack && currentTrack.id !== nextCurrent.id) {
      playbackHistoryRef.current = [...playbackHistoryRef.current.slice(-20), currentTrack].filter(Boolean);
    }

    const queuedAhead = Array.isArray(newQueue)
      ? sourceQueue.filter((_, index) => index > sourceIndex)
      : sourceQueue.filter((item) => item.queueItemId !== nextCurrent.queueItemId);

    setQueue(queuedAhead);
    repeatSequenceRef.current = Array.isArray(newQueue)
      ? sourceIndex >= 0 ? sourceQueue : [nextCurrent, ...sourceQueue]
      : [nextCurrent, ...queuedAhead];
    setQueueIndex(0);
    setCurrentTrack(nextCurrent);
    loadAndPlayTrack(nextCurrent, true);
  };

  const addToQueue = (track) => {
    if (!isPlayableQueueTrack(track)) {
      publishQueueFeedback("Couldn't add to queue. Try again.", 'error');
      return false;
    }
    const usedIds = new Set(queueRef.current.map((item) => item.queueItemId));
    const newTrack = createQueueItem(track, usedIds);
    if (!newTrack) {
      publishQueueFeedback("Couldn't add to queue. Try again.", 'error');
      return false;
    }
    setQueue((current) => [...current, newTrack]);
    repeatSequenceRef.current = [
      ...(repeatSequenceRef.current.length ? repeatSequenceRef.current : [trackRef.current].filter(Boolean)),
      newTrack
    ];
    publishQueueFeedback('Added to queue');
    return true;
  };

  const addNextToQueue = (track) => {
    if (!isPlayableQueueTrack(track)) {
      publishQueueFeedback("Couldn't add to queue. Try again.", 'error');
      return false;
    }
    const nextTrack = createQueueItem(track, new Set(queueRef.current.map((item) => item.queueItemId)));
    setQueue((current) => [nextTrack, ...current]);
    const repeatSequence = repeatSequenceRef.current.length
      ? repeatSequenceRef.current
      : [trackRef.current].filter(Boolean);
    repeatSequenceRef.current = [
      ...repeatSequence.slice(0, 1),
      nextTrack,
      ...repeatSequence.slice(1).filter((item) => item.queueItemId !== nextTrack.queueItemId)
    ];
    publishQueueFeedback('Added to play next');
    return true;
  };

  const removeFromQueue = (queueItemId) => {
    const currentQueue = queueRef.current;
    const index = currentQueue.findIndex((track) => (
      (track.queueItemId || track.id) === queueItemId
    ));
    if (index < 0) {
      publishQueueFeedback("Couldn't remove track from queue.", 'error');
      return false;
    }
    const [removedTrack] = currentQueue.slice(index, index + 1);
    setQueue((items) => items.filter((_, itemIndex) => itemIndex !== index));
    repeatSequenceRef.current = repeatSequenceRef.current.filter(
      (track) => track.queueItemId !== removedTrack.queueItemId
    );
    publishQueueFeedback('Removed from queue');
    return true;
  };

  const clearQueue = () => {
    if (queueRef.current.length === 0) return false;
    setQueue([]);
    repeatSequenceRef.current = trackRef.current ? [trackRef.current] : [];
    publishQueueFeedback('Queue cleared');
    return true;
  };

  const playQueuedTrack = async (track) => {
    const queueItemId = track?.queueItemId;
    const queueIndex = queueRef.current.findIndex((item) => item.queueItemId === queueItemId);
    if (queueIndex < 0) {
      publishQueueFeedback("Couldn't play queued track. Try again.", 'error');
      return false;
    }

    const nextQueue = queueRef.current.filter((_, index) => index !== queueIndex);
    const previousTrack = trackRef.current;
    if (previousTrack && previousTrack.id !== track.id) {
      playbackHistoryRef.current = [...playbackHistoryRef.current.slice(-20), previousTrack];
    }
    setQueue(nextQueue);
    repeatSequenceRef.current = [track, ...nextQueue];
    setQueueIndex(0);
    const started = await loadAndPlayTrack(track, true);
    publishQueueFeedback(started ? 'Now playing' : "Couldn't play queued track. Try again.", started ? 'success' : 'error');
    return started;
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
    setShuffle,
    toggleLoop,
    repeatMode,
    isRepeatAll,
    playTrack,
    playQueuedTrack,
    addToQueue,
    addNextToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    beginQueueReorder,
    finishQueueReorder,
    setQueue,
    setQueueIndex,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};

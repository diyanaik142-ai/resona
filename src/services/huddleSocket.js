import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket = null;
let currentHuddleId = null;
let currentUserId = null;
const listeners = new Map();

/**
 * Initialize or get singleton socket instance
 */
export function getHuddleSocket() {
  if (!socket) {
    const token = localStorage.getItem('authToken') || localStorage.getItem('resona_token') || '';
    socket = io(getApiBaseUrl(), {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('[HuddleSocket] Connected to server, id:', socket.id);
      if (currentUserId) {
        socket.emit('register_user', { userId: currentUserId });
      }
      if (currentHuddleId) {
        socket.emit('join_huddle', { huddleId: currentHuddleId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[HuddleSocket] Disconnected:', reason);
    });

    // Wire up events to subscribers
    const eventNames = [
      'huddle_state_updated',
      'queue_updated',
      'track_changed',
      'recommendations_updated',
      'poll_updated',
      'participants_updated',
      'huddle_ended',
      'notification_received',
      'huddle_invitation',
      'invitation_cancelled',
      'user_presence_updated'
    ];

    eventNames.forEach(evt => {
      socket.on(evt, (data) => {
        const callbacks = listeners.get(evt);
        if (callbacks) {
          callbacks.forEach(cb => {
            try { cb(data); } catch (e) { console.error(`[HuddleSocket callback error on ${evt}]`, e); }
          });
        }
      });
    });
  }

  return socket;
}

/**
 * Register user ID for presence and targeted notifications
 */
export function registerSocketUser(userId) {
  currentUserId = userId;
  const s = getHuddleSocket();
  if (s && s.connected && userId) {
    s.emit('register_user', { userId });
  }
}

/**
 * Join a Huddle room for real-time broadcasts
 */
export function joinHuddleRoom(huddleId) {
  currentHuddleId = huddleId;
  const s = getHuddleSocket();
  if (s && s.connected) {
    s.emit('join_huddle', { huddleId });
  }
}

/**
 * Leave a Huddle room
 */
export function leaveHuddleRoom(huddleId) {
  if (currentHuddleId === huddleId) {
    currentHuddleId = null;
  }
  const s = getHuddleSocket();
  if (s && s.connected) {
    s.emit('leave_huddle', { huddleId });
  }
}

/**
 * Subscribe to a real-time event
 */
export function subscribeHuddleEvent(eventName, callback) {
  getHuddleSocket();
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName).add(callback);

  // Return unsubscribe cleanup function
  return () => {
    const set = listeners.get(eventName);
    if (set) {
      set.delete(callback);
    }
  };
}

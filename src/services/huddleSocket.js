import { io } from 'socket.io-client';
import { getApiBaseUrl } from './api';

let socket = null;
let huddleSocket = null;
let currentHuddleId = null;
let currentUserId = null;
let currentToken = null;
const listeners = new Map();

const huddleEvents = new Set([
  'huddle_state_updated',
  'queue_updated',
  'track_changed',
  'recommendations_updated',
  'poll_updated',
  'participants_updated',
  'huddle_ended',
  'huddle_access_revoked'
]);
const notificationEvents = [
  'notification_received',
  'plan_entitlements_changed',
  'huddle_invitation',
  'invitation_cancelled',
  'user_presence_updated',
  'listening_activity_updated'
];
const huddleEventNames = [...huddleEvents];

function dispatchEvent(evt, data) {
  const callbacks = listeners.get(evt);
  if (!callbacks) return;
  callbacks.forEach((cb) => {
    try { cb(data); } catch (e) { console.error(`[HuddleSocket callback error on ${evt}]`, e); }
  });
}

function createSocket(url) {
  const token = localStorage.getItem('authToken') || localStorage.getItem('resona_token') || '';
  const instance = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: Boolean(token),
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });
  instance.on('connect_error', (error) => {
    console.warn('[HuddleSocket] Connection error:', error.message);
  });
  return instance;
}

/**
 * Initialize or get singleton socket instance
 */
export function getHuddleSocket() {
  if (!socket) {
    socket = createSocket(getApiBaseUrl());

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

    notificationEvents.forEach((evt) => socket.on(evt, (data) => dispatchEvent(evt, data)));
  }

  return socket;
}

function getHuddleNamespace() {
  if (!huddleSocket) {
    huddleSocket = createSocket(`${getApiBaseUrl()}/huddle`);
    huddleSocket.on('connect', () => {
      if (currentUserId) huddleSocket.emit('register_user');
      if (currentHuddleId) huddleSocket.emit('join_huddle', { huddleId: currentHuddleId });
    });
    huddleEventNames.forEach((evt) => huddleSocket.on(evt, (data) => dispatchEvent(evt, data)));
  }
  return huddleSocket;
}

function refreshSocketAuthentication() {
  const token = localStorage.getItem('authToken') || localStorage.getItem('resona_token') || '';
  if (!token) {
    currentToken = null;
    [socket, huddleSocket].forEach((instance) => instance?.disconnect());
    return;
  }
  if (token === currentToken) return;
  currentToken = token;
  [socket, huddleSocket].forEach((instance) => {
    if (!instance) return;
    instance.auth = { token };
    instance.disconnect();
    instance.connect();
  });
}

/**
 * Register user ID for presence and targeted notifications
 */
export function registerSocketUser(userId) {
  if (!userId) return;
  currentUserId = userId;
  const s = getHuddleSocket();
  refreshSocketAuthentication();
  if (s && s.connected && userId) {
    s.emit('register_user', { userId });
  }
  if (huddleSocket?.connected && userId) huddleSocket.emit('register_user');
}

/**
 * Join a Huddle room for real-time broadcasts
 */
export function joinHuddleRoom(huddleId) {
  currentHuddleId = huddleId;
  const s = getHuddleNamespace();
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
  const s = huddleSocket;
  if (s && s.connected) {
    s.emit('leave_huddle', { huddleId });
  }
  if (!currentHuddleId && huddleSocket) {
    huddleSocket.disconnect();
    huddleSocket = null;
  }
}

/**
 * Subscribe to a real-time event
 */
export function subscribeHuddleEvent(eventName, callback) {
  if (huddleEvents.has(eventName)) getHuddleNamespace();
  else getHuddleSocket();
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

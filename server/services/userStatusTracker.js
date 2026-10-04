/**
 * Real-time user status tracker for Resona
 * Tracks online presence and last active timestamps without mock data.
 */

class UserStatusTracker {
  constructor() {
    this.userSockets = new Map(); // userId -> Set<socketId>
    this.lastSeen = new Map();    // userId -> timestamp (ms)
  }

  setOnline(userId, socketId) {
    if (!userId) return;
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socketId);
    this.lastSeen.set(userId, Date.now());
  }

  setOffline(userId, socketId) {
    if (!userId) return;
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      if (socketId) {
        sockets.delete(socketId);
      } else {
        sockets.clear();
      }
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
        this.lastSeen.set(userId, Date.now());
      }
    }
  }

  touch(userId) {
    if (!userId) return;
    this.lastSeen.set(userId, Date.now());
  }

  isOnline(userId) {
    const sockets = this.userSockets.get(userId);
    return sockets ? sockets.size > 0 : false;
  }

  getStatus(userId) {
    const online = this.isOnline(userId);
    const lastActiveMs = this.lastSeen.get(userId);

    if (online) {
      return {
        isOnline: true,
        statusText: 'Active now',
        lastActive: lastActiveMs ? new Date(lastActiveMs).toISOString() : new Date().toISOString()
      };
    }

    if (lastActiveMs) {
      const diffMinutes = Math.floor((Date.now() - lastActiveMs) / 60000);
      let statusText = 'Offline';
      if (diffMinutes < 1) {
        statusText = 'Last active just now';
      } else if (diffMinutes < 60) {
        statusText = `Last active ${diffMinutes}m ago`;
      } else if (diffMinutes < 1440) {
        const hours = Math.floor(diffMinutes / 60);
        statusText = `Last active ${hours}h ago`;
      } else {
        const days = Math.floor(diffMinutes / 1440);
        statusText = `Last active ${days}d ago`;
      }

      return {
        isOnline: false,
        statusText,
        lastActive: new Date(lastActiveMs).toISOString()
      };
    }

    return {
      isOnline: false,
      statusText: 'Offline',
      lastActive: null
    };
  }
}

export const userStatusTracker = new UserStatusTracker();

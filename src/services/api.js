import { getApiBaseUrl, resolveMediaUrl } from '../utils/media.js';
export { getApiBaseUrl, resolveMediaUrl } from '../utils/media.js';

export function setToken(token) {
  if (token) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('resona_token', token);
  } else {
    localStorage.removeItem('authToken');
    localStorage.removeItem('resona_token');
  }
}

import { auth } from '../firebase';

export const getAuthHeaders = async () => {
  // If an admin session is active, NEVER send normal user tokens or admin tokens
  // to normal user endpoints to prevent interference and leaks.
  if (localStorage.getItem('adminToken')) {
    return { 'Content-Type': 'application/json' };
  }

  let headers = {
    'Content-Type': 'application/json'
  };

  const sessionId = localStorage.getItem('resona_session_id');
  if (sessionId) {
    headers['X-Session-Id'] = sessionId;
  }

  // Obtain fresh Firebase ID token if user is logged in
  if (auth?.currentUser) {
    const token = await auth.currentUser.getIdToken(true);
    headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }

  // Backend routes derive account identity from the Resona JWT.
  const authToken = localStorage.getItem('authToken') || localStorage.getItem('resona_token');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }

  const genericToken = localStorage.getItem('token');
  if (genericToken) {
    headers['Authorization'] = `Bearer ${genericToken}`;
    return headers;
  }

  return headers;
};


export const api = {
  // Auth
  auth: {
    login: async (email, password) => {
      if (email === 'admin') {
        const response = await fetch(`${getApiBaseUrl()}/api/admin/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: email, password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Admin login failed');
        localStorage.setItem('adminToken', data.token);
        return { token: data.token, user: data.user, preferences: data.user.preferences };
      }

      const response = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Login failed');
      setToken(data.token);
      return { token: data.token, user: data.user, preferences: data.preferences || {} };
    },
    register: async (userData) => {
      const response = await fetch(`${getApiBaseUrl()}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(userData)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Registration failed');
      setToken(data.token);
      return { token: data.token, user: data.user, preferences: data.preferences || {} };
    },
    getMe: async () => {
      const adminToken = localStorage.getItem('adminToken');
      if (adminToken) {
        // Return static admin user or fetch from backend
        return {
          user: { id: 'admin', email: 'admin', name: 'Administrator', role: 'admin' },
          preferences: {}
        };
      }

      const savedToken = localStorage.getItem('authToken') || localStorage.getItem('resona_token');
      if (!savedToken) throw new Error('Not authenticated');
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/auth/me`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to load account information');
      const profile = await api.user.getProfile();
      return { user: profile, preferences: data.preferences || {} };
    },
    changePassword: async (currentPassword, newPassword) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/auth/change-password`, {
        method: 'POST', headers, body: JSON.stringify({ currentPassword, newPassword })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to change password');
      return json;
    },
    logout: async () => {
      const headers = await getAuthHeaders();
      await fetch(`${getApiBaseUrl()}/api/auth/logout`, { method: 'POST', headers });
    },
    createSession: async (deviceName) => {
      const headers = await getAuthHeaders();
      delete headers['X-Session-Id'];
      const res = await fetch(`${getApiBaseUrl()}/api/auth/session`, {
        method: 'POST', headers, body: JSON.stringify({ deviceName })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create session');
      return json;
    }
  },
  // User
  user: {
    getEntitlements: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/entitlements`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load feature access');
      return json;
    },
    getPlanRequest: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/plan-request`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load plan request');
      return json;
    },
    uploadProfilePicture: async (file) => {
      const headers = await getAuthHeaders();
      delete headers['Content-Type']; // Let browser set multipart/form-data boundary
      const formData = new FormData();
      formData.append('picture', file);
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/picture`, {
        method: 'POST', headers, body: formData
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to upload picture');
      return json;
    },
    removeProfilePicture: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/picture`, {
        method: 'DELETE', headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to remove picture');
      return json;
    },
    requestPlanChange: async (requestedPlan) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/plan-request`, { method: 'POST', headers, body: JSON.stringify({ requestedPlan }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to submit plan request');
      return json;
    },
    cancelPlanRequest: async (id) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/plan-request/${encodeURIComponent(id)}/cancel`, { method: 'POST', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to cancel plan request');
      return json;
    },
    getRecommendations: async ({ limit = 12, force = false } = {}) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/recommendations?limit=${encodeURIComponent(limit)}&force=${force ? 'true' : 'false'}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load recommendations');
      return json;
    },
    getDailyDose: async ({ force = false } = {}) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/daily-dose?force=${force ? 'true' : 'false'}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load Daily Dose');
      return json;
    },
    recordActivity: async (event) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/activity`, { method: 'POST', headers, body: JSON.stringify(event) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to record listening activity');
      return json;
    },
    getProfile: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch profile');
      return {
         ...json,
         photo: resolveMediaUrl(json.photo),
         avatar: resolveMediaUrl(json.avatar),
         profileImage: resolveMediaUrl(json.profileImage)
      };
    },
    getProfileByHandle: async (handle) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(handle)}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch profile');
      return {
         ...json,
         photo: resolveMediaUrl(json.photo),
         avatar: resolveMediaUrl(json.avatar),
         profileImage: resolveMediaUrl(json.profileImage)
      };
    },
    followUser: async (handle) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(handle)}/follow`, { method: 'POST', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to follow user');
      return json;
    },
    unfollowUser: async (handle) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(handle)}/follow`, { method: 'DELETE', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to unfollow user');
      return json;
    },
    removeFollower: async (handle) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/followers/${encodeURIComponent(handle)}`, { method: 'DELETE', headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to remove follower');
      return json;
    },
    getFollowers: async (handle) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(handle)}/followers`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch followers');
      return json.followers || [];
    },
    getFollowing: async (handle) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile/${encodeURIComponent(handle)}/following`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch following');
      return json.following || [];
    },
    checkUid: async (uid) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/uid/check?uid=${encodeURIComponent(uid || '')}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json.error || 'Failed to validate UID');
        err.available = false;
        throw err;
      }
      return json;
    },
    updateProfile: async (profileUpdates) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/profile`, {
        method: 'PUT', headers, body: JSON.stringify(profileUpdates)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update profile');
      return json;
    },
    updatePreferences: async (preferences) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/preferences`, { method: 'PUT', headers, body: JSON.stringify(preferences) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update preferences');
      return { preferences: json.preferences || preferences };
    },
    getSessions: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/sessions`, { headers });
      const json = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch sessions');
      return json;
    },
    getSecurityEvents: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/security/events`, { headers });
      const json = await res.json().catch(() => ([]));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch security events');
      return json;
    },
    revokeSession: async (sessionId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/sessions/${sessionId}`, {
        method: 'DELETE', headers
      });
      if (!res.ok) throw new Error('Failed to revoke session');
      return res.json();
    },
    signOutOtherSessions: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/user/sessions/others`, {
        method: 'DELETE', headers
      });
      if (!res.ok) throw new Error('Failed to sign out of other sessions');
      return res.json();
    }
  },

  // Notifications
  notifications: {
    getNotifications: async (limit = 50) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/notifications?limit=${limit}`, { headers });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch notifications');
      return json;
    },
    markAsRead: async (notificationIds) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/notifications/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to mark notifications read');
      return json;
    },
    markAllAsRead: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/notifications/read-all`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to mark all notifications read');
      return json;
    },
    registerFcmToken: async (token) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/notifications/fcm/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token })
      });
      return res.json().catch(() => ({}));
    },
    unregisterFcmToken: async (token) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/notifications/fcm/unregister`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token })
      });
      return res.json().catch(() => ({}));
    }
  },

  // Shelf
  shelf: {
    getShelf: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/shelf`, { headers });
      if (!res.ok) throw new Error('Failed to fetch shelf');
      return res.json();
    },
    toggleLike: async (trackId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/shelf/like`, {
        method: 'POST', headers, body: JSON.stringify({ trackId })
      });
      if (!res.ok) throw new Error('Failed to toggle like');
      return res.json();
    },
    createPlaylist: async (data) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/shelf/playlist`, {
        method: 'POST', headers, body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create playlist');
      return res.json();
    },
    toggleSavePlaylist: async (playlistId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/shelf/playlist/save`, {
        method: 'POST', headers, body: JSON.stringify({ playlistId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save playlist');
      return json;
    },
    deletePlaylist: async (id) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/shelf/playlist/${id}`, {
        method: 'DELETE', headers
      });
      if (!res.ok) throw new Error('Failed to delete playlist');
      return res.json();
    }
  },

  // Creator
  creator: {
    getData: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/creator`, { headers });
      if (!res.ok) throw new Error('Failed to fetch creator data');
      return res.json();
    },
    apply: async (data) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/creator/apply`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to submit application');
      return json;
    }
  },

  // Social
  social: {
    getSocial: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social`, { headers });
      if (!res.ok) throw new Error('Failed to fetch social data');
      return res.json();
    },
    getFriends: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/friends`, { headers });
      if (!res.ok) throw new Error('Failed to fetch friends');
      return res.json();
    },
    updateListeningActivity: async ({ trackId = null, isPlaying }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/listening-activity`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ trackId, isPlaying }),
        keepalive: true
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update listening activity');
      return json;
    },
    searchUsers: async (q) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/users/search?q=${encodeURIComponent(q || '')}`, { headers });
      if (!res.ok) throw new Error('Failed to search users');
      return res.json();
    },
    getFusions: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/fusions`, { headers });
      if (!res.ok) throw new Error('Failed to fetch fusions');
      return res.json();
    },
    createFusion: async (participantIds) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/fusions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ participantIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create fusion');
      return json;
    },
    addFriend: async (friendId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/friends/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ friendId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to add friend');
      return json;
    },
    removeFriend: async (friendId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/friends/${friendId}`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to remove friend');
      return json;
    },
    getNotifications: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/notifications`, { headers });
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    notificationAction: async (id, action) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/notifications/${id}/action`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to perform notification action');
      return json;
    },
    markNotificationsAsRead: async (notificationIds) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/notifications/read`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ notificationIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to mark social notifications read');
      return json;
    },
    markAllNotificationsAsRead: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/notifications/read-all`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to mark all social notifications read');
      return json;
    }
  },

  // Huddle Queue System
  huddle: {
    getActive: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/active`, { headers });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch active Huddle');
      return res.json();
    },
    getById: async (id) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}`, { headers });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch Huddle');
      return res.json();
    },
    create: async (data) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json.error || 'Failed to create Huddle');
        err.code = json.code;
        err.activeHuddle = json.activeHuddle;
        throw err;
      }
      return json;
    },
    inviteFriends: async (huddleId, friendIds) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ huddleId, friendIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to invite friends');
      return json;
    },
    acceptInvitation: async (invitationId, huddleId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ huddleId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json.error || 'Failed to accept invitation');
        err.code = json.code;
        err.activeHuddle = json.activeHuddle;
        throw err;
      }
      return json;
    },
    declineInvitation: async (invitationId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/invitations/${invitationId}/decline`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to decline invitation');
      return json;
    },
    leaveAndJoin: async (fromHuddleId, toHuddleId, invitationId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/leave-and-join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ fromHuddleId, toHuddleId, invitationId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to leave and join Huddle');
      return json;
    },
    join: async (id, invitationId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ invitationId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err = new Error(json.error || 'Failed to join Huddle');
        err.code = json.code;
        err.activeHuddle = json.activeHuddle;
        throw err;
      }
      return json;
    },
    leave: async (id) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/leave`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to leave Huddle');
      return json;
    },
    setMode: async (id, mode) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/mode`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mode })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to update mode');
      return json;
    },
    transferHost: async (id, newHostId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/transfer-host`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ newHostId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to transfer host');
      return json;
    },
    addToQueue: async (id, { trackId, action, source }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/queue/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ trackId, action, source })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to add track to queue');
      return json;
    },
    playNext: async (id, queueId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/queue/play-next`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ queueId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to set Play Next');
      return json;
    },
    reorderQueue: async (id, itemIds) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/queue/reorder`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ itemIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to reorder queue');
      return json;
    },
    removeFromQueue: async (id, queueId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/queue/${queueId}`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to remove queue item');
      return json;
    },
    clearQueue: async (id) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/queue`, {
        method: 'DELETE',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to clear queue');
      return json;
    },
    advancePlayback: async (id, reason = 'track_ended') => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/playback/advance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ reason })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to advance playback');
      return json;
    },
    recommend: async (id, trackId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/recommend`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ trackId })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to recommend track');
      return json;
    },
    acceptRecommendation: async (id, recId, action = 'add_to_queue') => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/recommendations/${recId}/accept`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to accept recommendation');
      return json;
    },
    dismissRecommendation: async (id, recId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/recommendations/${recId}/dismiss`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to dismiss recommendation');
      return json;
    },
    createPoll: async (id, { type, question, trackIds }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/polls`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, question, trackIds })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to create poll');
      return json;
    },
    votePoll: async (id, pollId, optionIndex) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/polls/${pollId}/vote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ optionIndex })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to cast vote');
      return json;
    },
    endPoll: async (id, pollId) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/polls/${pollId}/end`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to end poll');
      return json;
    },
    resolvePoll: async (id, pollId, action) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/polls/${pollId}/resolve`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to resolve poll');
      return json;
    },
    endHuddle: async (id) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/end`, {
        method: 'POST',
        headers
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to end Huddle');
      return json;
    },
    savePlaylist: async (id, { type, title }) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/save-playlist`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type, title })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save playlist');
      return json;
    },
    sendChatMessage: async (id, message) => {
      const headers = await getAuthHeaders();
      const res = await fetch(`${getApiBaseUrl()}/api/social/huddle/${id}/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to send message');
      return json;
    }
  },


  // Tracks Catalog
  tracks: {
    getAll: async () => {
      try {
        const res = await fetch(`${getApiBaseUrl()}/api/tracks`);
        if (!res.ok) throw new Error('Failed to fetch tracks');
        const rawTracks = await res.json();
        const tracks = Array.isArray(rawTracks) ? rawTracks.map(t => ({
          ...t,
          audioUrl: resolveMediaUrl(t.audioUrl),
          cover: resolveMediaUrl(t.cover)
        })) : [];
        return { tracks };
      } catch (err) {
        console.warn('Could not fetch tracks from backend:', err.message);
        return { tracks: [] };
      }
    },
    create: async (trackData) => {
      throw new Error('Please use the Admin Dashboard to upload tracks.');
    },
    getPlaylists: async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/tracks/playlists`);
      if (!res.ok) throw new Error('Failed to fetch playlists');
      const playlists = await res.json();
      return playlists.map(p => ({
        ...p,
        coverUrl: resolveMediaUrl(p.coverUrl)
      }));
    },
    getPlaylist: async (id) => {
      const res = await fetch(`${getApiBaseUrl()}/api/tracks/playlists/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Failed to fetch playlist');
      const playlist = await res.json();
      return {
        ...playlist,
        tracks: (Array.isArray(playlist.trackItems) ? playlist.trackItems : [])
          .filter(item => item?.track)
          .map(item => ({
            ...item.track,
            playlistItemId: item.playlistItemId,
            trackId: item.trackId,
            order: item.order
          })),
        coverUrl: resolveMediaUrl(playlist.coverUrl)
      };
    }
  },

  // Admin Endpoints
  admin: {
    getHeaders: () => ({
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      'Content-Type': 'application/json'
    }),
    fetch: async (url, options = {}) => {
      const finalHeaders = { ...api.admin.getHeaders(), ...(options.headers || {}) };
      if (options.body instanceof FormData) {
          delete finalHeaders['Content-Type'];
      }
      const res = await fetch(url, { ...options, headers: finalHeaders });
      if (res.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.reload();
      }
      return res;
    },
    getSystemStatus: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/system/status`);
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    getPlaylists: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/playlists`);
      if (!res.ok) throw new Error('Failed to fetch admin playlists');
      const json = await res.json();
      return json.map(p => ({ ...p, coverUrl: resolveMediaUrl(p.coverUrl) }));
    },
    createPlaylist: async (formData) => {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${getApiBaseUrl()}/api/admin/playlists`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
         const json = await res.json().catch(() => ({}));
         throw new Error(json.error || 'Failed to create playlist');
      }
      return res.json();
    },
    updatePlaylist: async (id, formData) => {
      const token = localStorage.getItem('adminToken');
      const res = await fetch(`${getApiBaseUrl()}/api/admin/playlists/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      if (!res.ok) {
         const json = await res.json().catch(() => ({}));
         throw new Error(json.error || 'Failed to update playlist');
      }
      return res.json();
    },
    deletePlaylist: async (id) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/playlists/${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete playlist');
      return res.json();
    },
    getUsers: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      return res.json();
    },
    getPlanChangeRequests: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/plan-change-requests`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to fetch plan change requests');
      return json;
    },
    reviewPlanChangeRequest: async (id, decision, adminNote = '') => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/plan-change-requests/${encodeURIComponent(id)}/review`, {
        method: 'POST', body: JSON.stringify({ decision, adminNote })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to review request');
      return json;
    },
    updateUser: async (id, data) => {
      // Data might contain { role } or { disabled }
      if (data.role !== undefined) {
        const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/users/${id}/role`, {
          method: 'PUT', body: JSON.stringify({ role: data.role })
        });
        if (!res.ok) throw new Error('Failed to update role');
      }
      if (data.status !== undefined) {
        const disabled = data.status === 'disabled';
        const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/users/${id}/disable`, {
          method: 'PUT', body: JSON.stringify({ disabled })
        });
        if (!res.ok) throw new Error('Failed to update status');
      }
      if (data.planId !== undefined) {
        const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/users/${id}/plan`, {
          method: 'PUT', body: JSON.stringify({ planId: data.planId })
        });
        if (!res.ok) throw new Error('Failed to update plan');
      }
      if (data.overrides !== undefined) {
        const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/users/${id}/overrides`, {
          method: 'PUT', body: JSON.stringify({ overrides: data.overrides })
        });
        if (!res.ok) throw new Error('Failed to update overrides');
      }
      return { id, ...data };
    },
    deleteUser: async (id) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/users/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete user');
      return { success: true };
    },
    getFeatures: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/features`);
      if (!res.ok) throw new Error('Failed to fetch feature registry');
      return res.json();
    },
    getPlans: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/plans`);
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
    updatePlanFeatures: async (planId, features) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/plans/${planId}/features`, {
        method: 'PUT', body: JSON.stringify({ features })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update plan features');
      return res.json();
    },
    getCatalog: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/catalog?_t=${Date.now()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to fetch catalog');
      return data;
    },
    uploadTrack: async (formData) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/catalog`, {
        method: 'POST', body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to upload track');
      return data;
    },
    updateTrack: async (id, data) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/catalog/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
      return res.json();
    },
    deleteTrack: async (id) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/catalog/${id}`, {
        method: 'DELETE'
      });
      return res.json();
    },
    getRequests: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/requests`);
      return res.json();
    },
    updateRequest: async (id, data) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/requests/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
      return res.json();
    },
    getCreators: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/creators`);
      if (!res.ok) throw new Error('Failed to fetch creator applications');
      return res.json();
    },
    updateCreator: async (id, data) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/creators/${id}`, {
        method: 'PUT', body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to update application');
      return res.json();
    },
    getSettings: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/settings`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to fetch platform settings');
      return res.json();
    },
    updateSettings: async (data) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/settings`, {
        method: 'PUT', body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save settings');
      return json;
    },
    dangerAction: async (action, data = {}) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/danger/${action}`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `Danger action ${action} failed`);
      return json;
    },
    getAuditLogs: async (limit = 200) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/audit-logs?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
    getOverview: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/overview`);
      if (!res.ok) throw new Error(`Overview request failed (${res.status})`);
      return res.json();
    },
    getHealth: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/health`);
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json();
    },
    getStorage: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/storage`);
      if (!res.ok) throw new Error(`Storage measurement failed (${res.status})`);
      return res.json();
    },
    verifyCatalog: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/catalog/verify`, { method: 'POST' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Catalog verification failed');
      return res.json();
    },
    /** Measures real round-trip time to the backend health endpoint. */
    measureApiLatency: async () => {
      const start = performance.now();
      const res = await fetch(`${getApiBaseUrl()}/api/health?t=${Date.now()}`, { cache: 'no-store' });
      const ms = performance.now() - start;
      if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`);
      return Math.round(ms);
    },
    getAdminNotifications: async ({ limit = 20, offset = 0 } = {}) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/notifications?limit=${limit}&offset=${offset}`);
      if (!res.ok) throw new Error(`Failed to fetch admin notifications (${res.status})`);
      return res.json();
    },
    getAdminNotificationsUnreadCount: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/notifications/unread-count`);
      if (!res.ok) throw new Error(`Failed to fetch admin unread count (${res.status})`);
      return res.json();
    },
    markAdminNotificationRead: async (id) => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/notifications/read`, {
        method: 'POST',
        body: JSON.stringify({ notificationIds: [id] })
      });
      if (!res.ok) throw new Error(`Failed to mark notification read (${res.status})`);
      return res.json();
    },
    markAllAdminNotificationsRead: async () => {
      const res = await api.admin.fetch(`${getApiBaseUrl()}/api/admin/notifications/read-all`, {
        method: 'POST'
      });
      if (!res.ok) throw new Error(`Failed to mark all notifications read (${res.status})`);
      return res.json();
    }
  },

  // Search & Browse
  search: {
    query: async (q) => {
      const res = await fetch(`${getApiBaseUrl()}/api/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Search failed');
      const data = await res.json();
      return {
        ...data,
        songs: (data.songs || []).map(t => ({
          ...t,
          audioUrl: resolveMediaUrl(t.audioUrl),
          cover: resolveMediaUrl(t.cover)
        })),
        accounts: (data.accounts || []).map(a => ({
          ...a,
          avatar: resolveMediaUrl(a.avatar)
        }))
      };
    },
    suggestions: async (q) => {
      const res = await fetch(`${getApiBaseUrl()}/api/search/suggestions?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error('Suggestions failed');
      return res.json();
    },
    getGenres: async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/search/genres`);
      if (!res.ok) throw new Error('Failed to fetch genres');
      return res.json();
    },
    getGenre: async (id) => {
      const res = await fetch(`${getApiBaseUrl()}/api/search/genres/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error('Failed to fetch genre');
      const data = await res.json();
      return {
        ...data,
        tracks: (data.tracks || []).map(t => ({
           ...t,
           audioUrl: resolveMediaUrl(t.audioUrl),
           cover: resolveMediaUrl(t.cover)
        }))
      };
    },
    getTrending: async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/search/trending`);
      if (!res.ok) throw new Error('Failed to fetch trending');
      const tracks = await res.json();
      return (tracks || []).map(t => ({
           ...t,
           audioUrl: resolveMediaUrl(t.audioUrl),
           cover: resolveMediaUrl(t.cover)
      }));
    }
  },

  // Platform Global Config
  platform: {
    getConfig: async () => {
      const res = await fetch(`${getApiBaseUrl()}/api/platform/config`);
      if (!res.ok) throw new Error('Failed to fetch platform configuration');
      return res.json();
    }
  }
};

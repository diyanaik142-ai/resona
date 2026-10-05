import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile as updateFirebaseProfile, signOut } from 'firebase/auth';
import { auth as firebaseAuth } from '../firebase';
import { api, setToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [shelf, setShelf] = useState({ likedTrackIds: [], playlists: [], recentlyPlayed: [] });
  const [creatorData, setCreatorData] = useState(null);
  const [socialData, setSocialData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Load account data on boot or token change
  const refreshAccountData = async () => {
    try {
      const [meRes, shelfRes, creatorRes, socialRes, tracksRes, entitlementsRes] = await Promise.allSettled([
        api.auth.getMe(),
        api.shelf.getShelf(),
        api.creator.getData(),
        api.social.getSocial(),
        api.tracks.getAll(),
        api.user.getEntitlements()
      ]);

      if (meRes.status === 'fulfilled') {
        setUser(meRes.value.user);
        setPreferences(meRes.value.preferences);
      } else {
        throw new Error(meRes.reason?.message || 'Failed to load user profile');
      }
      if (shelfRes.status === 'fulfilled') {
        setShelf(shelfRes.value);
      }
      if (creatorRes.status === 'fulfilled') {
        setCreatorData(creatorRes.value);
      }
      if (socialRes.status === 'fulfilled') {
        setSocialData(socialRes.value);
      }
      if (tracksRes.status === 'fulfilled') {
        setCatalog(tracksRes.value.tracks);
      }
      if (entitlementsRes.status === 'fulfilled') {
        setUser((current) => current ? { ...current, planId: entitlementsRes.value.planId, planFeatures: entitlementsRes.value.planFeatures, features: entitlementsRes.value.features } : current);
      }
    } catch (err) {
      console.error('[AuthContext] Error loading user data:', err);
      throw err; // Propagate to trigger logout or login failure
    }
  };

  useEffect(() => {
    // Check for admin token first
    if (import.meta.env?.PROD) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
        if (!firebaseUser) {
          setUser(null);
          setLoading(false);
          return;
        }
        try {
          setToken(await firebaseUser.getIdToken());
          await refreshAccountData();
        } catch (err) {
          setAuthError(err.message || 'Could not load your account. Retry signing in.');
          setUser(null);
        } finally {
          setLoading(false);
        }
      });
      return unsubscribe;
    }
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      // Very basic validation - assume valid until getMe fails
      setUser({
        id: 'admin',
        email: 'admin',
        name: 'Administrator',
        role: 'admin',
        preferences: {}
      });
      setLoading(false);
      return;
    }

    const savedToken = localStorage.getItem('authToken') || localStorage.getItem('resona_token');
    if (savedToken) {
      setToken(savedToken);
      refreshAccountData().catch((err) => {
        console.warn('[AuthContext] Failed to refresh account data', err);
        setAuthError(err.message || 'Could not load your account. Retry signing in.');
        setUser(null);
      }).finally(() => setLoading(false));
    } else {
      setUser(null);
      setPreferences(null);
      setLoading(false);
    }
  }, []);

  // Login handler
  const login = async (email, password) => {
    setAuthError(null);
    try {
      if (import.meta.env?.PROD && email !== 'admin') {
        const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        setToken(await credential.user.getIdToken());
        await refreshAccountData();
        return { user: credential.user };
      }
      const res = await api.auth.login(email, password);
      setToken(res.token);
      setUser(res.user);
      setPreferences(res.preferences);
      await refreshAccountData();
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Register handler
  const register = async (formData) => {
    setAuthError(null);
    try {
      if (import.meta.env?.PROD) {
        const credential = await createUserWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
        await updateFirebaseProfile(credential.user, { displayName: formData.name || '' });
        setToken(await credential.user.getIdToken());
        await refreshAccountData();
        return { user: credential.user };
      }
      const res = await api.auth.register(formData);
      setToken(res.token);
      setUser(res.user);
      setPreferences(res.preferences);
      await refreshAccountData();
      return res;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (user?.role === 'admin') {
        localStorage.removeItem('adminToken');
      } else if (import.meta.env?.PROD) {
        await signOut(firebaseAuth);
      } else {
        await api.auth.logout().catch(() => {});
      }
    } finally {
      setToken(null);
      setUser(null);
      setPreferences(null);
      setShelf({ likedTrackIds: [], playlists: [], recentlyPlayed: [] });
      setCreatorData(null);
      setSocialData(null);
    }
  };

  // Change Password
  const changePassword = async (currentPassword, newPassword) => {
    return await api.auth.changePassword(currentPassword, newPassword);
  };

  // Update Profile
  const updateProfile = async (updates) => {
    const res = await api.user.updateProfile(updates);
    setUser(res.profile);
    return res.profile;
  };

  const applyPlan = async (planId) => {
    if (!planId) return;
    const entitlements = await api.user.getEntitlements();
    setUser((current) => current ? { ...current, planId: entitlements.planId, planFeatures: entitlements.planFeatures, features: entitlements.features } : current);
  };

  const refreshPlan = async () => {
    const [profile, entitlements] = await Promise.all([api.user.getProfile(), api.user.getEntitlements()]);
    setUser((current) => current ? { ...current, ...profile, planId: entitlements.planId, planFeatures: entitlements.planFeatures, features: entitlements.features } : current);
    return entitlements;
  };

  // Update Preferences
  const updatePreferences = async (updates) => {
    const res = await api.user.updatePreferences(updates);
    setPreferences(res.preferences);
    return res.preferences;
  };

  // Toggle Like on Track
  const toggleLikeTrack = async (trackId) => {
    const res = await api.shelf.toggleLike(trackId);
    setShelf((prev) => ({
      ...prev,
      likedTrackIds: res.likedTrackIds
    }));
    return res;
  };

  // Create Playlist
  const createPlaylist = async (title, description) => {
    const res = await api.shelf.createPlaylist(title, description);
    setShelf(res.shelf);
    return res.playlist;
  };

  // Delete Playlist
  const deletePlaylist = async (playlistId) => {
    const res = await api.shelf.deletePlaylist(playlistId);
    setShelf(res.shelf);
    return res;
  };

  // Upload Creator Track
  const uploadTrack = async (trackData) => {
    const res = await api.creator.uploadTrack(trackData);
    setCreatorData(res.creator);
    return res.track;
  };

  const value = {
    user,
    preferences,
    shelf,
    creatorData,
    socialData,
    catalog,
    loading,
    authError,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    changePassword,
    updateProfile,
    updatePreferences,
    toggleLikeTrack,
    createPlaylist,
    deletePlaylist,
    uploadTrack,
    refreshAccountData,
    refreshPlan,
    applyPlan
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

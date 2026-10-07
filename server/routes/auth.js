import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import {
  findAccountByEmail,
  findAccountById,
  createAccount,
  updateAccountPassword,
  getAccountData,
  saveAccountData
} from '../db/storage.js';
import { requireAuth } from '../middleware/auth.js';
import { logSecurityEvent } from '../services/securityService.js';

import { getPlatformSettings } from '../services/platformSettings.js';
import { ensureProfilePlan } from '../services/userService.js';
import { getUserFeatureEntitlements } from '../services/entitlements.js';

const router = express.Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({ error: 'Production registration uses Firebase Authentication. Local password registration is disabled.' });
    }
    const settings = await getPlatformSettings();
    if (settings.platform?.allowUserRegistration === false) {
      return res.status(403).json({
        error: 'Registration is temporarily unavailable. Please try again later.'
      });
    }

    const { name, email, password, dob, role, genres } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingAccount = await findAccountByEmail(email);
    if (existingAccount) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const defaultPlan = settings.platform?.defaultPlan || 'resona';
    const requireVerification = Boolean(settings.platform?.requireAccountVerification);

    const newAccount = await createAccount({
      email,
      password,
      profileData: {
        name: name || 'Resona Listener',
        role: role || 'listener',
        planId: defaultPlan,
        verified: !requireVerification,
        dob: dob || '2000-01-01',
        genres: Array.isArray(genres) ? genres : []
      }
    });
    const uid = String(name || '').trim().replace(/\s+/g, '_').toLowerCase();
    if (uid) await saveAccountData(newAccount.id, 'profile.json', { ...(await getAccountData(newAccount.id, 'profile.json')), uid, handle: uid });

    const token = jwt.sign({ id: newAccount.id, email: newAccount.email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    await ensureProfilePlan(newAccount.id, defaultPlan);
    const currentProfile = await getAccountData(newAccount.id, 'profile.json');
    const preferences = await getAccountData(newAccount.id, 'preferences.json');
    
    try {
      const { createAdminNotification } = await import('../services/notificationService.js');
      await createAdminNotification({
        type: 'ACCOUNT_CREATED',
        title: 'New Account Created',
        message: `${currentProfile.name} created a Resona account.`,
        actorUserId: newAccount.id,
        actorName: currentProfile.name,
        targetUrl: `/admin/users`,
        priority: 'NORMAL'
      });
      const io = req.app.get('io');
      if (io) io.emit('admin_notification_received');
    } catch (e) {
      console.error('Failed to send admin notification for ACCOUNT_CREATED', e);
    }

    return res.status(201).json({
      message: 'Account successfully registered and encrypted.',
      token,
      user: currentProfile,
      preferences
    });
  } catch (err) {
    console.error('[Register Error]', err);
    return res.status(500).json({ error: err.message || 'Registration failed.' });
  }
});

/**
 * Log in an existing user
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({ error: 'Production login uses Firebase Authentication. Local password login is disabled.' });
    }
    const account = await findAccountByEmail(email);
    if (!account) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Verify password against stored bcrypt hash
    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: account.id, email: account.email }, JWT_SECRET, {
      expiresIn: '30d'
    });

    // Record or update active session
    let sessions = (await getAccountData(account.id, 'sessions.json')) || [];
    const currentSession = {
      id: `sess_${Date.now()}`,
      deviceName: req.headers['user-agent'] ? 'Web Browser' : 'Resona Client',
      location: 'Active Now',
      isCurrent: true,
      lastActive: new Date().toISOString()
    };
    // Mark others as not current
    sessions = sessions.map((s) => ({ ...s, isCurrent: false }));
    sessions.unshift(currentSession);
    await saveAccountData(account.id, 'sessions.json', sessions.slice(0, 10));

    await ensureProfilePlan(account.id);
    const currentProfile = await getAccountData(account.id, 'profile.json');
    const preferences = await getAccountData(account.id, 'preferences.json');

    return res.json({
      message: 'Login successful.',
      token,
      user: currentProfile,
      preferences
    });
  } catch (err) {
    console.error('[Login Error]', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const profile = await getAccountData(req.user.id, 'profile.json');
    const preferences = await getAccountData(req.user.id, 'preferences.json');
    const entitlements = await getUserFeatureEntitlements(req.user.id);
    
    // Ensure the profile's planId accurately reflects what's in use
    const updatedProfile = { ...profile, entitlements };
    
    return res.json({ user: updatedProfile, preferences });
  } catch (err) {
    console.error('[Auth Me Error]', err);
    return res.status(500).json({ error: 'Failed to retrieve user data.' });
  }
});

/**
 * Change password with encryption
 * POST /api/auth/change-password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(501).json({ error: 'Password changes are managed through Firebase Authentication in production.' });
    }
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const account = await findAccountById(req.user.id);
    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, account.passwordHash);
    if (!isMatch) {
      return res.status(403).json({ error: 'Current password is incorrect.' });
    }

    // Update with new encrypted password
    await updateAccountPassword(req.user.id, newPassword);

    // Revoke all other sessions
    const sessionId = req.headers['x-session-id'];
    let sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    const now = new Date().toISOString();
    
    sessions = sessions.map(s => {
      if (s.id !== sessionId && !s.revokedAt) {
        return { ...s, revokedAt: now };
      }
      return s;
    });
    
    await saveAccountData(req.user.id, 'sessions.json', sessions);
    await logSecurityEvent(req.user.id, 'password_changed', { device: req.headers['user-agent'] });

    return res.json({ message: 'Password has been securely updated and re-encrypted. Other devices were signed out.' });
  } catch (err) {
    console.error('[Change Password Error]', err);
    return res.status(500).json({ error: 'Failed to change password.' });
  }
});

/**
 * Log out
 * POST /api/auth/logout
 */
router.post('/logout', requireAuth, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    let sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    
    if (sessionId) {
      sessions = sessions.map(s => s.id === sessionId ? { ...s, revokedAt: new Date().toISOString() } : s);
    } else {
      sessions = sessions.map((s) => ({ ...s, isCurrent: false }));
    }
    
    await saveAccountData(req.user.id, 'sessions.json', sessions);
    if (sessionId) {
      await logSecurityEvent(req.user.id, 'session_revoked', { isLogout: true, device: req.headers['user-agent'] });
    }
    return res.json({ message: 'Signed out successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed.' });
  }
});

/**
 * Create a new device session (used after Firebase authentication)
 * POST /api/auth/session
 */
router.post('/session', (req, res, next) => {
  req.skipSessionValidation = true;
  next();
}, requireAuth, async (req, res) => {
  try {
    const { deviceName } = req.body;
    let sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newSession = {
      id: sessionId,
      deviceName: deviceName || req.headers['user-agent'] || 'Unknown Device',
      createdAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      revokedAt: null
    };
    
    sessions.unshift(newSession);
    await saveAccountData(req.user.id, 'sessions.json', sessions.slice(0, 10)); // keep last 10
    
    await logSecurityEvent(req.user.id, 'new_login', { device: newSession.deviceName, ip: req.ip });

    return res.json({ sessionId });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create session.' });
  }
});

/**
 * Revoke all other sessions (used on password change)
 * POST /api/auth/session/revoke-others
 */
router.post('/session/revoke-others', requireAuth, async (req, res) => {
  try {
    const currentSessionId = req.headers['x-session-id'];
    if (!currentSessionId) {
      return res.status(400).json({ error: 'Missing current session ID.' });
    }
    
    let sessions = (await getAccountData(req.user.id, 'sessions.json')) || [];
    const now = new Date().toISOString();
    
    sessions = sessions.map(s => {
      if (s.id !== currentSessionId && !s.revokedAt) {
        return { ...s, revokedAt: now };
      }
      return s;
    });
    
    await saveAccountData(req.user.id, 'sessions.json', sessions);
    return res.json({ message: 'Other sessions have been revoked.' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to revoke other sessions.' });
  }
});

export default router;

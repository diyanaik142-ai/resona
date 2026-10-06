import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../firebaseAdmin.js';
import { registerFcmToken, removeFcmToken } from '../services/notificationService.js';

const router = express.Router();
router.use(requireAuth);

/**
 * GET /api/notifications
 */
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '50', 10);
    const snap = await db.collection('users')
      .doc(req.user.id)
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
      
    const notifications = snap.docs.map(doc => doc.data());
    const unreadCount = notifications.filter(n => !n.read).length;

    return res.json({ notifications, unreadCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/read
 */
router.post('/read', async (req, res) => {
  try {
    const { notificationIds } = req.body;
    if (!Array.isArray(notificationIds)) {
      return res.status(400).json({ error: 'notificationIds must be an array' });
    }

    const batch = db.batch();
    const now = new Date().toISOString();
    
    for (const id of notificationIds) {
      const ref = db.collection('users').doc(req.user.id).collection('notifications').doc(id);
      batch.update(ref, { read: true, readAt: now });
    }
    
    await batch.commit();
    return res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/fcm/register
 */
router.post('/fcm/register', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token required' });
    
    await registerFcmToken(req.user.id, token);
    return res.json({ message: 'Token registered' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/notifications/fcm/unregister
 */
router.post('/fcm/unregister', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'FCM token required' });
    
    await removeFcmToken(req.user.id, token);
    return res.json({ message: 'Token unregistered' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;

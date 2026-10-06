import { randomUUID } from 'node:crypto';
import { db, getAdminMessaging } from '../firebaseAdmin.js';
import { getAccountData } from '../db/index.js';

export async function registerFcmToken(userId, token) {
  try {
    await db.collection('users').doc(userId).collection('fcmTokens').doc(token).set({
      token,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    console.error('Failed to register FCM token', err);
    return false;
  }
}

export async function removeFcmToken(userId, token) {
  try {
    await db.collection('users').doc(userId).collection('fcmTokens').doc(token).delete();
    return true;
  } catch (err) {
    console.error('Failed to remove FCM token', err);
    return false;
  }
}

async function getUserTokens(userId) {
  try {
    const snap = await db.collection('users').doc(userId).collection('fcmTokens').get();
    return snap.docs.map(doc => doc.data().token);
  } catch (err) {
    console.error('Failed to get user tokens', err);
    return [];
  }
}

/**
 * Creates an in-app notification and dispatches push if allowed.
 * @param {string} recipientUserId - User ID of the recipient
 * @param {object} payload
 * @param {string} payload.type - Type of notification (e.g., 'follow', 'follow_request')
 * @param {string} payload.title
 * @param {string} payload.message
 * @param {string} [payload.actorUserId]
 * @param {string} [payload.actorName]
 * @param {string} [payload.actorHandle]
 * @param {string} [payload.actorAvatar]
 * @param {string} [payload.entityId]
 * @param {string} [payload.entityType]
 * @param {string} [payload.targetUrl]
 */
export async function createNotification(recipientUserId, payload) {
  try {
    const notificationId = randomUUID();
    const notification = {
      id: notificationId,
      recipientUserId,
      actorUserId: payload.actorUserId || null,
      actorName: payload.actorName || null,
      actorHandle: payload.actorHandle || null,
      actorAvatar: payload.actorAvatar || null,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      createdAt: new Date().toISOString(),
      read: false,
      readAt: null,
      entityId: payload.entityId || null,
      entityType: payload.entityType || null,
      targetUrl: payload.targetUrl || null
    };

    // 1. Save in-app notification to Firestore
    await db.collection('users').doc(recipientUserId).collection('notifications').doc(notificationId).set(notification);

    // 2. Check Preferences
    const preferences = (await getAccountData(recipientUserId, 'preferences.json')) || {};
    const pushEnabled = preferences.pushNotifications !== false;
    
    // Check specific type preference
    let typeEnabled = true;
    if (payload.type === 'follow') typeEnabled = preferences.pushFollower !== false;
    if (payload.type === 'follow_request') typeEnabled = preferences.pushFollowRequest !== false;
    if (payload.type.startsWith('huddle')) typeEnabled = preferences.pushHuddle !== false;
    if (payload.type.startsWith('music')) typeEnabled = preferences.pushMusic !== false;
    if (payload.type.startsWith('creator')) typeEnabled = preferences.pushCreator !== false;

    if (!pushEnabled || !typeEnabled) {
      return notification; // Push disabled, but in-app saved
    }

    // 3. Get FCM Tokens
    const tokens = await getUserTokens(recipientUserId);
    if (tokens.length === 0) return notification;

    // 4. Send FCM Push
    const messaging = getAdminMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: {
        title: payload.title,
        body: payload.message
      },
      data: {
        url: payload.targetUrl || '',
        type: payload.type,
        notificationId
      }
    });

    // 5. Cleanup invalid tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (errorCode === 'messaging/invalid-registration-token' ||
              errorCode === 'messaging/registration-token-not-registered') {
            failedTokens.push(tokens[idx]);
          }
        }
      });
      for (const t of failedTokens) {
        await removeFcmToken(recipientUserId, t);
      }
    }

    return notification;
  } catch (err) {
    console.error('Failed to create notification', err);
    // Even if push fails, ensure we don't crash the main flow
    return null;
  }
}

/**
 * Creates a notification for Admins
 */
export async function createAdminNotification(payload) {
  try {
    const notificationId = randomUUID();
    const notification = {
      id: notificationId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      createdAt: new Date().toISOString(),
      read: false,
      readAt: null,
      targetUrl: payload.targetUrl || null
    };

    // Save to an 'admin_notifications' root collection
    await db.collection('admin_notifications').doc(notificationId).set(notification);
    return notification;
  } catch (err) {
    console.error('Failed to create admin notification', err);
    return null;
  }
}

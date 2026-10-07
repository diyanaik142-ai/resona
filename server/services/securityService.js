import { getAccountData, saveAccountData } from '../db/storage.js';
import { createNotification } from './notificationService.js';
import { randomUUID } from 'node:crypto';

export async function logSecurityEvent(userId, type, metadata = {}) {
  const file = 'security_events.json';
  let events = (await getAccountData(userId, file)) || [];
  
  const event = {
    id: randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    ...metadata
  };
  
  events.unshift(event);
  if (events.length > 50) events = events.slice(0, 50);
  
  await saveAccountData(userId, file, events);
  
  // Notification logic based on type
  if (type === 'new_login') {
    await createNotification(userId, {
      type: 'security',
      title: 'New Login',
      message: `A new device signed into your account: ${metadata.device || 'Unknown Device'}.`,
      actionUrl: '/settings?subpage=security'
    });
  } else if (type === 'password_changed') {
    await createNotification(userId, {
      type: 'security',
      title: 'Password Changed',
      message: 'Your password was changed successfully.',
      actionUrl: '/settings?subpage=security'
    });
  } else if (type === 'session_revoked' && !metadata.isLogout) {
    await createNotification(userId, {
      type: 'security',
      title: 'Session Revoked',
      message: `Another device was signed out: ${metadata.device || 'Unknown Device'}.`,
      actionUrl: '/settings?subpage=security'
    });
  } else if (type === 'all_sessions_revoked') {
    await createNotification(userId, {
      type: 'security',
      title: 'All Sessions Revoked',
      message: 'All other devices were signed out.',
      actionUrl: '/settings?subpage=security'
    });
  }
}

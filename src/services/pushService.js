import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';

let isRegistered = false;

function dispatchNotificationSync(notification) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('resona:notification-sync', { detail: notification }));
  }
}

export async function initPushNotifications() {
  if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.isNativePlatform()) {
    console.log('[Push] Not running on native device, skipping push init.');
    return;
  }
  
  if (isRegistered) return;

  try {
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === 'prompt') {
      const result = await PushNotifications.requestPermissions();
      if (result.receive !== 'granted') {
        console.warn('[Push] Permission denied');
        return;
      }
    } else if (receive !== 'granted') {
      console.warn('[Push] Permission denied');
      return;
    }

    // Register with Apple / Google to receive token
    await PushNotifications.register();
    isRegistered = true;

    // Listeners
    PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] Registration token: ', token.value);
      try {
        await api.notifications.registerFcmToken(token.value);
      } catch (err) {
        console.error('[Push] Failed to send token to backend:', err);
      }
    });

    PushNotifications.addListener('registrationError', (error) => {
      console.error('[Push] Registration error: ', error.error);
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received: ', notification);
      dispatchNotificationSync(notification);
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('[Push] Notification action performed: ', notification);
      dispatchNotificationSync(notification);
    });
    
  } catch (err) {
    console.error('[Push] Initialization failed:', err);
  }
}

export function isNotificationUnread(notification) {
  return Boolean(notification) &&
    notification.read !== true &&
    notification.isRead !== true &&
    !notification.readAt;
}

export function mergeNotifications(...groups) {
  const notificationsById = new Map();

  groups.flat().forEach((notification) => {
    if (notification?.id) {
      notificationsById.set(notification.id, notification);
    }
  });

  return Array.from(notificationsById.values())
    .sort((a, b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
}

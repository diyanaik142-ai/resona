import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCircle, Clock, Check, Info, FileText, Music, AlertTriangle, UserPlus } from 'lucide-react';
import { api } from '../../services/api';
import { getHuddleSocket } from '../../services/huddleSocket';

const formatDistanceToNow = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + ' years ago';
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + ' months ago';
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + ' days ago';
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + ' mins ago';
  return Math.floor(seconds) + ' secs ago';
};

export default function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState('All');
  const drawerRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.admin.getAdminNotificationsUnreadCount();
      setUnreadCount(res.unreadCount);
    } catch (e) {
      console.error('Failed to fetch admin unread count', e);
    }
  };

  const fetchNotifications = async (loadMore = false) => {
    try {
      if (loadMore) setLoadingMore(true);
      else setLoading(true);

      const offset = loadMore ? notifications.length : 0;
      const data = await api.admin.getAdminNotifications({ limit: 20, offset });
      
      if (loadMore) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }
      setHasMore(data.hasMore);
      
      // Update unread count based on what we fetched just to be safe
      fetchUnreadCount();
    } catch (e) {
      console.error('Failed to fetch admin notifications', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();

    const handleNotification = () => {
      fetchUnreadCount();
      if (isOpen) {
        fetchNotifications(false);
      }
    };

    const socket = getHuddleSocket();
    if (socket) {
      socket.on('admin_notification_received', handleNotification);
    }

    return () => {
      if (socket) {
        socket.off('admin_notification_received', handleNotification);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(false);
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target) && !e.target.closest('#admin-bell-btn')) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = async (id, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await api.admin.markAdminNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.admin.markAllAdminNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ACCOUNT_CREATED': return <UserPlus className="w-5 h-5 text-teal-400" />;
      case 'PLAN_CHANGE_REQUEST': return <FileText className="w-5 h-5 text-blue-400" />;
      case 'CREATOR_APPLICATION': return <FileText className="w-5 h-5 text-purple-400" />;
      case 'TRACK_SUBMITTED':
      case 'TRACK_PUBLISHED': return <Music className="w-5 h-5 text-pink-400" />;
      case 'SYSTEM_ERROR': return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default: return <Info className="w-5 h-5 text-slate-400" />;
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) handleMarkAsRead(notif.id);
    if (notif.targetUrl) {
      // In a real app we might use React Router. For Resona admin, it's mostly tabs.
      // E.g. /admin/users, /admin/creators, /admin/catalog
      // We can extract the tab from the URL if needed, but for now just close the drawer
      setIsOpen(false);
      
      const tabMatch = notif.targetUrl.match(/\/admin\/([a-zA-Z0-9_-]+)/);
      if (tabMatch && tabMatch[1]) {
        // Dispatch an event so AdminDashboard can switch tab if needed
        window.dispatchEvent(new CustomEvent('adminTabSwitch', { detail: tabMatch[1] }));
      }
    }
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !n.isRead;
    if (filter === 'Accounts') return n.type.startsWith('ACCOUNT');
    if (filter === 'Plans') return n.type.startsWith('PLAN');
    if (filter === 'Creators') return n.type.startsWith('CREATOR');
    if (filter === 'Music') return n.type.startsWith('TRACK') || n.type.startsWith('ALBUM') || n.type.startsWith('PLAYLIST');
    if (filter === 'Reports') return n.type.includes('REPORT') || n.type === 'CONTENT_FLAGGED';
    if (filter === 'System') return n.type.startsWith('SYSTEM') || n.type.startsWith('STORAGE') || n.type.startsWith('BACKEND');
    return true;
  });

  return (
    <div className="relative">
      <button
        id="admin-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 transition-colors border border-white/5"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 min-w-[20px] h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 shadow-[0_0_10px_rgba(244,63,94,0.5)] border border-rose-400">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          ref={drawerRef}
          className="absolute right-0 mt-3 w-[380px] sm:w-[420px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] flex flex-col z-50 overflow-hidden max-h-[85vh]"
        >
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-900">
            <div>
              <h3 className="font-bold text-white text-lg">Admin Notifications</h3>
              <p className="text-xs text-slate-400">System and user activity alerts</p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition group"
                  title="Mark all as read"
                >
                  <CheckCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex gap-2 px-4 py-2 border-b border-white/10 overflow-x-auto no-scrollbar">
            {['All', 'Unread', 'Accounts', 'Plans', 'Creators', 'Music', 'Reports', 'System'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  filter === f
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                    : 'bg-slate-800/50 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm font-medium text-slate-400">No notifications yet</p>
                <p className="text-xs mt-1">System events will appear here</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredNotifications.map(notif => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-4 hover:bg-white/5 transition cursor-pointer flex gap-3 ${!notif.isRead ? 'bg-teal-500/5' : ''}`}
                  >
                    <div className="shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${!notif.isRead ? 'bg-teal-500/20' : 'bg-slate-800'}`}>
                        {getIcon(notif.type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm truncate ${!notif.isRead ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                          {notif.title}
                        </h4>
                        <div className="flex items-center gap-1.5 shrink-0 text-slate-500">
                          <Clock className="w-3 h-3" />
                          <span className="text-[10px] whitespace-nowrap">
                            {formatDistanceToNow(new Date(notif.createdAt))}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs mt-1 line-clamp-2 ${!notif.isRead ? 'text-slate-300' : 'text-slate-500'}`}>
                        {notif.message}
                      </p>
                      
                      {!notif.isRead && (
                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 text-xs font-medium transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark Read
                          </button>
                        </div>
                      )}
                    </div>
                    {!notif.isRead && (
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-2" />
                    )}
                  </div>
                ))}

                {hasMore && (
                  <button
                    onClick={() => fetchNotifications(true)}
                    disabled={loadingMore}
                    className="w-full p-4 text-xs font-bold text-teal-400 hover:text-teal-300 hover:bg-white/5 transition flex items-center justify-center disabled:opacity-50"
                  >
                    {loadingMore ? 'Loading...' : 'Load Older Notifications'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { isNotificationUnread } from '../../utils/notifications';
import { 
  Bell, 
  X, 
  Radio, 
  Clock, 
  Check, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  Sparkles,
  Info
} from 'lucide-react';

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function isToday(timestamp) {
  if (!timestamp) return false;
  const d = new Date(timestamp);
  const now = new Date();
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
}

/**
 * MobileNotificationsSheet - Purpose-built mobile notifications sheet
 * Supports intelligent Today vs Earlier grouping, one-tap Huddle Join/Decline,
 * and conflict modal resolution without leaving the room context.
 */
export default function MobileNotificationsSheet({
  isOpen,
  onClose,
  notifications = [],
  setNotifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  activeHuddle = null,
  setActiveHuddle,
  setShowHuddleRoom,
  onNavigate
}) {
  const { refreshAccountData } = useAuth();
  const [processingId, setProcessingId] = useState(null);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [conflictModal, setConflictModal] = useState(null);
  const [followStatuses, setFollowStatuses] = useState({});

  React.useEffect(() => {
    if (!isOpen) return;
    notifications.forEach(async (notif) => {
      if (notif.type === 'follow' && notif.actorHandle && !followStatuses[notif.actorHandle]) {
        try {
          const profile = await api.user.getProfileByHandle(notif.actorHandle);
          setFollowStatuses(prev => ({
             ...prev, 
             [notif.actorHandle]: profile.isFollowing ? 'following' : 'none' 
          }));
        } catch (err) { }
      }
    });
  }, [isOpen, notifications]);

  const handleFollowBack = async (e, notif) => {
    e.stopPropagation();
    const handle = notif.actorHandle;
    setFollowStatuses(prev => ({ ...prev, [handle]: 'loading' }));
    try {
      const res = await api.user.followUser(handle);
      setFollowStatuses(prev => ({ ...prev, [handle]: res.requested ? 'requested' : 'following' }));
      if (refreshAccountData) await refreshAccountData();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to follow back');
      setFollowStatuses(prev => ({ ...prev, [handle]: 'none' }));
    }
  };

  if (!isOpen) return null;

  const handleJoin = async (notif) => {
    setErrorMessage('');
    setProcessingId(notif.id);

    try {
      const invitationId = notif.invitationId || notif.id;
      const res = await api.huddle.acceptInvitation(invitationId, notif.huddleId);
      
      if (res.huddle) {
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'accepted' } : n));
        await onMarkAsRead?.([notif.id]);
        if (setActiveHuddle) setActiveHuddle(res.huddle);
        if (setShowHuddleRoom) setShowHuddleRoom(true);
        onClose();
      }
    } catch (err) {
      if (err.code === 'ALREADY_IN_HUDDLE') {
        setConflictModal({
          notification: notif,
          currentHuddle: err.activeHuddle || activeHuddle
        });
      } else {
        setErrorMessage(err.message || 'Failed to join Huddle');
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmLeaveAndJoin = async () => {
    if (!conflictModal) return;
    const { notification, currentHuddle } = conflictModal;
    setProcessingId(notification.id);
    setErrorMessage('');

    try {
      const invitationId = notification.invitationId || notification.id;
      const res = await api.huddle.leaveAndJoin(currentHuddle.id, notification.huddleId, invitationId);
      
      if (res.huddle) {
        setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, status: 'accepted' } : n));
        await onMarkAsRead?.([notification.id]);
        if (setActiveHuddle) setActiveHuddle(res.huddle);
        if (setShowHuddleRoom) setShowHuddleRoom(true);
        setConflictModal(null);
        onClose();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to switch Huddle rooms');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (notif) => {
    setProcessingId(notif.id);
    setErrorMessage('');
    try {
      const invitationId = notif.invitationId || notif.id;
      await api.huddle.declineInvitation(invitationId);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'declined' } : n));
      await onMarkAsRead?.([notif.id]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  const todayNotifs = notifications.filter(n => isToday(n.createdAt || n.timestamp));
  const earlierNotifs = notifications.filter(n => !isToday(n.createdAt || n.timestamp));

  const handleMarkAsRead = async (notificationId) => {
    try {
      if (onMarkAsRead) {
        await onMarkAsRead([notificationId]);
      } else {
        await api.notifications.markAsRead([notificationId]);
        const readAt = new Date().toISOString();
        setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true, readAt } : n));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadIds = notifications.filter(isNotificationUnread).map((notif) => notif.id);
    if (unreadIds.length === 0 && !onMarkAllAsRead) return;

    setIsMarkingAllRead(true);
    setErrorMessage('');
    try {
      if (onMarkAllAsRead) {
        await onMarkAllAsRead();
      } else if (onMarkAsRead) {
        await onMarkAsRead(unreadIds);
      } else {
        await api.notifications.markAsRead(unreadIds);
        const readAt = new Date().toISOString();
        setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, read: true, readAt } : n));
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to mark notifications as read');
    } finally {
      setIsMarkingAllRead(false);
    }
  };

  const renderNotifItem = (notif) => {
    const isHuddleInvite = notif.type === 'huddle_invite';
    const isPending = notif.status === 'pending';
    const isAccepted = notif.status === 'accepted';
    const isDeclined = notif.status === 'declined';
    const isBusy = processingId === notif.id;

    if (isHuddleInvite) {
      return (
        <div
          key={notif.id}
          className={`p-3.5 rounded-2xl border transition-all ${
            isPending && isNotificationUnread(notif)
              ? 'bg-cyan-500/[0.06] border-cyan-500/30'
              : 'bg-white/[0.02] border-white/5'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className="relative shrink-0 mt-0.5">
              <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-300 text-xs overflow-hidden">
                {notif.senderAvatar ? (
                  <img src={notif.senderAvatar} alt={notif.senderName} className="w-full h-full object-cover" />
                ) : (
                  notif.senderName?.charAt(0) || 'H'
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#121216] border border-white/20 flex items-center justify-center text-cyan-400">
                <Radio className="w-2.5 h-2.5 animate-pulse" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white truncate">
                  {notif.senderName || 'A friend'}
                </p>
                <span className="text-[10px] text-white/40 shrink-0">
                  {formatTimeAgo(notif.createdAt || notif.timestamp)}
                </span>
              </div>
              <p className="text-xs text-white/70 mt-0.5 leading-snug">
                invited you to join a Huddle
              </p>
              {notif.huddleName && (
                <p className="text-[11px] text-cyan-400 font-medium mt-1 truncate">
                  "{notif.huddleName}"
                </p>
              )}

              {isPending && (
                <div className="flex items-center gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => handleJoin(notif)}
                    disabled={isBusy}
                    className="flex-1 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[40px]"
                  >
                    {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Radio className="w-3.5 h-3.5" />}
                    Join
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(notif)}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-xs font-medium active:scale-95 transition-all min-h-[40px]"
                  >
                    Decline
                  </button>
                </div>
              )}

              {isAccepted && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span>Joined Huddle</span>
                </div>
              )}
              {isDeclined && (
                <div className="mt-2 text-[11px] text-white/40 italic">
                  Declined
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Follow Notification
    if (notif.type === 'follow') {
      const status = followStatuses[notif.actorHandle];
      const isFollowing = status === 'following';
      const isRequested = status === 'requested';
      const isLoading = status === 'loading';

      return (
        <div 
          key={notif.id}
          className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-start gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => {
            if (onNavigate) onNavigate(`profile/${notif.actorHandle}`);
            onClose();
          }}
        >
          <div className="w-10 h-10 rounded-full bg-slate-800 shrink-0 mt-0.5 overflow-hidden">
            {notif.actorAvatar ? (
              <img src={notif.actorAvatar} alt={notif.actorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-semibold text-white/50 text-xs">
                {notif.actorName?.charAt(0) || 'F'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-semibold text-white truncate">{notif.title || 'New follower'}</h5>
              <span className="text-[10px] text-white/40 font-mono shrink-0">
                {formatTimeAgo(notif.createdAt || notif.timestamp)}
              </span>
            </div>
            <p className="text-[11px] text-white/70 mt-0.5 leading-snug">
              <span className="font-semibold text-white">{notif.actorName}</span> (@{notif.actorHandle}) started following you
            </p>
            
            <div className="mt-3 flex items-center justify-between">
              <div></div>
              {!isFollowing && !isRequested && (
                <button
                  type="button"
                  onClick={(e) => handleFollowBack(e, notif)}
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl text-[11px] font-bold bg-white text-black hover:bg-white/90 active:scale-95 transition-all flex items-center justify-center min-w-[90px] shadow-sm"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Follow Back'}
                </button>
              )}
              {isFollowing && (
                <div className="px-4 py-2 rounded-xl text-[11px] font-bold border border-white/10 text-white/60 flex items-center gap-1 min-w-[90px] justify-center">
                  Following
                </div>
              )}
              {isRequested && (
                <div className="px-4 py-2 rounded-xl text-[11px] font-bold border border-white/10 text-white/60 flex items-center gap-1 min-w-[90px] justify-center">
                  Requested
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={notif.id}
        className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
          isNotificationUnread(notif) ? 'bg-cyan-500/[0.04] border-cyan-500/25' : 'bg-white/[0.02] border-white/5'
        }`}
      >
        <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-white truncate">{notif.title || 'Update'}</p>
            <span className="text-[10px] text-white/40 shrink-0">
              {formatTimeAgo(notif.createdAt || notif.timestamp)}
            </span>
          </div>
          <p className="text-[11px] text-white/60 mt-0.5 leading-snug">{notif.message}</p>
        </div>
        {isNotificationUnread(notif) && (
          <button
            type="button"
            onClick={() => handleMarkAsRead(notif.id)}
            aria-label="Mark notification as read"
            className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold text-cyan-300 hover:bg-white/5"
          >
            Read
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div 
        className="relative z-10 w-full bg-[#111114] border-t border-white/10 rounded-t-3xl max-h-[82dvh] flex flex-col pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mt-3 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {(unreadCount > 0 || notifications.filter(isNotificationUnread).length > 0) && (
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">
                {unreadCount ?? notifications.filter(isNotificationUnread).length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {(unreadCount > 0 || notifications.some(isNotificationUnread)) && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllRead}
                className="text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 disabled:opacity-50"
              >
                {isMarkingAllRead ? 'Marking…' : 'Mark all read'}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conflict Warning */}
        {conflictModal && (
          <div className="m-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-300">Active Huddle Conflict</p>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  You are currently inside "{conflictModal.currentHuddle?.name || 'another Huddle'}".
                  Leave your current room to join "{conflictModal.notification.senderName}'s Huddle"?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveAndJoin}
                disabled={processingId === conflictModal.notification.id}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-black hover:bg-amber-400 transition-colors flex items-center gap-1.5"
              >
                {processingId === conflictModal.notification.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                Leave & Join
              </button>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Grouped list */}
        <div className="p-4 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 mx-auto">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-white/60">No notifications</p>
              <p className="text-[11px] text-white/30">Huddle invitations and updates will appear here.</p>
            </div>
          ) : (
            <>
              {todayNotifs.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-1">
                    Today
                  </h4>
                  <div className="space-y-2">
                    {todayNotifs.map(renderNotifItem)}
                  </div>
                </div>
              )}

              {earlierNotifs.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-semibold text-white/40 uppercase tracking-wider px-1">
                    Earlier
                  </h4>
                  <div className="space-y-2">
                    {earlierNotifs.map(renderNotifItem)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

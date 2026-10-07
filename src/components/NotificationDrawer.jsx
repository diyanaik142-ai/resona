import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { isNotificationUnread } from '../utils/notifications';
import Avatar from './Avatar';
import { 
  Bell, 
  X, 
  Radio, 
  Clock, 
  Check, 
  AlertCircle, 
  Loader2, 
  LogOut, 
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

/**
 * Format relative timestamp (e.g., "Just now", "5m ago", "2h ago", "Yesterday")
 */
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

/**
 * NotificationDrawer - Centralized Resona Notification System
 * Handles Huddle Invitations, real-time presence, one-active-huddle validation, Join & Decline.
 */
export default function NotificationDrawer({
  isOpen,
  onClose,
  notifications = [],
  setNotifications,
  onMarkAsRead,
  activeHuddle = null,
  setActiveHuddle,
  setShowHuddleRoom,
  onNavigate
}) {
  const { refreshAccountData } = useAuth();
  const [processingId, setProcessingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [followStatuses, setFollowStatuses] = useState({});
  
  // Conflict dialog when user is already in another Huddle
  const [conflictModal, setConflictModal] = useState(null); // { notification, activeHuddle }

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

  // Handle invitation join
  const handleJoin = async (notif) => {
    setErrorMessage('');
    setProcessingId(notif.id);

    try {
      const invitationId = notif.invitationId || notif.id;
      const res = await api.huddle.acceptInvitation(invitationId, notif.huddleId);
      
      if (res.huddle) {
        // Mark notification as accepted locally
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'accepted' } : n));
        await onMarkAsRead?.([notif.id]);
        
        if (setActiveHuddle) setActiveHuddle(res.huddle);
        if (setShowHuddleRoom) setShowHuddleRoom(true);
        onClose();
      }
    } catch (err) {
      // Requirement 10: One Active Huddle Rule
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

  // Handle Leave Current and Join Invited
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

  // Handle invitation decline
  const handleDecline = async (notif) => {
    setProcessingId(notif.id);
    setErrorMessage('');
    try {
      const invitationId = notif.invitationId || notif.id;
      await api.huddle.declineInvitation(invitationId);
      // Mark as declined
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, status: 'declined' } : n));
      await onMarkAsRead?.([notif.id]);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to decline invitation');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-[#121216] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88dvh] sm:max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Notifications</h3>
              <p className="text-xs text-white/50">Huddle invitations & activity updates</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              aria-label="Close notifications"
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conflict Modal Overlay (Requirement 10: One Active Huddle Rule) */}
        {conflictModal && (
          <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 space-y-3 animate-fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-amber-300">You're already in an active Huddle.</h4>
                <p className="text-[11px] text-amber-200/80 leading-relaxed">
                  You are currently inside <span className="font-semibold text-white">"{conflictModal.currentHuddle?.name || 'another Huddle'}"</span>.
                  Resona preserves high-fidelity synchronized playback by limiting listeners to one active session at a time.
                </p>
                <p className="text-[11px] text-amber-200/80">
                  Would you like to leave your current Huddle and join <span className="font-semibold text-white">"{conflictModal.notification.senderName}'s Huddle"</span>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
              <button
                type="button"
                onClick={() => setConflictModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/60 hover:text-white"
              >
                Keep Current
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveAndJoin}
                disabled={processingId === conflictModal.notification.id}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-colors flex items-center gap-1.5 shadow-md"
              >
                {processingId === conflictModal.notification.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                Leave & Join
              </button>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Notifications List */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/30 mx-auto">
                <Bell className="w-5 h-5" />
              </div>
              <p className="text-xs font-medium text-white/60">No notifications</p>
              <p className="text-[11px] text-white/30">When friends invite you to Huddles, they will appear here.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isHuddleInvite = notif.type === 'huddle_invite';
              const isPending = notif.status === 'pending';
              const isAccepted = notif.status === 'accepted';
              const isDeclined = notif.status === 'declined';
              const isCancelled = notif.status === 'cancelled';
              const isBusy = processingId === notif.id;

              if (isHuddleInvite) {
                return (
                  <div
                    key={notif.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isPending && isNotificationUnread(notif)
                        ? 'bg-cyan-500/[0.04] border-cyan-500/30 shadow-md shadow-cyan-500/5'
                        : 'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Sender Avatar */}
                      <div className="relative shrink-0 mt-0.5">
                        <Avatar user={{ name: notif.senderName, avatar: notif.senderAvatar }} className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/30 overflow-hidden text-cyan-300 text-xs" />
                        {/* Status Icon Badge */}
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#121216] border border-white/20 flex items-center justify-center text-cyan-400">
                          <Radio className="w-2.5 h-2.5" />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                            Huddle Invitation
                          </span>
                          <span className="text-[10px] text-white/40 flex items-center gap-1 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {formatTimeAgo(notif.createdAt || notif.timestamp)}
                          </span>
                        </div>

                        {/* Requirement 5: "The sender's actual display name must be used. Do NOT display generic text such as 'You have been invited.'" */}
                        <p className="text-xs text-white mt-1 leading-snug">
                          <span className="font-semibold text-white">{notif.senderName}</span> invited you to join a Huddle
                          {notif.huddleName ? <span className="text-white/60"> ({notif.huddleName})</span> : ''}.
                        </p>

                        {/* Action Buttons or Status Badge */}
                        <div className="mt-3">
                          {isPending ? (
                            <div className="flex items-center gap-2">
                              {/* Requirement 7: When recipient selects "Join", immediately join active Huddle */}
                              <button
                                type="button"
                                onClick={() => handleJoin(notif)}
                                disabled={isBusy}
                                className="px-4 py-2 min-h-[38px] rounded-lg text-xs font-semibold bg-cyan-500 text-black hover:bg-cyan-400 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                Join
                              </button>

                              {/* Requirement 8: When recipient selects "Decline", mark handled/declined */}
                              <button
                                type="button"
                                onClick={() => handleDecline(notif)}
                                disabled={isBusy}
                                className="px-3.5 py-2 min-h-[38px] rounded-lg text-xs font-medium text-white/60 hover:text-white bg-white/5 hover:bg-white/10 disabled:opacity-50 transition-colors flex items-center justify-center"
                              >
                                Decline
                              </button>
                            </div>
                          ) : isAccepted ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-300">
                              <Check className="w-3 h-3" />
                              <span>Joined Huddle</span>
                            </div>
                          ) : isDeclined ? (
                            <span className="text-[11px] text-white/40 italic">
                              Invitation declined
                            </span>
                          ) : isCancelled ? (
                            <span className="text-[11px] text-amber-400/80 italic">
                              Huddle ended by host
                            </span>
                          ) : null}
                        </div>
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
                    className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer hover:bg-white/[0.04] transition-colors ${
                      isNotificationUnread(notif) ? 'bg-cyan-500/[0.04] border-cyan-500/25' : 'bg-white/[0.02] border-white/5'
                    }`}
                    onClick={() => {
                      if (onNavigate) onNavigate(`profile/${notif.actorHandle}`);
                      onClose();
                    }}
                  >
                    <Avatar user={{ name: notif.actorName, avatar: notif.actorAvatar }} className="w-10 h-10 rounded-full bg-slate-800 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h5 className="text-xs font-semibold text-white truncate">{notif.title || 'New follower'}</h5>
                        <span className="text-[10px] text-white/40 font-mono shrink-0">
                          {formatTimeAgo(notif.createdAt || notif.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-white/60 mt-0.5 leading-snug">
                        <span className="font-semibold text-white">{notif.actorName}</span> (@{notif.actorHandle}) started following you
                      </p>
                      
                      <div className="mt-3 flex items-center justify-between">
                        <div></div>
                        {!isFollowing && !isRequested && (
                          <button
                            type="button"
                            onClick={(e) => handleFollowBack(e, notif)}
                            disabled={isLoading}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-white text-black hover:bg-white/90 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[80px]"
                          >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Follow Back'}
                          </button>
                        )}
                        {isFollowing && (
                          <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-white/10 text-white/60 flex items-center gap-1 min-w-[80px] justify-center">
                            Following
                          </div>
                        )}
                        {isRequested && (
                          <div className="px-3 py-1.5 rounded-lg text-[10px] font-bold border border-white/10 text-white/60 flex items-center gap-1 min-w-[80px] justify-center">
                            Requested
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              // Standard / System Notification
              return (
                <div 
                  key={notif.id}
                  className={`p-3 rounded-xl border flex items-start justify-between gap-3 ${
                    isNotificationUnread(notif) ? 'bg-cyan-500/[0.04] border-cyan-500/25' : 'bg-white/[0.02] border-white/5'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-white/5 text-white/60 shrink-0 mt-0.5">
                      <Info className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-white">{notif.title || 'Update'}</h5>
                      <p className="text-[11px] text-white/60 mt-0.5">{notif.message || notif.desc}</p>
                      <span className="text-[10px] text-white/40 font-mono mt-1 block">
                        {formatTimeAgo(notif.createdAt || notif.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

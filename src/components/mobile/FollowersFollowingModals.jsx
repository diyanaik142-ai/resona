import React, { useState, useEffect } from 'react';
import { X, UserMinus } from 'lucide-react';
import { api } from '../../services/api';
import Avatar from '../Avatar';
import { useAuth } from '../../context/AuthContext';

export function FollowersModal({ user, onClose, onRefresh, onNavigate }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = currentUser?.id === user?.id;

  useEffect(() => {
    if (user?.handle) {
      api.user.getFollowers(user.handle)
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleRemove = async (handle) => {
    try {
      await api.user.removeFollower(handle);
      setUsers(users.filter(u => u.handle !== handle));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-xl font-black text-white">Followers</h2>
        <button onClick={onClose} className="p-2 rounded-full bg-white/5 active:scale-95 transition">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-slate-400 mt-10">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-slate-400 mt-10">No followers yet.</p>
        ) : (
          users.map(u => (
            <div 
              key={u.id} 
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-95 cursor-pointer"
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`profile/${u.handle}`);
                  onClose();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Avatar user={u} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-bold text-white text-sm">{u.name}</p>
                  <p className="text-xs text-slate-400">@{u.handle}</p>
                </div>
              </div>
              {isOwnProfile && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(u.handle);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold flex items-center gap-1 active:scale-[0.9]"
                >
                  <UserMinus className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function FollowingModal({ user, onClose, onRefresh, onNavigate }) {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const isOwnProfile = currentUser?.id === user?.id;

  useEffect(() => {
    if (user?.handle) {
      api.user.getFollowing(user.handle)
        .then(setUsers)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleUnfollow = async (handle) => {
    try {
      await api.user.unfollowUser(handle);
      setUsers(users.filter(u => u.handle !== handle));
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <h2 className="text-xl font-black text-white">Following</h2>
        <button onClick={onClose} className="p-2 rounded-full bg-white/5 active:scale-95 transition">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-center text-slate-400 mt-10">Loading...</p>
        ) : users.length === 0 ? (
          <p className="text-center text-slate-400 mt-10">Not following anyone yet.</p>
        ) : (
          users.map(u => (
            <div 
              key={u.id} 
              className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/5 active:scale-95 cursor-pointer"
              onClick={() => {
                if (onNavigate) {
                  onNavigate(`profile/${u.handle}`);
                  onClose();
                }
              }}
            >
              <div className="flex items-center gap-3">
                <Avatar user={u} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="font-bold text-white text-sm">{u.name}</p>
                  <p className="text-xs text-slate-400">@{u.handle}</p>
                </div>
              </div>
              {isOwnProfile && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUnfollow(u.handle);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 border border-white/10 text-xs font-bold active:scale-[0.9]"
                >
                  Unfollow
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

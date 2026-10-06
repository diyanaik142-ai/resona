import React, { useMemo, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Settings, User, Heart, Library,
  Users, Radio, Shield, LogOut, Disc, Sparkles, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api, resolveMediaUrl } from '../../services/api';
import PlanBadge from '../PlanBadge';
import ImageCropModal from '../ImageCropModal';
import Avatar from '../Avatar';
import { FollowersModal, FollowingModal } from './FollowersFollowingModals';

export default function MobileProfileView({ onNavigate, onOpenAuthModal, shelf }) {
  const { user, logout, updateProfile, refreshAccountData, creatorData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ name: user?.name || '', uid: user?.uid || user?.handle || '' });
  const [phone, setPhone] = useState(user?.phone || '');
  const [uidMessage, setUidMessage] = useState('');
  const [uidState, setUidState] = useState('idle');
  const [cropImage, setCropImage] = useState(null);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);

  const uidValue = useMemo(() => (user?.uid || user?.handle || '').toString().replace(/^@+/, ''), [user]);

  const handleUidChange = async (nextValue) => {
    setFormData((prev) => ({ ...prev, uid: nextValue }));
    const trimmed = nextValue.trim();
    if (!trimmed) {
      setUidMessage('UID cannot be empty');
      setUidState('error');
      return;
    }

    try {
      const result = await api.user.checkUid(trimmed);
      setUidMessage(!result.valid ? (result.error || 'UID is invalid') : (result.available ? 'UID available' : 'UID already taken'));
      setUidState(result.available ? 'success' : 'error');
    } catch (err) {
      setUidMessage(err.message || 'UID is invalid');
      setUidState('error');
    }
  };

  const handleSaveProfile = async () => {
    const nextUid = formData.uid.trim();
    if (!nextUid) {
      setUidMessage('UID cannot be empty');
      setUidState('error');
      return;
    }

    try {
      const result = await api.user.checkUid(nextUid);
      if (!result.valid || !result.available) {
        setUidMessage(result.error || 'UID already taken');
        setUidState('error');
        return;
      }

      const updated = await updateProfile({
        name: formData.name.trim(),
        uid: nextUid,
        handle: nextUid,
        phone
      });
      setFormData({ name: updated.name || formData.name, uid: updated.uid || updated.handle || nextUid });
      setIsEditing(false);
      setUidMessage('UID updated');
      setUidState('success');
    } catch (err) {
      setUidMessage(err.message || 'Could not save profile');
      setUidState('error');
    }
  };

  return (
    <div className="space-y-5 px-4 pt-2 pb-6 animate-fadeIn">
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => {
            if (window.history.length > 1) {
              window.history.back();
            } else {
              onNavigate('pulse');
            }
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <span className="text-[10px] font-mono tracking-wider text-slate-500 uppercase">
          Account Center
        </span>
      </div>

      {/* Main Profile Hero Card */}
      <div className="p-5 rounded-3xl glass-card border border-teal-500/20 relative overflow-hidden bg-gradient-to-br from-slate-900/90 to-slate-950/90">
        <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative z-10">
          <div className="w-16 h-16 rounded-full border-2 border-teal-400 overflow-hidden bg-slate-800 shadow-xl shadow-teal-500/20 shrink-0">
            <Avatar user={user} className="w-full h-full" />
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black text-white truncate">
              {user?.name || 'Resona Listener'}
            </h2>
            <p className="text-xs text-slate-300 font-mono truncate mt-0.5">
              {uidValue ? `@${uidValue}` : 'UID not added'}
            </p>
            <p className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
              {user?.email || 'No email registered'}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-[9px] font-bold text-teal-300 bg-teal-500/20 border border-teal-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                <PlanBadge plan={user?.planId} />
              </span>
              <span className="text-[9px] font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" />
                Active
              </span>
              <button
                type="button"
                onClick={() => {
                  setFormData({ name: user?.name || '', uid: uidValue || '' });
                setPhone(user?.phone || '');
                  setIsEditing(true);
                  setUidMessage('');
                  setUidState('idle');
                }}
                className="text-[9px] font-bold text-white bg-slate-700/80 border border-white/10 px-2.5 py-0.5 rounded-full"
              >
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {isEditing && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-3 space-y-3">
            <div className="flex gap-4 items-center">
              <Avatar user={user} className="w-16 h-16 rounded-full border border-white/20 shrink-0" />
              <div className="flex flex-col gap-2">
                <label className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer text-center text-white transition">
                  Change Picture
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) { setUidMessage('Image must be under 5MB'); setUidState('error'); return; }
                    setCropImage(file);
                    e.target.value = '';
                  }} />
                </label>
                {user?.avatar && <button onClick={async () => {
                  try {
                    await api.user.removeProfilePicture();
                    setUidMessage('Profile picture removed'); setUidState('success');
                    await refreshAccountData();
                  } catch (err) { setUidMessage(err.message); setUidState('error'); }
                }} className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-500/10">Remove</button>}
              </div>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 block mb-1">Display Name</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 block mb-1">UID</label>
              <input
                value={formData.uid}
                onChange={(e) => handleUidChange(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm"
              />
              {uidMessage && (
                <p className={`mt-2 text-[10px] ${uidState === 'success' ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {uidState === 'success' ? '✓ ' : '✕ '}{uidMessage}
                </p>
              )}
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.2em] text-slate-400 block mb-1">Phone (optional)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 rounded-xl border border-white/10 text-slate-300 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-2 rounded-xl bg-teal-500 text-slate-950 text-sm font-black"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Premium Profile Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-white/10">
          <div
            onClick={() => setShowFollowers(true)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 cursor-pointer transition active:scale-95"
          >
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Followers</p>
            <p className="text-3xl font-light text-white tracking-tight">{user?.followersCount || 0}</p>
          </div>
          <div
            onClick={() => setShowFollowing(true)}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 cursor-pointer transition active:scale-95"
          >
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">Following</p>
            <p className="text-3xl font-light text-white tracking-tight">{user?.followingCount || 0}</p>
          </div>
        </div>
      </div>

      {/* Primary Link: Settings & Preferences */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
          Preferences
        </span>

        <div
          onClick={() => onNavigate('settings')}
          className="flex items-center justify-between p-4 rounded-2xl glass-card border border-teal-500/30 hover:border-teal-400/60 bg-teal-500/5 transition cursor-pointer active:scale-[0.99] group shadow-lg shadow-teal-500/5"
        >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-300 shrink-0 group-hover:scale-105 transition">
              <Settings className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                Settings & Preferences
              </h3>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                Playback quality, crossfade, privacy, notifications
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-teal-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
        </div>
      </div>

      {/* Account Operations & Switch */}
      <div className="space-y-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
          Account Management
        </span>

        <div className="space-y-2">
          <div
            onClick={onOpenAuthModal}
            className="flex items-center justify-between p-3.5 rounded-2xl glass-card border border-white/5 hover:border-white/15 transition cursor-pointer active:scale-[0.99]"
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-white text-xs truncate">Switch Account</h4>
                <p className="text-[10px] text-slate-400 truncate">Sign in to a different account</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
          </div>

          {(() => {
            const isApprovedCreator = creatorData?.isCreator || creatorData?.status === 'approved';
            const isPendingCreator = creatorData?.status === 'pending';
            return (
              <div
                onClick={() => onNavigate('creator')}
                className="flex items-center justify-between p-3.5 rounded-2xl glass-card border border-white/5 hover:border-purple-500/30 transition cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                    <Radio className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-xs truncate">
                      {isApprovedCreator ? 'Creator Studio' : isPendingCreator ? 'Creator Application' : 'Become a Creator'}
                    </h4>
                    <p className="text-[10px] text-slate-400 truncate">
                      {isApprovedCreator 
                        ? 'Publish tracks & master releases' 
                        : isPendingCreator 
                          ? 'Application under review' 
                          : 'Apply to publish original music'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0 ml-2" />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Sign Out Button */}
      <button
        onClick={logout}
        className="w-full py-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition mt-6"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out</span>
      </button>
      
      {cropImage && (
        <ImageCropModal
          imageFile={cropImage}
          onCancel={() => setCropImage(null)}
          onCrop={async (croppedFile) => {
            setCropImage(null);
            setUidMessage('Uploading...');
            setUidState('idle');
            try {
              await api.user.uploadProfilePicture(croppedFile);
              setUidMessage('Profile picture updated');
              setUidState('success');
              await refreshAccountData();
            } catch (err) {
              setUidMessage(err.message);
              setUidState('error');
            }
          }}
        />
      )}
      
      {showFollowers && (
        <FollowersModal
          user={user}
          onClose={() => setShowFollowers(false)}
          onRefresh={refreshAccountData}
        />
      )}
      
      {showFollowing && (
        <FollowingModal
          user={user}
          onClose={() => setShowFollowing(false)}
          onRefresh={refreshAccountData}
        />
      )}
    </div>
  );
}

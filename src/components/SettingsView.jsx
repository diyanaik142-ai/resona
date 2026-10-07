import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PlanBadge from './PlanBadge';
import { api, resolveMediaUrl } from '../services/api';
import AuthModal from './AuthModal';
import ChangePasswordModal from './ChangePasswordModal';
import Avatar from './Avatar';
import ImageCropModal from './ImageCropModal';
import AccountSwitcherModal from './AccountSwitcherModal';
import {
  User, PlayCircle, Sliders, Bell, Eye, Users, Cast, Globe, Database, Heart,
  Accessibility, HelpCircle, Info, Sparkles, ChevronRight, ChevronLeft, Check,
  Smartphone, Speaker, Tv, X, Shield, Lock, Radio, UploadCloud, BarChart3, MessageSquare, Download, Trash2, Moon, Volume2, Mic, LogIn, LogOut, RefreshCw, FolderLock, FileText, AlertTriangle
} from 'lucide-react';

export default function SettingsView({ onNavigate }) {
  const { user, preferences, updatePreferences, logout, updateProfile, refreshAccountData, refreshPlan, authError, creatorData } = useAuth();
  const [activeSubpage, setActiveSubpage] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [showAccountSwitcher, setShowAccountSwitcher] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const isCreator = Boolean(creatorData?.isCreator || creatorData?.status === 'approved');

  // Hierarchy definition
  const SETTINGS_SECTIONS = [
    {
      title: 'ACCOUNT',
      items: [
        { id: 'account-profile', title: 'Account & Profile', desc: 'Manage your profile and account details', icon: User },
        { id: 'switch-account', title: 'Switch Account', desc: 'Manage multiple accounts on this device', icon: Users, action: () => setShowAccountSwitcher(true) },
        { id: 'security-sessions', title: 'Security & Sessions', desc: 'Manage passwords and active sessions', icon: Shield },
      ]
    },
    {
      title: 'PREFERENCES',
      items: [
        { id: 'playback-audio', title: 'Playback & Audio', desc: 'Streaming quality, crossfade, autoplay', icon: PlayCircle },
        { id: 'notifications', title: 'Notifications', desc: 'Push, email, and social updates', icon: Bell },
        { id: 'privacy-social', title: 'Privacy & Social', desc: 'Listening activity and follow requests', icon: Eye },
      ]
    },
    {
      title: 'STORAGE & DEVICES',
      items: [
        { id: 'storage-offline', title: 'Storage & Offline', desc: 'Manage downloaded music and cache', icon: Database },
        { id: 'connected-devices', title: 'Connected Devices', desc: 'Manage cast and active playback devices', icon: Cast },
      ]
    },
    {
      title: 'CREATOR',
      items: [
        { id: 'creator-hub', title: 'Creator Studio', desc: isCreator ? 'Manage your artist profile' : 'Apply to become a creator', icon: Mic },
      ]
    },
    {
      title: 'ACCOUNT MANAGEMENT',
      items: [
        { id: 'account-data', title: 'Account Data', desc: 'Download or request your data', icon: FileText },
        { id: 'deactivate-delete', title: 'Deactivate / Delete', desc: 'Permanently remove or hide your account', icon: AlertTriangle },
      ]
    },
    {
      title: 'ABOUT',
      items: [
        { id: 'about-resona', title: 'About Resona', desc: 'Version info and legal terms', icon: Info },
      ]
    }
  ];

  const handleItemClick = (item) => {
    if (item.action) {
      item.action();
    } else {
      setActiveSubpage(item.id);
    }
  };

  const renderActiveSubpage = () => {
    switch (activeSubpage) {
      case 'account-profile': return <AccountProfileSettings />;
      case 'security-sessions': return <SecuritySessionsSettings triggerToast={triggerToast} />;
      case 'playback-audio': return <PlaybackAudioSettings />;
      case 'notifications': return <NotificationsSettings />;
      case 'privacy-social': return <PrivacySocialSettings />;
      case 'storage-offline': return <StorageOfflineSettings />;
      case 'connected-devices': return <ConnectedDevicesSettings />;
      case 'creator-hub': return <CreatorSettings />;
      case 'account-data': return <AccountDataSettings />;
      case 'deactivate-delete': return <DeactivateDeleteSettings logout={logout} />;
      case 'about-resona': return <AboutSettings />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 pb-24 relative w-full h-full bg-[#06070B] overflow-y-auto custom-scrollbar">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm glass-panel border border-teal-400 bg-slate-900/90 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <p className="text-xs font-bold text-white">{toastMsg}</p>
        </div>
      )}

      {showAccountSwitcher && (
        <AccountSwitcherModal onClose={() => setShowAccountSwitcher(false)} />
      )}

      {showChangePassModal && (
        <ChangePasswordModal onClose={() => setShowChangePassModal(false)} onNavigate={onNavigate} />
      )}

      {/* Main Settings List */}
      {!activeSubpage && (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 border-b border-white/5 pb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 shrink-0">
              <Avatar src={user?.photo || user?.avatar} fallback={user?.name} className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name}</h1>
              <p className="text-sm text-slate-400">Manage your Resona experience</p>
            </div>
          </div>

          <div className="space-y-8">
            {SETTINGS_SECTIONS.map((section, idx) => (
              <div key={idx} className="space-y-3">
                <h2 className="text-xs font-bold text-teal-400 tracking-widest uppercase px-2">{section.title}</h2>
                <div className="bg-white/5 rounded-2xl border border-white/5 overflow-hidden divide-y divide-white/5">
                  {section.items.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors group text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-teal-500/20 group-hover:text-teal-400 transition-colors">
                        <item.icon className="w-5 h-5 text-slate-400 group-hover:text-teal-400 transition-colors" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-white text-sm truncate">{item.title}</h3>
                        <p className="text-xs text-slate-400 truncate">{item.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-8 pb-12 border-t border-white/5">
             <button
                onClick={logout}
                className="w-full p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 font-bold flex items-center justify-center gap-2 transition"
             >
                <LogOut className="w-5 h-5" />
                Sign Out {user?.name}
             </button>
             <p className="text-center text-xs text-slate-500 mt-4">
               Signing out will end the session for this account only.
             </p>
          </div>
        </div>
      )}

      {/* Subpage View */}
      {activeSubpage && (
        <div className="w-full max-w-3xl mx-auto p-4 md:p-8 animate-in slide-in-from-right-8 duration-300">
           <button 
             onClick={() => setActiveSubpage(null)}
             className="flex items-center gap-2 text-slate-400 hover:text-white transition mb-6"
           >
             <ChevronLeft className="w-5 h-5" />
             <span className="font-bold">Settings</span>
           </button>
           {renderActiveSubpage()}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STUBS FOR SETTINGS SUBPAGES
// ============================================================================

function AccountProfileSettings() {
  const { user, updateProfile } = useAuth();
  const [draft, setDraft] = useState({ name: user?.name || '', uid: user?.uid || user?.handle || '', phone: user?.phone || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess(false);
    try {
      const nextUid = draft.uid.trim().replace(/^@+/, '');
      if (!nextUid) throw new Error('UID is required.');
      await updateProfile({ name: draft.name, uid: nextUid, phone: draft.phone });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Account & Profile</h2>
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6 space-y-4">
        <div>
           <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Display Name</label>
           <input type="text" value={draft.name} onChange={e => setDraft({...draft, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-400" />
        </div>
        <div>
           <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Username / UID</label>
           <input type="text" value={draft.uid} onChange={e => setDraft({...draft, uid: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-400" />
        </div>
        <div>
           <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Email (Read Only)</label>
           <input type="text" value={draft.email} disabled className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-slate-400 opacity-50 cursor-not-allowed" />
        </div>
        <div>
           <label className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1 block">Phone Number</label>
           <input type="text" value={draft.phone} onChange={e => setDraft({...draft, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-400" />
        </div>
        
        {error && <p className="text-rose-400 text-sm">{error}</p>}
        {success && <p className="text-teal-400 text-sm font-bold">Profile updated successfully!</p>}
        
        <button onClick={handleSave} disabled={saving} className="w-full py-4 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-xl transition disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </div>
  );
}

function SecuritySessionsSettings({ triggerToast, onNavigate }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPassModal, setShowPassModal] = useState(false);

  const fetchSessions = () => {
    api.user.getSessions()
      .then(res => setSessions(Array.isArray(res) ? res : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleRevoke = async (id) => {
    try {
      await api.user.revokeSession(id);
      triggerToast('Session revoked');
      fetchSessions();
    } catch (err) {
      triggerToast(err.message || 'Could not revoke session');
    }
  };
  
  const handleSignOutOthers = async () => {
    try {
      await api.user.signOutOtherSessions();
      triggerToast('Signed out of all other sessions');
      fetchSessions();
    } catch (err) {
      triggerToast(err.message || 'Could not sign out of other devices');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Security & Sessions</h2>
      
      {showPassModal && <ChangePasswordModal onClose={() => setShowPassModal(false)} onNavigate={onNavigate} />}

      <div className="bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-lg">Password</h3>
          <p className="text-sm text-slate-400">Change your password and secure your account.</p>
        </div>
        <button onClick={() => setShowPassModal(true)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-sm transition shrink-0">
          Change Password
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
           <h3 className="font-bold text-white text-lg">Active Sessions</h3>
           {sessions.length > 1 && (
             <button onClick={handleSignOutOthers} className="text-rose-400 text-sm font-bold hover:text-rose-300 transition">
               Sign Out All Others
             </button>
           )}
        </div>
        
        {loading ? (
           <p className="text-slate-400 text-sm animate-pulse">Loading sessions...</p>
        ) : (
           <div className="space-y-3">
             {sessions.map(session => (
               <div key={session.id || session.sessionId} className="bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-between">
                 <div>
                   <h4 className="font-bold text-white text-sm flex items-center gap-2">
                     {session.device || 'Unknown Device'} 
                     {session.current && <span className="text-[10px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full uppercase tracking-wider">Current</span>}
                   </h4>
                   <p className="text-xs text-slate-400 mt-1">Last active: {new Date(session.lastActive || session.createdAt).toLocaleString()}</p>
                 </div>
                 {!session.current && (
                   <button onClick={() => handleRevoke(session.id || session.sessionId)} className="text-rose-400 hover:bg-rose-500/10 text-sm font-bold px-4 py-2 border border-rose-500/20 rounded-xl transition">
                     Revoke
                   </button>
                 )}
               </div>
             ))}
             {sessions.length === 0 && <p className="text-slate-400 text-sm">No active sessions found.</p>}
           </div>
        )}
      </div>
    </div>
  );
}

function PlaybackAudioSettings() {
  const { preferences, updatePreferences } = useAuth();
  
  const handleToggle = async (key) => {
    const newVal = !(preferences?.[key] ?? true);
    await updatePreferences({ [key]: newVal }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Playback & Audio</h2>
      <div className="space-y-2">
        <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Gapless Playback</h3>
            <p className="text-sm text-slate-400">Remove gaps between tracks</p>
          </div>
          <button onClick={() => handleToggle('gapless')} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${preferences?.gapless !== false ? 'bg-teal-500' : 'bg-white/10'}`}>
             <div className={`w-4 h-4 bg-white rounded-full transition-transform ${preferences?.gapless !== false ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Autoplay</h3>
            <p className="text-sm text-slate-400">Keep playing similar tracks when your selection ends</p>
          </div>
          <button onClick={() => handleToggle('autoplay')} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${preferences?.autoplay !== false ? 'bg-teal-500' : 'bg-white/10'}`}>
             <div className={`w-4 h-4 bg-white rounded-full transition-transform ${preferences?.autoplay !== false ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationsSettings() {
  const { preferences, updatePreferences } = useAuth();

  const handleToggle = async (key) => {
    const newVal = !(preferences?.[key] ?? true);
    await updatePreferences({ [key]: newVal }).catch(() => {});
  };

  const SETTINGS = [
    { key: 'pushNotifs', label: 'Push Notifications', desc: 'Receive push alerts on this device' },
    { key: 'notifFollows', label: 'New Followers', desc: 'When someone follows you' },
    { key: 'notifRecommendations', label: 'Music Recommendations', desc: 'Personalized picks and Daily Dose' },
    { key: 'notifHuddle', label: 'Huddle Activity', desc: 'When friends start a Huddle session' }
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Notifications</h2>
      <div className="space-y-2">
        {SETTINGS.map(setting => (
          <div key={setting.key} className="bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white">{setting.label}</h3>
              <p className="text-sm text-slate-400">{setting.desc}</p>
            </div>
            <button onClick={() => handleToggle(setting.key)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${preferences?.[setting.key] !== false ? 'bg-teal-500' : 'bg-white/10'}`}>
               <div className={`w-4 h-4 bg-white rounded-full transition-transform ${preferences?.[setting.key] !== false ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrivacySocialSettings() {
  const { preferences, updatePreferences } = useAuth();
  
  const handleToggle = async (key) => {
    const newVal = !(preferences?.[key] ?? false);
    await updatePreferences({ [key]: newVal }).catch(() => {});
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Privacy & Social</h2>
      <div className="space-y-2">
        <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Private Profile</h3>
            <p className="text-sm text-slate-400">Only approved followers can see your playlists and activity</p>
          </div>
          <button onClick={() => handleToggle('privateProfile')} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${preferences?.privateProfile === true ? 'bg-teal-500' : 'bg-white/10'}`}>
             <div className={`w-4 h-4 bg-white rounded-full transition-transform ${preferences?.privateProfile === true ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="bg-white/5 rounded-2xl border border-white/5 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white">Share Listening Activity</h3>
            <p className="text-sm text-slate-400">Let followers see what you are currently playing</p>
          </div>
          <button onClick={() => handleToggle('friendActivityVisible')} className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${preferences?.friendActivityVisible !== false ? 'bg-teal-500' : 'bg-white/10'}`}>
             <div className={`w-4 h-4 bg-white rounded-full transition-transform ${preferences?.friendActivityVisible !== false ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StorageOfflineSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Storage & Offline</h2>
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
         <p className="text-sm text-slate-400">
           Technical Reason: The Storage & Offline capabilities require a native filesystem interface (via React Native / Capacitor) and an IndexedDB caching layer for the web player. These backend services are not fully mocked out in the current API architecture to support robust state management.
         </p>
      </div>
    </div>
  );
}

function ConnectedDevicesSettings() {
  const { currentSessionId } = useAuth();
  const [sessions, setSessions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  
  const fetchSessions = async () => {
    try {
      const data = await api.user.getSessions();
      setSessions(data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id) => {
    try {
      await api.user.revokeSession(id);
      await fetchSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="text-slate-400 p-6">Loading connected devices...</div>;

  const currentDevice = sessions.find(s => s.id === currentSessionId);
  const otherDevices = sessions.filter(s => s.id !== currentSessionId);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Connected Devices</h2>
      {error && <div className="bg-red-500/20 text-red-200 p-4 rounded-xl text-sm">{error}</div>}
      
      <div className="space-y-4">
        <h3 className="font-bold text-white">Current Device</h3>
        {currentDevice ? (
          <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
                 <i className="material-icons text-teal-500">phonelink_ring</i>
              </div>
              <div>
                <h4 className="font-bold text-white">{currentDevice.userAgent || 'Current Device'}</h4>
                <p className="text-xs text-teal-400 font-medium">Active now</p>
                {currentDevice.createdAt && <p className="text-xs text-slate-500 mt-1">Authorized {new Date(currentDevice.createdAt).toLocaleDateString()}</p>}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">Unable to detect current device session.</div>
        )}
      </div>

      <div className="space-y-4 mt-8">
        <h3 className="font-bold text-white">Other Devices</h3>
        {otherDevices.length === 0 ? (
          <div className="bg-white/5 rounded-2xl p-6 text-center text-slate-400 text-sm">
             No other active devices found for this account.
          </div>
        ) : (
          otherDevices.map(session => (
            <div key={session.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                   <i className="material-icons text-slate-300">devices</i>
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">{session.userAgent || 'Unknown Device'}</h4>
                  {session.lastActive && <p className="text-xs text-slate-400">Last active: {new Date(session.lastActive).toLocaleDateString()}</p>}
                </div>
              </div>
              <button 
                onClick={() => handleRevoke(session.id)}
                className="px-4 py-2 bg-red-500/10 text-red-400 rounded-xl text-sm font-bold hover:bg-red-500/20 transition-colors"
              >
                Log Out
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CreatorSettings() {
  const [creatorData, setCreatorData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [artistName, setArtistName] = React.useState('');
  const [applying, setApplying] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    api.creator.getDashboard()
      .then(data => {
        if (mounted) {
          setCreatorData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => mounted = false;
  }, []);

  const handleApply = async (e) => {
    e.preventDefault();
    setApplying(true);
    setError('');
    try {
      const updated = await api.creator.apply(artistName);
      setCreatorData(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setApplying(false);
    }
  };

  if (loading) return <div className="text-slate-400 p-6">Loading creator status...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Creator Studio</h2>
      
      {error && <div className="bg-red-500/20 text-red-200 p-4 rounded-xl text-sm">{error}</div>}

      {(!creatorData || creatorData.status === 'none' || creatorData.status === 'rejected') && (
        <form onSubmit={handleApply} className="bg-white/5 rounded-2xl border border-white/5 p-6 space-y-4">
          <p className="text-slate-300 mb-4">
            {creatorData?.status === 'rejected' ? 'Your previous application was not approved. You may reapply.' : 'Apply to become a verified Creator on Resona to upload original music and earn revenue.'}
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Artist / Band Name</label>
            <input 
              type="text" 
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-teal-500 transition-colors"
              placeholder="Your stage name"
              value={artistName}
              onChange={e => setArtistName(e.target.value)}
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={applying || !artistName.trim()}
            className="w-full bg-teal-500 text-white rounded-xl font-bold py-3 hover:bg-teal-400 transition-colors disabled:opacity-50"
          >
            {applying ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      )}

      {creatorData?.status === 'pending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 p-6 rounded-2xl flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
             <i className="material-icons text-yellow-500">schedule</i>
          </div>
          <div>
            <h3 className="font-bold text-white text-lg">Application Pending</h3>
            <p className="text-slate-400 mt-1">Your creator application for "{creatorData.artistName}" is currently under review by our team. We'll notify you when a decision is made.</p>
          </div>
        </div>
      )}

      {creatorData?.status === 'approved' && (
        <div className="space-y-6">
          <div className="bg-teal-500/10 border border-teal-500/20 p-6 rounded-2xl flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-lg">Creator Studio</h3>
              <p className="text-slate-400">Welcome back, {creatorData.artistName}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-teal-500/20 flex items-center justify-center">
               <i className="material-icons text-teal-500">verified</i>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-center">
               <div className="text-2xl font-bold text-white">{creatorData.stats?.uploads || 0}</div>
               <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Uploads</div>
            </div>
            <div className="bg-white/5 rounded-2xl border border-white/5 p-4 text-center">
               <div className="text-2xl font-bold text-white">{creatorData.stats?.followers || '0'}</div>
               <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Followers</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountDataSettings() {
  const [status, setStatus] = React.useState('none');
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [dates, setDates] = React.useState({});

  const checkStatus = React.useCallback(async () => {
    try {
      const data = await api.user.exportStatus();
      setStatus(data.status || 'none');
      if (data.requestedAt) setDates(d => ({ ...d, requestedAt: data.requestedAt }));
      if (data.completedAt) setDates(d => ({ ...d, completedAt: data.completedAt }));
      if (data.status === 'preparing') {
        setTimeout(checkStatus, 1500); // Poll while preparing
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleRequest = async () => {
    setError('');
    setStatus('preparing');
    try {
      const data = await api.user.requestExport();
      setStatus(data.status);
      if (data.requestedAt) setDates(d => ({ ...d, requestedAt: data.requestedAt }));
      setTimeout(checkStatus, 1500);
    } catch (e) {
      setError(e.message);
      setStatus('none');
    }
  };

  const handleDownload = async () => {
    try {
      await api.user.downloadExport();
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading) return <div className="text-slate-400 p-6">Checking export status...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Account Data</h2>
      
      {error && <div className="bg-red-500/20 text-red-200 p-4 rounded-xl text-sm">{error}</div>}

      <div className="bg-white/5 rounded-2xl border border-white/5 p-6 space-y-6">
        <div>
          <h3 className="font-bold text-white text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-teal-400" />
            Download Your Data
          </h3>
          <p className="text-slate-400 text-sm mt-2">
            Get a copy of your Resona data, including your profile, preferences, library, social connections, and account history.
            This process generates a secure ZIP archive containing your data in JSON format.
          </p>
        </div>

        <div className="bg-black/30 rounded-xl p-5 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-300 font-medium">Export Status</span>
            {status === 'none' && <span className="text-slate-500 text-sm">Not requested</span>}
            {status === 'preparing' && <span className="text-yellow-400 text-sm flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin"/> Preparing...</span>}
            {status === 'ready' && <span className="text-teal-400 text-sm flex items-center gap-2"><Check className="w-4 h-4"/> Ready for download</span>}
            {status === 'failed' && <span className="text-rose-400 text-sm">Failed</span>}
          </div>

          {dates.requestedAt && (
            <div className="text-xs text-slate-500 mb-1">
              Requested: {new Date(dates.requestedAt).toLocaleString()}
            </div>
          )}
          {dates.completedAt && status === 'ready' && (
            <div className="text-xs text-slate-500">
              Completed: {new Date(dates.completedAt).toLocaleString()}
            </div>
          )}

          <div className="mt-6 border-t border-white/5 pt-4">
            {status === 'none' || status === 'failed' ? (
              <button 
                onClick={handleRequest}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                Request Export
              </button>
            ) : status === 'preparing' ? (
              <button 
                disabled
                className="bg-white/5 text-slate-500 px-4 py-2 rounded-lg font-medium text-sm cursor-not-allowed"
              >
                Requesting...
              </button>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={handleDownload}
                  className="bg-teal-500 hover:bg-teal-400 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download ZIP
                </button>
                <button 
                  onClick={handleRequest}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Request New
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeactivateDeleteSettings({ logout }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState('');

  const handleDeactivate = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.user.deactivateAccount();
      setSuccess('Account deactivated successfully. Logging out...');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deletePhrase !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.user.deleteAccount(deletePhrase);
      setSuccess('Account permanently deleted. Logging out...');
      setTimeout(() => logout(), 2000);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">Deactivate or Delete Account</h2>
      
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl flex items-center gap-3">
          <Check className="w-5 h-5 shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      <div className="bg-white/5 rounded-2xl border border-white/5 p-6">
        <h3 className="font-bold text-white mb-2">Deactivate Account</h3>
        <p className="text-sm text-slate-400 mb-6">
          Deactivating your account will hide your profile, playlists, and activity from other users. You can reactivate by logging in again in the future.
        </p>
        
        {!showDeactivateConfirm ? (
          <button 
            onClick={() => setShowDeactivateConfirm(true)}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors text-sm"
          >
            Deactivate Account
          </button>
        ) : (
          <div className="p-4 bg-black/40 rounded-xl space-y-4 border border-white/10">
            <p className="text-sm font-semibold text-white">Are you sure you want to deactivate?</p>
            <div className="flex items-center gap-3">
              <button 
                onClick={handleDeactivate}
                disabled={loading}
                className="px-6 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl font-bold transition-colors text-sm flex items-center justify-center min-w-[120px]"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Yes, Deactivate'}
              </button>
              <button 
                onClick={() => setShowDeactivateConfirm(false)}
                disabled={loading}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-rose-500/5 rounded-2xl border border-rose-500/20 p-6">
        <h3 className="font-bold text-rose-500 mb-2">Permanently Delete Account</h3>
        <p className="text-sm text-rose-500/80 mb-6">
          This is a permanent action. Your profile, playlists, uploads, followers, and all associated data will be completely deleted and cannot be recovered.
        </p>
        
        {!showDeleteConfirm ? (
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-500 rounded-xl font-bold transition-colors text-sm"
          >
            Delete Account
          </button>
        ) : (
          <div className="p-4 bg-rose-500/10 rounded-xl space-y-4">
            <p className="text-sm font-semibold text-rose-500">To confirm permanent deletion, please type DELETE below:</p>
            <input 
              type="text"
              value={deletePhrase}
              onChange={(e) => setDeletePhrase(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-black/40 border border-rose-500/20 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-rose-500 transition-colors uppercase"
            />
            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={handleDelete}
                disabled={loading || deletePhrase !== 'DELETE'}
                className="px-6 py-2 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:hover:bg-rose-500 text-white rounded-xl font-bold transition-colors text-sm flex items-center justify-center min-w-[120px]"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Delete Forever'}
              </button>
              <button 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletePhrase('');
                  setError(null);
                }}
                disabled={loading}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AboutSettings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white mb-6">About Resona</h2>
      <div className="bg-white/5 rounded-2xl border border-white/5 p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-teal-500/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-teal-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">Resona Studio</h3>
          <p className="text-slate-400 text-sm">Version 2.0.0 (Production Build)</p>
        </div>
        <p className="text-xs text-slate-500 max-w-sm">
          Resona is a premium music and social streaming platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import PlanBadge from './PlanBadge';
import { api, resolveMediaUrl } from '../services/api';
import AuthModal from './AuthModal';
import ChangePasswordModal from './ChangePasswordModal';
import Avatar from './Avatar';
import ImageCropModal from './ImageCropModal';
import {
  User, PlayCircle, Sliders, Bell, Eye, Users, Cast, Globe, Database, Heart,
  Accessibility, HelpCircle, Info, Sparkles, ChevronRight, ChevronLeft, Check,
  Smartphone, Speaker, Tv, X, Shield, Lock, Radio, UploadCloud, BarChart3, MessageSquare, Download, Trash2, Moon, Volume2, Mic, LogIn, LogOut, RefreshCw, FolderLock
} from 'lucide-react';

export default function SettingsView({ onNavigate }) {
  const { user, preferences, updatePreferences, logout, updateProfile, refreshAccountData, refreshPlan, authError, creatorData } = useAuth();
  const [planRequestData, setPlanRequestData] = useState(null);
  const [planRequestView, setPlanRequestView] = useState('summary');
  const [requestedPlan, setRequestedPlan] = useState('');
  const [planRequestError, setPlanRequestError] = useState('');
  const [planRequestBusy, setPlanRequestBusy] = useState(false);
  const [planRequestLoading, setPlanRequestLoading] = useState(false);
  const loadPlanRequest = async () => {
    setPlanRequestLoading(true);
    try { const [requestData] = await Promise.all([api.user.getPlanRequest(), refreshPlan()]); setPlanRequestData(requestData); setPlanRequestError(''); }
    catch (err) { setPlanRequestError(err.message || 'Could not load plan request status.'); }
    finally { setPlanRequestLoading(false); }
  };
  useEffect(() => { if (user?.id) loadPlanRequest(); }, [user?.id, user?.planId]);
  const submitPlanRequest = async () => {
    setPlanRequestBusy(true); setPlanRequestError('');
    try { await api.user.requestPlanChange(requestedPlan); setPlanRequestView('summary'); await loadPlanRequest(); }
    catch (err) { setPlanRequestError(err.message || 'Could not submit plan request.'); }
    finally { setPlanRequestBusy(false); }
  };
  const cancelPlanRequest = async () => {
    if (!planRequestData?.request?.id) return;
    setPlanRequestBusy(true); setPlanRequestError('');
    try { await api.user.cancelPlanRequest(planRequestData.request.id); await loadPlanRequest(); }
    catch (err) { setPlanRequestError(err.message || 'Could not cancel request.'); }
    finally { setPlanRequestBusy(false); }
  };
  const officialPlans = [
    ['resona', 'Resona'], ['resona_silver', 'Resona Silver'], ['resona_gold', 'Resona Gold'], ['resona_platinum', 'Resona Platinum']
  ];
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ name: '', uid: '', phone: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [profileLoadError, setProfileLoadError] = useState('');
  useEffect(() => {
    if (!user?.id) {
      setProfileLoadError(authError || 'Sign in to load your account profile.');
      return;
    }
    setProfileLoadError('');
  }, [user?.id, authError]);

  const openProfileEditor = () => {
    setProfileDraft({ name: user?.name || '', uid: user?.uid || user?.handle || '', phone: user?.phone || '' });
    setProfileError('');
    setEditingProfile(true);
  };
  const saveProfile = async () => {
    setProfileSaving(true);
    setProfileError('');
    try {
      const currentUid = (user?.uid || user?.handle || '').replace(/^@+/, '').toLowerCase();
      const nextUid = profileDraft.uid.trim().replace(/^@+/, '');
      if (!nextUid) throw new Error('UID is required.');
      const check = await api.user.checkUid(nextUid);
      if (!check.valid) throw new Error(check.error || 'UID is invalid');
      if (!check.available) throw new Error('UID already taken');
      await updateProfile({ name: profileDraft.name, uid: nextUid, phone: profileDraft.phone });
      setEditingProfile(false);
      triggerToast('Profile saved');
    } catch (err) { setProfileError(err.message || 'Could not save profile'); }
    finally { setProfileSaving(false); }
  };

  // Navigation subpage state: null = main settings list, string = id of active subpage
  const [activeSubpage, setActiveSubpage] = useState(null);
  const [activeSubSubpage, setActiveSubSubpage] = useState(null); // 'active-sessions'

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);

  // Toast Notification state
  const [toastMsg, setToastMsg] = useState('');
  const triggerToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  // Creator status derived from authoritative backend creatorData
  const isCreator = Boolean(creatorData?.isCreator || creatorData?.status === 'approved');
  const isPendingCreator = creatorData?.status === 'pending';
  const [activeDevice, setActiveDevice] = useState('This Phone');
  const [theme, setTheme] = useState('Dark');
  const [accentColor, setAccentColor] = useState('Teal');
  const [streamingQuality, setStreamingQuality] = useState('High (320kbps)');
  const [crossfade, setCrossfade] = useState('5 seconds');
  const [mobileDataStreaming, setMobileDataStreaming] = useState(true);
  const [autoplay, setAutoplay] = useState(true);
  const [gapless, setGapless] = useState(true);
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [privateProfile, setPrivateProfile] = useState(false);
  const [friendActivityVisible, setFriendActivityVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  // Sync state when preferences are fetched from backend
  useEffect(() => {
    if (preferences) {
      if (preferences.theme) setTheme(preferences.theme);
      if (preferences.accentColor) setAccentColor(preferences.accentColor);
      if (preferences.streamingQuality) setStreamingQuality(preferences.streamingQuality);
      if (preferences.crossfade) setCrossfade(preferences.crossfade);
      if (preferences.mobileDataStreaming !== undefined) setMobileDataStreaming(preferences.mobileDataStreaming);
      if (preferences.autoplay !== undefined) setAutoplay(preferences.autoplay);
      if (preferences.gapless !== undefined) setGapless(preferences.gapless);
      if (preferences.normalizeVolume !== undefined) setNormalizeVolume(preferences.normalizeVolume);
      if (preferences.pushNotifs !== undefined) setPushNotifs(preferences.pushNotifs);
      if (preferences.quietHours !== undefined) setQuietHours(preferences.quietHours);
      if (preferences.privateProfile !== undefined) setPrivateProfile(preferences.privateProfile);
      if (preferences.friendActivityVisible !== undefined) setFriendActivityVisible(preferences.friendActivityVisible);
      if (preferences.reduceMotion !== undefined) setReduceMotion(preferences.reduceMotion);
    }
  }, [preferences]);

  // Load sessions from backend when entering active-sessions
  useEffect(() => {
    if (activeSubSubpage === 'active-sessions') {
      api.user.getSessions()
        .then((data) => setSessionsList(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
  }, [activeSubSubpage]);

  const handlePrefToggle = (key, value) => {
    updatePreferences({ [key]: value }).catch(() => {});
    triggerToast(`Setting saved to your account`);
  };

  // 13 Core Listener Settings Menus + 4 Creator Menus
  const mainMenus = [
    { id: 'account', title: 'Account', desc: 'Manage your account and login details', icon: User },
    { id: 'playback', title: 'Playback', desc: 'Control how music plays', icon: PlayCircle },
    { id: 'audio-quality', title: 'Audio Quality', desc: 'Configure sound and data usage', icon: Sliders },
    { id: 'notifications', title: 'Notifications', desc: 'Choose updates Resona sends', icon: Bell },
    { id: 'privacy', title: 'Privacy', desc: 'Control what other users can see', icon: Eye },
    { id: 'social', title: 'Social', desc: 'Manage social and shared listening behavior', icon: Users },
    { id: 'cast-devices', title: 'Cast & Devices', desc: 'Manage playback across devices', icon: Cast },
    { id: 'language-appearance', title: 'Language & Appearance', desc: 'Personalize app interface and theme', icon: Globe },
    { id: 'data-storage', title: 'Data & Storage', desc: 'Manage downloads and local storage', icon: Database },
    { id: 'music-preferences', title: 'Music Preferences', desc: 'Personalize discovery and recommendations', icon: Heart },
    { id: 'accessibility', title: 'Accessibility', desc: 'Make Resona easier to use', icon: Accessibility },
    { id: 'help-support', title: 'Help & Support', desc: 'Get help, report bugs and feedback', icon: HelpCircle },
    { id: 'about', title: 'About Resona', desc: 'App info, version and acknowledgements', icon: Info }
  ];

  const creatorMenus = [
    { id: 'creator-preferences', title: 'Creator Preferences', desc: 'Public artist profile, display name, notifications', icon: User },
    { id: 'upload-preferences', title: 'Upload Preferences', desc: 'Default metadata, artwork, upload quality', icon: UploadCloud },
    { id: 'song-requests', title: 'Song Requests', desc: 'Review status, request history & preferences', icon: MessageSquare },
    { id: 'creator-hub-settings', title: 'Creator Hub Settings', desc: 'Uploads, release status, analytics', icon: BarChart3 }
  ];

  const currentMenuObj = [...mainMenus, ...creatorMenus].find((m) => m.id === activeSubpage);

  return (
    <div className="space-y-6 pb-24 relative">
      {/* Toast Banner */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-sm glass-panel border border-teal-400 bg-slate-900/90 p-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <Sparkles className="w-5 h-5 text-teal-400 flex-shrink-0" />
          <p className="text-xs font-bold text-white">{toastMsg}</p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBPAGE VIEW MODE (When activeSubpage is not null) */}
      {/* ========================================================================= */}
      {activeSubpage ? (
        <div className="space-y-5">
          {/* Subpage Header with Back Navigation */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <button
              onClick={() => setActiveSubpage(null)}
              className="p-2 rounded-xl glass-card text-slate-300 hover:text-white hover:bg-white/10 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold text-white">{currentMenuObj?.title}</h1>
              <p className="text-[11px] text-slate-400">{currentMenuObj?.desc}</p>
            </div>
          </div>

          {/* SUBPAGE CONTENT PANELS */}
          {/* 1. Account */}
          {activeSubpage === 'account' && (
            activeSubSubpage === 'active-sessions' ? (
              /* SUB-SUBPAGE: LOGGED IN DEVICES & ACTIVE SESSIONS */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setActiveSubSubpage(null)}
                    className="flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:underline"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back to Account
                  </button>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {sessionsList.length || 1} Active Session{sessionsList.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <div className="space-y-2.5">
                  <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Logged In Devices</h4>
                  {(sessionsList.length > 0 ? sessionsList : [
                    { id: 'dev1', deviceName: 'Current Browser Session', location: 'Active Now', isCurrent: true }
                  ]).map((dev) => (
                    <div key={dev.id} className="p-3.5 rounded-2xl glass-card border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/5 text-teal-400">
                          <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-white text-xs">{dev.deviceName}</h5>
                            {dev.isCurrent && (
                              <span className="text-[9px] font-bold uppercase text-slate-950 bg-teal-400 px-2 py-0.5 rounded-full">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{dev.location}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={async () => {
                    await api.user.signOutOthers();
                    setSessionsList(sessionsList.filter((s) => s.isCurrent));
                    triggerToast('Signed out of all other sessions');
                  }}
                  className="w-full py-3 rounded-2xl glass-card border border-rose-500/30 text-rose-400 font-bold text-xs hover:bg-rose-500/10 transition"
                >
                  Sign Out of All Other Devices
                </button>
              </div>
            ) : (
              /* ACCOUNT MAIN SUBPAGE */
              <div className="space-y-3">
                <div className="p-4 rounded-2xl glass-card border border-white/10 space-y-3">
                  {profileLoadError && <div role="alert" className="text-xs text-rose-300">{profileLoadError} <button className="underline" onClick={() => refreshAccountData().catch(err => setProfileLoadError(err.message || 'Could not load profile'))}>Retry</button></div>}
                  <div className="flex items-center gap-3 min-w-0">
                    {user?.avatar ? <img src={resolveMediaUrl(user.avatar)} alt="Avatar" className="w-12 h-12 rounded-full border-2 border-teal-400 object-cover shrink-0" /> : <div className="w-12 h-12 rounded-full border-2 border-teal-400 bg-slate-800 shrink-0 flex items-center justify-center text-teal-300"><User className="w-5 h-5" /></div>}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-sm truncate">{user?.name || 'Name not provided'}</h3>
                      <p className="text-xs text-slate-400 truncate">{user?.uid || user?.handle ? `@${(user.uid || user.handle).toString().replace(/^@+/, '')}` : 'UID not added'}</p>
                    </div>
                    <button onClick={openProfileEditor} className="shrink-0 px-3 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold">Edit Profile</button>
                  </div>
                  {user?.id && editingProfile && <div className="max-h-[65vh] overflow-y-auto mt-3 p-3 rounded-2xl bg-slate-950/60 border border-white/10 space-y-3">
                    <div className="flex gap-4 items-center mb-4">
                      {user?.avatar ? <img src={resolveMediaUrl(user.avatar)} className="w-16 h-16 rounded-full object-cover shrink-0 border border-white/20" /> : <div className="w-16 h-16 rounded-full bg-slate-800 shrink-0 flex items-center justify-center"><User className="w-6 h-6 text-slate-400" /></div>}
                      <div className="flex flex-col gap-2">
                        <label className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg cursor-pointer text-center text-white transition">
                          Change Picture
                          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) { setProfileError('Image must be under 5MB'); return; }
                            setCropImage(file);
                            e.target.value = '';
                          }} />
                        </label>
                        {user?.avatar && <button onClick={async () => {
                          setProfileSaving(true);
                          try {
                            await api.user.removeProfilePicture();
                            await refreshAccountData();
                            triggerToast('Profile picture removed');
                          } catch (err) { setProfileError(err.message); } finally { setProfileSaving(false); }
                        }} className="text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg bg-rose-500/10 transition">Remove</button>}
                      </div>
                    </div>
                    {[['Display Name','name'],['UID','uid'],['Phone','phone']].map(([label,key]) => <label key={key} className="block text-xs text-slate-400">{label}{key==='phone' && ' (optional)'}<input value={profileDraft[key]} onChange={e=>setProfileDraft(d=>({...d,[key]:e.target.value}))} className="mt-1 w-full min-w-0 bg-slate-900 border border-slate-700 text-white rounded-xl px-3 py-2 text-sm" /></label>)}
                    <p className="text-[11px] text-slate-400">Email: {user?.email || 'Not provided'} (managed by your sign-in provider)</p>
                    {profileError && <p role="alert" className="text-xs text-rose-300">{profileError}</p>}
                    <div className="flex gap-2 sticky bottom-0 bg-slate-950 py-2"><button onClick={()=>{setEditingProfile(false);setProfileError('');}} className="flex-1 py-2 rounded-xl border border-white/10 text-slate-200">Cancel</button><button disabled={profileSaving} onClick={saveProfile} className="flex-1 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold">{profileSaving?'Saving…':'Save Changes'}</button></div>
                  </div>}
                  <section className="p-4 rounded-2xl bg-slate-950/50 border border-teal-500/20 space-y-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">Your Resona Plan</h4>
                      {planRequestLoading ? <p className="mt-2 text-sm text-slate-400">Loading plan…</p> : user?.planId ? <PlanBadge plan={user.planId} className="inline-block mt-2 text-lg font-black text-teal-300" /> : <p className="mt-2 text-sm text-rose-300">Plan unavailable. Retry to load it.</p>}
                      <p className="text-[11px] text-slate-400 mt-1">Active plan · Features available with your current plan.</p>
                    </div>
                    {planRequestError && <p role="alert" className="text-xs text-rose-300">{planRequestError} <button onClick={loadPlanRequest} className="underline">Retry</button></p>}
                    {planRequestData?.request?.status === 'pending' ? <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-3 space-y-2 text-xs">
                      <p className="font-bold text-amber-200">Plan change request pending</p>
                      <p className="text-slate-300">Current plan: <PlanBadge plan={planRequestData.request.currentPlan} /></p>
                      <p className="text-slate-300">Requested plan: <PlanBadge plan={planRequestData.request.requestedPlan} /></p>
                      <p className="text-slate-400">Submitted: {new Date(planRequestData.request.createdAt).toLocaleString()}</p>
                      <button disabled={planRequestBusy} onClick={cancelPlanRequest} className="px-3 py-2 rounded-lg border border-white/10 text-slate-200 disabled:opacity-50">Cancel Request</button>
                    </div> : planRequestView === 'request' ? <div className="max-h-[55vh] overflow-y-auto rounded-xl bg-slate-900/70 border border-white/10 p-3 space-y-3">
                      <p className="text-sm font-bold text-white">Request a plan change</p>
                      <p className="text-xs text-slate-300">Current plan: <PlanBadge plan={user?.planId} /></p>
                      <div className="space-y-2">{officialPlans.map(([id, name]) => <label key={id} className={`flex items-center gap-3 rounded-lg p-2 text-sm ${id === user?.planId ? 'text-slate-500' : 'text-slate-200'}`}>
                        <input type="radio" name="requestedPlan" value={id} disabled={id === user?.planId || planRequestBusy} checked={requestedPlan === id} onChange={() => setRequestedPlan(id)} />
                        {name}{id === user?.planId && <span className="ml-auto text-[10px]">Current plan</span>}
                      </label>)}</div>
                      <div className="flex gap-2"><button onClick={() => setPlanRequestView('summary')} className="flex-1 py-2 rounded-lg border border-white/10 text-slate-200">Cancel</button><button onClick={submitPlanRequest} disabled={!requestedPlan || requestedPlan === user?.planId || planRequestBusy} className="flex-1 py-2 rounded-lg bg-teal-500 text-slate-950 font-bold disabled:opacity-50">{planRequestBusy ? 'Submitting…' : 'Submit Request'}</button></div>
                    </div> : <button disabled={!user?.planId || !planRequestData || planRequestBusy} onClick={() => { setRequestedPlan(''); setPlanRequestView('request'); }} className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold disabled:opacity-50">Request Plan Change</button>}
                    {planRequestData?.request && ['approved','rejected'].includes(planRequestData.request.status) && <p className="text-xs text-slate-300">Last request {planRequestData.request.status}. {planRequestData.request.adminNote || ''}</p>}
                  </section>
                  <div className="space-y-2 pt-2 border-t border-white/10 text-xs text-slate-300">
                    <div className="flex justify-between py-1 border-b border-white/5 gap-2">
                      <span className="shrink-0">Email</span>
                      <span className="font-semibold text-white truncate max-w-[200px] sm:max-w-none text-right">{user?.email || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>Phone</span>
                      <span className="font-semibold text-white">{user?.phone || 'Not added'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-white/5">
                      <span>Security</span>
                      <span className="font-semibold text-teal-400">Password managed by sign-in provider</span>
                    </div>
                  </div>
                </div>

                {/* Storage Partition Indicator */}
                <div className="p-3.5 rounded-2xl glass-card border border-teal-500/30 bg-teal-950/20 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-teal-400 font-bold">
                    <FolderLock className="w-4 h-4" />
                    <span>Isolated Data Storage Partition</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    User ID: <span className="font-mono text-teal-300 font-bold">{user?.id || 'Unknown'}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono break-all">
                    Partition: server/data/accounts/{user?.id || '...'}/
                  </p>
                  <div className="flex gap-1.5 flex-wrap pt-1 text-[9px] font-mono text-teal-300">
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">profile.json</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">preferences.json</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">shelf.json</span>
                    <span className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10">creator.json</span>
                  </div>
                </div>

                {/* Submenu item: Active Sessions & Logged in Devices */}
                <button
                  onClick={() => setActiveSubSubpage('active-sessions')}
                  className="w-full p-3.5 rounded-2xl glass-card text-left text-xs font-bold text-white hover:bg-white/10 flex justify-between items-center transition group border border-teal-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-white group-hover:text-teal-300">Active Sessions</p>
                      <p className="text-[10px] font-normal text-slate-400">View logged-in devices & sessions</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                </button>

                {/* Change Password (with bcrypt hashing) */}
                <button
                  onClick={() => setShowChangePassModal(true)}
                  className="w-full p-3 rounded-2xl glass-card text-left text-xs font-bold text-white hover:bg-white/10 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <Lock className="w-4 h-4 text-teal-400" />
                    <span>Change Password (Bcrypt Encrypted)</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                {/* Switch Account */}
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full p-3 rounded-2xl glass-card text-left text-xs font-bold text-teal-300 hover:bg-white/10 flex justify-between items-center border border-teal-500/30"
                >
                  <div className="flex items-center gap-2.5">
                    <RefreshCw className="w-4 h-4 text-teal-400" />
                    <span>Switch or Add Account</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-teal-400" />
                </button>

                {/* Sign Out */}
                <button
                  onClick={async () => {
                    await logout();
                    triggerToast('Signed out of Resona');
                    setShowAuthModal(true);
                  }}
                  className="w-full p-3 rounded-2xl glass-card text-left text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex justify-between items-center"
                >
                  <div className="flex items-center gap-2.5">
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Sign Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            )
          )}

          {/* 2. Playback */}
          {activeSubpage === 'playback' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div><p className="font-bold text-white text-xs">Autoplay similar songs</p><p className="text-[10px] text-slate-400">Keep listening when music ends</p></div>
                <input type="checkbox" checked={autoplay} onChange={() => setAutoplay(!autoplay)} className="accent-teal-400 w-4 h-4" />
              </div>

              <div className="p-3.5 rounded-2xl glass-card space-y-1">
                <label className="font-bold text-white text-xs block">Crossfade between tracks</label>
                <select value={crossfade} onChange={(e) => setCrossfade(e.target.value)} className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white">
                  <option value="Off">Off</option>
                  <option value="3 seconds">3 seconds</option>
                  <option value="5 seconds">5 seconds</option>
                  <option value="12 seconds">12 seconds</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div><p className="font-bold text-white text-xs">Gapless playback</p><p className="text-[10px] text-slate-400">Continuous album playback</p></div>
                <input type="checkbox" checked={gapless} onChange={() => setGapless(!gapless)} className="accent-teal-400 w-4 h-4" />
              </div>

              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div><p className="font-bold text-white text-xs">Normalize playback volume</p><p className="text-[10px] text-slate-400">Set uniform volume for all tracks</p></div>
                <input type="checkbox" checked={normalizeVolume} onChange={() => setNormalizeVolume(!normalizeVolume)} className="accent-teal-400 w-4 h-4" />
              </div>
            </div>
          )}

          {/* 3. Audio Quality */}
          {activeSubpage === 'audio-quality' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl glass-card space-y-1">
                <label className="font-bold text-white text-xs block">Streaming quality</label>
                <select value={streamingQuality} onChange={(e) => setStreamingQuality(e.target.value)} className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white">
                  <option value="Low">Low (96kbps)</option>
                  <option value="Normal">Normal (160kbps)</option>
                  <option value="High (320kbps)">High (320kbps)</option>
                  <option value="Original">Original Lossless (24-bit FLAC)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div><p className="font-bold text-white text-xs">Stream using mobile data</p><p className="text-[10px] text-slate-400">Allow streaming over cellular network</p></div>
                <input type="checkbox" checked={mobileDataStreaming} onChange={() => setMobileDataStreaming(!mobileDataStreaming)} className="accent-teal-400 w-4 h-4" />
              </div>

              <button onClick={() => triggerToast('Equalizer presets updated')} className="w-full p-3.5 rounded-2xl glass-card flex justify-between items-center text-xs font-bold text-white">
                <span>Equalizer & Custom Presets</span><ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          )}

          {/* 4. Notifications */}
          {activeSubpage === 'notifications' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold mb-1">Choose which updates Resona sends.</p>

              {/* Controls */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-teal-500/20">
                <h4 className="font-bold text-xs text-teal-400 uppercase tracking-wider">Channel & Master Controls</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Push Notifications</p><p className="text-[10px] text-slate-400">Mobile device push alerts</p></div>
                  <input type="checkbox" checked={pushNotifs} onChange={() => setPushNotifs(!pushNotifs)} className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Email Notifications</p><p className="text-[10px] text-slate-400">Updates sent to {user?.email || 'your registered email'}</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">In-App Notification Banner</p><p className="text-[10px] text-slate-400">Banners while using app</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
              </div>

              {/* Updates list */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Activity & Music Updates</h4>

                {[
                  { title: 'New music from followed artists', desc: 'Alerts when artists you follow release new tracks' },
                  { title: 'New followers and friend requests', desc: 'Alerts when someone follows or adds you' },
                  { title: 'Friend activity', desc: 'Alerts when friends start listening or create playlists' },
                  { title: 'Fusion invitations', desc: 'Alerts when invited to join a Fusion shared mix' },
                  { title: 'Huddle invitations and messages', desc: 'Alerts for real-time listening room invites' },
                  { title: 'Song request status', desc: 'Updates on song requests submitted to creators' },
                  { title: 'Creator upload and review updates', desc: 'Status alerts for your track uploads' },
                  { title: 'Soundprint availability', desc: 'Alerts when your yearly recap is ready' },
                  { title: 'System announcements', desc: 'Important product updates and feature releases' }
                ].map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl glass-card flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-xs">{item.title}</p>
                      <p className="text-[10px] text-slate-400">{item.desc}</p>
                    </div>
                    <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                  </div>
                ))}
              </div>

              {/* Quiet Hours */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between border border-purple-500/20">
                <div>
                  <p className="font-bold text-white text-xs">Quiet hours</p>
                  <p className="text-[10px] text-slate-400">Silence all notification sounds between 10 PM - 7 AM</p>
                </div>
                <input type="checkbox" checked={quietHours} onChange={() => setQuietHours(!quietHours)} className="accent-purple-400 w-4 h-4 cursor-pointer" />
              </div>
            </div>
          )}

          {/* 5. Privacy */}
          {activeSubpage === 'privacy' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold mb-1">Control what other users can see.</p>

              {/* Profile Visibility */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-teal-500/20">
                <h4 className="font-bold text-xs text-teal-400 uppercase tracking-wider">Profile Visibility</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Public or private profile</p><p className="text-[10px] text-slate-400">Make profile visible to Everyone or Friends only</p></div>
                  <input type="checkbox" checked={privateProfile} onChange={() => setPrivateProfile(!privateProfile)} className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Manage profile visibility</p><p className="text-[10px] text-slate-400">Search engine indexing and discovery</p></div>
                  <span className="text-xs font-bold text-teal-400">Standard</span>
                </div>
              </div>

              {/* Activity & Content Privacy */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-white/10">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Listening Activity & Content</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Show or hide listening activity</p><p className="text-[10px] text-slate-400">Broadcast live playing track to friends</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Show or hide recently played music</p><p className="text-[10px] text-slate-400">Display recent history on profile</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Show or hide playlists on profile</p><p className="text-[10px] text-slate-400">Public visibility for your custom playlists</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
              </div>

              {/* Interaction Permissions */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-white/10">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Interaction Controls</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="font-bold text-white text-xs">Control who can follow you</span>
                  <select className="bg-slate-900 border border-white/10 text-xs text-white p-1 rounded-lg">
                    <option value="Everyone">Everyone</option>
                    <option value="Approved">Approved Request</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="font-bold text-white text-xs">Control who can send friend requests</span>
                  <select className="bg-slate-900 border border-white/10 text-xs text-white p-1 rounded-lg">
                    <option value="Everyone">Everyone</option>
                    <option value="Friends of Friends">Friends of Friends</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="font-bold text-white text-xs">Control who can invite you to Fusion or Huddle</span>
                  <select className="bg-slate-900 border border-white/10 text-xs text-white p-1 rounded-lg">
                    <option value="Friends Only">Friends Only</option>
                    <option value="Everyone">Everyone</option>
                  </select>
                </div>
              </div>

              {/* Blocked Users & Legal */}
              <button onClick={() => triggerToast('Blocked users list: 0 users blocked')} className="w-full p-3.5 rounded-2xl glass-card text-xs font-bold text-white text-left flex justify-between items-center">
                <span>Blocked users list</span><ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              <button onClick={() => triggerToast('Data archive download link requested!')} className="w-full p-3.5 rounded-2xl glass-card text-xs font-bold text-teal-400 text-left flex justify-between items-center">
                <span>Download a copy of your account data</span><Download className="w-4 h-4 text-teal-400" />
              </button>

              <button onClick={() => triggerToast('Opening Privacy Policy...')} className="w-full p-3.5 rounded-2xl glass-card text-xs font-bold text-slate-300 text-left flex justify-between items-center">
                <span>Privacy policy</span><ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          )}

          {/* 6. Social */}
          {activeSubpage === 'social' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold mb-1">Manage social and shared listening behavior.</p>

              {/* Listening & Activity Visibility */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-teal-500/20">
                <h4 className="font-bold text-xs text-teal-400 uppercase tracking-wider">Listening Activity</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Friend activity visibility</p><p className="text-[10px] text-slate-400">Show what your friends are listening to in Pulse & Social</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Automatically share listening activity</p><p className="text-[10px] text-slate-400">Broadcast your playing track in real-time</p></div>
                  <input type="checkbox" checked={friendActivityVisible} onChange={() => setFriendActivityVisible(!friendActivityVisible)} className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
              </div>

              {/* Invitation & Experience Permissions */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-white/10">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Shared Experiences & Invites</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="font-bold text-white text-xs">Default Fusion invitation permissions</span>
                  <select className="bg-slate-900 border border-white/10 text-xs text-white p-1 rounded-lg">
                    <option value="Friends Only">Friends Only</option>
                    <option value="Everyone">Everyone</option>
                    <option value="Nobody">Nobody</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <span className="font-bold text-white text-xs">Default Huddle invitation permissions</span>
                  <select className="bg-slate-900 border border-white/10 text-xs text-white p-1 rounded-lg">
                    <option value="Friends Only">Friends Only</option>
                    <option value="Everyone">Everyone</option>
                  </select>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Allow others to add you to shared experiences</p><p className="text-[10px] text-slate-400">Automatic opt-in for group mixes</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
              </div>

              {/* Huddle & Sharing Preferences */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-white/10">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Messages & Sharing</h4>
                <button onClick={() => triggerToast('Huddle message filter: All messages enabled')} className="w-full text-left flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Huddle message preferences</p><p className="text-[10px] text-slate-400">Control live chat visibility in listening rooms</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
                <button onClick={() => triggerToast('Sharing preferences: Public link with Beat Code')} className="w-full text-left flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Sharing preferences for songs and playlists</p><p className="text-[10px] text-slate-400">Default share method & link formatting</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              {/* Manage Friends & Followers */}
              <button onClick={() => onNavigate('social')} className="w-full p-3.5 rounded-2xl glass-card text-xs font-bold text-teal-400 text-left flex justify-between items-center">
                <div><p className="font-bold text-teal-400 text-xs">Manage friends and connections</p><p className="text-[10px] text-slate-400">View connected users & invitations</p></div>
                <ChevronRight className="w-4 h-4 text-teal-400" />
              </button>
            </div>
          )}

          {/* 7. Cast & Devices */}
          {activeSubpage === 'cast-devices' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold mb-1">Manage playback across devices.</p>

              {/* Currently Connected Device & Connect/Disconnect */}
              <div className="p-4 rounded-2xl glass-card border border-teal-500/30 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Currently Connected Device</span>
                    <p className="font-extrabold text-white text-base mt-0.5">{activeDevice}</p>
                    <p className="text-[10px] text-slate-400">Playing on this device • Resona Connect</p>
                  </div>
                  <button
                    onClick={() => triggerToast(activeDevice === 'This Phone' ? 'Connected to This Phone' : `Disconnected from ${activeDevice}`)}
                    className="px-3 py-1.5 rounded-xl glass-card border border-white/10 text-xs font-bold text-teal-400 hover:bg-white/10"
                  >
                    {activeDevice === 'This Phone' ? 'Connected' : 'Disconnect'}
                  </button>
                </div>
              </div>

              {/* Available Cast Devices */}
              <div className="space-y-2">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Available Cast Devices</h4>
                {[
                  { name: 'This Phone', type: 'Local Speaker', icon: Smartphone },
                  { name: 'Living Room Speaker', type: 'Bluetooth Speaker', icon: Speaker },
                  { name: 'Bedroom TV', type: 'Chromecast / AirPlay', icon: Tv }
                ].map((d) => {
                  const Icon = d.icon;
                  const isConnected = activeDevice === d.name;
                  return (
                    <div
                      key={d.name}
                      onClick={() => {
                        setActiveDevice(d.name);
                        triggerToast(`Switched playback to ${d.name}`);
                      }}
                      className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                        isConnected ? 'glass-panel border-teal-400/80 bg-teal-500/10' : 'glass-card border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-white/5 text-teal-400">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-xs">{d.name}</p>
                          <p className="text-[10px] text-slate-400">{d.type}</p>
                        </div>
                      </div>
                      {isConnected ? (
                        <span className="text-[10px] font-bold text-teal-400 bg-teal-500/20 px-2.5 py-1 rounded-full">Connected</span>
                      ) : (
                        <button className="text-[10px] font-semibold text-slate-400 hover:text-white">Tap to Connect</button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Handoff & Discovery Controls */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-white/10">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Discovery & Handoff</h4>
                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Device playback handoff</p><p className="text-[10px] text-slate-400">Automatically transfer queue when near active device</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
                <div className="flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Allow or restrict device discovery</p><p className="text-[10px] text-slate-400">Let local Wi-Fi devices discover this phone</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>
              </div>

              {/* Remembered & Connected Devices Management */}
              <div className="space-y-2">
                <button onClick={() => triggerToast('Remembered devices list: 3 devices stored')} className="w-full p-3.5 rounded-2xl glass-card text-xs font-bold text-white text-left flex justify-between items-center">
                  <div><p className="font-bold text-white text-xs">Manage remembered devices</p><p className="text-[10px] text-slate-400">View & edit saved Cast destinations</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>

                <button onClick={() => triggerToast('Previously connected devices cleared!')} className="w-full p-3.5 rounded-2xl glass-card text-xs font-bold text-rose-400 text-left flex justify-between items-center hover:bg-rose-500/10">
                  <div><p className="font-bold text-rose-400 text-xs">Remove previously connected devices</p><p className="text-[10px] text-slate-400">Clear device connection history</p></div>
                  <Trash2 className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            </div>
          )}

          {/* 8. Language & Appearance */}
          {activeSubpage === 'language-appearance' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 font-semibold mb-1">Personalize the app's interface.</p>

              {/* Language & Theme Selectors */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-teal-500/20">
                <h4 className="font-bold text-xs text-teal-400 uppercase tracking-wider">Language & Theme</h4>

                {/* App Language */}
                <div className="space-y-1 py-1 border-b border-white/5">
                  <label className="font-bold text-white text-xs block">App language</label>
                  <select className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white">
                    <option value="English">English (US)</option>
                    <option value="Spanish">Español</option>
                    <option value="French">Français</option>
                    <option value="German">Deutsch</option>
                    <option value="Hindi">हिन्दी (Hindi)</option>
                    <option value="Japanese">日本語 (Japanese)</option>
                  </select>
                </div>

                {/* Light, dark, or system theme */}
                <div className="space-y-1 py-1">
                  <label className="font-bold text-white text-xs block">Light, dark, or system theme</label>
                  <select value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white">
                    <option value="Dark">Dark Theme (Default)</option>
                    <option value="Light">Light Theme</option>
                    <option value="System">Match System Theme</option>
                  </select>
                </div>
              </div>

              {/* Accent Color Palette */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2 border border-white/10">
                <label className="font-bold text-white text-xs block">Accent color</label>
                <div className="flex justify-between items-center pt-1">
                  {[
                    { name: 'Teal', color: '#10b981' },
                    { name: 'Cyan', color: '#06b6d4' },
                    { name: 'Purple', color: '#a855f7' },
                    { name: 'Pink', color: '#ec4899' },
                    { name: 'Amber', color: '#f59e0b' }
                  ].map((ac) => (
                    <button
                      key={ac.name}
                      onClick={() => {
                        setAccentColor(ac.name);
                        triggerToast(`Accent color set to ${ac.name}`);
                      }}
                      style={{ backgroundColor: ac.color }}
                      className={`w-7 h-7 rounded-full transition border-2 ${
                        accentColor === ac.name ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Animation & Display Options */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3 border border-white/10">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Animation & Display</h4>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Interface animation preferences</p><p className="text-[10px] text-slate-400">Smooth transitions and page animations</p></div>
                  <input type="checkbox" defaultChecked className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>

                <div className="flex justify-between items-center py-1 border-b border-white/5">
                  <div><p className="font-bold text-white text-xs">Reduce motion</p><p className="text-[10px] text-slate-400">Disable heavy UI transitions</p></div>
                  <input type="checkbox" checked={reduceMotion} onChange={() => setReduceMotion(!reduceMotion)} className="accent-teal-400 w-4 h-4 cursor-pointer" />
                </div>

                <div className="space-y-1 py-1 border-b border-white/5">
                  <label className="font-bold text-white text-xs block">Text size</label>
                  <select className="w-full p-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white">
                    <option value="Small">Small (90%)</option>
                    <option value="Normal">Normal (Default)</option>
                    <option value="Large">Large (110%)</option>
                  </select>
                </div>

                <button onClick={() => triggerToast('Display layout options: Glassmorphism enabled')} className="w-full text-left flex justify-between items-center py-1">
                  <div><p className="font-bold text-white text-xs">Display options</p><p className="text-[10px] text-slate-400">Glassmorphism blur intensity & density</p></div>
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
          )}

          {/* 9. Data & Storage */}
          {activeSubpage === 'data-storage' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Manage downloads and local storage.</p>
              
              {/* 1. Downloaded songs and playlists */}
              <div className="p-3.5 rounded-2xl glass-card flex justify-between items-center">
                <div>
                  <p className="font-bold text-white text-xs">Downloaded songs and playlists</p>
                  <p className="text-[10px] text-slate-400">46 songs • 3 playlists stored offline</p>
                </div>
                <button onClick={() => triggerToast('Opening downloaded media list...')} className="px-3 py-1.5 rounded-xl bg-white/10 text-teal-400 font-bold text-xs">
                  Manage
                </button>
              </div>

              {/* 2. Storage used by downloads */}
              <div className="p-4 rounded-2xl glass-card space-y-3">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white text-xs">Storage used by downloads</p>
                    <p className="text-[10px] text-slate-400">High-quality audio files & artwork</p>
                  </div>
                  <span className="font-extrabold text-teal-400 text-sm">1.2 GB</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden flex">
                  <div className="bg-teal-400 h-full" style={{ width: '45%' }}></div>
                  <div className="bg-purple-500 h-full" style={{ width: '25%' }}></div>
                  <div className="bg-slate-600 h-full" style={{ width: '30%' }}></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span> Downloads (1.2GB)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Cache (540MB)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600"></span> Free (4.2GB)</span>
                </div>
              </div>

              {/* 3 & 4. Clear cache & Clear temporary files */}
              <div className="space-y-2">
                <button onClick={() => triggerToast('App Cache cleared! (320 MB freed)')} className="w-full p-3.5 rounded-2xl glass-card flex justify-between items-center text-xs font-bold text-slate-200">
                  <div className="text-left">
                    <p className="font-bold text-white">Clear cache</p>
                    <p className="text-[10px] text-slate-400 font-normal">Frees cached images, artwork & metadata (320 MB)</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-amber-400" />
                </button>

                <button onClick={() => triggerToast('Temporary files cleared! (220 MB freed)')} className="w-full p-3.5 rounded-2xl glass-card flex justify-between items-center text-xs font-bold text-slate-200">
                  <div className="text-left">
                    <p className="font-bold text-white">Clear temporary files</p>
                    <p className="text-[10px] text-slate-400 font-normal">Removes temporary stream chunks & log buffers (220 MB)</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-amber-400" />
                </button>
              </div>

              {/* 5. Download location, where supported */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <div>
                  <p className="font-bold text-white text-xs">Download location, where supported</p>
                  <p className="text-[10px] text-slate-400">Select target storage for offline audio files</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => triggerToast('Download location set to Internal Storage')} className="p-2.5 rounded-xl border border-teal-500/50 bg-teal-500/10 text-teal-400 font-bold text-xs text-center">
                    Internal Storage
                  </button>
                  <button onClick={() => triggerToast('Download location set to SD Card')} className="p-2.5 rounded-xl border border-white/10 glass-card text-slate-300 font-bold text-xs text-center">
                    SD Card
                  </button>
                </div>
              </div>

              {/* 6. Automatic cache cleanup */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Automatic cache cleanup</p>
                  <p className="text-[10px] text-slate-400">Automatically clear cache when storage drops below 1 GB</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Auto Cache Cleanup Enabled' : 'Auto Cache Cleanup Disabled')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 7. Offline mode */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between border border-teal-500/30 bg-teal-500/5">
                <div>
                  <p className="font-bold text-white text-xs">Offline mode</p>
                  <p className="text-[10px] text-slate-400">Only play downloaded songs; disable online streaming</p>
                </div>
                <input type="checkbox" onChange={(e) => triggerToast(e.target.checked ? 'Offline Mode Activated' : 'Offline Mode Disabled')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 8. Wi-Fi-only download option */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Wi-Fi-only download option</p>
                  <p className="text-[10px] text-slate-400">Restrict song downloads to Wi-Fi connections only</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Wi-Fi-only downloads active' : 'Downloads allowed over cellular')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 9. Clear playback history */}
              <button onClick={() => triggerToast('Playback history cleared!')} className="w-full p-3.5 rounded-2xl glass-card flex justify-between items-center text-xs font-bold text-rose-400 border border-rose-500/20">
                <div className="text-left">
                  <p className="font-bold text-rose-400">Clear playback history</p>
                  <p className="text-[10px] text-slate-400 font-normal">Wipes all recent listening logs and played track records</p>
                </div>
                <Trash2 className="w-4 h-4 text-rose-400" />
              </button>
            </div>
          )}

          {/* 10. Music Preferences */}
          {activeSubpage === 'music-preferences' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Personalize discovery and recommendations.</p>

              {/* 1. Favorite genres and artists */}
              <div className="p-3.5 rounded-2xl glass-card space-y-3">
                <div>
                  <p className="font-bold text-white text-xs">Favorite genres and artists</p>
                  <p className="text-[10px] text-slate-400">Select music styles & artists to boost in recommendations</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['Lo-Fi Chill', 'Synthwave', 'Indie Acoustic', 'K-Pop', 'Cyberpunk Electro'].map((g, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                      {g} <button onClick={() => triggerToast(`Removed ${g}`)} className="hover:text-white">×</button>
                    </span>
                  ))}
                  <button onClick={() => triggerToast('Opening genre & artist picker...')} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                    + Add Favorite
                  </button>
                </div>
              </div>

              {/* 2. Preferred languages */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <div>
                  <p className="font-bold text-white text-xs">Preferred languages</p>
                  <p className="text-[10px] text-slate-400">Music & lyrics audio language selection</p>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {['English', 'Hindi', 'Spanish', 'Japanese'].map((lang, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                      {lang} <button onClick={() => triggerToast(`Removed ${lang}`)} className="hover:text-white">×</button>
                    </span>
                  ))}
                  <button onClick={() => triggerToast('Language picker opened...')} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                    + Add Language
                  </button>
                </div>
              </div>

              {/* 3. Explicit-content filtering */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Explicit-content filtering</p>
                  <p className="text-[10px] text-slate-400">Allow playback of tracks containing explicit lyrics</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Explicit content allowed' : 'Explicit content blocked')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 4. Excluded artists and tracks */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Excluded artists and tracks</p>
                  <p className="text-[10px] text-slate-400">Manage 2 hidden artists & 5 blocked tracks</p>
                </div>
                <button onClick={() => triggerToast('Opening excluded list...')} className="px-3 py-1.5 rounded-xl bg-white/10 text-teal-400 font-bold text-xs">
                  Manage Exclusions
                </button>
              </div>

              {/* 5. Manage listening history used for recommendations */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Manage listening history for recommendations</p>
                  <p className="text-[10px] text-slate-400">Use recent song plays to tune algorithm</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Listening history recommendation active' : 'Listening history unlinked from algorithm')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 6. Reset or refresh recommendations */}
              <button onClick={() => triggerToast('Recommendation engine refreshed!')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-xs flex justify-between items-center border border-teal-500/30">
                <div>
                  <p className="font-bold text-teal-400">Reset or refresh recommendations</p>
                  <p className="text-[10px] font-normal text-slate-400">Re-evaluate taste profile and generate fresh daily mixes</p>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-400" />
              </button>

              {/* 7. Manage muted or disliked tracks */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Manage muted or disliked tracks</p>
                  <p className="text-[10px] text-slate-400">12 tracks marked as "Don't play this again"</p>
                </div>
                <button onClick={() => triggerToast('Opening disliked tracks list...')} className="px-3 py-1.5 rounded-xl bg-white/10 text-teal-400 font-bold text-xs">
                  View List (12)
                </button>
              </div>
            </div>
          )}

          {/* 11. Accessibility */}
          {activeSubpage === 'accessibility' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">Make Resona easier to use.</p>

              {/* 1. Reduce motion */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Reduce motion</p>
                  <p className="text-[10px] text-slate-400">Minimize interface animations and parallax transitions</p>
                </div>
                <input type="checkbox" checked={reduceMotion} onChange={() => { setReduceMotion(!reduceMotion); triggerToast(reduceMotion ? 'Animations enabled' : 'Motion reduced'); }} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 2. Larger text */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-white text-xs">Larger text</p>
                    <p className="text-[10px] text-slate-400">Increase font scale for UI labels and song titles</p>
                  </div>
                  <span className="text-xs font-bold text-teal-400">{textSize}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {['Normal', 'Large', 'Extra Large'].map((size) => (
                    <button key={size} onClick={() => { setTextSize(size); triggerToast(`Text size: ${size}`); }} className={`p-2 rounded-xl text-xs font-bold ${textSize === size ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-900 border border-white/5 text-slate-400'}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Screen reader support */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Screen reader support</p>
                  <p className="text-[10px] text-slate-400">Optimize ARIA labels, focus states & voiceover cues</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Screen Reader optimization ON' : 'Screen Reader optimization OFF')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 4. High-contrast interface */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">High-contrast interface</p>
                  <p className="text-[10px] text-slate-400">Enhance background-to-text visual contrast for outdoor viewing</p>
                </div>
                <input type="checkbox" onChange={(e) => triggerToast(e.target.checked ? 'High-contrast mode enabled' : 'High-contrast mode disabled')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 5. Captions and lyrics display preferences */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <div>
                  <p className="font-bold text-white text-xs">Captions and lyrics display preferences</p>
                  <p className="text-[10px] text-slate-400">Customize lyrics font size, highlight color & auto-scroll</p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => triggerToast('Lyrics font set to Bold High Contrast')} className="p-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300">
                    High-Vis Lyrics
                  </button>
                  <button onClick={() => triggerToast('Auto-scroll synchronized lyrics ON')} className="p-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-bold text-slate-300">
                    Auto-Scroll Lyrics
                  </button>
                </div>
              </div>

              {/* 6. Haptic feedback */}
              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Haptic feedback</p>
                  <p className="text-[10px] text-slate-400">Provide subtle tactile vibration pulses on tap and seek</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Haptic feedback ON' : 'Haptic feedback OFF')} className="accent-teal-400 w-4 h-4" />
              </div>

              {/* 7. Animation and visual effect controls */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <div>
                  <p className="font-bold text-white text-xs">Animation and visual effect controls</p>
                  <p className="text-[10px] text-slate-400">Control vinyl spinning, background pulse glow & glass blurs</p>
                </div>
                <div className="space-y-2 pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-300">Background Glow & Wave Pulse</span>
                    <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Background glow ON' : 'Background glow OFF')} className="accent-teal-400 w-4 h-4" />
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-xs text-slate-300">Rotating Album Vinyl Disc</span>
                    <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Vinyl rotation ON' : 'Vinyl rotation OFF')} className="accent-teal-400 w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 12. Help & Support */}
          {activeSubpage === 'help-support' && (
            <div className="space-y-4 text-xs">
              <p className="text-xs text-slate-400">Get help, report issues, and access support resources.</p>

              {/* 1. Help Center & FAQ */}
              <button onClick={() => triggerToast('Opening Help Center & Knowledge Base...')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">Help Center & FAQ</p>
                  <p className="text-[10px] font-normal text-slate-400">Search guides, playback troubleshooting & feature tutorials</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 2. Contact support */}
              <button onClick={() => triggerToast('Launching 24/7 Live Support Chat...')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-teal-400">Contact support</p>
                  <p className="text-[10px] font-normal text-slate-400">Chat with Resona customer service agents (24/7)</p>
                </div>
                <ChevronRight className="w-4 h-4 text-teal-400" />
              </button>

              {/* 3. Report a problem */}
              <button onClick={() => triggerToast('Report a problem form opened')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-amber-400">Report a problem</p>
                  <p className="text-[10px] font-normal text-slate-400">Report audio playback glitches, app crashes, or broken links</p>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>

              {/* 4. Community and feedback */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <p className="font-bold text-white text-xs">Community and feedback</p>
                <p className="text-[10px] text-slate-400">Join creator discussions and request new Resona features</p>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => triggerToast('Redirecting to Resona Discord Community...')} className="flex-1 p-2 rounded-xl bg-indigo-500/20 text-indigo-300 font-semibold text-center text-[11px] border border-indigo-500/30">
                    Discord Community
                  </button>
                  <button onClick={() => triggerToast('Feature request portal opened...')} className="flex-1 p-2 rounded-xl bg-purple-500/20 text-purple-300 font-semibold text-center text-[11px] border border-purple-500/30">
                    Feature Requests
                  </button>
                </div>
              </div>

              {/* 5. System status & App logs */}
              <div className="p-3.5 rounded-2xl glass-card flex justify-between items-center">
                <div>
                  <p className="font-bold text-white text-xs">System status & diagnostics</p>
                  <p className="text-[10px] text-slate-400">All Resona streaming servers operational (100%)</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-bold border border-teal-500/30">Operational</span>
              </div>
            </div>
          )}

          {/* 13. About Resona */}
          {activeSubpage === 'about' && (
            <div className="space-y-4 py-2 text-xs">
              <p className="text-xs text-slate-400 text-center">App information and acknowledgements.</p>

              <div className="text-center space-y-2">
                <img src="/branding/resona-icon.png" alt="Resona" className="w-16 h-16 object-contain mx-auto drop-shadow-xl" />
                <div>
                  <h2 className="font-extrabold text-white text-lg">Resona</h2>
                  <p className="text-xs text-slate-400">Music That Feels Like You</p>
                </div>
              </div>

              {/* 1. App version */}
              <div className="p-3.5 rounded-2xl glass-card flex justify-between items-center">
                <div>
                  <p className="font-bold text-white text-xs">App version</p>
                  <p className="text-[10px] text-slate-400">Build 2026.10.01-Release</p>
                </div>
                <span className="font-mono text-xs font-bold text-teal-400">v2.4.0</span>
              </div>

              {/* 2. What's new */}
              <button onClick={() => triggerToast('Opening Release Notes (v2.4.0)...')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">What's new in v2.4.0</p>
                  <p className="text-[10px] font-normal text-slate-400">Huddle 2.0 live voice chat, Fusion Mix 3D, and Beat Code QR styling</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* Plan access is shown from the authenticated account in Account settings. */}

              {/* 4. Open-source licenses */}
              <button onClick={() => triggerToast('Opening Open-Source Licenses...')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">Open-source licenses</p>
                  <p className="text-[10px] font-normal text-slate-400">Third-party software libraries and dependencies</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 5. Credits */}
              <button onClick={() => triggerToast('Opening Resona Credits & Team...')} className="w-full p-3.5 rounded-2xl glass-card text-left font-bold text-white flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold">Credits & Acknowledgements</p>
                  <p className="text-[10px] font-normal text-slate-400">Audio engineers, designers, sound creators & contributors</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>

              {/* 6. Legal information */}
              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <p className="font-bold text-white text-xs">Legal information</p>
                <div className="space-y-1.5 text-[11px] pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Terms of Service</span>
                    <button onClick={() => triggerToast('Opening Terms of Service...')} className="text-teal-400 underline font-semibold">Read Terms</button>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-slate-400">Privacy Policy & Cookies</span>
                    <button onClick={() => triggerToast('Opening Privacy Policy...')} className="text-teal-400 underline font-semibold">Read Policy</button>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-white/5">
                    <span className="text-slate-400">Copyright & Trademark Notices</span>
                    <button onClick={() => triggerToast('Opening Copyright Notices...')} className="text-teal-400 underline font-semibold">View Notices</button>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 text-center pt-2">© 2026 Resona Music Technologies Inc. All rights reserved.</p>
            </div>
          )}

          {/* Creator Subpages */}
          {activeSubpage === 'creator-preferences' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Manage your creator identity, verified artist badge, and public catalog preferences.</p>
              
              <div className="p-4 rounded-2xl glass-card space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-lg">
                    S
                  </div>
                  <div>
                    <p className="font-extrabold text-white text-sm flex items-center gap-1">Shree <span className="text-teal-400 text-xs">✓ Verified</span></p>
                    <p className="text-[10px] text-purple-300 font-medium">Indie Electronic & Ambient Artist</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Artist Handle</span>
                    <span className="text-white font-mono">@shree_official</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Monthly Listeners</span>
                    <span className="text-teal-400 font-bold">142,500</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl glass-card space-y-2 text-xs">
                <p className="font-bold text-white text-xs">Artist Profile Bio</p>
                <textarea rows="3" defaultValue="Crafting immersive ambient electronic music and lo-fi beats from Mumbai." className="w-full bg-slate-900 border border-white/10 rounded-xl p-2 text-xs text-slate-300 focus:outline-none focus:border-teal-400" />
                <button onClick={() => triggerToast('Artist Bio Saved!')} className="w-full p-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-center">Save Profile Updates</button>
              </div>
            </div>
          )}

          {activeSubpage === 'upload-preferences' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Configure default audio formats, master loudness target, and copyright protection settings for new uploads.</p>

              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <p className="font-bold text-white text-xs">Mastering Format & Quality</p>
                <select onChange={(e) => triggerToast(`Default Upload Format: ${e.target.value}`)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white">
                  <option value="wav24">24-bit / 48kHz Lossless WAV (Recommended)</option>
                  <option value="flac">24-bit FLAC Master</option>
                  <option value="wav16">16-bit / 44.1kHz Studio WAV</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl glass-card space-y-2">
                <p className="font-bold text-white text-xs">Auto-Mastering Target (Loudness)</p>
                <select onChange={(e) => triggerToast(`Target LUFS: ${e.target.value}`)} className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white">
                  <option value="-14">-14 LUFS (Streaming Standard)</option>
                  <option value="-12">-12 LUFS (Punchy Modern Master)</option>
                  <option value="-16">-16 LUFS (Dynamic Audiophile Master)</option>
                </select>
              </div>

              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Automatic Fingerprinting</p>
                  <p className="text-[10px] text-slate-400">Protect uploaded tracks with Resona Digital Rights Shield</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Digital Rights Shield Active' : 'Digital Rights Shield Off')} className="accent-teal-400 w-4 h-4" />
              </div>
            </div>
          )}

          {activeSubpage === 'song-requests' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Manage live song requests from followers during Huddles or live stream broadcasts.</p>

              <div className="p-3.5 rounded-2xl glass-card flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">Accept Live Song Requests</p>
                  <p className="text-[10px] text-slate-400">Allow fans to submit track suggestions during live sessions</p>
                </div>
                <input type="checkbox" defaultChecked onChange={(e) => triggerToast(e.target.checked ? 'Song requests enabled' : 'Song requests disabled')} className="accent-teal-400 w-4 h-4" />
              </div>

              <div className="p-3.5 rounded-2xl glass-card space-y-2 text-xs">
                <p className="font-bold text-white text-xs">Pending Fan Requests (3)</p>
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5">
                    <div>
                      <p className="font-bold text-white text-xs">"Acoustic Cover of Cyberpunk Night"</p>
                      <p className="text-[10px] text-slate-400">Requested by @alex_m • 2h ago</p>
                    </div>
                    <button onClick={() => triggerToast('Accepted request!')} className="px-2.5 py-1 rounded-lg bg-teal-500 text-slate-950 font-bold text-[10px]">Accept</button>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-white/5">
                    <div>
                      <p className="font-bold text-white text-xs">"Remix Stems Release"</p>
                      <p className="text-[10px] text-slate-400">Requested by @beats_by_sam • 5h ago</p>
                    </div>
                    <button onClick={() => triggerToast('Accepted request!')} className="px-2.5 py-1 rounded-lg bg-teal-500 text-slate-950 font-bold text-[10px]">Accept</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSubpage === 'creator-hub-settings' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                {isCreator 
                  ? 'Access Creator Hub analytics dashboard, upload tools, and track management.' 
                  : isPendingCreator 
                    ? 'Your creator application is currently being reviewed by our administration team.' 
                    : 'Apply for creator status to access upload tools, release management, and analytics.'}
              </p>
              
              <div className="p-4 rounded-2xl glass-card space-y-3 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-sm">
                      {isCreator ? 'Resona Creator Studio' : isPendingCreator ? 'Application Under Review' : 'Become a Creator'}
                    </h3>
                    <p className="text-[10px] text-purple-300">
                      {isCreator 
                        ? 'Publish music, inspect analytics, track royalties' 
                        : isPendingCreator 
                          ? 'Application submitted • Under review' 
                          : 'Submit an application for artist verification'}
                    </p>
                  </div>
                </div>

                <button onClick={() => onNavigate('creator')} className="w-full p-3.5 rounded-2xl glass-button-primary font-bold text-xs">
                  {isCreator ? 'Launch Creator Hub Dashboard →' : isPendingCreator ? 'View Application Status →' : 'Apply to Become a Creator →'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* MAIN SETTINGS LIST VIEW */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-extrabold text-white">Settings & More</h1>
            <p className="text-xs text-slate-400">Customize your experience, playback & preferences.</p>
          </div>

          {/* User Account Quick Card */}
          <div className="p-4 rounded-3xl glass-panel border border-teal-500/30 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar
                user={user}
                className="w-12 h-12 rounded-full border-2 border-teal-400 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-white text-sm truncate">{user?.name || 'Name not provided'}</h2>
                <p className="text-[10px] text-teal-300 truncate">{user?.email || 'Email not provided'}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className="text-[9px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-bold shrink-0">
                    <PlanBadge plan={user?.plan ?? user?.planId} />
                  </span>
                  <span className="text-[9px] text-slate-400 font-mono truncate">
                    ID: {user?.id?.slice(0, 10) || 'Unknown'}...
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAuthModal(true)}
              className="py-1.5 px-3 rounded-xl glass-card text-xs font-bold text-teal-300 hover:bg-white/10 border border-teal-500/30 transition flex items-center gap-1 shrink-0"
            >
              <RefreshCw className="w-3 h-3 text-teal-400" /> Switch
            </button>
          </div>

          {/* Creator Status Card */}
          <div className="p-4 rounded-3xl glass-panel border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-xs">
                  {isCreator ? 'Verified Creator' : isPendingCreator ? 'Creator Application Pending' : 'Become a Creator'}
                </h3>
                <p className="text-[10px] text-slate-400">
                  {isCreator 
                    ? 'Creator features enabled & verified' 
                    : isPendingCreator 
                      ? 'Application under review by administrators' 
                      : 'Apply to upload & manage original releases'}
                </p>
              </div>
            </div>
            {!isCreator && !isPendingCreator ? (
              <button
                onClick={() => onNavigate('creator')}
                className="px-3.5 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition"
              >
                Apply
              </button>
            ) : isPendingCreator ? (
              <button
                onClick={() => onNavigate('creator')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition"
              >
                Status
              </button>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                Active
              </span>
            )}
          </div>

          {/* 13 Listener Core Settings Menus */}
          <div className="space-y-2">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Listener Settings</h3>
            {mainMenus.map((menu) => {
              const Icon = menu.icon;
              return (
                <div
                  key={menu.id}
                  onClick={() => setActiveSubpage(menu.id)}
                  className="p-3.5 rounded-2xl glass-card flex items-center justify-between cursor-pointer hover:bg-white/10 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-white/5 text-teal-400 group-hover:scale-105 transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-xs group-hover:text-teal-300">{menu.title}</h4>
                      <p className="text-[10px] text-slate-400">{menu.desc}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                </div>
              );
            })}
          </div>

          {/* 4 Creator Specific Settings Menus (Shown only when Creator Features enabled) */}
          {isCreator && (
            <div className="space-y-2 pt-2 border-t border-purple-500/20">
              <h3 className="font-bold text-xs text-purple-400 uppercase tracking-wider">Creator Settings</h3>
              {creatorMenus.map((menu) => {
                const Icon = menu.icon;
                return (
                  <div
                    key={menu.id}
                    onClick={() => setActiveSubpage(menu.id)}
                    className="p-3.5 rounded-2xl glass-card border border-purple-500/20 flex items-center justify-between cursor-pointer hover:bg-purple-500/10 transition group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 group-hover:scale-105 transition">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs group-hover:text-purple-300">{menu.title}</h4>
                        <p className="text-[10px] text-slate-400">{menu.desc}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Auth & Switch Account Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassModal}
        onClose={() => setShowChangePassModal(false)}
        onSuccess={(msg) => triggerToast(msg)}
      />
      {cropImage && (
        <ImageCropModal
          imageFile={cropImage}
          onCancel={() => setCropImage(null)}
          onCrop={async (croppedFile) => {
            setCropImage(null);
            setProfileSaving(true);
            try {
              await api.user.uploadProfilePicture(croppedFile);
              await refreshAccountData();
              triggerToast('Profile picture updated');
            } catch (err) {
              setProfileError(err.message);
            } finally {
              setProfileSaving(false);
            }
          }}
        />
      )}
    </div>
  );
}

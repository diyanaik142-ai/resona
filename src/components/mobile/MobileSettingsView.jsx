import React, { useState, useEffect } from 'react';
import {
  ChevronLeft, ChevronRight, User, Sliders, Volume2, Bell,
  Shield, Users, Radio, Sun, Info, LogOut, Check, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import PlanBadge from '../PlanBadge';
import { api } from '../../services/api';

export default function MobileSettingsView({ onNavigate, onOpenAuthModal }) {
  const { user, logout, refreshPlan } = useAuth();
  const [activeCategory, setActiveCategory] = useState(null); // null = main list
  const [planRequestData, setPlanRequestData] = useState(null);
  const [planRequestOpen, setPlanRequestOpen] = useState(false);
  const [requestedPlan, setRequestedPlan] = useState('');
  const [planError, setPlanError] = useState('');
  const [planBusy, setPlanBusy] = useState(false);
  const plans = [['resona','Resona'],['resona_silver','Resona Silver'],['resona_gold','Resona Gold'],['resona_platinum','Resona Platinum']];
  const loadPlanRequest = async () => {
    setPlanBusy(true);
    try { const [data] = await Promise.all([api.user.getPlanRequest(), refreshPlan()]); setPlanRequestData(data); setPlanError(''); }
    catch (err) { setPlanError(err.message || 'Could not load plan status'); }
    finally { setPlanBusy(false); }
  };
  useEffect(() => { if (user?.id) loadPlanRequest(); }, [user?.id]);
  const submitPlanRequest = async () => {
    setPlanBusy(true); setPlanError('');
    try { await api.user.requestPlanChange(requestedPlan); setPlanRequestOpen(false); await loadPlanRequest(); }
    catch (err) { setPlanError(err.message || 'Could not submit request'); }
    finally { setPlanBusy(false); }
  };
  const cancelPlanRequest = async () => {
    setPlanBusy(true); setPlanError('');
    try { await api.user.cancelPlanRequest(planRequestData.request.id); await loadPlanRequest(); }
    catch (err) { setPlanError(err.message || 'Could not cancel request'); }
    finally { setPlanBusy(false); }
  };

  // Setting states
  const [crossfade, setCrossfade] = useState(false);
  const [streamingQuality, setStreamingQuality] = useState('Lossless (24-bit/96kHz)');
  const [loudnessNorm, setLoudnessNorm] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  const categories = [
    { id: 'account', label: 'Account & Identity', icon: User, desc: user?.email || 'Manage profile' },
    { id: 'playback', label: 'Playback & Audio', icon: Sliders, desc: 'Quality, Crossfade, Equalizer' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Push, Huddle invites, Activity' },
    { id: 'privacy', label: 'Privacy & Security', icon: Shield, desc: 'Visibility, Data partition' },
    { id: 'creator', label: 'Creator Studio', icon: Radio, desc: 'Publish master audio releases' },
    { id: 'about', label: 'About Resona', icon: Info, desc: 'v2.4.0 Studio Master' }
  ];

  return (
    <div className="space-y-4 pb-6 pt-2 px-4">
      {/* If subpage is active: show Back Header */}
      {activeCategory ? (
        <div className="space-y-4">
          <button
            onClick={() => setActiveCategory(null)}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-white transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </button>

          {/* SUBPAGE: ACCOUNT */}
          {activeCategory === 'account' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Account & Profile</h2>

              <div className="p-4 rounded-3xl glass-card border border-teal-500/30 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-full border-2 border-teal-400 overflow-hidden bg-slate-800 shrink-0">
                    <img
                      src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
                      alt="Avatar"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-white text-sm truncate">{user?.name || 'Listener'}</h3>
                    <p className="text-[11px] text-teal-300 truncate mt-0.5">{user?.email}</p>
                    <span className="text-[9px] bg-teal-500/20 text-teal-400 px-2 py-0.5 rounded-full font-bold mt-1 inline-block">
                      <PlanBadge plan={user?.plan ?? user?.planId} />
                    </span>
                  </div>
                </div>
                <button
                  onClick={onOpenAuthModal}
                  className="py-1.5 px-3 rounded-xl glass-card text-xs font-bold text-teal-300 border border-teal-500/30 shrink-0 ml-2"
                >
                  Switch
                </button>
              </div>

              <section className="p-4 rounded-2xl glass-card border border-teal-500/20 space-y-3">
                <div><h3 className="text-sm font-bold text-white">Your Resona Plan</h3>{user?.planId ? <PlanBadge plan={user.planId} className="block mt-2 text-lg font-black text-teal-300" /> : <p className="mt-2 text-sm text-slate-400">Plan unavailable</p>}<p className="text-[11px] text-slate-400 mt-1">Active plan · Features available with your current plan.</p></div>
                {planError && <p role="alert" className="text-xs text-rose-300">{planError} <button onClick={loadPlanRequest} className="underline">Retry</button></p>}
                {planRequestData?.request?.status === 'pending' ? <div className="rounded-xl bg-amber-500/10 p-3 space-y-2 text-xs"><p className="font-bold text-amber-200">Plan change request pending</p><p>Current plan: {plans.find(([id])=>id===planRequestData.request.currentPlan)?.[1]}</p><p>Requested plan: {plans.find(([id])=>id===planRequestData.request.requestedPlan)?.[1]}</p><p className="text-slate-400">Submitted: {new Date(planRequestData.request.createdAt).toLocaleString()}</p><button disabled={planBusy} onClick={cancelPlanRequest} className="py-2 px-3 border border-white/10 rounded-lg">Cancel Request</button></div> : planRequestOpen ? <div className="max-h-[55vh] overflow-y-auto p-3 rounded-xl bg-slate-950/60 space-y-3"><h4 className="font-bold text-white">Request a plan change</h4><p className="text-xs">Current plan: <PlanBadge plan={user?.planId} /></p>{plans.map(([id,name])=><label key={id} className="flex items-center gap-3 text-sm py-1"><input type="radio" name="mobile-plan" value={id} checked={requestedPlan===id} disabled={id===user?.planId||planBusy} onChange={()=>setRequestedPlan(id)} />{name}{id===user?.planId&&<span className="ml-auto text-[10px] text-slate-500">Current plan</span>}</label>)}<div className="flex gap-2"><button onClick={()=>setPlanRequestOpen(false)} className="flex-1 py-2 border border-white/10 rounded-lg">Cancel</button><button disabled={!requestedPlan||planBusy} onClick={submitPlanRequest} className="flex-1 py-2 rounded-lg bg-teal-500 text-slate-950 font-bold disabled:opacity-50">Submit Request</button></div></div> : <button disabled={!user?.planId||planBusy} onClick={()=>{setRequestedPlan('');setPlanRequestOpen(true);}} className="w-full py-3 rounded-xl bg-teal-500 text-slate-950 text-xs font-bold disabled:opacity-50">Request Plan Change</button>}
                {planRequestData?.request && ['approved','rejected'].includes(planRequestData.request.status) && <p className="text-xs text-slate-300">Last request {planRequestData.request.status}. {planRequestData.request.adminNote}</p>}
              </section>

              <div className="p-4 rounded-2xl glass-card border border-white/5 space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Account ID</span>
                  <span className="font-mono text-white">{user?.id?.slice(0, 12)}...</span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-slate-400">Audio Storage</span>
                  <span className="text-teal-300 font-semibold">Isolated Partition</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Authentication</span>
                  <span className="text-emerald-400 font-semibold">Verified Safe</span>
                </div>
              </div>

              <button
                onClick={logout}
                className="w-full py-3 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          {/* SUBPAGE: PLAYBACK */}
          {activeCategory === 'playback' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Playback & Audio</h2>

              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Streaming Quality</h4>
                    <p className="text-[10px] text-slate-400">Lossless FLAC Master streams</p>
                  </div>
                  <span className="text-xs font-bold text-teal-400">24-bit/96kHz</span>
                </div>

                <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Crossfade</h4>
                    <p className="text-[10px] text-slate-400">Seamless blend between tracks</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={crossfade}
                    onChange={() => setCrossfade(!crossfade)}
                    className="accent-teal-400 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Volume Normalization</h4>
                    <p className="text-[10px] text-slate-400">Even loudness across master recordings</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={loudnessNorm}
                    onChange={() => setLoudnessNorm(!loudnessNorm)}
                    className="accent-teal-400 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBPAGE: NOTIFICATIONS */}
          {activeCategory === 'notifications' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Notifications</h2>

              <div className="space-y-2">
                <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Push Notifications</h4>
                    <p className="text-[10px] text-slate-400">Receive alerts on your mobile device</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={pushNotifs}
                    onChange={() => setPushNotifs(!pushNotifs)}
                    className="accent-teal-400 w-4 h-4 cursor-pointer"
                  />
                </div>

                <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs">Huddle Invitations</h4>
                    <p className="text-[10px] text-slate-400">Instant alerts when friends start rooms</p>
                  </div>
                  <span className="text-xs font-bold text-teal-400">Enabled</span>
                </div>
              </div>
            </div>
          )}

          {/* SUBPAGE: PRIVACY */}
          {activeCategory === 'privacy' && (
            <div className="space-y-4">
              <h2 className="text-lg font-black text-white">Privacy & Security</h2>

              <div className="p-3.5 rounded-2xl glass-card border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs">Private Listening</h4>
                  <p className="text-[10px] text-slate-400">Hide playback activity from friends</p>
                </div>
                <input
                  type="checkbox"
                  checked={privateProfile}
                  onChange={() => setPrivateProfile(!privateProfile)}
                  className="accent-teal-400 w-4 h-4 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* SUBPAGE: CREATOR */}
          {activeCategory === 'creator' && (
            <div className="space-y-4 text-center p-6 rounded-3xl glass-card border border-purple-500/30">
              <Radio className="w-10 h-10 text-purple-400 mx-auto" />
              <h3 className="font-black text-white text-base">Creator Studio</h3>
              <p className="text-xs text-slate-400">Publish original master audio recordings to the daily catalog.</p>
              <button
                onClick={() => onNavigate('creator')}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 font-bold text-xs text-white"
              >
                Launch Studio
              </button>
            </div>
          )}

          {/* SUBPAGE: ABOUT */}
          {activeCategory === 'about' && (
            <div className="space-y-4 p-5 rounded-3xl glass-card border border-white/10 text-xs text-slate-300">
              <h3 className="font-black text-white text-sm">Resona Music Platform</h3>
              <p className="leading-relaxed text-slate-400">
                High-resolution audio streaming platform engineered for lossless fidelity, synchronized listening huddles, and master recordings.
              </p>
              <div className="pt-2 border-t border-white/5 space-y-1 font-mono text-[11px] text-slate-400">
                <p>Version: 2.4.0 (Studio Master)</p>
                <p>Engine: WebAudio Master Lossless</p>
                <p>Status: All Systems Operational</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN CATEGORY MENU */
        <div className="space-y-4">
          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-1.5 text-xs font-bold text-teal-400 hover:text-teal-300 transition active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back to Profile</span>
          </button>

          <div>
            <h1 className="text-xl font-black text-white">Settings</h1>
            <p className="text-xs text-slate-400">Manage audio, account, and preferences</p>
          </div>

          <div className="space-y-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className="flex items-center justify-between p-3.5 rounded-2xl glass-card border border-white/5 hover:border-teal-500/30 transition cursor-pointer active:scale-[0.99] group"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-teal-400 shrink-0 group-hover:scale-105 transition">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-white text-xs truncate group-hover:text-teal-300 transition">
                        {cat.label}
                      </h3>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {cat.desc}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition shrink-0 ml-2" />
                </div>
              );
            })}
          </div>

          {/* Quick Sign Out button */}
          <button
            onClick={logout}
            className="w-full py-3.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition mt-6"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}

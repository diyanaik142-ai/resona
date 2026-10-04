import React, { useState } from 'react';
import { Shield, RefreshCw, Lock, AlertTriangle, ArrowRight, X } from 'lucide-react';
import { api } from '../services/api';

export default function MaintenanceScreen({ maintenanceMessage, onRefreshStatus, onAdminLoginSuccess }) {
  const [checking, setChecking] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    try {
      if (onRefreshStatus) {
        await onRefreshStatus();
      }
    } finally {
      setTimeout(() => setChecking(false), 600);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      const res = await api.auth.login(adminUsername, adminPassword);
      if (res && res.user?.role === 'admin') {
        if (onAdminLoginSuccess) {
          onAdminLoginSuccess(res.user);
        } else {
          window.location.reload();
        }
      } else {
        setLoginError('Administrator credentials required for maintenance bypass.');
      }
    } catch (err) {
      setLoginError(err.message || 'Invalid administrator credentials');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#06070B] text-slate-100 flex flex-col items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg glass-panel rounded-3xl border border-amber-500/20 p-8 shadow-2xl relative z-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-semibold uppercase tracking-wider">
            Platform Maintenance Mode
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Resona is Temporarily Offline
          </h1>
        </div>

        {/* Message */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 text-sm text-slate-300 leading-relaxed font-medium">
          {maintenanceMessage || "Resona is currently undergoing scheduled platform maintenance. We'll be back shortly."}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-300 transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
            <span>{checking ? 'Checking Status…' : 'Check Platform Status'}</span>
          </button>

          <button
            onClick={() => setShowAdminModal(true)}
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2 transition border border-white/10"
          >
            <Shield className="w-4 h-4 text-teal-400" />
            <span>Administrator Access</span>
          </button>
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-teal-500/30 rounded-3xl p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <button
              onClick={() => setShowAdminModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center mx-auto text-teal-300 shadow-lg shadow-teal-500/20 mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Administrator Bypass</h2>
              <p className="text-xs text-slate-400">Sign in with administrator credentials to manage platform.</p>
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Username</label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Admin Password</label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 border border-white/10 text-white text-sm focus:outline-none focus:border-teal-400"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 hover:bg-teal-300 transition shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                <span>{isLoggingIn ? 'Verifying…' : 'Sign In as Admin'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

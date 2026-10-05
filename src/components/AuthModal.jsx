import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Lock, Mail, User, Calendar, ShieldCheck, ArrowRight, Sparkles, X, Check, Eye, EyeOff } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState(defaultMode); // 'login' or 'register'
  const [showPassword, setShowPassword] = useState(false);
  const [platformConfig, setPlatformConfig] = useState(null);

  useEffect(() => {
    if (isOpen) {
      api.platform.getConfig()
        .then(cfg => setPlatformConfig(cfg))
        .catch(() => {});
    }
  }, [isOpen]);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('2000-01-01');
  const [role, setRole] = useState('listener');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register({ name, email, password, dob, role });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-teal-500/30 rounded-3xl p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full glass-card text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <img src="/branding/resona-icon.png" alt="Resona" className="w-12 h-12 object-contain mx-auto drop-shadow-lg mb-2" />
          <h2 className="text-xl font-extrabold text-white">
            {mode === 'login' ? 'Welcome Back' : 'Join Resona'}
          </h2>
          <p className="text-[11px] text-slate-400">
            {mode === 'login'
              ? 'Access your private music shelf, presets & library.'
              : 'Create an isolated account with encrypted credentials.'}
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span>Bcrypt Encrypted Passwords & Isolated Data Storage</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold text-center">
            {error}
          </div>
        )}

        {/* Form or Registration Unavailable */}
        {mode === 'register' && platformConfig?.allowUserRegistration === false ? (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center space-y-3">
            <div className="text-amber-300 font-bold text-xs">Registration Temporarily Unavailable</div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Registration is temporarily unavailable. Please try again later.
            </p>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full py-2.5 rounded-xl bg-teal-400 text-slate-950 font-bold text-xs hover:bg-teal-300 transition"
            >
              Sign In to Existing Account
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Chen"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full py-2 pl-9 pr-3 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                placeholder="name@resona.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2 pl-9 pr-3 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2 pl-9 pr-9 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Date of Birth</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="date"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full py-2 pl-9 pr-3 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Account Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {['listener', 'creator', 'both'].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold capitalize transition border ${
                        role === r
                          ? 'bg-teal-400 text-slate-950 border-teal-300'
                          : 'glass-card text-slate-300 border-white/10'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-2xl glass-button-primary font-bold text-xs flex items-center justify-center gap-2 mt-4 shadow-lg shadow-teal-500/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Account' : 'Create Encrypted Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        )}



        {/* Toggle Mode */}
        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
            className="text-xs font-semibold text-slate-400 hover:text-teal-300 transition"
          >
            {mode === 'login' ? (
              <span>Don't have an account? <strong className="text-teal-400">Sign Up</strong></span>
            ) : (
              <span>Already have an account? <strong className="text-teal-400">Sign In</strong></span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

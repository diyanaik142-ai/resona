import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, ShieldCheck, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

export default function LoginView({ onGoToGetStarted }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      // Login successful! AuthContext updates and App re-renders into main view
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="w-full min-h-[100dvh] overflow-y-auto no-scrollbar bg-[#08090E] text-slate-100 flex flex-col p-3 sm:p-4 relative">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-teal-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="m-auto w-full max-w-sm glass-panel rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl relative z-10 space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <img src={`${window.location.origin}/branding/resona-icon.png`} alt="Resona" className="w-12 h-12 object-contain mx-auto drop-shadow-[0_4px_6px_rgba(45,212,191,0.2)]" />
          <h1 className="text-xl font-black text-white tracking-tight">
            Sign in to <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">Resona</span>
          </h1>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
            Access your private library, isolated playlists & personalized audio hub.
          </p>
        </div>

        {/* Security Badge */}
        <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[10px] text-teal-300 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
          <span>Bcrypt Password Encryption & Isolated Storage</span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1.5 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                autoComplete="username"
                placeholder="name@resona.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full py-2.5 pl-10 pr-4 rounded-xl glass-card border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-teal-400 transition"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-slate-400 font-semibold">Password</label>
              <span className="text-[10px] text-teal-400 font-medium">Bcrypt Encrypted</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full py-2.5 pl-10 pr-10 rounded-xl glass-card border border-white/10 text-base sm:text-sm text-white focus:outline-none focus:border-teal-400 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-slate-500 hover:text-white transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl glass-button-primary font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <span>Sign In to Resona</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>



        {/* Footer Navigation */}
        <div className="text-center pt-2 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={onGoToGetStarted}
            className="text-xs font-semibold text-slate-300 hover:text-teal-300 transition"
          >
            New to Resona? <strong className="text-teal-400">Get Started & Register</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Sparkles, Headphones, Radio, User, ArrowRight, Check, ShieldCheck, AlertCircle } from 'lucide-react';

export default function OnboardingView({ onComplete, onOpenLogin }) {
  const { register, updatePreferences } = useAuth();
  const [step, setStep] = useState(1); // 1: Welcome, 2: User Role, 3: Register Form, 4: Genre Picker
  const [selectedRole, setSelectedRole] = useState('both');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    dob: '1998-05-14'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (step === 4) {
      api.search.getGenres()
        .then(res => setAvailableGenres(res))
        .catch(err => console.warn('Could not fetch genres', err));
    }
  }, [step]);

  const toggleGenre = (id) => {
    if (selectedGenres.includes(id)) {
      setSelectedGenres(selectedGenres.filter((g) => g !== id));
    } else {
      setSelectedGenres([...selectedGenres, id]);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e?.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please provide both email and password.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        name: formData.name || 'Resona Listener',
        email: formData.email,
        password: formData.password,
        dob: formData.dob,
        role: selectedRole,
        genres: selectedGenres
      });
      setStep(4);
    } catch (err) {
      setError(err.message || 'Registration failed. Email might already be taken.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishOnboarding = async () => {
    localStorage.setItem('resona_device_seen', 'true');
    try {
      await updatePreferences({ selectedGenres });
    } catch (e) {
      console.warn('Could not save initial genre preferences:', e);
    }
    onComplete();
  };

  const handleGoToSignIn = () => {
    localStorage.setItem('resona_device_seen', 'true');
    if (onOpenLogin) onOpenLogin();
  };

  return (
    <div className="w-full h-full min-h-full overflow-y-auto no-scrollbar bg-[#08090E] text-slate-100 flex items-center justify-center p-3 sm:p-4 relative">
      {/* Background glowing ambient light */}
      <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-teal-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm glass-panel rounded-3xl border border-white/10 p-5 sm:p-6 shadow-2xl relative z-10 space-y-4 my-auto">
        {/* Step Indicator Header */}
      <div className="flex items-center justify-between z-10 pt-1 mb-4">
        <div className="flex items-center gap-2">
          <img src="/branding/resona-icon.png" alt="Resona" className="w-8 h-8 object-contain drop-shadow-[0_2px_4px_rgba(45,212,191,0.2)]" />
          <span className="font-semibold text-lg tracking-wider text-white">Resona</span>
        </div>
        <div className="flex gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step === i ? 'w-6 bg-teal-400' : 'w-2 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: WELCOME SCREEN */}
      {step === 1 && (
        <div className="flex-1 flex flex-col justify-center items-center text-center z-10 py-6">
          <div className="relative mb-6">
            <div className="w-36 h-36 rounded-3xl overflow-hidden glass-card p-1 shadow-2xl border border-teal-500/30">
              <img
                src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80"
                alt="Welcome Artwork"
                className="w-full h-full object-cover rounded-2xl"
              />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-teal-400 text-slate-950 p-2.5 rounded-xl shadow-lg font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-2">
            Welcome to <span className="bg-gradient-to-r from-teal-400 to-cyan-300 bg-clip-text text-transparent">Resona</span>
          </h1>
          <p className="text-slate-400 text-sm max-w-xs mb-8">
            Music isn't just heard. It's felt, lived and shared with people who match your vibe.
          </p>

          <div className="w-full space-y-3">
            <button
              onClick={() => setStep(2)}
              className="w-full py-3.5 px-6 rounded-2xl glass-button-primary flex items-center justify-center gap-2 font-bold text-base shadow-lg shadow-teal-500/20"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={handleGoToSignIn}
              className="w-full py-3 px-6 rounded-2xl glass-card hover:bg-white/10 text-teal-300 text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              I already have an account (Sign In)
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: CHOOSE WHAT DEFINES YOU */}
      {step === 2 && (
        <div className="flex-1 flex flex-col justify-between z-10 py-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Choose what defines you</h2>
            <p className="text-slate-400 text-xs mb-6">You can always change this later in your settings.</p>

            <div className="space-y-3">
              {/* Listener */}
              <div
                onClick={() => setSelectedRole('listener')}
                className={`p-4 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
                  selectedRole === 'listener'
                    ? 'bg-teal-500/15 border-teal-400/80 shadow-lg shadow-teal-500/10'
                    : 'glass-card border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-teal-500/20 text-teal-400">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Listener</h3>
                    <p className="text-xs text-slate-400">Explore and enjoy music</p>
                  </div>
                </div>
                {selectedRole === 'listener' && <Check className="w-5 h-5 text-teal-400" />}
              </div>

              {/* Creator */}
              <div
                onClick={() => setSelectedRole('creator')}
                className={`p-4 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
                  selectedRole === 'creator'
                    ? 'bg-purple-500/15 border-purple-400/80 shadow-lg shadow-purple-500/10'
                    : 'glass-card border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
                    <Radio className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Creator</h3>
                    <p className="text-xs text-slate-400">Share your original music</p>
                  </div>
                </div>
                {selectedRole === 'creator' && <Check className="w-5 h-5 text-purple-400" />}
              </div>

              {/* Both */}
              <div
                onClick={() => setSelectedRole('both')}
                className={`p-4 rounded-2xl cursor-pointer transition flex items-center justify-between border ${
                  selectedRole === 'both'
                    ? 'bg-cyan-500/15 border-cyan-400/80 shadow-lg shadow-cyan-500/10'
                    : 'glass-card border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-400">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">Both</h3>
                    <p className="text-xs text-slate-400">Listen and create</p>
                  </div>
                </div>
                {selectedRole === 'both' && <Check className="w-5 h-5 text-cyan-400" />}
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full mt-6 py-3.5 rounded-2xl glass-button-primary font-bold text-base shadow-lg"
          >
            Continue
          </button>
        </div>
      )}

      {/* STEP 3: CREATE ACCOUNT */}
      {step === 3 && (
        <div className="flex-1 flex flex-col justify-between z-10 py-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Create your account</h2>
            <p className="text-slate-400 text-xs mb-3">Your credentials are encrypted & stored in your private partition.</p>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-300 font-medium mb-4">
              <ShieldCheck className="w-4 h-4 text-teal-400 flex-shrink-0" />
              <span>Bcrypt salted password encryption enabled</span>
            </div>

            {error && (
              <div className="mb-4 p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-xl glass-card border border-white/10 text-white text-base sm:text-sm focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Email</label>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="you@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-xl glass-card border border-white/10 text-white text-base sm:text-sm focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Password (minimum 6 characters)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-xl glass-card border border-white/10 text-white text-base sm:text-sm focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Date of birth</label>
                <input
                  type="date"
                  value={formData.dob}
                  onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                  className="w-full py-2.5 px-4 rounded-xl glass-card border border-white/10 text-white text-sm focus:outline-none focus:border-teal-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-6 py-3.5 rounded-2xl glass-button-primary font-bold text-base shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Encrypting & Registering...' : 'Sign Up & Continue'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button 
                onClick={onOpenLogin}
                className="text-xs text-slate-400 hover:text-white transition"
              >
                Already have an account? <span className="text-teal-400 font-bold">Log in</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: GENRE SELECTION GRID */}
      {step === 4 && (
        <div className="flex-1 flex flex-col justify-between z-10 py-4">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Which genres draw you in?</h2>
            <p className="text-slate-400 text-xs mb-5">Select a few to personalize your Pulse feed.</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {availableGenres.map((genre) => {
                const isSelected = selectedGenres.includes(genre.id);
                return (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.id)}
                    className={`p-3 rounded-2xl text-xs font-semibold flex flex-col items-center justify-center gap-1.5 transition border ${
                      isSelected
                        ? 'bg-teal-400 text-slate-950 border-teal-300 font-bold shadow-md shadow-teal-500/20'
                        : 'glass-card text-slate-300 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span>{genre.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-slate-950" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleFinishOnboarding}
            className="w-full mt-6 py-3.5 rounded-2xl glass-button-primary font-bold text-base shadow-lg"
          >
            Finish & Launch Pulse
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

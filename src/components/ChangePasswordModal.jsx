import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, X, Check, Shield, AlertCircle } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      if (onSuccess) onSuccess('Password updated and re-encrypted successfully!');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to change password. Please verify current password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-teal-500/30 rounded-3xl p-5 relative shadow-2xl space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full glass-card text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Change Password</h3>
            <p className="text-[11px] text-slate-400">Encrypted with bcrypt salted hashing</p>
          </div>
        </div>

        {error && (
          <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full py-2 px-3 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full py-2 px-3 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
            />
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-semibold mb-1 block">Confirm New Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full py-2 px-3 rounded-xl glass-card border border-white/10 text-white text-xs focus:outline-none focus:border-teal-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl glass-card text-xs font-bold text-slate-300 hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl glass-button-primary text-xs font-bold shadow disabled:opacity-50"
            >
              {isSubmitting ? 'Encrypting...' : 'Save Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

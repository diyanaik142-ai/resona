import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, User, Plus, LogOut, Check, Trash2, ShieldCheck } from 'lucide-react';
import AuthModal from './AuthModal';

export default function AccountSwitcherModal({ isOpen, onClose }) {
  const { user, switchAccount, logout } = useAuth();
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = JSON.parse(localStorage.getItem('resona_saved_accounts') || '[]');
        setSavedAccounts(saved);
      } catch (e) {
        setSavedAccounts([]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSwitch = async (email) => {
    if (user?.email === email) {
      onClose();
      return;
    }
    await switchAccount(email);
    onClose();
  };

  const handleRemoveAccount = (e, email) => {
    e.stopPropagation();
    try {
      const saved = JSON.parse(localStorage.getItem('resona_saved_accounts') || '[]');
      const updated = saved.filter(a => a.email !== email);
      localStorage.setItem('resona_saved_accounts', JSON.stringify(updated));
      setSavedAccounts(updated);
    } catch (err) {}
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (showAddAccount) {
    return (
      <AuthModal 
        isOpen={true} 
        onClose={() => {
          setShowAddAccount(false);
          // Re-fetch accounts when coming back from AuthModal
          try {
            const saved = JSON.parse(localStorage.getItem('resona_saved_accounts') || '[]');
            setSavedAccounts(saved);
          } catch (e) {}
        }} 
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm glass-panel border border-white/10 rounded-3xl p-6 relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full glass-card text-slate-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1 mb-6">
          <img src={`${window.location.origin}/branding/resona-icon.png`} alt="Resona" className="w-12 h-12 object-contain mx-auto drop-shadow-lg mb-2" />
          <h2 className="text-xl font-extrabold text-white">Switch Account</h2>
          <p className="text-[11px] text-slate-400">Select an account or add a new one.</p>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
          {savedAccounts.map(acc => {
            const isActive = user?.email === acc.email;
            return (
              <div
                key={acc.email}
                onClick={() => handleSwitch(acc.email)}
                className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer active:scale-[0.99] ${
                  isActive ? 'bg-teal-500/10 border-teal-500/30' : 'glass-card border-white/5 hover:border-white/15'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {acc.avatar ? (
                      <img src={acc.avatar} alt={acc.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className={`w-5 h-5 ${isActive ? 'text-teal-400' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-white text-sm truncate">{acc.name}</h4>
                    <p className="text-xs text-slate-400 truncate">{acc.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isActive && (
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-teal-400" />
                    </div>
                  )}
                  {!isActive && (
                    <button
                      onClick={(e) => handleRemoveAccount(e, acc.email)}
                      className="p-2 rounded-xl hover:bg-white/5 text-slate-500 hover:text-rose-400 transition"
                      title="Remove Account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-2 pt-4 border-t border-white/10">
          <button
            onClick={() => setShowAddAccount(true)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl glass-card border border-white/5 hover:border-white/15 transition cursor-pointer text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-slate-300" />
            </div>
            <div>
              <div className="font-bold text-white text-sm">Add Account</div>
              <div className="text-[10px] text-slate-400">Sign in to another Resona account</div>
            </div>
          </button>

          {user && (
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 transition cursor-pointer text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0 group-hover:bg-rose-500/20 transition">
                <LogOut className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="font-bold text-rose-300 text-sm">Log out {user.name}</div>
                <div className="text-[10px] text-rose-400/70">Securely sign out this account</div>
              </div>
            </button>
          )}
        </div>
        
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] text-slate-500">
          <ShieldCheck className="w-3 h-3" />
          <span>Accounts are stored securely on this device.</span>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Bell, Sparkles, Radio, Search, Library, Users, Settings, Disc, Shield } from 'lucide-react';
import { resolveMediaUrl } from '../../services/api';
import Avatar from '../Avatar';

export default function MobileHeader({
  activeTab,
  onNavigate,
  onOpenNotifications,
  unreadNotificationsCount = 0,
  onOpenProfile,
  user
}) {
  // Contextual title based on active tab
  const getContextTitle = () => {
    switch (activeTab) {
      case 'pulse': return 'Pulse';
      case 'seek': return 'Discover';
      case 'onair': return 'Now Playing';
      case 'shelf': return 'My Shelf';
      case 'social': return 'Social & Huddle';
      case 'creator': return 'Creator Studio';
      case 'settings': return 'Settings';
      case 'profile': return 'Profile';
      default: return 'Resona';
    }
  };

  return (
    <header className="fixed top-0 left-0 w-full glass-panel border-b border-white/5 px-4 pt-[env(safe-area-inset-top,0px)] h-[calc(3.5rem+env(safe-area-inset-top,0px))] flex items-center justify-between z-40 bg-slate-950/95 backdrop-blur-2xl select-none">
      {/* Left: Resona Wordmark */}
      <div
        className="flex items-center gap-2 cursor-pointer active:scale-95 transition"
        onClick={() => onNavigate('pulse')}
      >
        <img src="/branding/resona-icon.png" alt="Resona" className="w-7 h-7 object-contain drop-shadow-[0_2px_4px_rgba(45,212,191,0.2)]" />
        <span className="font-black text-sm tracking-wider text-white">RESONA</span>
      </div>

      {/* Center: Contextual Page Title */}
      <div className="flex-1 text-center px-2 min-w-0">
        <h2 className="text-xs font-bold text-slate-300 tracking-wide uppercase truncate">
          {getContextTitle()}
        </h2>
      </div>

      {/* Right: Notifications & Profile Avatar */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenNotifications}
          className="w-9 h-9 rounded-full glass-card border border-white/10 flex items-center justify-center text-slate-300 hover:text-white relative transition active:scale-90"
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-400 rounded-full" />
            </>
          )}
        </button>

        <div
          onClick={onOpenProfile}
          title="Profile & Settings"
          aria-label="Profile and Settings"
          className="cursor-pointer active:scale-90 transition shrink-0"
        >
          <Avatar
            user={user}
            className="w-9 h-9 rounded-full border-2 border-teal-500/40 shadow-md"
          />
        </div>
      </div>
    </header>
  );
}

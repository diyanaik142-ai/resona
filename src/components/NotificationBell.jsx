import React from 'react';
import { Bell } from 'lucide-react';

export default function NotificationBell({ unreadCount = 0, className = '', onClick }) {
  const count = Math.max(0, Number(unreadCount) || 0);
  const label = count > 0 ? `Notifications, ${count} unread` : 'Notifications';
  const badge = count > 99 ? '99+' : count > 9 ? '9+' : String(count);

  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      className={`relative inline-flex min-h-[44px] min-w-[44px] items-center justify-center ${className}`}>
      <Bell className="w-4 h-4" aria-hidden="true" />
      {count > 0 && (
        <span aria-hidden="true" className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-400 px-1 text-[9px] font-bold leading-none text-slate-950 shadow-[0_0_8px_rgba(251,113,133,0.55)]">
          {badge}
        </span>
      )}
    </button>
  );
}

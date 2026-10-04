import React from 'react';
import { Sparkles, Search, Radio, Library, Users } from 'lucide-react';

export default function MobileBottomNav({ activeTab, onNavigate }) {
  const navItems = [
    { id: 'pulse', label: 'Pulse', icon: Sparkles },
    { id: 'seek', label: 'Seek', icon: Search },
    { id: 'onair', label: 'On Air', icon: Radio },
    { id: 'shelf', label: 'My Shelf', icon: Library },
    { id: 'social', label: 'Social', icon: Users }
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] bg-slate-950/95 backdrop-blur-2xl select-none"
      role="navigation"
      aria-label="Mobile Navigation"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 min-h-[48px] py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
                isActive
                  ? 'text-teal-400 font-extrabold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div className={`p-1 rounded-xl transition ${isActive ? 'bg-teal-500/15' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'text-teal-300 font-bold' : 'text-slate-400 font-medium'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

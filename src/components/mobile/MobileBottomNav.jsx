import React from 'react';
import { Sparkles, Search, Radio, Library, Users, ListMusic, HeartPulse, Mic2, UserPlus, Activity, Share2, Network } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MAIN_NAV = [
  { id: 'pulse', label: 'Pulse', icon: Sparkles },
  { id: 'seek', label: 'Seek', icon: Search },
  { id: 'onair', label: 'On Air', icon: Radio },
  { id: 'shelf', label: 'My Shelf', icon: Library },
  { id: 'social', label: 'Social', icon: Users }
];

const SUB_NAV = {
  shelf: [
    { id: 'playlists', label: 'Playlists', icon: ListMusic },
    { id: 'heartbeats', label: 'Heartbeats', icon: HeartPulse },
    { id: 'artists', label: 'Artists', icon: Mic2 }
  ],
  social: [
    { id: 'friends', label: 'Friends', icon: UserPlus },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'shared', label: 'Shared', icon: Share2 },
    { id: 'fusions', label: 'Fusions', icon: Network }
  ]
};

export default function MobileBottomNav({ activeTab, activeSubTab, onNavigate }) {
  
  const getRenderItems = () => {
    if (activeTab === 'social') {
      return [
        { ...SUB_NAV.social[0], isSub: true, parent: 'social' },
        { ...SUB_NAV.social[1], isSub: true, parent: 'social' },
        { ...MAIN_NAV.find(n => n.id === 'social'), isParent: true },
        { ...SUB_NAV.social[2], isSub: true, parent: 'social' },
        { ...SUB_NAV.social[3], isSub: true, parent: 'social' }
      ];
    }
    if (activeTab === 'shelf') {
      return [
        { ...SUB_NAV.shelf[0], isSub: true, parent: 'shelf' },
        { ...SUB_NAV.shelf[1], isSub: true, parent: 'shelf' },
        { ...MAIN_NAV.find(n => n.id === 'shelf'), isParent: true },
        { ...SUB_NAV.shelf[2], isSub: true, parent: 'shelf' },
        { id: 'empty', isEmpty: true }
      ];
    }
    return MAIN_NAV;
  };

  const items = getRenderItems();

  const handleNavClick = (item) => {
    if (item.isEmpty) return;
    if (item.isParent) {
      // Return to default nav if clicking the active parent
      onNavigate('BACK');
      return;
    }
    if (item.isSub) {
      onNavigate(`${item.parent}/${item.id}`);
    } else {
      if (item.id === 'shelf' || item.id === 'social') {
        // When clicking a parent that has subtabs, default to its first subtab
        const firstSub = SUB_NAV[item.id][0].id;
        onNavigate(`${item.id}/${firstSub}`);
      } else {
        onNavigate(item.id);
      }
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-white/10 px-2 pt-1 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] bg-slate-950/95 backdrop-blur-2xl select-none overflow-hidden"
      role="navigation"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 max-w-md mx-auto relative h-[56px] items-center">
        <AnimatePresence>
          {items.map((item, index) => {
            if (item.isEmpty) {
              return <div key="empty" className="h-full" />;
            }
            const Icon = item.icon;
            let isActive = false;
            
            if (item.isParent) {
              isActive = true; // Parent is always highlighted in contextual mode
            } else if (item.isSub) {
              isActive = activeSubTab === item.id;
            } else {
              isActive = activeTab === item.id;
            }

            return (
              <motion.button
                key={item.id}
                layoutId={`nav-item-${item.id}`}
                onClick={() => handleNavClick(item)}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                transition={{ type: "spring", stiffness: 350, damping: 25, mass: 0.8 }}
                className={`flex flex-col items-center justify-center h-full w-full py-1 px-1 rounded-xl transition-colors duration-200 active:scale-95 ${
                  isActive
                    ? 'text-teal-400 font-extrabold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                style={{
                  gridColumn: index + 1
                }}
              >
                <div className={`p-1 rounded-xl transition ${isActive ? (item.isParent ? 'bg-teal-500/25' : 'bg-teal-500/15') : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 truncate max-w-full px-1 ${isActive ? 'text-teal-300 font-bold' : 'text-slate-400 font-medium'}`}>
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>
    </nav>
  );
}

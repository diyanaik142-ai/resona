import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Music, Activity, Shield, LogOut, LayoutDashboard, Settings, UserCheck, ScrollText } from 'lucide-react';
import AdminUsers from './admin/AdminUsers';
import AdminCatalog from './admin/AdminCatalog';
import AdminPlaylists from './admin/AdminPlaylists';
import AdminSystem from './admin/AdminSystem';
import AdminSettings from './admin/AdminSettings';
import AdminOverview from './admin/AdminOverview';
import AdminCreators from './admin/AdminCreators';
import AdminAudit from './admin/AdminAudit';
import { ENV_STYLES } from './admin/adminUtils';
import { api } from '../services/api';

const TABS = [
  { id: 'overview', icon: LayoutDashboard, label: 'Overview' },
  { id: 'users', icon: Users, label: 'User Management' },
  { id: 'catalog', icon: Music, label: 'Music Catalog' },
  { id: 'playlists', icon: Music, label: 'Playlists' },
  { id: 'creators', icon: UserCheck, label: 'Creator Applications' },
  { id: 'audit', icon: ScrollText, label: 'Audit Logs' },
  { id: 'system', icon: Activity, label: 'System Status' },
  { id: 'settings', icon: Settings, label: 'Admin Settings' },
];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  // Environment comes from the backend's NODE_ENV — never hardcoded.
  const [environment, setEnvironment] = useState(null);
  const [envError, setEnvError] = useState(false);

  useEffect(() => {
    api.admin.getSystemStatus()
      .then(s => { setEnvironment(s.environment); setEnvError(false); })
      .catch(() => setEnvError(true));
  }, []);

  const activeLabel = TABS.find(t => t.id === activeTab)?.label || activeTab;

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#06070B] text-slate-200 overflow-x-clip">
      {/* Desktop Sidebar (Preserved exactly as-is, hidden on mobile) */}
      <div className="hidden md:flex w-64 bg-slate-900/50 border-r border-white/5 flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <h2 className="font-bold text-white tracking-wide">Resona Admin</h2>
            <p className="text-[10px] text-teal-400 font-mono tracking-widest uppercase">System Control</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {TABS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                  ? 'bg-teal-500/10 text-teal-400 font-bold border border-teal-500/20 shadow-[0_0_20px_rgba(45,212,191,0.1)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/20 font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Navigation Header & Tab Strip (Hidden on desktop) */}
      <div className="md:hidden flex flex-col border-b border-white/5 bg-slate-950/95 backdrop-blur-xl shrink-0 z-20 sticky top-0">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-teal-400" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white text-sm truncate">Resona Admin</h2>
              <div className="flex items-center gap-2">
                <p className="text-[9px] text-teal-400 font-mono uppercase truncate">System Control</p>
                {environment && (
                  <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full border flex items-center gap-1 ${ENV_STYLES[environment.name] || ENV_STYLES.development}`}>
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {environment.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/20 shrink-0 ml-2"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2.5 no-scrollbar touch-pan-x">
          {TABS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-semibold transition shrink-0 ${activeTab === item.id
                  ? 'bg-teal-500/20 text-teal-300 font-bold border border-teal-500/30'
                  : 'text-slate-400 hover:bg-white/5'
                }`}
            >
              <item.icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-y-auto">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-72 h-72 md:w-[500px] md:h-[500px] bg-teal-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-72 h-72 md:w-[600px] md:h-[600px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

        <header className="hidden md:flex h-20 px-10 items-center justify-between border-b border-white/5 bg-slate-900/30 backdrop-blur-xl z-10 sticky top-0">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {activeLabel}
          </h1>

          <div className="flex items-center gap-4">
            {environment ? (
              <div className={`px-4 py-1.5 rounded-full border flex items-center gap-2 ${ENV_STYLES[environment.name] || ENV_STYLES.development}`} title={`Determined from backend: ${environment.source}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                <span className="text-xs font-mono uppercase tracking-wider">{environment.name}</span>
              </div>
            ) : (
              <div className="px-4 py-1.5 rounded-full border border-white/10 text-xs font-mono uppercase tracking-wider text-slate-500" title={envError ? 'Backend did not report its environment' : undefined}>
                {envError ? 'Env unknown' : '…'}
              </div>
            )}
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
              <Shield className="w-5 h-5 text-slate-300" />
            </div>
          </div>
        </header>
        
        {/* Mobile active label (optional, can be part of page content) */}
        <div className="md:hidden px-4 pt-4 pb-2 z-10">
           <h1 className="text-xl font-black text-white tracking-tight">
            {activeLabel}
          </h1>
        </div>

        <main className="flex-1 p-4 sm:p-6 md:p-10 z-10">
          {activeTab === 'overview' && <AdminOverview onNavigate={setActiveTab} />}
          {activeTab === 'users' && <AdminUsers />}
          {activeTab === 'catalog' && <AdminCatalog />}
          {activeTab === 'playlists' && <AdminPlaylists />}
          {activeTab === 'system' && <AdminSystem />}
          {activeTab === 'creators' && <AdminCreators />}
          {activeTab === 'audit' && <AdminAudit />}
          {activeTab === 'settings' && <AdminSettings />}

        </main>
      </div>
    </div>
  );
}

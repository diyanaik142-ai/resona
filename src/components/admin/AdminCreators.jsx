import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../services/api';
import { UserCheck, RefreshCw, Loader2, AlertTriangle, Check, X, Inbox } from 'lucide-react';
import { timeAgo } from './adminUtils';

const FILTERS = ['pending', 'approved', 'rejected', 'all'];

export default function AdminCreators() {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setApps(await api.admin.getCreators()); setError(null); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const decide = async (id, status) => {
    setBusyId(id); setActionError(null);
    try {
      const updated = await api.admin.updateCreator(id, { status });
      setApps(prev => prev.map(a => (a.id === id ? updated : a)));
    } catch (err) {
      setActionError(err.message);
    } finally { setBusyId(null); }
  };

  const norm = a => String(a.status || '').toLowerCase();
  const counts = apps ? Object.fromEntries(FILTERS.map(f => [f, f === 'all' ? apps.length : apps.filter(a => norm(a) === f).length])) : {};
  const visible = apps ? (filter === 'all' ? apps : apps.filter(a => norm(a) === filter)) : [];

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><UserCheck className="w-6 h-6 text-purple-400" /> Creator Applications</h2>
          <p className="text-sm text-slate-500 mt-1">Source: creator_apps.json</p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm capitalize border transition ${filter === f ? 'bg-purple-500/15 border-purple-500/40 text-purple-300' : 'border-white/10 text-slate-400 hover:text-white'}`}>
            {f}{apps && <span className="ml-1.5 text-xs opacity-70">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {actionError && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm">Action failed: {actionError}</div>}

      <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
        {loading && !apps ? (
          <div className="p-8 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading applications…</div>
        ) : error ? (
          <div className="p-8 text-rose-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Unable to load creator applications: {error}
            <button onClick={load} className="underline ml-2">Retry</button></div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Inbox className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            {filter === 'pending' ? 'No pending applications.' : `No ${filter === 'all' ? '' : filter + ' '}applications.`}
            {apps.length === 0 && <p className="text-xs text-slate-600 mt-2">No creator applications have been submitted yet.</p>}
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {visible.map(a => (
              <div key={a.id} className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">{a.artistName || a.name || a.email || a.id}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {[a.email, a.genre, a.submittedAt || a.createdAt ? `submitted ${timeAgo(a.submittedAt || a.createdAt)}` : null].filter(Boolean).join(' · ')}
                  </p>
                  {a.reviewedAt && <p className="text-[11px] text-slate-600 mt-1">Reviewed {timeAgo(a.reviewedAt)} by {a.reviewedBy}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full capitalize ${norm(a) === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : norm(a) === 'rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>{norm(a) || 'unknown'}</span>
                  {norm(a) === 'pending' && (
                    <>
                      <button disabled={busyId === a.id} onClick={() => decide(a.id, 'approved')} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50" title="Approve">
                        {busyId === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      </button>
                      <button disabled={busyId === a.id} onClick={() => decide(a.id, 'rejected')} className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50" title="Reject">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

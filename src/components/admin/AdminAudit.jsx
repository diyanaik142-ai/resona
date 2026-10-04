import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { ScrollText, RefreshCw, Loader2, AlertTriangle, Search, Inbox } from 'lucide-react';

const ACTION_LABELS = {
  ADMIN_LOGIN: 'Admin login',
  UPDATE_PLAN: 'Plan changed',
  UPDATE_ROLE: 'Role changed',
  UPDATE_OVERRIDES: 'Feature overrides changed',
  UPDATE_PLAN_FEATURES: 'Plan features changed',
  DISABLE_USER: 'User disabled',
  ENABLE_USER: 'User enabled',
  DELETE_USER: 'User deleted',
  UPLOAD_TRACK: 'Track uploaded',
  UPDATE_TRACK: 'Track updated',
  DELETE_TRACK: 'Track deleted',
  VERIFY_CATALOG: 'Catalog verified',
  CREATOR_APPLICATION_APPROVED: 'Creator application approved',
  CREATOR_APPLICATION_REJECTED: 'Creator application rejected',
  CREATOR_APPLICATION_PENDING: 'Creator application reset to pending'
};

function summarize(details) {
  if (!details || typeof details !== 'object') return '';
  return Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ');
}

export default function AdminAudit() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await api.admin.getAuditLogs(500)); setError(null); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const entries = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.entries;
    return data.entries.filter(e =>
      [e.action, ACTION_LABELS[e.action], e.adminId, e.target, e.result, summarize(e.details)].join(' ').toLowerCase().includes(q));
  }, [data, query]);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><ScrollText className="w-6 h-6 text-blue-400" /> Audit Logs</h2>
          <p className="text-sm text-slate-500 mt-1">
            Source: audit_logs.json{data && <> · {data.total} total entries{data.total > data.entries.length && `, newest ${data.entries.length} shown`}</>}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> {loading ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Filter by action, actor, target…"
          className="w-full bg-slate-900 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 outline-none" />
      </div>

      <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
        {loading && !data ? (
          <div className="p-8 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading audit logs…</div>
        ) : error ? (
          <div className="p-8 text-rose-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Unable to load audit logs: {error}
            <button onClick={load} className="underline ml-2">Retry</button></div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-slate-500"><Inbox className="w-10 h-10 mx-auto mb-3 text-slate-700" />
            {data.total === 0 ? 'No audit events have been recorded yet.' : 'No entries match this filter.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400">
                <tr>
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">Action</th>
                  <th className="p-3 font-medium">Actor</th>
                  <th className="p-3 font-medium">Target</th>
                  <th className="p-3 font-medium">Result</th>
                  <th className="p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map(e => (
                  <tr key={e.id} className="hover:bg-white/[0.02] align-top">
                    <td className="p-3 text-slate-400 whitespace-nowrap font-mono text-xs">{new Date(e.timestamp).toLocaleString()}</td>
                    <td className="p-3 text-white">{ACTION_LABELS[e.action] || e.action}</td>
                    <td className="p-3 text-slate-300">{e.adminId || '—'}</td>
                    <td className="p-3 text-slate-400 font-mono text-xs break-all">{e.target || '—'}</td>
                    <td className="p-3">
                      {e.result
                        ? <span className={`text-xs px-2 py-0.5 rounded-full ${e.result === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>{e.result}</span>
                        : <span className="text-xs text-slate-600" title="Recorded before result tracking was added">not recorded</span>}
                    </td>
                    <td className="p-3 text-slate-500 text-xs break-all max-w-md">{summarize(e.details)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

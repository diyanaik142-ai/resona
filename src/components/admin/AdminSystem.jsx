import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';
import { Activity, Server, Cpu, Wifi, RefreshCw, AlertTriangle, Loader2, HardDrive } from 'lucide-react';
import { formatBytes, formatUptime, timeAgo, StatusLabel } from './adminUtils';

const POLL_MS = 15000;

export default function AdminSystem() {
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [storage, setStorage] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyError, setLatencyError] = useState(null);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    const [s, h, st, l] = await Promise.allSettled([
      api.admin.getSystemStatus(), api.admin.getHealth(), api.admin.getStorage(), api.admin.measureApiLatency()
    ]);
    if (s.status === 'fulfilled') { setStatus(s.value); setStatusError(null); } else { setStatus(null); setStatusError(s.reason?.message); }
    if (h.status === 'fulfilled') { setHealth(h.value); setHealthError(null); } else { setHealth(null); setHealthError(h.reason?.message); }
    if (st.status === 'fulfilled') { setStorage(st.value); setStorageError(null); } else { setStorageError(st.reason?.message); }
    if (l.status === 'fulfilled') { setLatency(l.value); setLatencyError(null); } else { setLatency(null); setLatencyError(l.reason?.message); }
    setLastUpdated(new Date().toISOString());
    setLoadedOnce(true);
    setRefreshing(false);
    inFlight.current = false;
  }, []);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, POLL_MS);
    return () => clearInterval(i);
  }, [refresh]);

  const loading = !loadedOnce;
  const mem = status?.memory;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity className="text-emerald-400 w-6 h-6" /> System Status
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-xs text-slate-500">{lastUpdated ? `Checked ${timeAgo(lastUpdated)} · every ${POLL_MS / 1000}s` : ''}</span>
          <button onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm hover:bg-white/10 disabled:opacity-60">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> {refreshing ? 'Updating…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Overall */}
      <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">Overall</p>
          <div className="text-2xl font-black mt-1">
            {loading ? <span className="text-slate-500 text-lg">Loading…</span>
              : healthError ? <span className="text-rose-400">Unavailable</span>
              : <StatusLabel status={health.overall} />}
          </div>
          {healthError && <p className="text-xs text-rose-300 mt-2">Health check could not be completed: {healthError}</p>}
        </div>
        {health && (
          <p className="text-xs text-slate-500 text-right max-w-xs">
            Operational = every required component passed its check. Degraded = at least one required component failed.
          </p>
        )}
      </div>

      {/* Components */}
      <div className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 text-sm font-bold text-slate-300 uppercase tracking-wider">Components</div>
        {loading ? (
          <div className="p-6 text-slate-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Running health checks…</div>
        ) : !health ? (
          <div className="p-6 text-rose-300 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Component status unavailable — the backend did not respond.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {health.components.map(c => (
              <div key={c.id} className="p-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {c.name} {!c.required && <span className="text-[10px] text-slate-500 font-normal ml-1 uppercase">optional</span>}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {c.ok ? c.detail : c.error}
                    {c.location && <> · <span className="font-mono">{c.location}</span></>}
                  </p>
                  {c.note && <p className="text-[11px] text-slate-600 mt-1">{c.note}</p>}
                </div>
                <div className="text-right shrink-0">
                  <StatusLabel status={c.status} />
                  {c.id !== 'backend' && <p className="text-[11px] text-slate-600 mt-1 font-mono">{c.latencyMs} ms</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Process & measurements */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Tile icon={Server} color="text-emerald-400" title="Backend Process" loading={loading} error={statusError}
          value={status && formatUptime(status.uptime)}
          sub={status && `PID ${status.pid} · Node ${status.nodeVersion} · ${status.platform}`} />

        <Tile icon={Cpu} color="text-blue-400" title="Heap Memory" loading={loading} error={statusError}
          value={mem && formatBytes(mem.heapUsed)}
          sub={mem && `of ${formatBytes(mem.heapTotal)} allocated · RSS ${formatBytes(mem.rss)}`}
          bar={mem ? mem.heapUsed / mem.heapTotal : null} />

        <Tile icon={HardDrive} color="text-purple-400" title="Server Data Storage" loading={loading} error={storageError}
          value={storage && formatBytes(storage.totalBytes)}
          sub={storage && `Media ${formatBytes(storage.mediaBytes)} · App data ${formatBytes(storage.appDataBytes)}`} />

        <Tile icon={Wifi} color="text-teal-400" title="API Response Time" loading={loading} error={latencyError}
          value={latency !== null && `${latency} ms`}
          sub="Measured browser → backend round trip" />
      </div>

      <p className="text-xs text-slate-600">
        Not shown because Resona does not currently have them: CDN bandwidth (media is served directly by this server) and API rate-limit usage (no rate limiter is configured).
      </p>
    </div>
  );
}

function Tile({ icon: Icon, color, title, loading, error, value, sub, bar }) {
  return (
    <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-5 h-5 ${color}`} />
        <h3 className="text-slate-400 font-medium">{title}</h3>
      </div>
      <div className="text-2xl font-black text-white">
        {loading ? <span className="text-slate-500 text-lg">Loading…</span> : error ? <span className="text-rose-400">Unavailable</span> : value}
      </div>
      {!loading && !error && bar !== null && bar !== undefined && (
        <div className="w-full bg-slate-800 h-1.5 mt-3 rounded-full overflow-hidden">
          <div className="bg-blue-400 h-full" style={{ width: `${Math.min(100, bar * 100)}%` }} />
        </div>
      )}
      <p className="text-xs text-slate-500 mt-2">{error ? error : sub}</p>
    </div>
  );
}

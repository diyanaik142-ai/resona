import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Users, Music, Activity, Disc, Shield, RefreshCw, AlertTriangle, HardDrive, Gauge, Flame, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '../../services/api';
import { formatBytes, formatUptime, timeAgo, StatusLabel } from './adminUtils';

const POLL_MS = 30000;

const ACCENTS = {
  teal: { hover: 'hover:border-teal-500/30', icon: 'text-teal-400 bg-teal-500/10' },
  purple: { hover: 'hover:border-purple-500/30', icon: 'text-purple-400 bg-purple-500/10' },
  emerald: { hover: 'hover:border-emerald-500/30', icon: 'text-emerald-400 bg-emerald-500/10' },
  amber: { hover: 'hover:border-amber-500/30', icon: 'text-amber-400 bg-amber-500/10' }
};

function Card({ accent = 'teal', icon: Icon, title, source, children }) {
  const a = ACCENTS[accent];
  return (
    <div className={`bg-slate-900/50 border border-white/5 rounded-xl sm:rounded-2xl p-4 sm:p-6 relative overflow-hidden transition-all ${a.hover}`}>
      <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-2 sm:gap-3">
        <div className="min-w-0 w-full">
          <div className="flex items-center justify-between sm:block mb-1">
             <p className="text-[11px] sm:text-sm font-medium text-slate-400 truncate pr-2 sm:pr-0">{title}</p>
             <div className={`p-1.5 sm:hidden rounded-lg shrink-0 ${a.icon}`}>
               <Icon className="w-3.5 h-3.5" />
             </div>
          </div>
          {children}
        </div>
        <div className={`hidden sm:block p-3 rounded-xl shrink-0 ${a.icon}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      {source && <p className="hidden sm:block mt-3 text-[11px] uppercase tracking-wider text-slate-600 truncate">Source: {source}</p>}
    </div>
  );
}

function Value({ loading, error, children }) {
  if (loading) return <div className="h-7 sm:h-9 flex items-center text-slate-500 text-sm sm:text-lg"><Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin mr-1.5 sm:mr-2" />…</div>;
  if (error) return <div className="text-lg sm:text-2xl font-black text-rose-400">Error</div>;
  return <h3 className="text-xl sm:text-3xl font-black text-white">{children}</h3>;
}

function ErrorLine({ error, onRetry }) {
  return (
    <div className="mt-2 sm:mt-4 text-[10px] sm:text-xs text-rose-300 flex items-start gap-1.5 sm:gap-2">
      <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 mt-0.5 shrink-0" />
      <span className="flex-1 line-clamp-2 sm:line-clamp-none">{error}</span>
      {onRetry && <button onClick={onRetry} className="underline hover:text-white">Retry</button>}
    </div>
  );
}

function userTrendText(u) {
  if (u.percentChange !== null && u.percentChange !== undefined) {
    const pct = Math.round(u.percentChange);
    return { badge: `${pct >= 0 ? '+' : ''}${pct}%`, text: `vs last month (${u.createdThisMonth} vs ${u.createdPreviousMonth})` };
  }
  if (u.createdThisMonth > 0) return { badge: `+${u.createdThisMonth}`, text: `new this month (none last month)` };
  return { badge: '0', text: 'new users this month' };
}

export default function AdminOverview({ onNavigate }) {
  const [overview, setOverview] = useState(null);
  const [overviewError, setOverviewError] = useState(null);
  const [storage, setStorage] = useState(null);
  const [storageError, setStorageError] = useState(null);
  const [latency, setLatency] = useState(null);
  const [latencyError, setLatencyError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [, setTick] = useState(0);

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    const [ov, st, lat] = await Promise.allSettled([api.admin.getOverview(), api.admin.getStorage(), api.admin.measureApiLatency()]);
    if (ov.status === 'fulfilled') { setOverview(ov.value); setOverviewError(null); } else { setOverviewError(ov.reason?.message || 'Unable to reach the backend'); }
    if (st.status === 'fulfilled') { setStorage(st.value); setStorageError(null); } else { setStorageError(st.reason?.message || 'Unable to measure storage'); }
    if (lat.status === 'fulfilled') { setLatency(lat.value); setLatencyError(null); } else { setLatency(null); setLatencyError(lat.reason?.message || 'Backend unreachable'); }
    setLastUpdated(new Date().toISOString());
    setLoadedOnce(true);
    setRefreshing(false);
    inFlight.current = false;
  }, []);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    const clock = setInterval(() => setTick(t => t + 1), 15000); // keeps uptime / "updated ago" current
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [refresh]);

  const runVerify = async () => {
    setVerifying(true); setVerifyError(null); setVerifyResult(null);
    try { setVerifyResult(await api.admin.verifyCatalog()); refresh(); }
    catch (err) { setVerifyError(err.message); }
    finally { setVerifying(false); }
  };

  const loading = !loadedOnce;
  const failedAll = !!overviewError && !overview;
  const users = overview?.users, catalog = overview?.catalog, creators = overview?.creators, health = overview?.health;

  // Live uptime derived from the backend's reported process start time
  const uptimeSeconds = overview?.backend?.startedAt ? (Date.now() - new Date(overview.backend.startedAt).getTime()) / 1000 : null;

  const healthData = health?.ok ? health.data : null;
  const requiredComponents = healthData?.components.filter(c => c.required) || [];
  const firebase = healthData?.components.find(c => c.id === 'firebase_auth');
  const firestore = healthData?.components.find(c => c.id === 'firestore');

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] sm:text-sm text-slate-500 truncate">
          {lastUpdated ? <>Updated {timeAgo(lastUpdated)}</> : 'Fetching live data…'}
        </p>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 border border-white/10 text-xs sm:text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-60 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Updating…' : 'Refresh'}
        </button>
      </div>

      {failedAll && (
        <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs sm:text-sm flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span className="flex-1">Unable to load dashboard data: {overviewError}</span>
          <button onClick={refresh} className="underline shrink-0">Retry</button>
        </div>
      )}

      {/* Primary metrics */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-6">
        <Card icon={Users} title="Total Users" source="Firebase Authentication" accent="teal">
          <Value loading={loading} error={failedAll || (users && !users.ok)}>{users?.data?.total}</Value>
          {users?.ok && (() => {
            const t = userTrendText(users.data);
            return (
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="text-teal-400 bg-teal-400/10 px-2 py-0.5 rounded font-bold">{t.badge}</span>
                <span className="text-slate-500">{t.text}</span>
              </div>
            );
          })()}
          {users && !users.ok && <ErrorLine error={`Unable to retrieve Firebase user count: ${users.error}`} onRetry={refresh} />}
        </Card>

        <Card icon={Music} title="Active Catalog" source="Resona Catalog · Published tracks" accent="purple">
          <Value loading={loading} error={failedAll || (catalog && !catalog.ok)}>{catalog?.data?.published}</Value>
          {catalog?.ok && (
            <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
              <span className="text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded font-bold">+{catalog.data.addedThisWeek}</span>
              <span className="text-slate-500">new this week</span>
              {catalog.data.totalRecords !== catalog.data.published && (
                <span className="text-slate-600">· {catalog.data.totalRecords - catalog.data.published} unpublished</span>
              )}
            </div>
          )}
          {catalog && !catalog.ok && <ErrorLine error={`Unable to read catalog: ${catalog.error}`} onRetry={refresh} />}
        </Card>

        <Card icon={Activity} title="Backend Process Uptime" source={overview ? `Node.js process ${overview.backend.pid}` : 'Node.js process'} accent="emerald">
          <Value loading={loading} error={failedAll}>{formatUptime(uptimeSeconds)}</Value>
          {overview && (
            <p className="mt-4 text-xs text-slate-500">Since {new Date(overview.backend.startedAt).toLocaleString()} · resets on restart</p>
          )}
        </Card>

        <Card icon={Gauge} title="System Status" source="Live health checks" accent="amber">
          {loading ? <Value loading /> : failedAll ? <Value error /> : health && !health.ok ? <Value error /> : (
            <div className="text-2xl font-black"><StatusLabel status={healthData.overall} /></div>
          )}
          {healthData && (
            <p className="mt-4 text-xs text-slate-500">
              {requiredComponents.filter(c => c.ok).length}/{requiredComponents.length} required components operational
              {healthData.optionalDown > 0 && <span className="text-amber-400/80"> · {healthData.optionalDown} optional unavailable</span>}
            </p>
          )}
          {health && !health.ok && <ErrorLine error={health.error} onRetry={refresh} />}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick actions — every one performs a real operation */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={runVerify}
              disabled={verifying}
              className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5 group disabled:opacity-70 text-left"
            >
              <div className="flex items-center gap-3">
                <Disc className={`w-5 h-5 text-teal-400 ${verifying ? 'animate-spin' : ''}`} />
                <div>
                  <span className="font-medium block">Verify Catalog Integrity</span>
                  <span className="text-xs text-slate-500">Checks every track's media files exist on disk (read-only)</span>
                </div>
              </div>
              <span className="text-xs text-slate-500 group-hover:text-white transition">{verifying ? 'Checking…' : 'Run'}</span>
            </button>

            {(verifyResult || verifyError) && (
              <div className={`p-4 rounded-xl text-sm border ${verifyError ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : verifyResult.healthy ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-amber-500/10 border-amber-500/30 text-amber-100'}`}>
                {verifyError ? <>Verification failed: {verifyError}</> : (
                  <>
                    <div className="flex items-center gap-2 font-semibold">
                      {verifyResult.healthy ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {verifyResult.healthy ? 'Catalog verified — no problems found' : 'Catalog verified — problems found'}
                    </div>
                    <p className="mt-1 text-xs opacity-80">
                      {verifyResult.tracksChecked} track(s) and {verifyResult.mediaFilesChecked} media file(s) checked ·
                      {' '}{verifyResult.issues.length} issue(s) · {verifyResult.orphanedFiles.length} unreferenced file(s)
                    </p>
                    {verifyResult.issues.slice(0, 5).map((i, idx) => (
                      <p key={idx} className="mt-1 text-xs opacity-90">• {i.title || i.trackId}: {i.message}</p>
                    ))}
                    {verifyResult.orphanedFiles.slice(0, 5).map(f => (
                      <p key={f} className="mt-1 text-xs opacity-90">• Unreferenced media file: {f}</p>
                    ))}
                  </>
                )}
              </div>
            )}

            <button onClick={() => onNavigate('creators')} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5 group">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-purple-400" />
                <span className="font-medium">Review Creator Applications</span>
              </div>
              {loading ? <span className="text-xs text-slate-500">Loading…</span>
                : !creators?.ok ? <span className="text-xs text-rose-400">Unavailable</span>
                : creators.data.pending > 0
                  ? <span className="text-xs px-2 py-0.5 bg-rose-500 text-white rounded-full font-bold">{creators.data.pending} pending</span>
                  : <span className="text-xs text-slate-500">No pending applications</span>}
            </button>

            <button onClick={() => onNavigate('audit')} className="w-full flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5 group">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-blue-400" />
                <span className="font-medium">View Audit Logs</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition" />
            </button>
          </div>
        </div>

        {/* System health — measured values only */}
        <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">System Health</h3>
            <button onClick={() => onNavigate('system')} className="text-xs text-slate-500 hover:text-white inline-flex items-center gap-1">Details <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="space-y-5 text-sm">
            <Row label="Storage Used" sub={storage ? `Local data directory (${storage.location}) · ${storage.totalFiles} files` : 'Local data directory'}
              loading={loading} error={storageError} value={storage && formatBytes(storage.totalBytes)} />
            <Row label="Media Storage" sub={storage ? `Uploaded audio & artwork · ${storage.mediaFiles} files` : 'Uploaded audio & artwork'}
              loading={loading} error={storageError} value={storage && formatBytes(storage.mediaBytes)} />

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-400 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Host Disk</span>
                <span className="font-mono text-blue-400">
                  {loading ? 'Loading…' : storageError ? <span className="text-rose-400">Unavailable</span>
                    : !storage.disk.available ? <span className="text-slate-500">Not measured</span>
                    : `${formatBytes(storage.disk.usedBytes)} / ${formatBytes(storage.disk.totalBytes)}`}
                </span>
              </div>
              {storage?.disk?.available && (
                <>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400 rounded-full transition-all" style={{ width: `${(storage.disk.usedBytes / storage.disk.totalBytes) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1">{((storage.disk.usedBytes / storage.disk.totalBytes) * 100).toFixed(1)}% used · {formatBytes(storage.disk.freeBytes)} free on the volume hosting server data</p>
                </>
              )}
            </div>

            <Row label="API Response Time" sub="Measured browser → backend round trip"
              loading={loading} error={latencyError} value={latency !== null && `${latency} ms`} />

            <div className="flex justify-between items-start">
              <div>
                <span className="text-slate-400 flex items-center gap-2"><Flame className="w-4 h-4" /> Firebase Authentication</span>
              </div>
              {loading ? <span className="text-slate-500">Loading…</span> : firebase ? <StatusLabel status={firebase.status} /> : <span className="text-rose-400">Unavailable</span>}
            </div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-slate-400 flex items-center gap-2"><Flame className="w-4 h-4" /> Firestore <span className="text-[10px] text-slate-600">(optional)</span></span>
                {firestore && !firestore.ok && <p className="text-[11px] text-slate-600 mt-1 max-w-xs">{firestore.error}</p>}
              </div>
              {loading ? <span className="text-slate-500">Loading…</span> : firestore ? <StatusLabel status={firestore.status} /> : <span className="text-rose-400">Unavailable</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, sub, loading, error, value }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <div>
        <span className="text-slate-400">{label}</span>
        {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
      </div>
      <span className="font-mono text-teal-400 shrink-0">
        {loading ? <span className="text-slate-500">Loading…</span> : error ? <span className="text-rose-400" title={error}>Unavailable</span> : value}
      </span>
    </div>
  );
}

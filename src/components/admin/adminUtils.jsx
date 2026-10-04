import React from 'react';

export function formatBytes(bytes) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return 'Unavailable';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = bytes / 1024, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${units[i]}`;
}

export function formatUptime(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return 'Unavailable';
  const s = Math.max(0, Math.floor(totalSeconds));
  if (s < 60) return '<1m';
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${m}m`;
  return `${m}m`;
}

export function timeAgo(iso) {
  if (!iso) return '';
  const diff = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 5) return 'just now';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(iso).toLocaleString();
}

export const STATUS_STYLES = {
  operational: { dot: 'bg-emerald-400', text: 'text-emerald-400', label: 'Operational' },
  degraded: { dot: 'bg-amber-400', text: 'text-amber-400', label: 'Degraded' },
  unavailable: { dot: 'bg-rose-500', text: 'text-rose-400', label: 'Unavailable' },
  unknown: { dot: 'bg-slate-500', text: 'text-slate-400', label: 'Unknown' }
};

export function StatusDot({ status = 'unknown', pulse = false }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return <span className={`inline-block w-2 h-2 rounded-full ${s.dot} ${pulse ? 'animate-pulse' : ''}`} />;
}

export function StatusLabel({ status = 'unknown' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center gap-2 font-semibold ${s.text}`}>
      <StatusDot status={status} /> {s.label}
    </span>
  );
}

export const ENV_STYLES = {
  production: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  test: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
  development: 'bg-sky-500/10 border-sky-500/30 text-sky-300'
};

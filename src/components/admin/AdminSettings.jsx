import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import {
  Settings, Music, Radio, Users, Lock, Key, HardDrive, Bell,
  Volume2, ShieldAlert, FileText, Activity, Palette, AlertTriangle, Save,
  RefreshCw, AlertCircle, Trash2, Globe, RotateCcw, CheckCircle2, Info
} from 'lucide-react';

const CATEGORIES = [
  { id: 'platform', label: 'Platform', icon: Globe, description: 'Core availability, registration & maintenance' },
  { id: 'catalog', label: 'Music & Catalog', icon: Music, description: 'Catalog access, submissions & approvals' },
  { id: 'creator', label: 'Creator Hub', icon: Radio, description: 'Artist applications, studio uploads & limits' },
  { id: 'social', label: 'Social & Community', icon: Users, description: 'Social profiles, huddle, fusion & sharing' },
  { id: 'privacy', label: 'Privacy & Data', icon: Lock, description: 'Default user privacy, retention & export' },
  { id: 'api', label: 'API & Developer', icon: Key, description: 'API access permissions & token policies' },
  { id: 'storage', label: 'Storage & Media', icon: HardDrive, description: 'Upload limits, formats & media cleanup' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Global notification channels & alerts' },
  { id: 'audioDefaults', label: 'Audio Defaults', icon: Volume2, description: 'Playback defaults, audio quality & crossfade' },
  { id: 'contentSafety', label: 'Content & Safety', icon: ShieldAlert, description: 'Content moderation, explicit filters & reports' },
  { id: 'audit', label: 'Administration & Audit', icon: FileText, description: 'Audit event triggers & security retention' },
  { id: 'system', label: 'System', icon: Activity, description: 'Runtime status, health telemetry & diagnostics' },
  { id: 'branding', label: 'Appearance & Branding', icon: Palette, description: 'Brand identity, theme accents & metadata' },
  { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, description: 'Destructive operations & maintenance actions', danger: true },
];

export default function AdminSettings() {
  const [activeCategory, setActiveCategory] = useState('platform');
  const [savedSettings, setSavedSettings] = useState(null);
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' }); // idle | saving | saved | error
  const [systemMetrics, setSystemMetrics] = useState(null);

  // Danger Zone Modals
  const [dangerModal, setDangerModal] = useState(null); // { action, title, description, requireText, requirePassword }
  const [confirmInput, setConfirmInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [dangerExecuting, setDangerExecuting] = useState(false);
  const [dangerResult, setDangerResult] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await api.admin.getSettings();
      setSavedSettings(data);
      setFormData(JSON.parse(JSON.stringify(data)));
    } catch (err) {
      console.error('Failed to load settings:', err);
      setLoadError(err.message || 'Unable to load platform settings. Please check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemMetrics = async () => {
    setMetricsLoading(true);
    try {
      const [sys, health, storage] = await Promise.allSettled([
        api.admin.getSystemStatus(),
        api.admin.getHealth(),
        api.admin.getStorage()
      ]);
      setSystemMetrics({
        status: sys.status === 'fulfilled' ? sys.value : null,
        health: health.status === 'fulfilled' ? health.value : null,
        storage: storage.status === 'fulfilled' ? storage.value : null
      });
    } catch (e) {
      console.warn('System metrics fetch failed', e);
    } finally {
      setMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (activeCategory === 'system') {
      fetchSystemMetrics();
    }
  }, [activeCategory]);

  // Section-level field updater
  const updateField = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
    }));
    if (saveStatus.state === 'saved') {
      setSaveStatus({ state: 'idle', message: '' });
    }
  };

  // Check if current category has unsaved changes
  const isCategoryDirty = (category) => {
    if (!savedSettings || !formData || !savedSettings[category] || !formData[category]) return false;
    return JSON.stringify(savedSettings[category]) !== JSON.stringify(formData[category]);
  };

  const hasAnyDirty = () => {
    if (!savedSettings || !formData) return false;
    return JSON.stringify(savedSettings) !== JSON.stringify(formData);
  };

  // Revert category changes
  const discardCategoryChanges = (category) => {
    if (!savedSettings) return;
    setFormData(prev => ({
      ...prev,
      [category]: JSON.parse(JSON.stringify(savedSettings[category]))
    }));
  };

  // Save current settings to server
  const handleSave = async (categoryToSave = null) => {
    setSaveStatus({ state: 'saving', message: 'Saving platform configuration…' });
    try {
      const payload = categoryToSave
        ? { [categoryToSave]: formData[categoryToSave] }
        : formData;

      const res = await api.admin.updateSettings(payload);
      if (res && res.settings) {
        setSavedSettings(res.settings);
        setFormData(JSON.parse(JSON.stringify(res.settings)));
        const diffCount = res.diff?.length || 0;
        setSaveStatus({
          state: 'saved',
          message: diffCount > 0 ? `Saved ${diffCount} change${diffCount === 1 ? '' : 's'} successfully.` : 'Configuration is up to date.'
        });
      } else {
        setSavedSettings(JSON.parse(JSON.stringify(formData)));
        setSaveStatus({ state: 'saved', message: 'Saved successfully.' });
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setSaveStatus({
        state: 'error',
        message: err.message || 'Could not save this setting. Your previous configuration remains unchanged.'
      });
    }
  };

  // Execute danger action
  const handleExecuteDanger = async () => {
    if (!dangerModal) return;
    if (dangerModal.requireText && confirmInput !== dangerModal.requireText) {
      setDangerResult({ error: `Text mismatch. Type "${dangerModal.requireText}" to confirm.` });
      return;
    }
    if (dangerModal.requirePassword && !adminPasswordInput) {
      setDangerResult({ error: 'Administrator password is required.' });
      return;
    }

    setDangerExecuting(true);
    setDangerResult(null);

    try {
      const res = await api.admin.dangerAction(dangerModal.action, {
        confirmText: confirmInput,
        adminPassword: adminPasswordInput
      });

      setDangerResult({ success: true, message: res.message || 'Operation completed successfully.' });
      // If configuration was reset, refresh
      if (dangerModal.action === 'reset-platform-config' || dangerModal.action === 'factory-reset') {
        if (res.settings) {
          setSavedSettings(res.settings);
          setFormData(JSON.parse(JSON.stringify(res.settings)));
        } else {
          fetchSettings();
        }
      }
    } catch (err) {
      setDangerResult({ error: err.message || 'Action failed.' });
    } finally {
      setDangerExecuting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 text-slate-400">
        <RefreshCw className="w-8 h-8 text-teal-400 animate-spin" />
        <p className="text-sm font-semibold tracking-wide">Loading platform configuration…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 space-y-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
          <h3 className="font-bold text-lg text-white">Unable to load platform settings</h3>
        </div>
        <p className="text-sm text-rose-300/80">{loadError}</p>
        <button
          onClick={fetchSettings}
          className="px-5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-white text-sm font-bold transition flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const activeMeta = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];
  const dirtyThis = isCategoryDirty(activeCategory);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Settings className="w-6 h-6 text-teal-400" /> Platform Configuration
            </h2>
            {hasAnyDirty() && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Authoritative global configuration center. Changes are validated, audited, and enforced server-side.
          </p>
        </div>

        {/* Global Save Status / Controls */}
        <div className="flex items-center gap-3">
          {saveStatus.state === 'saving' && (
            <div className="flex items-center gap-2 text-xs text-teal-400 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…
            </div>
          )}
          {saveStatus.state === 'saved' && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus.message}
            </div>
          )}
          {saveStatus.state === 'error' && (
            <div className="flex items-center gap-2 text-xs text-rose-400 font-medium animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5" /> {saveStatus.message}
            </div>
          )}

          {activeCategory !== 'danger' && dirtyThis && (
            <>
              <button
                type="button"
                onClick={() => discardCategoryChanges(activeCategory)}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Discard
              </button>
              <button
                type="button"
                onClick={() => handleSave(activeCategory)}
                disabled={saveStatus.state === 'saving'}
                className="px-4 py-2 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-teal-500/20 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Layout: Settings Navigation Sidebar + Content Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Navigation Sidebar */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-white/5 rounded-2xl p-2 flex flex-row lg:flex-col gap-1 overflow-x-auto no-scrollbar touch-pan-x backdrop-blur-xl">
          <div className="hidden lg:block px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-500">
            Configuration Sections
          </div>
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const isDirty = isCategoryDirty(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`shrink-0 lg:w-full text-left px-3.5 py-2.5 rounded-xl transition flex items-center justify-between group ${
                  isActive
                    ? cat.danger
                      ? 'bg-rose-500/15 text-rose-300 font-bold border border-rose-500/30'
                      : 'bg-teal-500/10 text-teal-300 font-bold border border-teal-500/30 shadow-[0_0_15px_rgba(45,212,191,0.08)]'
                    : cat.danger
                      ? 'text-rose-400/80 hover:bg-rose-500/10 hover:text-rose-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? (cat.danger ? 'text-rose-400' : 'text-teal-400') : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <div className="truncate text-xs">
                    <span className="block truncate">{cat.label}</span>
                  </div>
                </div>
                {isDirty && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 ml-2" title="Unsaved changes in this section" />
                )}
              </button>
            );
          })}
        </div>

        {/* Section Content Area */}
        <div className="lg:col-span-8 space-y-6">
          <div className={`p-6 rounded-2xl border backdrop-blur-xl ${
            activeMeta.danger
              ? 'bg-rose-950/20 border-rose-500/30 shadow-[0_0_30px_rgba(244,63,94,0.05)]'
              : 'bg-slate-900/40 border-white/5'
          }`}>
            {/* Category Header */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-white/5">
              <div>
                <h3 className={`text-lg font-black tracking-tight flex items-center gap-2 ${activeMeta.danger ? 'text-rose-300' : 'text-white'}`}>
                  <activeMeta.icon className={`w-5 h-5 ${activeMeta.danger ? 'text-rose-400' : 'text-teal-400'}`} />
                  {activeMeta.label}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">{activeMeta.description}</p>
              </div>

              {dirtyThis && activeCategory !== 'danger' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20">
                    Modified
                  </span>
                </div>
              )}
            </div>

            {/* RENDER CATEGORY VIEW */}
            {renderCategoryContent()}
          </div>
        </div>
      </div>

      {/* Danger Zone Execution Confirmation Modal */}
      {dangerModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel border border-rose-500/40 rounded-3xl p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{dangerModal.title}</h3>
                <p className="text-xs text-rose-400/80">Destructive administrative operation</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {dangerModal.description}
            </p>

            {dangerResult?.error && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold">
                {dangerResult.error}
              </div>
            )}

            {dangerResult?.success && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                {dangerResult.message}
              </div>
            )}

            {!dangerResult?.success && (
              <div className="space-y-3 pt-2">
                {dangerModal.requireText && (
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                      Type <span className="text-white font-mono font-bold select-all">"{dangerModal.requireText}"</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={e => setConfirmInput(e.target.value)}
                      placeholder={dangerModal.requireText}
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-rose-400"
                    />
                  </div>
                )}

                {dangerModal.requirePassword && (
                  <div>
                    <label className="text-[11px] text-slate-400 font-semibold mb-1 block">
                      Confirm Administrator Password:
                    </label>
                    <input
                      type="password"
                      value={adminPasswordInput}
                      onChange={e => setAdminPasswordInput(e.target.value)}
                      placeholder="Admin password"
                      className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-rose-400"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setDangerModal(null);
                  setConfirmInput('');
                  setAdminPasswordInput('');
                  setDangerResult(null);
                }}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold transition"
              >
                {dangerResult?.success ? 'Close' : 'Cancel'}
              </button>

              {!dangerResult?.success && (
                <button
                  type="button"
                  onClick={handleExecuteDanger}
                  disabled={dangerExecuting}
                  className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-rose-500/20 disabled:opacity-50"
                >
                  {dangerExecuting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{dangerExecuting ? 'Executing…' : 'Execute Destructive Action'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper row component for toggles
  function SettingToggleRow({ label, description, checked, onChange, disabled = false }) {
    return (
      <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-b-0 group">
        <div className="pr-4 min-w-0">
          <div className="text-xs font-semibold text-white group-hover:text-teal-300 transition">{label}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={Boolean(checked)}
            onChange={e => onChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-500"></div>
        </label>
      </div>
    );
  }

  // Helper row for select dropdowns
  function SettingSelectRow({ label, description, value, options, onChange }) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 last:border-b-0 gap-2">
        <div className="pr-4 min-w-0">
          <div className="text-xs font-semibold text-white">{label}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</div>
        </div>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 shrink-0 font-medium"
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  // Helper row for inputs
  function SettingInputRow({ label, description, value, type = 'text', onChange, placeholder = '' }) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3 border-b border-white/5 last:border-b-0 gap-2">
        <div className="pr-4 min-w-0">
          <div className="text-xs font-semibold text-white">{label}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</div>
        </div>
        <input
          type={type}
          value={value ?? ''}
          placeholder={placeholder}
          onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-400 shrink-0 w-full sm:w-48 font-medium"
        />
      </div>
    );
  }

  // Helper row for danger actions
  function DangerActionRow({ label, description, buttonLabel, onAction, variant = 'danger' }) {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-3.5 border-b border-white/5 last:border-b-0 gap-3">
        <div className="pr-4 min-w-0">
          <div className="text-xs font-bold text-white">{label}</div>
          <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{description}</div>
        </div>
        <button
          type="button"
          onClick={onAction}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 flex items-center justify-center gap-1.5 ${
            variant === 'danger'
              ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 shadow-lg shadow-rose-500/10'
              : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30'
          }`}
        >
          {buttonLabel}
        </button>
      </div>
    );
  }

  function renderCategoryContent() {
    const data = formData;
    if (!data) return null;

    switch (activeCategory) {
      // 1. PLATFORM
      case 'platform': {
        const p = data.platform || {};
        return (
          <div className="space-y-4">
            <SettingToggleRow
              label="Allow User Registration"
              description="Permit new listeners to register accounts. When disabled, public registration is halted while existing users retain full login access."
              checked={p.allowUserRegistration}
              onChange={v => updateField('platform', 'allowUserRegistration', v)}
            />
            <SettingToggleRow
              label="Require Account Verification"
              description="Require newly created user accounts to pass verification before obtaining standard listener access."
              checked={p.requireAccountVerification}
              onChange={v => updateField('platform', 'requireAccountVerification', v)}
            />
            <SettingSelectRow
              label="Default New-User Plan"
              description="The Resona entitlement tier automatically provisioned for future registered listeners. Existing accounts remain unaffected."
              value={p.defaultPlan || 'resona'}
              options={[
                { value: 'resona', label: 'Resona (Standard Free)' },
                { value: 'resona_silver', label: 'Resona Silver' },
                { value: 'resona_gold', label: 'Resona Gold' },
                { value: 'resona_platinum', label: 'Resona Platinum' },
              ]}
              onChange={v => updateField('platform', 'defaultPlan', v)}
            />
            <SettingToggleRow
              label="Maintenance Mode"
              description="Enforce global maintenance server-side. Normal users are presented with the maintenance message while administrators retain full access."
              checked={p.maintenanceMode}
              onChange={v => updateField('platform', 'maintenanceMode', v)}
            />
            <div className="pt-2">
              <label className="text-xs font-semibold text-white block mb-1">Maintenance Message</label>
              <p className="text-[11px] text-slate-400 mb-2 leading-relaxed">
                Notice presented to listeners across web and client views during active maintenance.
              </p>
              <textarea
                value={p.maintenanceMessage || ''}
                onChange={e => updateField('platform', 'maintenanceMessage', e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>
        );
      }

      // 2. MUSIC & CATALOG
      case 'catalog': {
        const c = data.catalog || {};
        return (
          <div className="space-y-4">
            <SettingToggleRow
              label="Public Catalog Discovery"
              description="Controls whether music catalog and search discovery are active for normal users. Existing audio files remain preserved."
              checked={c.publicCatalog}
              onChange={v => updateField('catalog', 'publicCatalog', v)}
            />
            <SettingToggleRow
              label="Allow Admin Catalog Uploads"
              description="Permit administrators to upload and publish official tracks through the Music Catalog panel."
              checked={c.allowAdminUploads}
              onChange={v => updateField('catalog', 'allowAdminUploads', v)}
            />
            <SettingToggleRow
              label="Allow User Original Uploads"
              description="Permit approved creators and users to publish original music compositions."
              checked={c.allowUserOriginalUploads}
              onChange={v => updateField('catalog', 'allowUserOriginalUploads', v)}
            />
            <SettingToggleRow
              label="Allow Song Recommendations"
              description="Permit listeners to submit song suggestions and requests for administrative evaluation."
              checked={c.allowSongRecommendations}
              onChange={v => updateField('catalog', 'allowSongRecommendations', v)}
            />
            <SettingToggleRow
              label="Require Catalog Approval"
              description="Enforce manual administrative review on submitted content prior to catalog publication."
              checked={c.requireCatalogApproval}
              onChange={v => updateField('catalog', 'requireCatalogApproval', v)}
            />

            <div className="pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Platform Playback Availability</h4>
              <SettingSelectRow
                label="Default Streaming Quality"
                description="Authoritative baseline playback stream bitrate."
                value={c.defaultStreamingQuality || 'high'}
                options={[
                  { value: 'standard', label: 'Standard (128 kbps)' },
                  { value: 'high', label: 'High (320 kbps)' },
                  { value: 'lossless', label: 'Lossless Hi-Res FLAC' },
                ]}
                onChange={v => updateField('catalog', 'defaultStreamingQuality', v)}
              />
              <SettingToggleRow
                label="Enable Up-Next Queue"
                description="Global playback queue functionality."
                checked={c.enableQueue}
                onChange={v => updateField('catalog', 'enableQueue', v)}
              />
              <SettingToggleRow
                label="Enable Shuffle Playback"
                description="Global randomized track shuffling."
                checked={c.enableShuffle}
                onChange={v => updateField('catalog', 'enableShuffle', v)}
              />
              <SettingToggleRow
                label="Enable Repeat Context"
                description="Global repeat single track and loop queue."
                checked={c.enableRepeat}
                onChange={v => updateField('catalog', 'enableRepeat', v)}
              />
              <SettingToggleRow
                label="Enable Gapless Audio"
                description="Eliminate silence gaps between consecutive tracks."
                checked={c.enableGapless}
                onChange={v => updateField('catalog', 'enableGapless', v)}
              />
              <SettingToggleRow
                label="Allow Lossless Audio Globally"
                description="Global platform switch for FLAC lossless streams. When disabled, lossless quality cannot be unlocked by any plan."
                checked={c.allowLosslessAudio}
                onChange={v => updateField('catalog', 'allowLosslessAudio', v)}
              />
            </div>
          </div>
        );
      }

      // 3. CREATOR HUB
      case 'creator': {
        const cr = data.creator || {};
        return (
          <div className="space-y-4">
            <SettingToggleRow
              label="Enable Creator Hub"
              description="Global availability of the Creator Studio interface and associated artist features."
              checked={cr.enableCreatorHub}
              onChange={v => updateField('creator', 'enableCreatorHub', v)}
            />
            <SettingToggleRow
              label="Allow Creator Applications"
              description="Permit listeners to submit creator/artist onboarding applications."
              checked={cr.allowCreatorApplications}
              onChange={v => updateField('creator', 'allowCreatorApplications', v)}
            />
            <SettingToggleRow
              label="Require Admin Approval for Creators"
              description="Mandate administrative approval in the Creator Applications dashboard before creator privileges activate."
              checked={cr.requireAdminApproval}
              onChange={v => updateField('creator', 'requireAdminApproval', v)}
            />
            <SettingToggleRow
              label="Allow Creator Uploads"
              description="Enable track uploading inside the Creator Studio."
              checked={cr.allowCreatorUploads}
              onChange={v => updateField('creator', 'allowCreatorUploads', v)}
            />
            <SettingToggleRow
              label="Enable Creator Analytics"
              description="Grant artists real-time performance analytics on stream count and follower growth."
              checked={cr.enableCreatorAnalytics}
              onChange={v => updateField('creator', 'enableCreatorAnalytics', v)}
            />

            <div className="pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Creator Upload Restrictions</h4>
              <SettingInputRow
                label="Maximum Audio File Size (MB)"
                description="Enforced ceiling for creator audio uploads."
                type="number"
                value={cr.maxAudioFileSizeMb || 50}
                onChange={v => updateField('creator', 'maxAudioFileSizeMb', v)}
              />
              <SettingInputRow
                label="Maximum Track Duration (Minutes)"
                description="Maximum allowable duration per single uploaded track."
                type="number"
                value={cr.maxTrackDurationMinutes || 20}
                onChange={v => updateField('creator', 'maxTrackDurationMinutes', v)}
              />
              <SettingToggleRow
                label="Require Cover Artwork"
                description="Disallow track submissions that lack album cover artwork."
                checked={cr.requireCoverArt}
                onChange={v => updateField('creator', 'requireCoverArt', v)}
              />
              <SettingToggleRow
                label="Require Publishing Approval"
                description="Draft new creator tracks as 'Pending' until reviewed by platform moderation."
                checked={cr.requirePublishingApproval}
                onChange={v => updateField('creator', 'requirePublishingApproval', v)}
              />
            </div>
          </div>
        );
      }

      // 4. SOCIAL & COMMUNITY
      case 'social': {
        const s = data.social || {};
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-teal-400" />
              <span>Global availability controls strictly override plan entitlements and user overrides.</span>
            </div>
            <SettingToggleRow
              label="Enable Social Profiles"
              description="User profile discovery, listener follow relationships, and public handles."
              checked={s.enableSocialProfiles}
              onChange={v => updateField('social', 'enableSocialProfiles', v)}
            />
            <SettingToggleRow
              label="Enable Friend Activity"
              description="Live feed showcasing what friends and followed listeners are playing."
              checked={s.enableFriendActivity}
              onChange={v => updateField('social', 'enableFriendActivity', v)}
            />
            <SettingToggleRow
              label="Enable Fusion"
              description="Blended collaborative playlists dynamically matched to mutual listening taste."
              checked={s.enableFusion}
              onChange={v => updateField('social', 'enableFusion', v)}
            />
            <SettingToggleRow
              label="Enable Social Huddle"
              description="Synchronized real-time listening lounges and chat sessions."
              checked={s.enableHuddle}
              onChange={v => updateField('social', 'enableHuddle', v)}
            />
            <SettingToggleRow
              label="Enable Track Sharing"
              description="External deep link generation for sharing songs and albums."
              checked={s.enableSharing}
              onChange={v => updateField('social', 'enableSharing', v)}
            />
            <SettingToggleRow
              label="Enable Beat Codes"
              description="Scannable visual wave codes for instant music handoffs."
              checked={s.enableBeatCodes}
              onChange={v => updateField('social', 'enableBeatCodes', v)}
            />

            <div className="pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Social Defaults for New Accounts</h4>
              <SettingSelectRow
                label="Default Profile Visibility"
                description="Initial privacy setting assigned to newly registered listeners."
                value={s.defaultProfileVisibility || 'public'}
                options={[
                  { value: 'public', label: 'Public (Discoverable by everyone)' },
                  { value: 'friends', label: 'Friends Only' },
                  { value: 'private', label: 'Private (Hidden)' }
                ]}
                onChange={v => updateField('social', 'defaultProfileVisibility', v)}
              />
              <SettingSelectRow
                label="Default Activity Visibility"
                description="Initial state of 'Currently Playing' broadcast for new listeners."
                value={s.defaultActivityVisibility || 'friends'}
                options={[
                  { value: 'public', label: 'Public' },
                  { value: 'friends', label: 'Friends Only' },
                  { value: 'private', label: 'Private' }
                ]}
                onChange={v => updateField('social', 'defaultActivityVisibility', v)}
              />
            </div>
          </div>
        );
      }

      // 5. PRIVACY & DATA
      case 'privacy': {
        const pr = data.privacy || {};
        return (
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs">
              <strong>Zero-Access Principle:</strong> Administrative settings govern platform data policies. Administrators are strictly prevented from viewing private user audio files, chats, or unshared playlists.
            </div>

            <SettingSelectRow
              label="Default Playlist Visibility"
              description="Visibility assigned to newly generated user playlists."
              value={pr.defaultPlaylistVisibility || 'public'}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'friends', label: 'Friends Only' },
                { value: 'private', label: 'Private' }
              ]}
              onChange={v => updateField('privacy', 'defaultPlaylistVisibility', v)}
            />
            <SettingSelectRow
              label="Default Recently Played Visibility"
              description="Initial visibility for listening history entries on user profiles."
              value={pr.defaultRecentlyPlayed || 'friends'}
              options={[
                { value: 'public', label: 'Public' },
                { value: 'friends', label: 'Friends Only' },
                { value: 'private', label: 'Private' }
              ]}
              onChange={v => updateField('privacy', 'defaultRecentlyPlayed', v)}
            />
            <SettingInputRow
              label="Listening History Retention (Days)"
              description="Policy duration for retaining listener streaming logs. 0 retains indefinitely."
              type="number"
              value={pr.listeningHistoryRetentionDays || 365}
              onChange={v => updateField('privacy', 'listeningHistoryRetentionDays', v)}
            />
            <SettingInputRow
              label="Search History Retention (Days)"
              description="Duration query telemetry remains retained for search suggestions."
              type="number"
              value={pr.searchHistoryRetentionDays || 90}
              onChange={v => updateField('privacy', 'searchHistoryRetentionDays', v)}
            />
            <SettingToggleRow
              label="Allow Account Self-Deletion"
              description="Permit registered listeners to permanently erase their account and private library data."
              checked={pr.allowAccountDeletion}
              onChange={v => updateField('privacy', 'allowAccountDeletion', v)}
            />
            <SettingToggleRow
              label="Allow Data Export"
              description="Permit users to download a copy of their listening history and playlists in JSON format."
              checked={pr.allowDataExport}
              onChange={v => updateField('privacy', 'allowDataExport', v)}
            />
          </div>
        );
      }

      // 6. API & DEVELOPER
      case 'api': {
        const a = data.api || {};
        return (
          <div className="space-y-4">
            <SettingToggleRow
              label="Global API Access"
              description="Master switch controlling platform REST endpoint availability."
              checked={a.enableApiAccess}
              onChange={v => updateField('api', 'enableApiAccess', v)}
            />
            <SettingToggleRow
              label="User Client API Access"
              description="Permit standard listener client sessions to communicate with the REST API."
              checked={a.enableUserApiAccess}
              onChange={v => updateField('api', 'enableUserApiAccess', v)}
            />
            <SettingToggleRow
              label="Creator API Access"
              description="Allow creator tools and artist studio upload endpoints."
              checked={a.enableCreatorApiAccess}
              onChange={v => updateField('api', 'enableCreatorApiAccess', v)}
            />
            <SettingToggleRow
              label="Administrator API Access"
              description="Admin route availability. When disabled, admin requests require local console access."
              checked={a.enableAdminApiAccess}
              onChange={v => updateField('api', 'enableAdminApiAccess', v)}
            />
            <SettingToggleRow
              label="Allow API Key Management"
              description="Permit developer tokens for external integrations."
              checked={a.allowApiKeyManagement}
              onChange={v => updateField('api', 'allowApiKeyManagement', v)}
            />
            <SettingInputRow
              label="Default Session Token Expiration (Days)"
              description="Maximum lifespan for standard JWT user sessions."
              type="number"
              value={a.tokenExpirationDays || 30}
              onChange={v => updateField('api', 'tokenExpirationDays', v)}
            />
            <SettingToggleRow
              label="Allow Token Revocation"
              description="Immediately invalidate JWT sessions when password or credentials change."
              checked={a.allowTokenRevocation}
              onChange={v => updateField('api', 'allowTokenRevocation', v)}
            />
          </div>
        );
      }

      // 7. STORAGE & MEDIA
      case 'storage': {
        const st = data.storage || {};
        return (
          <div className="space-y-4">
            <SettingToggleRow
              label="Allow Audio Uploads"
              description="Permit audio file uploads to backend storage (/data/media)."
              checked={st.allowAudioUploads}
              onChange={v => updateField('storage', 'allowAudioUploads', v)}
            />
            <SettingToggleRow
              label="Allow Image Uploads"
              description="Permit cover artwork and profile image uploads."
              checked={st.allowImageUploads}
              onChange={v => updateField('storage', 'allowImageUploads', v)}
            />
            <SettingInputRow
              label="Max Audio Size (MB)"
              description="Server-enforced ceiling for single audio file uploads."
              type="number"
              value={st.maxAudioSizeMb || 50}
              onChange={v => updateField('storage', 'maxAudioSizeMb', v)}
            />
            <SettingInputRow
              label="Max Image Size (MB)"
              description="Server-enforced ceiling for image artwork uploads."
              type="number"
              value={st.maxImageSizeMb || 10}
              onChange={v => updateField('storage', 'maxImageSizeMb', v)}
            />
            <SettingToggleRow
              label="Automated Audio Processing"
              description="Validate audio integrity, channel count, and sample rate upon upload."
              checked={st.audioProcessing}
              onChange={v => updateField('storage', 'audioProcessing', v)}
            />
            <SettingToggleRow
              label="Metadata Extraction"
              description="Automatically parse ID3 tags, artist names, and duration from audio headers."
              checked={st.metadataExtraction}
              onChange={v => updateField('storage', 'metadataExtraction', v)}
            />
            <SettingInputRow
              label="Temp Upload Retention (Hours)"
              description="Retention period before orphan temporary upload files are flagged for removal."
              type="number"
              value={st.tempUploadRetentionHours || 24}
              onChange={v => updateField('storage', 'tempUploadRetentionHours', v)}
            />
            <SettingToggleRow
              label="Auto Cleanup Failed Uploads"
              description="Purge incomplete multipart uploads automatically."
              checked={st.failedUploadCleanup}
              onChange={v => updateField('storage', 'failedUploadCleanup', v)}
            />
          </div>
        );
      }

      // 8. NOTIFICATIONS
      case 'notifications': {
        const n = data.notifications || {};
        return (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Notification Categories</h4>
            <SettingToggleRow
              label="Account & Security Alerts"
              description="Deliver notifications regarding logins, password updates, and plan changes."
              checked={n.enableAccountNotifications}
              onChange={v => updateField('notifications', 'enableAccountNotifications', v)}
            />
            <SettingToggleRow
              label="New Music Releases"
              description="Notify listeners when followed artists publish new catalog tracks."
              checked={n.enableNewReleaseNotifications}
              onChange={v => updateField('notifications', 'enableNewReleaseNotifications', v)}
            />
            <SettingToggleRow
              label="Creator Application Updates"
              description="Alert applicants when their creator submission is approved or reviewed."
              checked={n.enableCreatorNotifications}
              onChange={v => updateField('notifications', 'enableCreatorNotifications', v)}
            />
            <SettingToggleRow
              label="Social Huddle & Fusion Invites"
              description="Notify users when invited to participate in listening parties or joint playlists."
              checked={n.enableHuddleNotifications}
              onChange={v => updateField('notifications', 'enableHuddleNotifications', v)}
            />
            <SettingToggleRow
              label="System Announcements"
              description="Broadcast administrative bulletins and service maintenance notifications."
              checked={n.enableSystemAnnouncements}
              onChange={v => updateField('notifications', 'enableSystemAnnouncements', v)}
            />

            <div className="pt-4 border-t border-white/5">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Delivery Channels</h4>
              <SettingToggleRow
                label="In-App Notifications"
                description="Deliver alerts within the Resona interface bell drawer."
                checked={n.enableInAppNotifications}
                onChange={v => updateField('notifications', 'enableInAppNotifications', v)}
              />
              <SettingToggleRow
                label="Email Notifications"
                description="Dispatch transactional emails to registered listener email addresses."
                checked={n.enableEmailNotifications}
                onChange={v => updateField('notifications', 'enableEmailNotifications', v)}
              />
            </div>
          </div>
        );
      }

      // 9. AUDIO DEFAULTS
      case 'audioDefaults': {
        const ad = data.audioDefaults || {};
        return (
          <div className="space-y-4">
            <SettingSelectRow
              label="Default Audio Quality"
              description="Baseline streaming quality applied prior to listener customization."
              value={ad.defaultAudioQuality || 'high'}
              options={[
                { value: 'standard', label: 'Standard (128 kbps)' },
                { value: 'high', label: 'High Bitrate (320 kbps)' },
                { value: 'lossless', label: 'Hi-Res Lossless' }
              ]}
              onChange={v => updateField('audioDefaults', 'defaultAudioQuality', v)}
            />
            <SettingToggleRow
              label="Default Autoplay"
              description="Automatically continue playing related music when the current queue completes."
              checked={ad.defaultAutoplay}
              onChange={v => updateField('audioDefaults', 'defaultAutoplay', v)}
            />
            <SettingInputRow
              label="Default Crossfade (Seconds)"
              description="Number of seconds to overlap playback between consecutive songs."
              type="number"
              value={ad.defaultCrossfadeSeconds || 3}
              onChange={v => updateField('audioDefaults', 'defaultCrossfadeSeconds', v)}
            />
            <SettingToggleRow
              label="Default Gapless Playback"
              description="Seamless audio transitions between live concert tracks."
              checked={ad.defaultGapless}
              onChange={v => updateField('audioDefaults', 'defaultGapless', v)}
            />
            <SettingToggleRow
              label="Audio Normalization"
              description="Balance volume consistency across varied studio mastered tracks."
              checked={ad.enableAudioNormalization}
              onChange={v => updateField('audioDefaults', 'enableAudioNormalization', v)}
            />
            <SettingInputRow
              label="Default Initial Volume (0-100)"
              description="Starting audio level applied on first launch on a new device."
              type="number"
              value={ad.defaultVolumeLevel || 85}
              onChange={v => updateField('audioDefaults', 'defaultVolumeLevel', v)}
            />
          </div>
        );
      }

      // 10. CONTENT & SAFETY
      case 'contentSafety': {
        const cs = data.contentSafety || {};
        return (
          <div className="space-y-4">
            <SettingToggleRow
              label="Require Content Approval"
              description="Prevent user/creator tracks from going public without explicit moderation signoff."
              checked={cs.requireContentApproval}
              onChange={v => updateField('contentSafety', 'requireContentApproval', v)}
            />
            <SettingToggleRow
              label="Allow User Reports"
              description="Enable listeners to flag inappropriate tracks, comments, or playlists."
              checked={cs.allowUserReports}
              onChange={v => updateField('contentSafety', 'allowUserReports', v)}
            />
            <SettingToggleRow
              label="Enable Account Safety Restrictions"
              description="Enable administrative rate limiting and mute sanctions for abusive accounts."
              checked={cs.enableAccountRestrictions}
              onChange={v => updateField('contentSafety', 'enableAccountRestrictions', v)}
            />
            <SettingToggleRow
              label="Allow Explicit Content on Platform"
              description="Permit tracks marked with explicit language or parental advisories."
              checked={cs.allowExplicitContent}
              onChange={v => updateField('contentSafety', 'allowExplicitContent', v)}
            />
            <SettingSelectRow
              label="Default Explicit Content Preference"
              description="Default filter setting for newly registered listeners."
              value={cs.defaultExplicitPreference || 'allow'}
              options={[
                { value: 'allow', label: 'Allow Explicit Tracks' },
                { value: 'warn', label: 'Display Advisory Warning' },
                { value: 'filter', label: 'Clean Only (Filter Explicit)' }
              ]}
              onChange={v => updateField('contentSafety', 'defaultExplicitPreference', v)}
            />
          </div>
        );
      }

      // 11. ADMINISTRATION & AUDIT
      case 'audit': {
        const au = data.audit || {};
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 mb-2">
              Configure which administrative and security events are logged into the immutable audit store.
            </p>
            <SettingToggleRow
              label="Log Authentication Events"
              description="Track administrator logins, session creations, and failed authentication attempts."
              checked={au.logAuthEvents}
              onChange={v => updateField('audit', 'logAuthEvents', v)}
            />
            <SettingToggleRow
              label="Log User Account Actions"
              description="Record role modifications, account disabling, and user deletion."
              checked={au.logUserChanges}
              onChange={v => updateField('audit', 'logUserChanges', v)}
            />
            <SettingToggleRow
              label="Log Plan & Entitlement Updates"
              description="Record changes to user subscription tiers and feature overrides."
              checked={au.logPlanChanges}
              onChange={v => updateField('audit', 'logPlanChanges', v)}
            />
            <SettingToggleRow
              label="Log Catalog Operations"
              description="Record track uploads, metadata updates, and catalog deletions."
              checked={au.logCatalogChanges}
              onChange={v => updateField('audit', 'logCatalogChanges', v)}
            />
            <SettingToggleRow
              label="Log Creator Decisions"
              description="Record creator application approvals, reviews, and rejections."
              checked={au.logCreatorDecisions}
              onChange={v => updateField('audit', 'logCreatorDecisions', v)}
            />
            <SettingToggleRow
              label="Log Destructive Danger Zone Operations"
              description="Mandatory auditing of cache wipes, index rebuilds, and database resets."
              checked={au.logDestructiveActions}
              disabled={true}
              onChange={() => {}}
            />
            <SettingInputRow
              label="Audit Log Retention (Days)"
              description="Retention window for historical audit records."
              type="number"
              value={au.auditRetentionDays || 90}
              onChange={v => updateField('audit', 'auditRetentionDays', v)}
            />
          </div>
        );
      }

      // 12. SYSTEM
      case 'system': {
        const sys = data.system || {};
        const envInfo = systemMetrics?.status?.environment;
        const health = systemMetrics?.health;
        const storage = systemMetrics?.storage;

        return (
          <div className="space-y-6">
            {/* Live Runtime Telemetry */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Environment</span>
                <div className="text-sm font-bold text-teal-400 font-mono">
                  {envInfo?.name ? envInfo.name.toUpperCase() : 'DETECTING…'}
                </div>
                <div className="text-[10px] text-slate-500">Source: {envInfo?.source || 'NODE_ENV'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Backend API</span>
                <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Online (Node {systemMetrics?.status?.process?.nodeVersion || 'v20'})</span>
                </div>
                <div className="text-[10px] text-slate-500">Uptime: {systemMetrics?.status?.process?.uptimeSeconds ? `${Math.round(systemMetrics.status.process.uptimeSeconds / 60)} mins` : 'Live'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Data Storage Engine</span>
                <div className="text-sm font-bold text-white font-mono">
                  {storage ? `${storage.humanReadableTotalSize || 'Healthy'} (${storage.fileCount || 0} files)` : 'JSON Segregated Store'}
                </div>
                <div className="text-[10px] text-slate-500">Storage Synced • Health: {health?.status || 'online'}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Platform Status</span>
                <div className="text-sm font-bold text-white font-mono">
                  {data.platform?.maintenanceMode ? (
                    <span className="text-amber-400">MAINTENANCE ACTIVE</span>
                  ) : (
                    <span className="text-teal-400">OPERATIONAL</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-500">Public routing active</div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Diagnostics Configuration</h4>
              <SettingSelectRow
                label="Logging Level"
                description="Verbosity threshold for console and telemetry log capture."
                value={sys.logLevel || 'info'}
                options={[
                  { value: 'debug', label: 'Debug (Verbose)' },
                  { value: 'info', label: 'Info (Standard)' },
                  { value: 'warn', label: 'Warnings Only' },
                  { value: 'error', label: 'Errors Only' },
                ]}
                onChange={v => updateField('system', 'logLevel', v)}
              />
              <SettingToggleRow
                label="Enable Error Reporting"
                description="Capture and record runtime error stacks for administrative triage."
                checked={sys.enableErrorReporting}
                onChange={v => updateField('system', 'enableErrorReporting', v)}
              />
              <SettingToggleRow
                label="Periodic System Health Checks"
                description="Continuously poll storage and Firebase connectivity."
                checked={sys.enableSystemHealthChecks}
                onChange={v => updateField('system', 'enableSystemHealthChecks', v)}
              />
            </div>
          </div>
        );
      }

      // 13. APPEARANCE & BRANDING
      case 'branding': {
        const br = data.branding || {};
        return (
          <div className="space-y-4">
            <SettingInputRow
              label="Platform Name"
              description="Application branding name displayed across headers and metadata."
              value={br.platformName || 'Resona'}
              onChange={v => updateField('branding', 'platformName', v)}
            />
            <SettingInputRow
              label="Brand Tagline"
              description="Promotional subtext displayed on splash screens and welcome pages."
              value={br.brandTagline || 'The Pure High-Fidelity Music Experience'}
              onChange={v => updateField('branding', 'brandTagline', v)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-b border-white/5">
              <div>
                <label className="text-xs font-semibold text-white block mb-1">Primary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={br.accentColor || '#2dd4bf'}
                    onChange={e => updateField('branding', 'accentColor', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={br.accentColor || '#2dd4bf'}
                    onChange={e => updateField('branding', 'accentColor', e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono w-28"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-white block mb-1">Secondary Accent Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={br.secondaryAccentColor || '#a855f7'}
                    onChange={e => updateField('branding', 'secondaryAccentColor', e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={br.secondaryAccentColor || '#a855f7'}
                    onChange={e => updateField('branding', 'secondaryAccentColor', e.target.value)}
                    className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white font-mono w-28"
                  />
                </div>
              </div>
            </div>

            <SettingInputRow
              label="Default Track Artwork URL"
              description="Fallback cover image for tracks lacking custom uploaded artwork."
              value={br.defaultArtworkUrl || ''}
              onChange={v => updateField('branding', 'defaultArtworkUrl', v)}
            />
          </div>
        );
      }

      // 14. DANGER ZONE
      case 'danger': {
        return (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs leading-relaxed space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-white">
                <AlertTriangle className="w-4 h-4 text-rose-400" /> Caution: Administrative Operations
              </div>
              <div>
                Destructive actions permanently modify or erase persistent platform data. Every operation requires explicit confirmation and generates a high-severity audit log entry.
              </div>
            </div>

            {/* Platform Emergency Controls */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">Platform Emergency Toggles</h4>
              <SettingToggleRow
                label="Toggle Platform Maintenance Mode"
                description="Immediately block public access while preserving administrative control."
                checked={data.platform?.maintenanceMode}
                onChange={v => {
                  updateField('platform', 'maintenanceMode', v);
                  handleSave('platform');
                }}
              />
              <SettingToggleRow
                label="Toggle User Registration"
                description="Instantly enable or halt new listener registration."
                checked={data.platform?.allowUserRegistration}
                onChange={v => {
                  updateField('platform', 'allowUserRegistration', v);
                  handleSave('platform');
                }}
              />
            </div>

            {/* Maintenance Operations */}
            <div className="pt-4 border-t border-white/5 space-y-1">
              <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider mb-2">Maintenance Actions</h4>
              <DangerActionRow
                label="Clear Temporary Uploads"
                description="Scan storage and delete orphan .tmp files or unreferenced temporary uploads from /data/media."
                buttonLabel="Clear Temp Files"
                variant="warning"
                onAction={() => setDangerModal({
                  action: 'clear-temp-uploads',
                  title: 'Clear Temporary Uploads',
                  description: 'This will purge unreferenced temporary audio files and incomplete uploads. Active catalog songs will NOT be affected.',
                  requireText: null,
                  requirePassword: false
                })}
              />
              <DangerActionRow
                label="Clear Platform Memory Caches"
                description="Flush in-memory rate limiting counters and query suggestion caches."
                buttonLabel="Clear Caches"
                variant="warning"
                onAction={() => setDangerModal({
                  action: 'clear-cache',
                  title: 'Clear Platform Caches',
                  description: 'This will reset in-memory caches and force reload of fresh configuration on the next request.',
                  requireText: null,
                  requirePassword: false
                })}
              />
              <DangerActionRow
                label="Rebuild Catalog Index"
                description="Verify and normalize all track entries, genres, and stream counters in catalog.json."
                buttonLabel="Rebuild Catalog Index"
                variant="warning"
                onAction={() => setDangerModal({
                  action: 'rebuild-catalog-index',
                  title: 'Rebuild Catalog Index',
                  description: 'This will verify IDs, status fields, and genre normalization across all catalog tracks.',
                  requireText: null,
                  requirePassword: false
                })}
              />
              <DangerActionRow
                label="Rebuild Recommendation Index"
                description="Re-cluster music library genres and personalized suggestion matrices."
                buttonLabel="Rebuild Recommendations"
                variant="warning"
                onAction={() => setDangerModal({
                  action: 'rebuild-recommendation-index',
                  title: 'Rebuild Recommendation Index',
                  description: 'Re-index genre affinities across current catalog tracks.',
                  requireText: null,
                  requirePassword: false
                })}
              />
            </div>

            {/* Destructive Operations */}
            <div className="pt-4 border-t border-rose-500/20 space-y-1">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-2">Destructive Actions</h4>
              <DangerActionRow
                label="Reset Platform Configuration"
                description="Revert all 14 settings categories to authoritative Resona system defaults."
                buttonLabel="Reset Configuration"
                onAction={() => setDangerModal({
                  action: 'reset-platform-config',
                  title: 'Reset Platform Configuration',
                  description: 'This will revert all global settings, storage limits, and feature defaults back to platform defaults.',
                  requireText: 'RESET CONFIGURATION',
                  requirePassword: false
                })}
              />
              <DangerActionRow
                label="Delete Entire Music Catalog"
                description="Erase all published catalog tracks and playlists permanently."
                buttonLabel="Delete Catalog"
                onAction={() => setDangerModal({
                  action: 'delete-catalog',
                  title: 'Delete Entire Music Catalog',
                  description: 'CRITICAL: This permanently wipes all tracks from catalog.json. This operation cannot be undone.',
                  requireText: 'DELETE CATALOG',
                  requirePassword: true
                })}
              />
              <DangerActionRow
                label="Delete All Non-Admin Users"
                description="Remove all listener accounts from Firebase Authentication and Firestore profiles. Administrator accounts remain intact."
                buttonLabel="Delete All Users"
                onAction={() => setDangerModal({
                  action: 'delete-all-users',
                  title: 'Delete All Non-Admin Users',
                  description: 'CRITICAL: All non-admin Firebase Auth users and Firestore profiles will be permanently erased.',
                  requireText: 'DELETE ALL USERS',
                  requirePassword: true
                })}
              />
              <DangerActionRow
                label="Factory Reset Platform"
                description="Reset configuration, wipe catalog, clear creator applications, and delete all overrides."
                buttonLabel="Factory Reset"
                onAction={() => setDangerModal({
                  action: 'factory-reset',
                  title: 'Factory Reset Resona Platform',
                  description: 'CRITICAL: This restores the system to pristine initial deployment state. All catalog tracks, creator applications, and overrides are removed.',
                  requireText: 'FACTORY RESET RESONA',
                  requirePassword: true
                })}
              />
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }
}

import React, { useState, useEffect } from 'react';
import { api, resolveMediaUrl } from '../../services/api';
import { Users, Search, Edit2, Check, X, Trash2, Ban, Shield, Settings2, PlayCircle, Music, Star, Zap, Crown, Speaker, ChevronLeft, Loader2 } from 'lucide-react';
import { FEATURE_REGISTRY, FEATURE_CATEGORIES } from '../../../shared/featureRegistry.js';
import PlanBadge from '../PlanBadge';

const PLAN_COLORS = {
  resona: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  resona_silver: 'bg-slate-300/20 text-slate-200 border-slate-300/30',
  resona_gold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  resona_platinum: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const PLAN_NAMES = {
  resona: 'Resona',
  resona_silver: 'Resona Silver',
  resona_gold: 'Resona Gold',
  resona_platinum: 'Resona Platinum'
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [featureSearchQuery, setFeatureSearchQuery] = useState("");
  const [featureCategoryFilter, setFeatureCategoryFilter] = useState("All Categories");
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Edit states for mutations
  const [editPlan, setEditPlan] = useState(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planError, setPlanError] = useState(null);
  const [planSuccess, setPlanSuccess] = useState(false);

  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isUpdatingFeatures, setIsUpdatingFeatures] = useState(false);
  const [featureMessage, setFeatureMessage] = useState(null);
  const [planRequests, setPlanRequests] = useState([]);
  const [requestError, setRequestError] = useState('');
  const [reviewBusy, setReviewBusy] = useState('');

  const selectedUser = users.find(u => u.id === selectedUserId);

  useEffect(() => {
    fetchUsers();
    fetchPlanRequests();
  }, []);

  const fetchPlanRequests = async () => {
    try { setPlanRequests(await api.admin.getPlanChangeRequests()); setRequestError(''); }
    catch (err) { setRequestError(err.message || 'Could not load plan requests'); }
  };

  const reviewRequest = async (request, decision) => {
    setReviewBusy(request.id);
    try {
      const note = decision === 'rejected' ? (window.prompt('Optional rejection note', '') || '') : '';
      await api.admin.reviewPlanChangeRequest(request.id, decision, note);
      await Promise.all([fetchPlanRequests(), refreshUser()]);
    } catch (err) { setRequestError(err.message || 'Could not review plan request'); }
    finally { setReviewBusy(''); }
  };

  useEffect(() => {
    if (selectedUser) {
      setEditPlan(selectedUser.planId || 'resona');
    }
  }, [selectedUserId, selectedUser?.planId]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.admin.getUsers();
      setUsers(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    // Just refetch all users for simplicity and data consistency
    try {
      const data = await api.admin.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to refresh users", err);
    }
  };

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to completely delete this user? This cannot be undone.')) return;
    try {
      await api.admin.deleteUser(id);
      setSelectedUserId(null);
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete user.');
    }
  };

  const toggleStatus = async () => {
    if (!selectedUser) return;
    setIsUpdatingStatus(true);
    try {
      const newStatus = selectedUser.status === 'disabled' ? 'active' : 'disabled';
      await api.admin.updateUser(selectedUser.id, { status: newStatus });
      await refreshUser();
    } catch (err) {
      console.error(err);
      alert('Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const updateRole = async (e) => {
    if (!selectedUser) return;
    const newRole = e.target.value;
    setIsUpdatingRole(true);
    try {
      await api.admin.updateUser(selectedUser.id, { role: newRole });
      await refreshUser();
    } catch (err) {
      console.error(err);
      alert('Failed to update role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const savePlan = async () => {
    if (!selectedUser || !editPlan) return;
    setIsSavingPlan(true);
    setPlanError(null);
    setPlanSuccess(false);
    try {
      await api.admin.updateUser(selectedUser.id, { planId: editPlan });
      await refreshUser();
      setPlanSuccess(true);
      setTimeout(() => setPlanSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      setPlanError('Unable to update plan. Your previous plan has been preserved.');
    } finally {
      setIsSavingPlan(false);
    }
  };

  const cancelPlanEdit = () => {
    setEditPlan(selectedUser?.planId || 'resona');
    setPlanError(null);
  };

  const changeFeatureOverride = async (featureKey, overrideValue) => {
    if (!selectedUser) return;
    setIsUpdatingFeatures(true);
    setFeatureMessage(null);
    try {
      const currentOverrides = { ...(selectedUser.overrides || {}) };
      
      if (overrideValue === 'default') {
        delete currentOverrides[featureKey];
      } else {
        currentOverrides[featureKey] = overrideValue === 'enabled';
      }

      await api.admin.updateUser(selectedUser.id, { overrides: currentOverrides });
      await refreshUser();
      setFeatureMessage({ type: 'success', text: `Updated ${FEATURE_REGISTRY.find(f => f.id === featureKey)?.name || featureKey}` });
      setTimeout(() => setFeatureMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setFeatureMessage({ type: 'error', text: 'Failed to update feature override.' });
    } finally {
      setIsUpdatingFeatures(false);
    }
  };

  const resetAllOverrides = async () => {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to reset all feature overrides? All features will return to their plan defaults.')) return;
    setIsUpdatingFeatures(true);
    setFeatureMessage(null);
    try {
      await api.admin.updateUser(selectedUser.id, { overrides: {} });
      await refreshUser();
      setFeatureMessage({ type: 'success', text: 'All feature overrides have been removed.' });
      setTimeout(() => setFeatureMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setFeatureMessage({ type: 'error', text: 'Failed to reset overrides.' });
    } finally {
      setIsUpdatingFeatures(false);
    }
  };

  if (loading) return <div className="text-slate-400">Loading users...</div>;
  if (error) return (
    <div className="text-rose-400 flex flex-col items-start gap-4">
      <div>Unable to load users. Please try again.</div>
      <button onClick={fetchUsers} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-white text-sm">Retry</button>
    </div>
  );

  if (selectedUser) {
    const isPlanChanged = editPlan !== (selectedUser.planId || 'resona');

    return (
      <div className="space-y-4 md:space-y-6 pb-20">
        <button 
          onClick={() => setSelectedUserId(null)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Users
        </button>

        <h2 className="text-xl md:text-2xl font-bold text-white flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
          <span className="text-slate-400 text-sm md:text-2xl">User Management /</span>
          <span className="truncate">{selectedUser.displayName || 'Unknown'}</span>
        </h2>

        {/* IDENTITY CARD */}
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-5 md:p-6 flex flex-col md:flex-row items-center md:items-start gap-4 md:gap-6 text-center md:text-left">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
            {selectedUser.avatar || selectedUser.photoURL ? (
              <img src={resolveMediaUrl(selectedUser.avatar || selectedUser.photoURL)} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <Users className="w-8 h-8 md:w-10 md:h-10 text-slate-500" />
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1 w-full flex flex-col items-center md:items-start">
            <h3 className="text-xl md:text-2xl font-bold text-white truncate w-full">{selectedUser.displayName || 'No Display Name'}</h3>
            <p className="text-sm md:text-base text-slate-400 truncate w-full">{selectedUser.email}</p>
            <p className="text-[10px] md:text-sm text-slate-500 font-mono truncate w-full">UID: {selectedUser.id}</p>
            <div className="pt-3 flex flex-wrap justify-center md:justify-start gap-2">
              <span className="text-slate-300 text-xs font-bold bg-white/10 px-3 py-1 rounded-full capitalize">
                {selectedUser.role || 'User'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${PLAN_COLORS[selectedUser.planId] || PLAN_COLORS.resona}`}>
                {PLAN_NAMES[selectedUser.planId] || 'Resona'}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedUser.status === 'disabled' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                {selectedUser.status === 'disabled' ? 'Disabled' : 'Active'}
              </span>
            </div>
          </div>
        </div>

        {/* ACCOUNT AND ROLE SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* ACCOUNT */}
          <section className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Account</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div>
                  <div className="text-sm text-slate-400">Status</div>
                  <div className="font-medium text-white">{selectedUser.status === 'disabled' ? 'Disabled' : 'Active'}</div>
                </div>
                <button 
                  onClick={toggleStatus}
                  disabled={isUpdatingStatus}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition flex items-center gap-2 ${selectedUser.status === 'disabled' ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-white/10 text-slate-300 hover:bg-white/20'} disabled:opacity-50`}
                >
                  {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedUser.status === 'disabled' ? 'Enable Account' : 'Disable Account'}
                </button>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div>
                  <div className="text-sm text-slate-400">Email Verification</div>
                  <div className="font-medium text-white">{selectedUser.emailVerified ? 'Verified' : 'Unverified'}</div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div>
                  <div className="text-sm text-slate-400">Joined</div>
                  <div className="font-medium text-white">{selectedUser.creationTime ? new Date(selectedUser.creationTime).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
              <div className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div>
                  <div className="text-sm text-slate-400">Last Sign In</div>
                  <div className="font-medium text-white">{selectedUser.lastSignInTime ? new Date(selectedUser.lastSignInTime).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </div>
          </section>

          {/* ROLE */}
          <section className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden h-fit">
            <div className="p-4 border-b border-white/5 bg-white/[0.02]">
              <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Role</h3>
            </div>
            <div className="p-4">
              <div className="bg-white/5 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="text-sm text-slate-400">Current Role</div>
                <div className="relative">
                  <select 
                    value={selectedUser.role || 'user'}
                    onChange={updateRole}
                    disabled={isUpdatingRole}
                    className="appearance-none bg-slate-800 border border-white/10 rounded-lg pl-4 pr-10 py-2 text-white text-sm font-medium outline-none focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="user">User</option>
                    <option value="admin">Administrator</option>
                  </select>
                  {isUpdatingRole ? (
                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin pointer-events-none" />
                  ) : (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 px-1">Changing the role updates immediately. Administrators have full dashboard access.</p>
            </div>
          </section>
        </div>

        {/* RESONA PLAN */}
        <section className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02]">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">Resona Plan</h3>
          </div>
          <div className="p-6">
            <div className="mb-4">
              <div className="text-sm text-slate-400 mb-1">Current Plan</div>
              <div className="text-lg font-bold text-white"><PlanBadge plan={selectedUser.planId} /></div>
            </div>

            <div className="bg-white/5 rounded-xl p-4 border border-white/5">
              <div className="text-sm text-slate-400 mb-3">Change Plan</div>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <select 
                  value={editPlan ?? selectedUser.planId ?? 'resona'}
                  onChange={e => setEditPlan(e.target.value)}
                  disabled={isSavingPlan}
                  className="w-full sm:w-64 bg-slate-800 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm font-medium outline-none focus:border-cyan-500 disabled:opacity-50"
                >
                  {Object.entries(PLAN_NAMES).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
                
                {isPlanChanged && (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button 
                      onClick={cancelPlanEdit}
                      disabled={isSavingPlan}
                      className="px-4 py-2.5 rounded-lg text-sm font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 transition"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={savePlan}
                      disabled={isSavingPlan}
                      className="px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition flex items-center gap-2"
                    >
                      {isSavingPlan && <Loader2 className="w-4 h-4 animate-spin" />}
                      {isSavingPlan ? 'Saving...' : 'Save Plan'}
                    </button>
                  </div>
                )}
              </div>
              
              {planError && (
                <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-start gap-2">
                  <X className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    {planError}
                    <button onClick={savePlan} className="ml-3 underline hover:text-rose-300">Retry</button>
                  </div>
                </div>
              )}
              {planSuccess && (
                <div className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  Plan updated successfully
                </div>
              )}
            </div>
          </div>
        </section>

        {/* FEATURE ACCESS */}
        <section className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/[0.02] flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Feature Access <span className="text-xs font-normal text-slate-500 ml-2 normal-case">{FEATURE_REGISTRY.length} features</span>
                </h3>
                {(() => {
                  const enabled = FEATURE_REGISTRY.filter(f => selectedUser.features?.[f.id]).length;
                  const overrideCount = Object.keys(selectedUser.overrides || {}).length;
                  return (
                    <div className="flex gap-3 mt-1.5 text-xs">
                      <span className="text-emerald-400">{enabled} enabled</span>
                      <span className="text-slate-500">{FEATURE_REGISTRY.length - enabled} disabled</span>
                      <span className="text-purple-400">{overrideCount} custom override{overrideCount === 1 ? '' : 's'}</span>
                    </div>
                  );
                })()}
              </div>
              {featureMessage && (
                <span className={`text-sm ${featureMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {featureMessage.text}
                </span>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search features..."
                  value={featureSearchQuery}
                  onChange={(e) => setFeatureSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 outline-none"
                />
              </div>
              <select
                value={featureCategoryFilter}
                onChange={(e) => setFeatureCategoryFilter(e.target.value)}
                className="w-full sm:w-auto bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-sm text-white outline-none focus:border-cyan-500"
              >
                <option value="All Categories">All Categories</option>
                {FEATURE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile Features List */}
          <div className="md:hidden flex flex-col divide-y divide-white/5">
            {FEATURE_CATEGORIES.filter(cat => featureCategoryFilter === 'All Categories' || featureCategoryFilter === cat).map(category => {
              const categoryFeatures = FEATURE_REGISTRY
                .filter(f => f.category === category)
                .filter(f => 
                  f.name.toLowerCase().includes(featureSearchQuery.toLowerCase()) || 
                  f.description.toLowerCase().includes(featureSearchQuery.toLowerCase())
                );
              
              if (categoryFeatures.length === 0) return null;

              return (
                <React.Fragment key={category}>
                  <div className="p-3 bg-slate-800/50 text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                    {category}
                  </div>
                  {categoryFeatures.map(feature => {
                    const key = feature.id;
                    const isEffective = selectedUser.features?.[key] ?? false;
                    const hasOverride = selectedUser.overrides && selectedUser.overrides[key] !== undefined;
                    const overrideVal = hasOverride ? selectedUser.overrides[key] : null;
                    const basePlanDefault = selectedUser.planFeatures?.[key] ?? false;

                    return (
                      <div key={key} className="p-4 flex flex-col gap-3">
                        <div>
                          <div className="font-bold text-white text-sm">{feature.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{feature.description}</div>
                        </div>
                        <div className="flex justify-between items-center bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                          <div className="text-[11px] text-slate-400">Plan: <span className={basePlanDefault ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>{basePlanDefault ? 'Enabled' : 'Disabled'}</span></div>
                          <div className="text-[11px] text-slate-400">Effective: <span className={isEffective ? 'text-emerald-400 font-bold' : 'text-slate-500 font-bold'}>{isEffective ? 'Enabled' : 'Disabled'}</span></div>
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-slate-400 font-medium">Override</span>
                          <select
                            value={hasOverride ? (overrideVal ? 'enabled' : 'disabled') : 'default'}
                            onChange={(e) => changeFeatureOverride(key, e.target.value)}
                            disabled={isUpdatingFeatures || !feature.controllable}
                            className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-cyan-500 disabled:opacity-50"
                          >
                            <option value="default">Default</option>
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>

          {/* Desktop Features Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400">
                <tr>
                  <th className="p-4 font-medium">Feature</th>
                  <th className="p-4 font-medium">Plan Default</th>
                  <th className="p-4 font-medium">User Override</th>
                  <th className="p-4 font-medium">Effective Access</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {FEATURE_CATEGORIES.filter(cat => featureCategoryFilter === 'All Categories' || featureCategoryFilter === cat).map(category => {
                  const categoryFeatures = FEATURE_REGISTRY
                    .filter(f => f.category === category)
                    .filter(f => 
                      f.name.toLowerCase().includes(featureSearchQuery.toLowerCase()) || 
                      f.description.toLowerCase().includes(featureSearchQuery.toLowerCase())
                    );
                  
                  if (categoryFeatures.length === 0) return null;

                  return (
                    <React.Fragment key={category}>
                      <tr className="bg-slate-800/50">
                        <td colSpan="4" className="p-3 text-xs font-bold text-cyan-400 uppercase tracking-wider">
                          {category}
                        </td>
                      </tr>
                      {categoryFeatures.map(feature => {
                        const key = feature.id;
                        const isEffective = selectedUser.features?.[key] ?? false;
                        const hasOverride = selectedUser.overrides && selectedUser.overrides[key] !== undefined;
                        const overrideVal = hasOverride ? selectedUser.overrides[key] : null;
                        
                        // Plan default is provided by backend in planFeatures, or false if undefined
                        const basePlanDefault = selectedUser.planFeatures?.[key] ?? false;

                        return (
                          <tr key={key} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="p-4">
                              <div className="font-medium text-white">{feature.name}</div>
                              <div className="text-xs text-slate-500 mt-1">{feature.description}</div>
                            </td>
                            <td className="p-4 align-top">
                              <span className={`inline-block mt-1 text-xs font-bold ${basePlanDefault ? 'text-emerald-400' : 'text-slate-500'}`}>
                                {basePlanDefault ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                            <td className="p-4 align-top">
                              <select
                                value={hasOverride ? (overrideVal ? 'enabled' : 'disabled') : 'default'}
                                onChange={(e) => changeFeatureOverride(key, e.target.value)}
                                disabled={isUpdatingFeatures || !feature.controllable}
                                className="bg-slate-800 border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-cyan-500 disabled:opacity-50 mt-0.5"
                              >
                                <option value="default">Default</option>
                                <option value="enabled">Enabled</option>
                                <option value="disabled">Disabled</option>
                              </select>
                            </td>
                            <td className="p-4 align-top">
                              <span className={`inline-block mt-1 px-2.5 py-1 rounded-full text-xs font-bold ${isEffective ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'}`}>
                                {isEffective ? 'Enabled' : 'Disabled'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* ACCOUNT ACTIONS */}
        <section className="space-y-4 pt-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <button 
              onClick={resetAllOverrides}
              disabled={isUpdatingFeatures || !selectedUser.overrides || Object.keys(selectedUser.overrides).length === 0}
              className="px-4 py-2.5 rounded-lg text-sm font-medium border border-white/10 text-slate-300 bg-slate-900/50 hover:bg-white/5 transition disabled:opacity-50 w-full sm:w-auto"
            >
              Reset All Overrides
            </button>
            <button 
              onClick={() => deleteUser(selectedUser.id)}
              className="px-4 py-2.5 rounded-lg text-sm font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition w-full sm:w-auto ml-auto"
            >
              Delete Account
            </button>
          </div>
        </section>

      </div>
    );
  }

  // --- MAIN USERS TABLE VIEW ---
  
  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (
      (u.email || '').toLowerCase().includes(q) ||
      (u.id || '').toLowerCase().includes(q) ||
      (u.displayName || '').toLowerCase().includes(q)
    );
  });

  const totalUsers = users.length;
  const assignedPlans = users.filter(u => u.planId).length;
  const admins = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      
      {/* PAGE HEADER & SEARCH */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-cyan-400 w-5 h-5 md:w-7 md:h-7" /> User Management
          </h2>
          <p className="text-slate-400 text-xs md:text-sm mt-1">Manage accounts, plans, roles, and feature access.</p>
        </div>
        <div className="relative w-full md:w-64 lg:w-80 shrink-0">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search users..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>

      {/* PLAN CHANGE REQUESTS */}
      <section className="bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-3 md:p-4 border-b border-white/5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Plan Change Requests</h3>
            <p className="hidden md:block text-xs text-slate-400 mt-1">Review requests for Resona access plans.</p>
          </div>
          <button onClick={fetchPlanRequests} className="text-xs font-semibold text-teal-300 hover:text-white px-2.5 py-1.5 bg-teal-500/10 rounded-lg transition-colors border border-teal-500/20">Refresh</button>
        </div>
        {requestError && <p role="alert" className="p-3 text-xs text-rose-300">{requestError}</p>}
        {planRequests.length === 0 ? (
          <p className="p-4 text-xs md:text-sm text-slate-400">No pending requests.</p>
        ) : (
          <div className="divide-y divide-white/5">
            {planRequests.map(request => (
              <div key={request.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm">{request.userName} <span className="font-normal text-slate-400 ml-1 truncate">{request.uid ? `@${request.uid}` : request.email}</span></p>
                  <p className="mt-1 text-xs text-slate-300">
                    Current: <span className="text-slate-400">{PLAN_NAMES[request.currentPlan] || request.currentPlan}</span> → Requested: <strong>{PLAN_NAMES[request.requestedPlan] || request.requestedPlan}</strong>
                  </p>
                  <p className="mt-1.5 text-[10px] uppercase font-bold text-amber-400/80 tracking-wider">
                    {new Date(request.createdAt).toLocaleString()} · Pending
                  </p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <button disabled={reviewBusy === request.id} onClick={() => reviewRequest(request,'approved')} className="flex-1 md:flex-none px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-sm font-bold disabled:opacity-50 transition border border-emerald-500/30 text-center">Approve</button>
                  <button disabled={reviewBusy === request.id} onClick={() => reviewRequest(request,'rejected')} className="flex-1 md:flex-none px-4 py-2.5 rounded-lg bg-rose-500/20 text-rose-300 text-sm font-bold disabled:opacity-50 transition border border-rose-500/30 text-center">Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <p className="text-slate-400 text-xs md:text-sm">Total Users</p>
            <p className="text-xl md:text-2xl font-bold text-white">{totalUsers}</p>
          </div>
          <Users className="w-6 h-6 md:w-8 md:h-8 text-cyan-400/50 self-start md:self-auto opacity-50" />
        </div>
        <div className="bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <p className="text-slate-400 text-xs md:text-sm">Access Plans</p>
            <p className="text-xl md:text-2xl font-bold text-white">{assignedPlans}</p>
          </div>
          <Crown className="w-6 h-6 md:w-8 md:h-8 text-yellow-400/50 self-start md:self-auto opacity-50" />
        </div>
        <div className="col-span-2 md:col-span-1 bg-slate-900/50 rounded-2xl border border-white/5 p-4 flex flex-row md:flex-col lg:flex-row items-center md:items-start lg:items-center justify-between gap-2">
          <div>
            <p className="text-slate-400 text-xs md:text-sm">Administrators</p>
            <p className="text-xl md:text-2xl font-bold text-white">{admins}</p>
          </div>
          <Shield className="w-6 h-6 md:w-8 md:h-8 text-purple-400/50 opacity-50" />
        </div>
      </div>

      {/* USERS SECTION HEADER */}
      <div className="flex items-end justify-between pt-2 pb-1">
        <div>
          <h3 className="text-sm font-bold text-slate-300 tracking-wider uppercase">Users</h3>
          <p className="text-xs text-slate-500 mt-0.5">{totalUsers} account{totalUsers !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block bg-slate-900/50 rounded-2xl border border-white/5 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 border-b border-white/5 text-slate-400">
            <tr>
              <th className="p-4 font-medium">User</th>
              <th className="p-4 font-medium">Plan</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map(u => (
              <tr 
                key={u.id} 
                onClick={() => setSelectedUserId(u.id)}
                className="hover:bg-white/[0.05] cursor-pointer transition-colors group"
              >
                <td className="p-4">
                  <div className="font-medium text-white">{u.email}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{u.displayName}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${PLAN_COLORS[u.planId] || PLAN_COLORS.resona}`}>
                    {PLAN_NAMES[u.planId] || 'Resona'}
                  </span>
                </td>
                <td className="p-4">
                  {u.role === 'admin' ? (
                    <span className="flex items-center gap-1 text-purple-400 text-xs font-bold bg-purple-400/10 px-2.5 py-1 rounded-full w-fit">
                      <Shield className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs capitalize bg-white/5 px-2.5 py-1 rounded-full w-fit inline-block">{u.role || 'user'}</span>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${u.status === 'disabled' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                    {u.status === 'disabled' ? 'Disabled' : 'Active'}
                  </span>
                </td>
                <td className="p-4 text-slate-500">{u.creationTime ? new Date(u.creationTime).toLocaleDateString() : 'N/A'}</td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="5" className="p-8 text-center text-slate-500">No registered users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden flex flex-col gap-3">
        {filteredUsers.map(u => (
          <div 
            key={u.id}
            onClick={() => setSelectedUserId(u.id)}
            className="bg-slate-900/80 rounded-2xl border border-white/5 p-4 flex flex-col gap-3 active:bg-white/5 active:scale-[0.99] transition-all cursor-pointer"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                {u.avatar || u.photoURL ? (
                  <img src={resolveMediaUrl(u.avatar || u.photoURL)} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-5 h-5 text-slate-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-sm truncate pr-2">{u.displayName || 'Unknown User'}</div>
                <div className="text-xs text-slate-400 truncate pr-2">{u.email}</div>
              </div>
            </div>
            
            <div className="flex items-end justify-between pt-2 border-t border-white/5">
              <div className="flex flex-col gap-1.5">
                 <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${PLAN_COLORS[u.planId] || PLAN_COLORS.resona}`}>
                      {PLAN_NAMES[u.planId] || 'Resona'}
                    </span>
                    <span className={`text-[10px] font-bold flex items-center gap-1 ${u.status === 'disabled' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span> {u.status === 'disabled' ? 'Disabled' : 'Active'}
                    </span>
                 </div>
                 <div className="text-[11px] text-slate-400 font-medium">
                    Role: <span className="text-slate-200 capitalize ml-1">{u.role || 'User'}</span>
                 </div>
              </div>
              <div className="text-xs font-bold text-cyan-400 bg-cyan-400/10 px-3 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                 Manage <ChevronLeft className="w-3 h-3 rotate-180" />
              </div>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm bg-slate-900/50 rounded-2xl border border-white/5">
            No users found matching your search.
          </div>
        )}
      </div>
    </div>
  );
}

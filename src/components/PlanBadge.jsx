import React from 'react';

const PLAN_NAMES = {
  resona: 'Resona',
  resona_silver: 'Resona Silver',
  resona_gold: 'Resona Gold',
  resona_platinum: 'Resona Platinum',
};

/** Resolve the backend's canonical plan value to an official display name. */
export function getPlanName(plan) {
  if (typeof plan !== 'string' || !plan.trim()) return null;
  const normalized = plan.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return PLAN_NAMES[normalized] || null;
}

export default function PlanBadge({ plan, className = '' }) {
  const name = getPlanName(plan);
  if (!name) return null;
  return <span className={className}>{name}</span>;
}

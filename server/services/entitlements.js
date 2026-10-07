import { FEATURE_REGISTRY, normalizeFeatureMap } from '../../shared/featureRegistry.js';
import { OVERRIDES_FILE, PLANS_FILE } from '../config.js';

/**
 * RESONA ENTITLEMENT SERVICE (server-authoritative).
 *
 *   effectiveAccess = planDefault && (userOverride ?? true)
 *
 * Plan defaults are read from plans.json. This file only provides the SEED used to
 * fill in features that a stored plan has never been configured for. Values already
 * stored in plans.json are always preserved.
 */

export const PLAN_ORDER = ['resona', 'resona_silver', 'resona_gold', 'resona_platinum'];

// Lowest plan tier (index into PLAN_ORDER) on which a feature is enabled by default.
// Features not listed here seed as disabled on every plan.
const SEED_MIN_TIER = {
  // Core & Navigation
  pulse: 0, seek: 0, my_shelf: 0, heartbeats: 0, profile: 0, browse: 0, genre_browsing: 0,
  // Playback
  basic_playback: 0, queue: 0, repeat: 0, shuffle: 0,
  advanced_queue: 1, crossfade: 1, gapless_playback: 1, playback_speed: 2,
  // Audio
  standard_audio: 0, high_quality_audio: 1, lossless_audio: 2, enhanced_audio_controls: 2,
  maximum_audio_quality: 3,
  // Discovery & Personalization
  tuned_for_you: 0, daily_dose: 0, fresh_drops: 0, monday_mystery: 0, curated_mixes: 0,
  endless: 1, personalized_mixes: 1, advanced_recommendations: 2, advanced_personalization: 3,
  // Library
  playlists: 0, listening_history: 0, advanced_playlists: 1, extended_listening_history: 2,
  offline_playback: 3, // Gold = DISABLED, Platinum = ENABLED (required)
  // Social
  friend_activity: 0, social_profiles: 0, fusion: 1, huddle: 1,
  // Cast & Sharing
  cast: 0, beat_codes: 0, sharing: 0, advanced_cast: 2,
  // Creator
  creator_hub: 0, creator_upload: 0, creator_profile: 0, creator_analytics: 1,
  // Special
  ad_free_listening: 1, exclusive_content: 2, early_access: 3,
  // Experimental
  experimental_features: 3, priority_content_access: 3, advanced_huddle: 3
};

export function seedDefault(planId, featureId) {
  const tier = PLAN_ORDER.indexOf(planId);
  const minTier = SEED_MIN_TIER[featureId];
  if (tier === -1 || minTier === undefined) return false;
  return tier >= minTier;
}

/**
 * Return a plans object where every plan has an explicit boolean for every
 * registered feature. Legacy IDs are migrated; stored values are preserved.
 */
export function normalizePlans(plans = {}) {
  const out = {};
  for (const [planId, plan] of Object.entries(plans || {})) {
    const stored = normalizeFeatureMap(plan?.features);
    const features = {};
    for (const f of FEATURE_REGISTRY) {
      features[f.id] = Object.prototype.hasOwnProperty.call(stored, f.id)
        ? stored[f.id]
        : seedDefault(planId, f.id);
    }
    out[planId] = { ...plan, features };
  }
  return out;
}

export function normalizeOverrides(overrides = {}) {
  const out = {};
  for (const [uid, map] of Object.entries(overrides || {})) {
    const normalized = normalizeFeatureMap(map);
    if (Object.keys(normalized).length) out[uid] = normalized;
  }
  return out;
}

/** Compute plan defaults + effective access for every registered feature respecting global availability. */
export function computeEntitlements(plan, userOverrides = {}, globalFeatureMap = null) {
  const overrides = normalizeFeatureMap(userOverrides);
  const planFeatures = {};
  const features = {};
  for (const f of FEATURE_REGISTRY) {
    const planDefault = plan?.features?.[f.id] === true;
    planFeatures[f.id] = planDefault;
    const requested = planDefault &&
      (!Object.prototype.hasOwnProperty.call(overrides, f.id) || overrides[f.id] === true);
    // Hierarchy: GLOBAL PLATFORM AVAILABILITY → PLAN ENTITLEMENT → USER OVERRIDE
    // If feature is globally disabled, effective access is strictly false.
    const isGloballyAllowed = globalFeatureMap ? (globalFeatureMap[f.id] !== false) : true;
    features[f.id] = isGloballyAllowed ? requested : false;
  }
  return { planFeatures, features, overrides };
}

// Ensure dynamic imports to avoid circular dependencies for DB storage
export async function getUserFeatureEntitlements(userId) {
  const { getAccountData, getGlobalData } = await import('../db/storage.js');
  const { getPlatformSettings, getGlobalFeatureMap } = await import('./platformSettings.js');
  
  const profile = (await getAccountData(userId, 'profile.json')) || {};
  const planId = profile.planId || 'resona';

  const platform = await getPlatformSettings();
  const globalFeatures = getGlobalFeatureMap(platform);

  const plansData = (await getGlobalData(PLANS_FILE)) || {};
  const normalizedPlans = normalizePlans(plansData);
  const planConfig = normalizedPlans[planId] || {};

  const overridesData = (await getGlobalData(OVERRIDES_FILE)) || {};
  const userOverrides = overridesData?.[userId] || {};

  return computeEntitlements(planConfig, userOverrides, globalFeatures);
}

export async function hasFeature(userId, featureId) {
  const result = await getUserFeatureEntitlements(userId);
  if (!result) return false;
  return result.features[featureId] === true;
}

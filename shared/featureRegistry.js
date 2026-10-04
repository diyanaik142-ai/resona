/**
 * RESONA FEATURE REGISTRY — single source of truth for WHAT features exist.
 *
 * Imported by both the Node backend (entitlement service, admin API) and the
 * React frontend (admin UI). Do NOT duplicate this list anywhere else.
 *
 * - Plan configuration (server/data/global/plans.json) decides default availability.
 * - User overrides (overrides.json) decide individual exceptions.
 * - The entitlement service (server/services/entitlements.js) computes effective access.
 *
 * Adding a feature here automatically makes it appear in every admin interface
 * and in entitlement calculations (defaulting to disabled on every plan until configured).
 */

export const FEATURE_CATEGORIES = [
  'Core & Navigation',
  'Playback',
  'Audio',
  'Discovery & Personalization',
  'Library',
  'Social',
  'Cast & Sharing',
  'Creator',
  'Special',
  'Experimental'
];

export const FEATURE_REGISTRY = [
  // Core & Navigation
  { id: "pulse", name: "Pulse", description: "Main feed of contextual content.", category: "Core & Navigation", controllable: true },
  { id: "seek", name: "Seek", description: "Search and explore.", category: "Core & Navigation", controllable: true },
  { id: "my_shelf", name: "My Shelf", description: "Personal collection of saved content.", category: "Core & Navigation", controllable: true },
  { id: "heartbeats", name: "Heartbeats", description: "Quick emotional reactions to music.", category: "Core & Navigation", controllable: true },
  { id: "profile", name: "Profile", description: "User profile and identity.", category: "Core & Navigation", controllable: true },
  { id: "browse", name: "Browse All", description: "General directory browsing.", category: "Core & Navigation", controllable: true },
  { id: "genre_browsing", name: "Genre Browsing", description: "Browse by musical genre.", category: "Core & Navigation", controllable: true },

  // Playback
  { id: "basic_playback", name: "Basic Playback", description: "Standard audio playback.", category: "Playback", controllable: true },
  { id: "queue", name: "Queue", description: "Standard up-next queue.", category: "Playback", controllable: true },
  { id: "advanced_queue", name: "Advanced Queue", description: "Advanced queue management.", category: "Playback", controllable: true },
  { id: "crossfade", name: "Crossfade", description: "Smooth transition between tracks.", category: "Playback", controllable: true },
  { id: "gapless_playback", name: "Gapless Playback", description: "Playback without gaps between tracks.", category: "Playback", controllable: true },
  { id: "playback_speed", name: "Playback Speed", description: "Adjust the speed of playback.", category: "Playback", controllable: true },
  { id: "repeat", name: "Repeat", description: "Repeat a track or context.", category: "Playback", controllable: true },
  { id: "shuffle", name: "Shuffle", description: "Randomize the playback order.", category: "Playback", controllable: true },

  // Audio
  { id: "standard_audio", name: "Standard Audio", description: "Standard quality audio streaming.", category: "Audio", controllable: true },
  { id: "high_quality_audio", name: "High Quality Audio", description: "High bitrate audio streaming.", category: "Audio", controllable: true },
  { id: "lossless_audio", name: "Lossless Audio", description: "Uncompressed lossless audio streaming.", category: "Audio", controllable: true },
  { id: "maximum_audio_quality", name: "Maximum Audio Quality", description: "Highest possible fidelity including Hi-Res.", category: "Audio", controllable: true },
  { id: "enhanced_audio_controls", name: "Enhanced Audio Controls", description: "Equalizer and spatial audio controls.", category: "Audio", controllable: true },

  // Discovery & Personalization
  { id: "tuned_for_you", name: "Tuned for You", description: "Algorithmic personalized recommendations.", category: "Discovery & Personalization", controllable: true },
  { id: "daily_dose", name: "Daily Dose", description: "Daily curated listening session.", category: "Discovery & Personalization", controllable: true },
  { id: "fresh_drops", name: "Fresh Drops", description: "New releases based on user taste.", category: "Discovery & Personalization", controllable: true },
  { id: "monday_mystery", name: "Monday Mystery", description: "Weekly discovery mixtape.", category: "Discovery & Personalization", controllable: true },
  { id: "curated_mixes", name: "Curated Mixes", description: "Human-curated themed mixes.", category: "Discovery & Personalization", controllable: true },
  { id: "endless", name: "Endless", description: "Infinite radio-style playback.", category: "Discovery & Personalization", controllable: true },
  { id: "advanced_recommendations", name: "Advanced Recommendations", description: "Deep algorithmic suggestions.", category: "Discovery & Personalization", controllable: true },
  { id: "personalized_mixes", name: "Personalized Mixes", description: "Auto-generated mixes based on taste.", category: "Discovery & Personalization", controllable: true },
  { id: "advanced_personalization", name: "Advanced Personalization", description: "Fine-grained control over algorithmic recommendations.", category: "Discovery & Personalization", controllable: true },

  // Library
  { id: "playlists", name: "Playlists", description: "Create and manage standard playlists.", category: "Library", controllable: true },
  { id: "advanced_playlists", name: "Advanced Playlists", description: "Smart playlists, folders, and collaborative editing.", category: "Library", controllable: true },
  { id: "listening_history", name: "Listening History", description: "View recent listening history.", category: "Library", controllable: true },
  { id: "extended_listening_history", name: "Extended Listening History", description: "Full historical listening data.", category: "Library", controllable: true },
  { id: "offline_playback", name: "Offline Playback", description: "Download supported music for listening without an internet connection.", category: "Library", controllable: true },

  // Social
  { id: "fusion", name: "Fusion", description: "Create a shared personalized listening experience.", category: "Social", controllable: true },
  { id: "huddle", name: "Huddle", description: "Shared live listening room.", category: "Social", controllable: true },
  { id: "friend_activity", name: "Friend Activity", description: "See what friends are listening to.", category: "Social", controllable: true },
  { id: "social_profiles", name: "Social Profiles", description: "Public user profiles and following.", category: "Social", controllable: true },

  // Cast & Sharing
  { id: "cast", name: "Cast", description: "Cast to standard smart speakers and TVs.", category: "Cast & Sharing", controllable: true },
  { id: "beat_codes", name: "Beat Codes", description: "Scan codes to share music quickly.", category: "Cast & Sharing", controllable: true },
  { id: "advanced_cast", name: "Advanced Cast", description: "Multi-room and high-fidelity casting protocols.", category: "Cast & Sharing", controllable: true },
  { id: "sharing", name: "Sharing", description: "Share links to social networks.", category: "Cast & Sharing", controllable: true },

  // Creator
  { id: "creator_hub", name: "Creator Hub", description: "Access the Creator dashboard.", category: "Creator", controllable: true },
  { id: "creator_upload", name: "Creator Upload", description: "Upload original music tracks.", category: "Creator", controllable: true },
  { id: "creator_analytics", name: "Creator Analytics", description: "View detailed listener analytics.", category: "Creator", controllable: true },
  { id: "creator_profile", name: "Creator Profile", description: "Manage artist presence.", category: "Creator", controllable: true },

  // Special
  { id: "ad_free_listening", name: "Ad-Free Listening", description: "Listen without audio or visual interruptions.", category: "Special", controllable: true },
  { id: "exclusive_content", name: "Exclusive Content", description: "Access to premium exclusive releases.", category: "Special", controllable: true },
  { id: "early_access", name: "Early Access", description: "Listen to releases before they go public.", category: "Special", controllable: true },

  // Experimental
  { id: "experimental_features", name: "Experimental Features", description: "Opt-in to beta features.", category: "Experimental", controllable: true },
  { id: "priority_content_access", name: "Priority Content Access", description: "VIP access to servers during high load.", category: "Experimental", controllable: true },
  { id: "advanced_huddle", name: "Advanced Huddle", description: "Large-scale interactive listening events.", category: "Experimental", controllable: true }
];

export const FEATURE_IDS = new Set(FEATURE_REGISTRY.map(f => f.id));

/**
 * Legacy IDs that actually exist in stored data → stable registry IDs.
 * Only `ad_free` was found in this project's plans.json / overrides.json.
 */
export const LEGACY_FEATURE_ID_MAP = {
  ad_free: 'ad_free_listening'
};

export function normalizeFeatureId(id) {
  return LEGACY_FEATURE_ID_MAP[id] || id;
}

/**
 * Normalize a { featureId: boolean } map: migrates legacy IDs, drops unknown IDs
 * and non-boolean values. A value already stored under the stable ID wins over a legacy one.
 */
export function normalizeFeatureMap(map = {}) {
  const out = {};
  for (const [rawId, value] of Object.entries(map || {})) {
    if (typeof value !== 'boolean') continue;
    const id = normalizeFeatureId(rawId);
    if (!FEATURE_IDS.has(id)) continue;
    if (rawId !== id && Object.prototype.hasOwnProperty.call(map, id)) continue;
    out[id] = value;
  }
  return out;
}

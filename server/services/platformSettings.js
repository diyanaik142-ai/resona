import { SETTINGS_FILE, AUDIT_FILE } from '../config.js';
import { getGlobalData, saveGlobalData, addGlobalItem } from '../db/storage.js';

export const DEFAULT_PLATFORM_SETTINGS = {
  // 1. Platform
  platform: {
    allowUserRegistration: true,
    requireAccountVerification: false,
    defaultPlan: 'resona', // 'resona' | 'resona_silver' | 'resona_gold' | 'resona_platinum'
    maintenanceMode: false,
    maintenanceMessage: "Resona is currently undergoing scheduled maintenance. We'll be back shortly."
  },

  // 2. Music & Catalog
  catalog: {
    publicCatalog: true,
    allowAdminUploads: true,
    allowUserOriginalUploads: true,
    allowSongRecommendations: true,
    requireCatalogApproval: true,
    defaultStreamingQuality: 'high', // 'standard' | 'high' | 'lossless'
    enableQueue: true,
    enableShuffle: true,
    enableRepeat: true,
    enableGapless: true,
    defaultCrossfade: 3, // seconds
    defaultPlaybackSpeed: 1.0,
    allowLosslessAudio: true
  },

  // 3. Creator Hub
  creator: {
    enableCreatorHub: true,
    allowCreatorApplications: true,
    requireAdminApproval: true,
    allowCreatorUploads: true,
    enableCreatorProfiles: true,
    enableCreatorAnalytics: true,
    enableCreatorPublishing: true,
    maxAudioFileSizeMb: 50,
    allowedAudioFormats: ['mp3', 'wav', 'flac', 'aac', 'm4a'],
    maxTrackDurationMinutes: 20,
    requireMetadata: true,
    requireCoverArt: true,
    requirePublishingApproval: true
  },

  // 4. Social & Community
  social: {
    enableSocialProfiles: true,
    enableFriendActivity: true,
    enableFusion: true,
    enableHuddle: true,
    enableSharing: true,
    enableBeatCodes: true,
    defaultProfileVisibility: 'public', // 'public' | 'friends' | 'private'
    defaultActivityVisibility: 'friends' // 'public' | 'friends' | 'private'
  },

  // 5. Privacy & Data
  privacy: {
    defaultProfileVisibility: 'public', // 'public' | 'friends' | 'private'
    defaultListeningActivity: 'friends', // 'public' | 'friends' | 'private'
    defaultPlaylistVisibility: 'public', // 'public' | 'friends' | 'private'
    defaultRecentlyPlayed: 'friends', // 'public' | 'friends' | 'private'
    listeningHistoryRetentionDays: 365,
    searchHistoryRetentionDays: 90,
    allowAccountDeletion: true,
    allowDataExport: true
  },

  // 6. API & Developer
  api: {
    enableApiAccess: true,
    enableUserApiAccess: true,
    enableCreatorApiAccess: true,
    enableAdminApiAccess: true,
    apiReadAccess: true,
    apiWriteAccess: true,
    allowApiKeyManagement: true,
    tokenExpirationDays: 30,
    allowTokenRevocation: true
  },

  // 7. Storage & Media
  storage: {
    allowAudioUploads: true,
    allowImageUploads: true,
    maxAudioSizeMb: 50,
    maxImageSizeMb: 10,
    allowedAudioFormats: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
    allowedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
    audioProcessing: true,
    coverArtProcessing: true,
    metadataExtraction: true,
    transcoding: false,
    tempUploadRetentionHours: 24,
    deletedMediaRetentionDays: 30,
    failedUploadCleanup: true
  },

  // 8. Notifications
  notifications: {
    enableAccountNotifications: true,
    enableNewReleaseNotifications: true,
    enableCreatorNotifications: true,
    enableFriendActivityNotifications: true,
    enableHuddleNotifications: true,
    enableFusionNotifications: true,
    enableSongRequestNotifications: true,
    enableSystemAnnouncements: true,
    enableInAppNotifications: true,
    enableEmailNotifications: true,
    enablePushNotifications: false
  },

  // 9. Audio Defaults
  audioDefaults: {
    defaultAudioQuality: 'high', // 'standard' | 'high' | 'lossless'
    defaultAutoplay: true,
    defaultCrossfadeSeconds: 3,
    defaultGapless: true,
    enableAudioNormalization: true,
    explicitContentHandling: 'allow', // 'allow' | 'warn' | 'filter'
    defaultVolumeLevel: 85
  },

  // 10. Content & Safety
  contentSafety: {
    allowUserUploads: true,
    allowCreatorUploads: true,
    allowSongRecommendations: true,
    allowPublicPlaylists: true,
    allowPublicProfiles: true,
    requireContentApproval: true,
    allowUserReports: true,
    enableAutomatedFlagging: false,
    enableAccountRestrictions: true,
    allowExplicitContent: true,
    defaultExplicitPreference: 'allow' // 'allow' | 'warn' | 'filter'
  },

  // 11. Administration & Audit
  audit: {
    logAuthEvents: true,
    logUserChanges: true,
    logPlanChanges: true,
    logFeatureChanges: true,
    logCatalogChanges: true,
    logCreatorDecisions: true,
    logDestructiveActions: true,
    auditRetentionDays: 90
  },

  // 12. System
  system: {
    logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
    enableErrorReporting: true,
    enableSystemHealthChecks: true
  },

  // 13. Appearance & Branding
  branding: {
    platformName: 'Resona',
    brandTagline: 'The Pure High-Fidelity Music Experience',
    accentColor: '#2dd4bf',
    secondaryAccentColor: '#a855f7',
    defaultArtworkUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    maintenancePageMessage: "Resona is currently undergoing scheduled maintenance. We'll be back shortly."
  }
};

/**
 * Deep merge default settings with stored settings, and migrate legacy formats.
 */
function mergeWithDefaults(stored = {}) {
  const merged = JSON.parse(JSON.stringify(DEFAULT_PLATFORM_SETTINGS));

  // Migrate legacy format if present
  if (stored && (stored.features || typeof stored.maintenanceMode === 'boolean')) {
    if (typeof stored.maintenanceMode === 'boolean') {
      merged.platform.maintenanceMode = stored.maintenanceMode;
    }
    if (stored.features) {
      if (typeof stored.features.userRegistration === 'boolean') {
        merged.platform.allowUserRegistration = stored.features.userRegistration;
      }
      if (typeof stored.features.creatorUploads === 'boolean') {
        merged.creator.allowCreatorUploads = stored.features.creatorUploads;
      }
      if (typeof stored.features.socialHuddles === 'boolean') {
        merged.social.enableHuddle = stored.features.socialHuddles;
      }
    }
  }

  // Iterate over canonical categories
  for (const category of Object.keys(DEFAULT_PLATFORM_SETTINGS)) {
    if (stored && typeof stored[category] === 'object' && stored[category] !== null) {
      for (const [key, defVal] of Object.entries(DEFAULT_PLATFORM_SETTINGS[category])) {
        if (stored[category][key] !== undefined) {
          // Type consistency
          if (Array.isArray(defVal)) {
            if (Array.isArray(stored[category][key])) {
              merged[category][key] = stored[category][key];
            }
          } else if (typeof defVal === typeof stored[category][key]) {
            merged[category][key] = stored[category][key];
          }
        }
      }
    }
  }

  // Also retain legacy keys at top level for backwards compatibility
  merged.maintenanceMode = merged.platform.maintenanceMode;
  merged.features = {
    userRegistration: merged.platform.allowUserRegistration,
    creatorUploads: merged.creator.allowCreatorUploads,
    socialHuddles: merged.social.enableHuddle
  };

  return merged;
}

/**
 * Retrieve platform settings. Reads from SETTINGS_FILE and merges defaults.
 */
export async function getPlatformSettings() {
  try {
    const stored = await getGlobalData(SETTINGS_FILE);
    return mergeWithDefaults(stored || {});
  } catch (err) {
    console.error('[PlatformSettings] Failed to read settings, using defaults:', err);
    return JSON.parse(JSON.stringify(DEFAULT_PLATFORM_SETTINGS));
  }
}

/**
 * Compute the diff between previous settings and updated settings.
 */
function computeDiff(prev, next, prefix = '') {
  const diffs = [];
  for (const key of Object.keys(next)) {
    if (key === 'features' || key === 'maintenanceMode') continue; // Skip legacy duplicates
    const nextVal = next[key];
    const prevVal = prev?.[key];
    const path = prefix ? `${prefix}.${key}` : key;

    if (nextVal !== null && typeof nextVal === 'object' && !Array.isArray(nextVal)) {
      diffs.push(...computeDiff(prevVal || {}, nextVal, path));
    } else if (JSON.stringify(prevVal) !== JSON.stringify(nextVal)) {
      diffs.push({
        path,
        previous: prevVal,
        next: nextVal
      });
    }
  }
  return diffs;
}

/**
 * Validate and update platform settings.
 */
export async function updatePlatformSettings(updates, adminId = 'admin') {
  if (!updates || typeof updates !== 'object') {
    throw new Error('Invalid settings object.');
  }

  const current = await getPlatformSettings();
  const next = JSON.parse(JSON.stringify(current));

  // Merge updates
  for (const category of Object.keys(DEFAULT_PLATFORM_SETTINGS)) {
    if (updates[category] && typeof updates[category] === 'object') {
      for (const [key, val] of Object.entries(updates[category])) {
        if (DEFAULT_PLATFORM_SETTINGS[category][key] !== undefined) {
          // Validation
          const expectedType = typeof DEFAULT_PLATFORM_SETTINGS[category][key];
          if (Array.isArray(DEFAULT_PLATFORM_SETTINGS[category][key])) {
            if (Array.isArray(val)) {
              next[category][key] = val.map(s => String(s).trim().toLowerCase());
            }
          } else if (expectedType === 'number') {
            const num = Number(val);
            if (!isNaN(num) && num >= 0) {
              next[category][key] = num;
            }
          } else if (expectedType === 'boolean') {
            next[category][key] = Boolean(val);
          } else if (expectedType === 'string') {
            next[category][key] = String(val);
          }
        }
      }
    }
  }

  // Handle direct legacy top-level toggles if sent
  if (typeof updates.maintenanceMode === 'boolean') {
    next.platform.maintenanceMode = updates.maintenanceMode;
  }
  if (updates.features) {
    if (typeof updates.features.userRegistration === 'boolean') {
      next.platform.allowUserRegistration = updates.features.userRegistration;
    }
    if (typeof updates.features.creatorUploads === 'boolean') {
      next.creator.allowCreatorUploads = updates.features.creatorUploads;
    }
    if (typeof updates.features.socialHuddles === 'boolean') {
      next.social.enableHuddle = updates.features.socialHuddles;
    }
  }

  // Sync legacy fields
  next.maintenanceMode = next.platform.maintenanceMode;
  next.features = {
    userRegistration: next.platform.allowUserRegistration,
    creatorUploads: next.creator.allowCreatorUploads,
    socialHuddles: next.social.enableHuddle
  };

  const diffs = computeDiff(current, next);

  await saveGlobalData(SETTINGS_FILE, next);

  // Audit each meaningful diff
  if (diffs.length > 0) {
    for (const d of diffs) {
      try {
        await addGlobalItem(AUDIT_FILE, {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
          adminId,
          action: 'PLATFORM_SETTING_CHANGED',
          target: d.path,
          details: {
            previousValue: d.previous,
            newValue: d.next
          },
          result: 'success',
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.error('[PlatformSettings] Audit failed:', err);
      }
    }
  }

  return { settings: next, diff: diffs };
}

/**
 * Reset platform settings to authoritative defaults.
 */
export async function resetPlatformSettings(adminId = 'admin') {
  const defaults = JSON.parse(JSON.stringify(DEFAULT_PLATFORM_SETTINGS));
  defaults.maintenanceMode = defaults.platform.maintenanceMode;
  defaults.features = {
    userRegistration: defaults.platform.allowUserRegistration,
    creatorUploads: defaults.creator.allowCreatorUploads,
    socialHuddles: defaults.social.enableHuddle
  };

  await saveGlobalData(SETTINGS_FILE, defaults);

  try {
    await addGlobalItem(AUDIT_FILE, {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      adminId,
      action: 'PLATFORM_SETTINGS_RESET',
      target: 'platform_configuration',
      details: { message: 'Reset all settings to authoritative platform defaults' },
      result: 'success',
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('[PlatformSettings] Audit failed:', err);
  }

  return defaults;
}

/**
 * Map platform settings to individual feature registry IDs for entitlement computation.
 * When a feature is disabled at the platform level, its value in the map is false.
 */
export function getGlobalFeatureMap(settings = DEFAULT_PLATFORM_SETTINGS) {
  const cat = settings.catalog || {};
  const soc = settings.social || {};
  const cre = settings.creator || {};

  return {
    // Navigation / Catalog
    pulse: cat.publicCatalog !== false,
    seek: cat.publicCatalog !== false,
    browse: cat.publicCatalog !== false,
    genre_browsing: cat.publicCatalog !== false,
    
    // Playback
    queue: cat.enableQueue !== false,
    shuffle: cat.enableShuffle !== false,
    repeat: cat.enableRepeat !== false,
    crossfade: cat.defaultCrossfade !== 0,
    gapless_playback: cat.enableGapless !== false,
    playback_speed: true,
    
    // Audio
    standard_audio: true,
    high_quality_audio: true,
    lossless_audio: cat.allowLosslessAudio !== false,
    maximum_audio_quality: cat.allowLosslessAudio !== false,
    
    // Social
    social_profiles: soc.enableSocialProfiles !== false,
    friend_activity: soc.enableFriendActivity !== false,
    fusion: soc.enableFusion !== false,
    huddle: soc.enableHuddle !== false,
    advanced_huddle: soc.enableHuddle !== false,
    sharing: soc.enableSharing !== false,
    beat_codes: soc.enableBeatCodes !== false,

    // Creator
    creator_hub: cre.enableCreatorHub !== false,
    creator_upload: cre.allowCreatorUploads !== false,
    creator_analytics: cre.enableCreatorAnalytics !== false,
    creator_profile: cre.enableCreatorProfiles !== false
  };
}

/**
 * Public configuration returned to clients without requiring admin authorization.
 */
export function getPublicPlatformConfig(settings) {
  const s = settings || DEFAULT_PLATFORM_SETTINGS;
  return {
    maintenanceMode: Boolean(s.platform?.maintenanceMode),
    maintenanceMessage: s.platform?.maintenanceMessage || "Resona is currently undergoing maintenance.",
    allowUserRegistration: Boolean(s.platform?.allowUserRegistration !== false),
    requireAccountVerification: Boolean(s.platform?.requireAccountVerification),
    defaultPlan: s.platform?.defaultPlan || 'resona',
    publicCatalog: Boolean(s.catalog?.publicCatalog !== false),
    branding: {
      platformName: s.branding?.platformName || 'Resona',
      brandTagline: s.branding?.brandTagline || 'The Pure High-Fidelity Music Experience',
      accentColor: s.branding?.accentColor || '#2dd4bf',
      secondaryAccentColor: s.branding?.secondaryAccentColor || '#a855f7'
    }
  };
}

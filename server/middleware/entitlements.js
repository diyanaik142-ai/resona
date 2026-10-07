import { hasFeature } from '../services/entitlements.js';

/**
 * Middleware to ensure the user has a specific feature enabled based on their
 * active plan, overrides, and global platform availability.
 * 
 * Must be used AFTER requireAuth.
 */
export function requireFeature(featureId) {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hasAccess = await hasFeature(req.user.id, featureId);

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Feature not enabled',
          code: 'FEATURE_NOT_ENABLED',
          feature: featureId,
          message: `The ${featureId} feature is not enabled for your current Resona plan.`
        });
      }

      next();
    } catch (err) {
      console.error(`[requireFeature ${featureId} error]`, err);
      return res.status(500).json({ error: 'Internal server error verifying entitlements.' });
    }
  };
}

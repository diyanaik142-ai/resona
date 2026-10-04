import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = Number(process.env.PORT) || 8080;
export const JWT_SECRET = process.env.JWT_SECRET || 'local-development-only-change-me';
export const DATA_DIR = path.resolve(__dirname, 'data');
export const ACCOUNTS_DIR = path.resolve(DATA_DIR, 'accounts');
export const AUTH_FILE = path.resolve(DATA_DIR, 'auth', 'accounts.json');

// Global Storage
export const GLOBAL_DIR = path.resolve(DATA_DIR, 'global');
export const CATALOG_FILE = path.resolve(GLOBAL_DIR, 'catalog.json');
export const AUDIT_FILE = path.resolve(GLOBAL_DIR, 'audit_logs.json');
export const REQUESTS_FILE = path.resolve(GLOBAL_DIR, 'requests.json');
export const CREATORS_FILE = path.resolve(GLOBAL_DIR, 'creator_apps.json');
export const SETTINGS_FILE = path.resolve(GLOBAL_DIR, 'admin_settings.json');
export const PLANS_FILE = path.resolve(GLOBAL_DIR, 'plans.json');
export const OVERRIDES_FILE = path.resolve(GLOBAL_DIR, 'overrides.json');
export const PLAN_CHANGE_REQUESTS_FILE = path.resolve(GLOBAL_DIR, 'plan_change_requests.json');
export const RECOMMENDATION_CACHE_FILE = path.resolve(GLOBAL_DIR, 'recommendation_cache.json');
export const HUDDLES_FILE = path.resolve(GLOBAL_DIR, 'huddles.json');
export const FUSIONS_FILE = path.resolve(GLOBAL_DIR, 'fusions.json');

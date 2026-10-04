import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth as adminAuth } from 'firebase-admin/auth';
import { getFirestore as adminFirestore } from 'firebase-admin/firestore';
import { getStorage as adminStorage } from 'firebase-admin/storage';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { GoogleAuth } from 'google-auth-library';

// Cloud Run uses its attached service identity. For local development, use
// GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default login`.
// The project ID is the one already configured by Resona's Firebase client.
const defaultAdcPaths = [
  process.env.CLOUDSDK_CONFIG && path.join(process.env.CLOUDSDK_CONFIG, 'application_default_credentials.json'),
  process.env.APPDATA && path.join(process.env.APPDATA, 'gcloud', 'application_default_credentials.json'),
  path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json')
].filter(Boolean);
const configuredProjectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'resona-13';
export const FIRESTORE_DATABASE_ID = process.env.FIRESTORE_DATABASE_ID || 'default';
// Local authorized-user ADC often has no discoverable project ID of its own.
// GoogleAuth reads GOOGLE_CLOUD_PROJECT, so seed it only when no override exists.
if (!process.env.GOOGLE_CLOUD_PROJECT && !process.env.GCLOUD_PROJECT) {
  process.env.GOOGLE_CLOUD_PROJECT = configuredProjectId;
}
const googleAuth = new GoogleAuth();
const app = getApps().find((candidate) => candidate.name === '[DEFAULT]') || initializeApp({
  credential: applicationDefault(),
  projectId: configuredProjectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'resona-13.firebasestorage.app'
});

if (app.options.projectId !== configuredProjectId) {
  throw new Error(`Firebase Admin project mismatch: expected ${configuredProjectId}, initialized ${app.options.projectId || '<unset>'}`);
}

console.info(`[Firebase Admin] project=${app.options.projectId}`);

export const firebaseApp = app;
let authInstance;
let firestoreInstance;
let bucketInstance;

function credentialSource() {
  const explicitPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.google_application_credentials;
  if (explicitPath) return { source: 'GOOGLE_APPLICATION_CREDENTIALS', path: explicitPath, exists: fs.existsSync(explicitPath) };
  const adcPath = defaultAdcPaths.find((file) => fs.existsSync(file));
  if (adcPath) return { source: process.env.CLOUDSDK_CONFIG ? 'CLOUDSDK_CONFIG ADC file' : 'well-known ADC file', path: adcPath, exists: true };
  if (process.env.GCE_METADATA_HOST || process.env.GCE_METADATA_IP) return { source: 'Compute metadata server', path: null, exists: null };
  return { source: 'none detected', path: null, exists: false };
}

export function getFirebaseAdminDiagnostics() {
  const source = credentialSource();
  return {
    projectId: app.options.projectId,
    configuredProjectId,
    appName: app.name,
    credentialSource: source.source,
    credentialPath: source.path,
    credentialFileExists: source.exists,
    envOverrides: {
      GOOGLE_APPLICATION_CREDENTIALS: Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS),
      google_application_credentials: Boolean(process.env.google_application_credentials),
      GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT || null,
      GCLOUD_PROJECT: process.env.GCLOUD_PROJECT || null,
      CLOUDSDK_CONFIG: process.env.CLOUDSDK_CONFIG || null,
      GOOGLE_CLOUD_QUOTA_PROJECT: process.env.GOOGLE_CLOUD_QUOTA_PROJECT || null,
      FIREBASE_CONFIG: Boolean(process.env.FIREBASE_CONFIG),
      GCE_METADATA_HOST: Boolean(process.env.GCE_METADATA_HOST),
      GCE_METADATA_IP: Boolean(process.env.GCE_METADATA_IP)
    },
    runtime: {
      node: process.version,
      executable: process.execPath,
      user: process.env.USERNAME || os.userInfo().username,
      home: os.homedir(),
      appData: process.env.APPDATA || null,
      cwd: process.cwd(),
      pathHasGcloud: (process.env.PATH || '').split(path.delimiter).some((entry) => fs.existsSync(path.join(entry, process.platform === 'win32' ? 'gcloud.cmd' : 'gcloud')))
    },
    databaseId: FIRESTORE_DATABASE_ID
  };
}

export async function verifyAdminAdcProject() {
  const client = await googleAuth.getClient();
  const projectId = await googleAuth.getProjectId();
  return { credentialType: client.constructor?.name || 'unknown', projectId: projectId || null };
}

export function getAdminAuth() { return authInstance ||= adminAuth(app); }
export function getAdminFirestore() {
  if (!firestoreInstance) {
    firestoreInstance = adminFirestore(app, FIRESTORE_DATABASE_ID);
    if (firestoreInstance.projectId !== configuredProjectId || firestoreInstance.databaseId !== FIRESTORE_DATABASE_ID) {
      throw new Error(`Firebase Admin Firestore target mismatch: project=${firestoreInstance.projectId} database=${firestoreInstance.databaseId}`);
    }
    console.info(`[Firebase Admin] Firestore target=projects/${firestoreInstance.projectId}/databases/${firestoreInstance.databaseId}`);
  }
  return firestoreInstance;
}
export function getStorageBucket() { return bucketInstance ||= adminStorage(app).bucket(); }

// Lazy proxies allow the local server process and health endpoint to start even
// before a developer configures ADC; protected operations fail with clear setup text.
export const auth = new Proxy({}, { get: (_target, property) => { const value = getAdminAuth()[property]; return typeof value === 'function' ? value.bind(getAdminAuth()) : value; } });
export const db = new Proxy(function () {}, {
  get: (_target, property) => { const value = getAdminFirestore()[property]; return typeof value === 'function' ? value.bind(getAdminFirestore()) : value; },
  apply: (_target, thisArg, args) => Reflect.apply(getAdminFirestore(), thisArg, args)
});
export const bucket = new Proxy({}, { get: (_target, property) => { const value = getStorageBucket()[property]; return typeof value === 'function' ? value.bind(getStorageBucket()) : value; } });

export default { app, auth, db, bucket };

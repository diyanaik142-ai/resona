# Resona backend: local and Cloud Run setup

The existing Firebase project is `resona-13`; no project or database creation is part of this repository setup. The backend uses the existing default Firestore database through Firebase Admin ADC and Firebase Storage through the same project.

## Local

1. Install Google Cloud CLI and run `gcloud auth application-default login` for an identity allowed to access the existing Firestore database and Storage bucket.
2. Copy `.env.example` to `.env`; set a random `JWT_SECRET`, an `ADMIN_PASSWORD_HASH` (bcrypt hash), and the exact local/deployed frontend origins in `CORS_ORIGINS`.
3. Run `npm run dev`. The backend binds `0.0.0.0:8080`; Vite proxies `/api` and `/media` to it.
4. `GET http://localhost:8080/health` checks Firestore connectivity without exposing project or credential details.

## Existing JSON data

Local JSON and media files were preserved. `npm run migrate:firestore` is a read-only dry-run; it reports candidate writes and existing destination documents. Review the report, confirm the destination document paths against the actual existing Firestore schema, and only then use `npm run migrate:firestore:apply`. The importer is additive and skips existing documents. It does not copy media: use the documented media migration path below and update track metadata after verifying Storage access. Never delete local originals until a separate backup and playback verification.

## Cloud Run

1. Build the frontend with `VITE_API_URL` unset so a same-origin web frontend uses its backend origin, or set the public Cloud Run service URL at build time for a separately hosted web frontend and APK.
2. Build the container after `npm run build`: `gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/REPOSITORY/resona-backend`.
3. Deploy to the existing project's Cloud Run, set `GOOGLE_CLOUD_PROJECT=resona-13`, `FIREBASE_STORAGE_BUCKET=resona-13.firebasestorage.app`, `JWT_SECRET`, `ADMIN_PASSWORD_HASH`, `CORS_ORIGINS`, and `NODE_ENV=production`. Attach a dedicated runtime service account with least-privilege Firestore and Storage permissions. Do not upload service-account key files.
4. Grant the runtime identity access to the already existing Firestore database and Storage bucket. Deploy and record the returned HTTPS service URL, then set it as frontend `VITE_API_URL` for separate frontend/APK builds.
5. Verify health, login/profile, catalog uploads/playback, and Socket.IO Huddles from PC and a phone before calling the migration complete.

## Media migration

Use a reviewed manifest of existing `server/data/media` assets. Upload each retained file to Firebase Storage, verify access from a phone against the app's policy, then update the corresponding Firestore track's `audioUrl`/`cover` to the Storage object URL. Keep source files until all track references and playback are confirmed.

import { FIRESTORE_DATABASE_ID, db, bucket } from '../server/firebaseAdmin.js';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT || 'resona-13';
const collections = await db.listCollections();
const report = [];
for (const collection of collections) {
  const snapshot = await collection.count().get();
  report.push({ name: collection.id, documents: snapshot.data().count });
}
const relevant = ['users', 'profiles', 'tracks', 'artists', 'albums', 'playlists', 'listeningHistory', 'likes', 'fusions', 'huddles', 'notifications', 'planChangeRequests', 'recommendations', 'creatorApplications', 'auditLogs', 'resonaData', 'userUids', 'userEmailIndex'];
const named = report.filter((entry) => relevant.includes(entry.name));
const bucketMetadata = await bucket.getMetadata();
console.log(JSON.stringify({ projectId, database: FIRESTORE_DATABASE_ID, bucket: bucketMetadata[0]?.name, collections: report, relevantResonaCollections: named }, null, 2));

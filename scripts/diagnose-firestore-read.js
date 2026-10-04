import { getAdminFirestore, getFirebaseAdminDiagnostics, verifyAdminAdcProject } from '../server/firebaseAdmin.js';

const diagnostics = getFirebaseAdminDiagnostics();
const redact = (value) => String(value || '').replace(/(access_token|refresh_token|id_token|private_key|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=<redacted>');
const safeError = (error) => ({
    name: error?.name ?? null,
    code: error?.code ?? null,
    message: redact(error?.message || error),
    details: redact(error?.details),
    status: error?.status ?? null,
    debugTrackingId: error?.metadata?.get?.('x-debug-tracking-id')?.[0] || null
});

console.log('[Firestore diagnostic] runtime/config:', JSON.stringify(diagnostics, null, 2));

try {
  console.log('[Firestore diagnostic] ADC resolution:', JSON.stringify(await verifyAdminAdcProject()));
  const firestore = getAdminFirestore();
  await firestore.listCollections();
  console.log('[Firestore diagnostic] Firestore target:', JSON.stringify({ projectId: firestore.projectId, databaseId: firestore.databaseId }));
  // Establish which collections already exist, without creating any.
  const collections = await firestore.listCollections();
  const names = collections.map((collection) => collection.id);
  console.log('[Firestore diagnostic] existing collections:', JSON.stringify(names));

  // Choose the first existing collection and read at most one document.
  for (const collection of collections) {
    const snapshot = await collection.limit(1).get();
    if (snapshot.empty) continue;
    console.log('[Firestore diagnostic] read succeeded:', JSON.stringify({
      projectId: diagnostics.projectId,
      databaseId: diagnostics.databaseId,
      collection: collection.id,
      documentRead: true
    }));
    process.exitCode = 0;
    break;
  }
  if (collections.length === 0) {
    console.log('[Firestore diagnostic] connection succeeded; database has no top-level collections to read.');
  } else if (process.exitCode !== 0) {
    console.log('[Firestore diagnostic] connection succeeded; all discovered top-level collections are empty.');
  }
} catch (error) {
  console.error('[Firestore diagnostic] read failed:', JSON.stringify({
    projectId: diagnostics.projectId,
    databaseId: diagnostics.databaseId,
    resource: `projects/${diagnostics.projectId}/databases/${diagnostics.databaseId}`,
    error: safeError(error)
  }, null, 2));
  process.exitCode = 1;
}

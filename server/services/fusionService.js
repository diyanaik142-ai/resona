import { db } from '../firebaseAdmin.js';
import { getRealUserProfile } from './userService.js';

export class FusionService {
  async _readFusions() {
    const snapshot = await db.collection('fusions').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async _writeFusions(fusions) {
    const batch = db.batch();
    for (const fusion of fusions) batch.set(db.collection('fusions').doc(String(fusion.id)), fusion, { merge: true });
    await batch.commit();
  }

  /**
   * Create a Fusion between the creator and a list of participants.
   * participantIds must contain the creatorId and at least one other real user.
   */
  async createFusion(creatorId, participantIds) {
    if (!participantIds.includes(creatorId)) {
      participantIds.push(creatorId);
    }
    
    // Deduplicate
    const uniqueParticipants = [...new Set(participantIds)];
    if (uniqueParticipants.length < 2) {
      throw new Error('A Fusion requires at least two participants.');
    }

    // Verify all participants exist
    for (const uid of uniqueParticipants) {
      const p = await getRealUserProfile(uid);
      if (!p) throw new Error(`User with ID ${uid} not found.`);
    }

    const fusionKey = [...uniqueParticipants].sort().join('|');
    const ref = db.collection('fusions').doc(Buffer.from(fusionKey).toString('base64url'));
    const newFusion = {
      id: ref.id,
      createdBy: creatorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      participants: uniqueParticipants,
      tracks: [] // Placeholder for derived track data
    };

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) return;
      tx.create(ref, newFusion);
    });
    return (await ref.get()).data();
  }

  /**
   * Get all Fusions involving a specific user
   */
  async getUserFusions(userId) {
    const fusions = await this._readFusions();
    return fusions.filter(f => f.participants.includes(userId));
  }

  /**
   * Get Fusion by ID, ensuring user is a participant
   */
  async getFusion(fusionId, userId) {
    const fusions = await this._readFusions();
    const fusion = fusions.find(f => f.id === fusionId);
    if (!fusion) throw new Error('Fusion not found');
    if (userId && !fusion.participants.includes(userId)) {
      throw new Error('Not authorized to access this Fusion');
    }
    return fusion;
  }
}

export const fusionService = new FusionService();

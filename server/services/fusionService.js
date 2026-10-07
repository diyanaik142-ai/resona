import { db } from '../firebaseAdmin.js';
import { getRealUserProfile } from './userService.js';
import { hasFeature } from './entitlements.js';

export class FusionService {
  async _readFusions() {
    const snapshot = await db.collection('fusions').get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async _analyzeTaste(userId, catalog) {
    const { getAccountData } = await import('../db/storage.js');
    const { normalizeShelf } = await import('./recommendationService.js');
    const shelf = normalizeShelf(await getAccountData(userId, 'shelf.json'));
    
    const artists = {};
    const genres = {};
    const liked = new Set(shelf.likedTracks || []);
    const playStats = shelf.playStats || {};
    
    for (const track of catalog) {
      let weight = 0;
      if (liked.has(track.id)) weight += 5;
      const stats = playStats[track.id];
      if (stats) {
        weight += (stats.playStarts || 0) * 1;
        weight += (stats.completions || 0) * 2;
        weight += (stats.replays || 0) * 3;
        weight -= (stats.skips || 0) * 2;
      }
      if (weight > 0) {
        artists[track.artist] = (artists[track.artist] || 0) + weight;
        for (const genre of (track.genres || [])) {
          genres[genre] = (genres[genre] || 0) + weight;
        }
      }
    }
    
    const getTop = (obj, limit) => Object.entries(obj).sort((a,b) => b[1] - a[1]).slice(0, limit).map(x => x[0]);
    return { 
      topArtists: getTop(artists, 50),
      topGenres: getTop(genres, 50),
      weights: { artists, genres },
      liked,
      playStats
    };
  }

  async _generateFusionData(uniqueParticipants) {
    const { getGlobalData } = await import('../db/storage.js');
    const { CATALOG_FILE } = await import('../config.js');
    const catalog = (await getGlobalData(CATALOG_FILE)) || [];
    const published = catalog.filter(t => (!t.status || t.status === 'Published') && !t.deleted);
    
    const tastes = await Promise.all(uniqueParticipants.map(uid => this._analyzeTaste(uid, published)));
    
    // Find intersection of top artists and genres
    let commonArtists = tastes[0].topArtists;
    let commonGenres = tastes[0].topGenres;
    
    for (let i = 1; i < tastes.length; i++) {
      commonArtists = commonArtists.filter(a => tastes[i].topArtists.includes(a));
      commonGenres = commonGenres.filter(g => tastes[i].topGenres.includes(g));
    }
    
    // Calculate a rough compatibility percentage based on overlap
    const maxPossibleArtists = Math.min(...tastes.map(t => t.topArtists.length));
    const maxPossibleGenres = Math.min(...tastes.map(t => t.topGenres.length));
    
    let compatibilityScore = 50; // Base score
    if (maxPossibleArtists > 0) {
      compatibilityScore += (commonArtists.length / maxPossibleArtists) * 30;
    }
    if (maxPossibleGenres > 0) {
      compatibilityScore += (commonGenres.length / maxPossibleGenres) * 20;
    }
    compatibilityScore = Math.round(Math.min(100, Math.max(10, compatibilityScore)));
    
    // Create playlist favoring common artists/genres
    const scoredTracks = published.map(track => {
      let score = 0;
      if (commonArtists.includes(track.artist)) score += 10;
      if (track.genres && track.genres.some(g => commonGenres.includes(g))) score += 5;
      
      // Bonus if liked by multiple participants
      const likers = tastes.filter(t => t.liked.has(track.id)).length;
      score += likers * 5;
      
      return { trackId: track.id, score };
    });
    
    const playlist = scoredTracks
      .filter(t => t.score > 0)
      .sort((a,b) => b.score - a.score)
      .slice(0, 30)
      .map(t => t.trackId);
      
    return {
      compatibilityScore,
      commonArtists: commonArtists.slice(0, 5),
      commonGenres: commonGenres.slice(0, 5),
      playlist,
      playlistId: `fusion_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };
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
      const hasEntitlement = await hasFeature(uid, 'fusion');
      if (!hasEntitlement) {
        const err = new Error(`${p.name || uid} does not have access to Fusion.`);
        err.code = 'RECIPIENT_FEATURE_NOT_ENABLED';
        throw err;
      }
    }

    const fusionKey = [...uniqueParticipants].sort().join('|');
    const ref = db.collection('fusions').doc(Buffer.from(fusionKey).toString('base64url'));
    
    let isNew = false;
    let finalFusion;

    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        finalFusion = existing.data();
        return;
      }
      isNew = true;
    });
    
    if (isNew) {
      const fusionData = await this._generateFusionData(uniqueParticipants);
      finalFusion = {
        id: ref.id,
        createdBy: creatorId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        participants: uniqueParticipants,
        ...fusionData
      };
      await ref.set(finalFusion);
    }
    
    return finalFusion;
  }

  /**
   * Get all Fusions involving a specific user
   */
  async getUserFusions(userId) {
    const fusions = await this._readFusions();
    return fusions.filter(f => f.participants && f.participants.includes(userId));
  }

  /**
   * Get Fusion by ID, ensuring user is a participant
   */
  async getFusion(fusionId, userId) {
    const fusions = await this._readFusions();
    const fusion = fusions.find(f => f.id === fusionId);
    if (!fusion) throw new Error('Fusion not found');
    if (userId && (!fusion.participants || !fusion.participants.includes(userId))) {
      throw new Error('Not authorized to access this Fusion');
    }
    return fusion;
  }
}

export const fusionService = new FusionService();


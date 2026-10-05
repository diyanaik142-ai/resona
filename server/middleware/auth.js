import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import { findAccountById, getAccountData } from '../db/storage.js';
import { getAuth } from 'firebase-admin/auth';
import '../firebaseAdmin.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token.' });
    }

    // 1. Try Firebase ID Token verification
    try {
      const decodedFirebase = await getAuth().verifyIdToken(token);
      let profile = await getAccountData(decodedFirebase.uid, 'profile.json');
      const { db } = await import('../firebaseAdmin.js');
      
      if (!profile) {
        profile = {
          id: decodedFirebase.uid,
          name: decodedFirebase.name || '',
          email: decodedFirebase.email || '',
          uid: '',
          handle: '',
          role: 'listener',
          avatar: decodedFirebase.picture || null,
          createdAt: new Date().toISOString()
        };
        const userRef = db.collection('users').doc(decodedFirebase.uid);
        await db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(userRef);
          if (!snapshot.exists) transaction.create(userRef, { ...profile, internalUserId: decodedFirebase.uid, emailLower: String(profile.email || '').toLowerCase(), planId: 'resona' });
        });
      } else {
        await db.collection('users').doc(decodedFirebase.uid).set({ email: decodedFirebase.email || profile.email || '', emailLower: String(decodedFirebase.email || profile.email || '').toLowerCase(), updatedAt: new Date().toISOString() }, { merge: true });
      }

      req.user = {
        id: decodedFirebase.uid,
        email: decodedFirebase.email || '',
        name: profile.name || decodedFirebase.name || decodedFirebase.email?.split('@')[0] || 'Listener',
        avatar: profile.avatar || decodedFirebase.picture || null,
        role: profile.role || 'listener',
        planId: profile.planId || decodedFirebase.customClaims?.planId || 'resona'
      };
      return next();
    } catch (firebaseErr) {
      // 2. Try Resona JWT Verification (fallback for dev/admin)
      if (token !== 'firebase-token' && process.env.NODE_ENV !== 'production') {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded.id === 'admin' || decoded.role === 'admin') {
            req.user = {
              id: 'admin',
              email: decoded.email || 'admin@resona.internal',
              name: 'Administrator',
              role: 'admin'
            };
            return next();
          }

          const account = await findAccountById(decoded.id);
          if (account) {
            const accProfile = (await getAccountData(account.id, 'profile.json')) || {};
            req.user = {
              id: account.id,
              email: account.email,
              name: accProfile.name || account.email?.split('@')[0] || 'Listener',
              avatar: accProfile.avatar || null,
              role: accProfile.role || 'listener',
              planId: accProfile.planId || 'resona'
            };
            return next();
          }

          req.user = {
            id: decoded.id,
            email: decoded.email || '',
            name: decoded.name || decoded.email?.split('@')[0] || `User_${decoded.id.slice(0, 5)}`,
            avatar: decoded.avatar || null,
            role: decoded.role || 'listener',
            planId: decoded.planId || 'resona'
          };
          return next();
        } catch (jwtErr) {
          // Both failed
        }
      }
    }

    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed.' });
  }
}

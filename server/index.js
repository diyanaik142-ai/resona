import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT } from './config.js';
import { initStorage } from './db/storage.js';

import authRouter from './routes/auth.js';
import userRouter from './routes/user.js';
import shelfRouter from './routes/shelf.js';
import creatorRouter from './routes/creator.js';
import socialRouter from './routes/social.js';
import tracksRouter from './routes/tracks.js';
import adminRouter from './routes/admin.js';
import searchRouter from './routes/search.js';
import notificationsRouter from './routes/notifications.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import { getPlatformSettings, getPublicPlatformConfig } from './services/platformSettings.js';
import { huddleService } from './services/huddleService.js';
import { userStatusTracker } from './services/userStatusTracker.js';
const app = express();

const server = http.createServer(app);
const baseIoOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost,https://resona.anchorlyhms.com').split(',').map((value) => value.trim());
const ioOrigins = [...new Set([...baseIoOrigins, 'capacitor://localhost', 'https://localhost'])];

const io = new SocketIOServer(server, {
  cors: {
    origin: ioOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

huddleService.init(io);

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    if (process.env.NODE_ENV !== 'production') {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.userId = decoded.id;
        return next();
      } catch {}
    }
    const { getAuth } = await import('firebase-admin/auth');
    socket.userId = (await getAuth().verifyIdToken(token)).uid;
    next();
  } catch {
    next(new Error('Invalid authentication token'));
  }
});

io.on('connection', (socket) => {
  socket.on('register_user', () => {
    const userId = socket.userId;
    if (userId) {
      socket.join(`user:${userId}`);
      userStatusTracker.setOnline(userId, socket.id);
      console.log(`[Socket] User registered: ${userId} (${socket.id})`);
      io.emit('user_presence_updated', { userId, status: userStatusTracker.getStatus(userId) });
    }
  });

  socket.on('join_huddle', async ({ huddleId }) => {
    if (huddleId) {
      const huddle = await huddleService.getHuddleById(huddleId, socket.userId).catch(() => null);
      if (!huddle) return;
      socket.join(`huddle:${huddleId}`);
      console.log(`[Socket] Client joined huddle:${huddleId}`);
    }
  });

  socket.on('leave_huddle', ({ huddleId }) => {
    if (huddleId) {
      socket.leave(`huddle:${huddleId}`);
      console.log(`[Socket] Client left huddle:${huddleId}`);
    }
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      userStatusTracker.setOffline(socket.userId, socket.id);
      console.log(`[Socket] User disconnected: ${socket.userId} (${socket.id})`);
      io.emit('user_presence_updated', { userId: socket.userId, status: userStatusTracker.getStatus(socket.userId) });
    }
  });
});

const baseAppOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost,https://resona.anchorlyhms.com').split(',').map((value) => value.trim());
const allowedOrigins = [...new Set([...baseAppOrigins, 'capacitor://localhost', 'https://localhost'])];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// Public platform configuration endpoint (available even during maintenance)
app.get('/api/platform/config', async (req, res) => {
  try {
    const settings = await getPlatformSettings();
    res.json(getPublicPlatformConfig(settings));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load platform configuration' });
  }
});

// Server-side Maintenance Mode middleware
app.use(async (req, res, next) => {
  // Always permit non-API requests (static, dist, etc.)
  if (!req.originalUrl.startsWith('/api')) {
    return next();
  }

  // Always permit admin routes, admin auth, health check, and public platform config
  if (
    req.originalUrl.startsWith('/api/admin') ||
    req.originalUrl.startsWith('/api/platform/config') ||
    req.originalUrl.startsWith('/api/health')
  ) {
    return next();
  }

  try {
    const settings = await getPlatformSettings();
    if (settings.platform?.maintenanceMode) {
      // Allow administrators to bypass maintenance mode if authenticated
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          if (decoded && decoded.role === 'admin') {
            return next();
          }
        } catch (_) {}
      }

      // Block normal user traffic
      return res.status(503).json({
        error: 'Service Unavailable: Platform Maintenance Mode',
        maintenance: true,
        message: settings.platform.maintenanceMessage || 'Resona is currently undergoing scheduled maintenance.'
      });
    }
  } catch (err) {
    console.warn('[Maintenance Check Warning]', err.message);
  }

  next();
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/users', userRouter);
app.use('/api/shelf', shelfRouter);
app.use('/api/creator', creatorRouter);
app.use('/api/social', socialRouter);
app.use('/api/tracks', tracksRouter);
app.use('/api/admin', adminRouter);
app.use('/api/search', searchRouter);
app.use('/api/notifications', notificationsRouter);

// Liveness does not depend on remote services.
app.get('/health', async (req, res) => {
  try {
    const { db } = await import('./firebaseAdmin.js');
    await db.listCollections();
    res.json({ status: 'ok', database: 'connected' });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});
app.get('/api/health', async (req, res) => {
  try {
    const { db } = await import('./firebaseAdmin.js');
    await db.listCollections();
    res.json({ status: 'online', app: 'Resona Backend API', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'unavailable' });
  }
});

// Serve media files statically
const catalogPath = process.env.NODE_ENV === 'production' 
  ? '/opt/resona/media/catalog' 
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data', 'media', 'catalog');
app.use('/media/catalog', express.static(catalogPath));

const profilesPath = process.env.NODE_ENV === 'production'
  ? '/opt/resona/media/profiles'
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data', 'media', 'profiles');
app.use('/media/profiles', express.static(profilesPath));

// Retain local media compatibility in development. Production media must use Storage URLs.
if (process.env.NODE_ENV !== 'production') {
  const mediaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'data', 'media');
  app.use('/media', express.static(mediaPath));
}

// Serve frontend dist if available
const distPath = path.resolve(__dirname, '..', 'dist');
if (process.env.SERVE_FRONTEND === 'true') app.use(express.static(distPath));

// Fallback to index.html for client-side routing
app.use((req, res, next) => {
  if (process.env.SERVE_FRONTEND === 'true' && req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
    return res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next();
    });
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// Initialize storage and launch server
async function start() {
  try {
    await import('./firebaseAdmin.js');
    try {
      await initStorage();
    } catch (error) {
      if (process.env.NODE_ENV === 'production') throw error;
      console.warn(`[Firestore unavailable] ${error.message}`);
    }
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n======================================================`);
      console.log(`  🎵 Resona Backend Server running on http://localhost:${PORT}`);
      console.log(`  🔒 Authentication: JWT + bcrypt password encryption`);
      console.log(`  📁 Storage: Isolated per-account data directories`);
      console.log(`  ⚡ Real-Time: Socket.IO connected`);
      console.log(`======================================================\n`);
    });

  } catch (err) {
    console.error('[Fatal Start Error]', err);
    process.exit(1);
  }
}

start();

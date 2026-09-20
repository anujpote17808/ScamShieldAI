import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getClientUrls, getJwtSecret } from './config';
import prisma from './utils/prisma';

dotenv.config();

// ── Startup diagnostics ────────────────────────────────────────────────────
// Printed to Render logs on every boot. No secrets are logged.
console.log('[startup] NODE_ENV      :', process.env.NODE_ENV || '(not set – defaulting to development)');
console.log('[startup] PORT          :', process.env.PORT || '5001 (default)');
console.log('[startup] DATABASE_URL  :', process.env.DATABASE_URL ? '✓ set' : '✗ NOT SET – DB will fail');
console.log('[startup] JWT_SECRET    :', process.env.JWT_SECRET ? '✓ set' : '✗ NOT SET – auth will fail');
console.log('[startup] FRONTEND_URL  :', process.env.FRONTEND_URL || process.env.CLIENT_URL || '✗ NOT SET – CORS will block frontend');

let allowedOrigins: string[] = [];
try {
  allowedOrigins = getClientUrls();
  console.log('[startup] CORS origins  :', allowedOrigins.join(', '));
} catch (err: any) {
  console.error('[startup] CORS config error:', err.message);
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
  allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
}

const dynamicCorsOrigin = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    // Instead of throwing an error (which yields 500 Internal Server Error),
    // we return false so Express CORS gracefully omits the headers and the browser blocks it natively.
    callback(null, false);
  }
};

const app = express();
const httpServer = createServer(app);
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

export const io = new Server(httpServer, {
  cors: {
    origin: dynamicCorsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: dynamicCorsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

import authRoutes from './routes/auth.routes';
import scanRoutes from './routes/scan.routes';
import analyticsRoutes from './routes/analytics.routes';
import { errorHandler } from './middleware/error.middleware';
import cookieParser from 'cookie-parser';

app.use(cookieParser());
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '16kb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/scans', scanRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root route – confirms the service is reachable (no auth required)
app.get('/', (_req, res) => {
  res.status(200).json({ success: true, data: { service: 'ScamShieldAI API', status: 'running' } });
});

// Health check – also verifies DB connectivity
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, data: { service: 'ok', database: 'ok' } });
  } catch {
    res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' } });
  }
});

// Socket.IO auth
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));

  jwt.verify(token, getJwtSecret(), (err: any, decoded: any) => {
    if (err) return next(new Error('Authentication error'));
    socket.data.userId = decoded.userId;
    next();
  });
});

io.on('connection', (socket) => {
  const userId = socket.data.userId;
  socket.join(userId);
  console.log(`User connected and joined room: ${userId}`);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);
  });
});

// Error handling middleware
app.use(errorHandler);

// Start Server
const PORT = Number(process.env.PORT) || 5001;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[startup] Server is running on port ${PORT}`);
});

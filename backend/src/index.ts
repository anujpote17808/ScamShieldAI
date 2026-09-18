import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getClientUrl, getJwtSecret } from './config';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.disable('x-powered-by');
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

export const io = new Server(httpServer, {
  cors: {
    origin: getClientUrl(),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: getClientUrl(),
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
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
app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ success: true, data: { service: 'ok', database: 'ok' } });
  } catch {
    res.status(503).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Service temporarily unavailable' } });
  }
});

// Socket.IO
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
const PORT = process.env.PORT || 5001;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

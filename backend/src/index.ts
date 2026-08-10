import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import { initSocketServer } from './services/socketService.js';
import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import signatureRoutes from './routes/signatureRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import userRoutes from './routes/userRoutes.js';
import roleRoutes from './routes/roleRoutes.js';
import permissionRoutes from './routes/permissionRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Initialize Socket.io Real-time Engine
initSocketServer(server);

// Security Middleware: Helmet HTTP Headers (เปิดให้โหลดรูปภาพจาก Cross-Origin ได้)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Security Middleware: Rate Limiter (ป้องกัน Brute Force & DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: { success: false, message: 'คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS Policy Setup: Dynamic LAN & Dev Support
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl) or any LAN / localhost origins
      if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.')) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback allow in local dev environment
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' })); // Support Base64 images for signatures
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Custom JSON Parsing Error Handler (ป้องกัน Malformed JSON หรือ Bad Escaping)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof SyntaxError && 'status' in err && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'รูปแบบข้อมูล JSON ไม่ถูกต้อง (Invalid JSON format / Bad escaping)',
    });
  }
  next(err);
});

app.use(cookieParser());

// Static Directory Serving for Images & Signatures
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), system: 'FixFlow CMMS Backend API & Socket Engine' });
});

// API Routes Mapping
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/permissions', permissionRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/signatures', signatureRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/uploads', uploadRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Global Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

server.listen(PORT, () => {
  console.log(`🚀 FixFlow CMMS Backend API & Socket Server running on port ${PORT}`);
  console.log(`🔒 Security Guards Enabled: Dual-Layer RBAC, Anti-Replay Signatures, Helmet & RateLimiter`);
});

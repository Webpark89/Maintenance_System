import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import signatureRoutes from './routes/signatureRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security Middleware: Helmet HTTP Headers
app.use(helmet());

// Security Middleware: Rate Limiter (ป้องกัน Brute Force & DDoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs
  message: { success: false, message: 'คำขอถี่เกินไป กรุณาลองใหม่อีกครั้งในภายหลัง' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// CORS Policy Setup
const allowedOrigins = [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:8080'];
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS Policy'));
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

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'online', timestamp: new Date().toISOString(), system: 'FixFlow CMMS Backend API' });
});

// API Routes Mapping
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/assets', assetRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/signatures', signatureRoutes);
app.use('/api/v1/analytics', analyticsRoutes);

// 404 Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'API Endpoint Not Found' });
});

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Global Error:', err);
  res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 FixFlow CMMS Backend API Server running on port ${PORT}`);
  console.log(`🔒 Security Guards Enabled: Dual-Layer RBAC, Helmet, RateLimiter & JWT Cookie`);
});

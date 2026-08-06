import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken, TokenPayload } from '../utils/jwt.js';
import { prisma } from '../config/db.js';

export interface AuthenticatedSocket extends Socket {
  user?: TokenPayload;
}

let io: Server | null = null;

export function initSocketServer(server: HttpServer): Server {
  const allowedOrigins = [process.env.CORS_ORIGIN || 'http://localhost:5173', 'http://localhost:8080'];

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Socket Authentication Error: Token required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Socket Authentication Error: Invalid token'));
    }

    socket.user = payload;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    console.log(`🔌 Socket Connected: User ${user.name} (${user.empId}) - Role: ${user.role}`);

    // Join Role-specific Room
    if (user.role === 'technician') {
      socket.join('room:technicians');
    } else if (user.role === 'supervisor') {
      socket.join('room:supervisor');
      socket.join('room:technicians'); // Supervisors also listen to tech room
    } else if (user.role === 'requester') {
      socket.join('room:requesters');
    }

    // Join Personal User Room
    socket.join(`user:${user.userId}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Socket Disconnected: User ${user.name} (${user.empId})`);
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized');
  }
  return io;
}

/**
 * Helper function to create DB Notification record & Push Real-time Socket Event
 */
export async function sendNotification(options: {
  userId: number | null;
  requestId: number;
  title: string;
  message: string;
  targetRoom?: string;
  eventType?: string;
  payloadData?: any;
}) {
  try {
    const { userId, requestId, title, message, targetRoom, eventType = 'notification', payloadData } = options;

    // 1. Save Notification record in PostgreSQL
    let dbRecord = null;
    if (userId) {
      dbRecord = await prisma.notifications.create({
        data: {
          user_id: userId,
          request_id: requestId,
          title,
          message,
          is_read: false,
        },
      });
    }

    // 2. Emit Real-time Socket Event if Socket Server is active
    if (io) {
      const eventPayload = {
        notification: dbRecord,
        title,
        message,
        requestId,
        data: payloadData,
        timestamp: new Date().toISOString(),
      };

      if (targetRoom) {
        io.to(targetRoom).emit(eventType, eventPayload);
      }

      if (userId) {
        io.to(`user:${userId}`).emit(eventType, eventPayload);
      }
    }
  } catch (error) {
    console.error('Send Notification Error:', error);
  }
}

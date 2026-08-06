import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:5000`;
};

const SOCKET_SERVER_URL = getSocketUrl();

let socket: Socket | null = null;

export function connectSocket(token?: string): Socket {
  if (socket?.connected) return socket;

  socket = io(SOCKET_SERVER_URL, {
    auth: { token },
    withCredentials: true,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('⚡ Socket connected to backend:', socket?.id);
  });

  socket.on('disconnect', () => {
    console.log('⚡ Socket disconnected from backend');
  });

  // Listen to Real-time Notification Events
  socket.on('new_request', (data: any) => {
    toast.info(data.title || 'มีใบแจ้งซ่อมใหม่', {
      description: data.message,
      duration: 5000,
    });
  });

  socket.on('request_updated', (data: any) => {
    toast.success(data.title || 'อัปเดตสถานะงานซ่อม', {
      description: data.message,
      duration: 5000,
    });
  });

  socket.on('job_completed', (data: any) => {
    toast.success(data.title || 'งานซ่อมเสร็จสมบูรณ์', {
      description: data.message,
      duration: 6000,
    });
  });

  socket.on('task_assigned', (data: any) => {
    toast.warning(data.title || 'คุณได้รับมอบหมายงานใหม่', {
      description: data.message,
      duration: 5000,
    });
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

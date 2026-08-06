import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  // Always use http protocol for backend port 5000 to prevent HTTPS Mixed Content SSL blocks
  return `http://${hostname}:5000/api/v1`;
};

export const API_BASE_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT token from sessionStorage if available
api.interceptors.request.use(
  (config) => {
    try {
      const userRaw = sessionStorage.getItem('fixflow_user');
      if (userRaw) {
        const user = JSON.parse(userRaw);
        if (user?.token) {
          config.headers.Authorization = `Bearer ${user.token}`;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Uniform error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
    return Promise.reject(new Error(message));
  }
);

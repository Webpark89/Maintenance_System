import axios from 'axios';

const getBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // Use relative path when running in browser so Vite proxy handles HTTP/HTTPS seamless translation
  if (typeof window !== 'undefined') {
    return '/api/v1';
  }
  return 'http://localhost:5000/api/v1';
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

// Response Interceptor: Uniform error handling preserving network error signals
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isNetworkError = !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED' || error.message?.includes('Network Error');
    const message = error.response?.data?.message || (isNetworkError ? 'ERR_CONNECTION_REFUSED: เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์' : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    const customErr = new Error(message);
    (customErr as any).isNetworkError = isNetworkError;
    (customErr as any).status = error.response?.status;
    (customErr as any).code = error.code;
    return Promise.reject(customErr);
  }
);

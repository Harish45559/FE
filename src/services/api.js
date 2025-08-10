// services/api.js
import axios from 'axios';

function buildBaseURL() {
  const raw = (import.meta.env?.VITE_API_URL || '').trim();

  // If unset, same-origin (best when Express serves the client)
  if (!raw) return '/api';

  // Normalize
  const cleaned = raw.replace(/\/+$/, '');

  // If it already ends with /api, don't append another /api
  if (/\/api$/i.test(cleaned)) return cleaned;

  return `${cleaned}/api`;
}

const api = axios.create({
  baseURL: buildBaseURL(),
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    if (import.meta.env?.DEV) {
      const method = (config.method || 'GET').toUpperCase();
      const url = (config.baseURL || '') + (config.url?.startsWith('http') ? '' : config.url || '');
      console.log(`[api] ${method} → ${url}`);
    }
    return config;
  },
  (error) => {
    if (import.meta.env?.DEV) console.error('[api] request error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (import.meta.env?.DEV) {
      console.error('[api] response error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      });
    }
    return Promise.reject(error);
  }
);

export default api;

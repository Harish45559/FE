// services/api.js
import axios from 'axios';

/**
 * Build a safe base URL:
 * - If VITE_API_URL is set, treat it as the backend ROOT (no trailing /api) and append /api
 * - Otherwise default to same-origin '/api' (best when Express serves the built client)
 *
 * Examples:
 *   VITE_API_URL = "https://be-i5z1.onrender.com"  -> "https://be-i5z1.onrender.com/api"
 *   VITE_API_URL unset                              -> "/api"
 */
function buildBaseURL() {
  const root = (import.meta.env?.VITE_API_URL || '').trim();
  if (!root) return '/api';
  const cleaned = root.replace(/\/+$/, ''); // remove trailing slashes
  return `${cleaned}/api`;
}

const api = axios.create({
  baseURL: buildBaseURL(),
  withCredentials: true, // keep true if you use cookies/sessions
  headers: {
    'Content-Type': 'application/json',
  },
  // Optional: add a sensible timeout
  timeout: 30000,
});

// Request interceptor (dev-only logging)
api.interceptors.request.use(
  (config) => {
    if (import.meta.env?.DEV) {
      const method = (config.method || 'GET').toUpperCase();
      // ensure we don't double-print baseURL when url is absolute
      const url =
        (config.baseURL || '') +
        (config.url?.startsWith('http') ? '' : config.url || '');
      // eslint-disable-next-line no-console
      console.log(`[api] ${method} → ${url}`);
    }
    return config;
  },
  (error) => {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
      console.error('[api] request error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor (logs errors; you can add global handling here)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env?.DEV) {
      // eslint-disable-next-line no-console
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

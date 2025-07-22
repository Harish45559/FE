// services/api.js or similar file in your frontend
import axios from 'axios';

// Use environment variable or fallback to production URL
const BASE_URL = import.meta.env.VITE_API_URL || 'https://be-i5z1.onrender.com/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Important for CORS with credentials
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    if (error.response) {
      // Server responded with error status
      console.error('Error data:', error.response.data);
      console.error('Error status:', error.response.status);
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
    } else {
      // Something else happened
      console.error('Error message:', error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
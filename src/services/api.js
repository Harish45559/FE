import axios from 'axios';

const api = axios.create({
  baseURL: 'https://be-i5z1.onrender.com/api', // ✅ This must match your backend
  withCredentials: true,
});

export default api;

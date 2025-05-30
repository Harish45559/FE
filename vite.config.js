/* eslint-env node */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const renderHost = 'attendance-system-ubuf.onrender.com';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    origin: `https://${renderHost}`, // ✅ This is now REQUIRED
  },
  preview: {
    host: '0.0.0.0',
    port: process.env.PORT || 5173,
    origin: `https://${renderHost}` // ✅ Needed for vite preview
  }
});

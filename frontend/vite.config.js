/**
 * ========================================================
 * KATEGORI      : Konfigurasi (Frontend)
 * DESKRIPSI     : File konfigurasi untuk Vite bundler.
 * FUNGSI UTAMA  : Mengatur plugin React, port server dev, dan proxy API ke backend.
 * ========================================================
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});

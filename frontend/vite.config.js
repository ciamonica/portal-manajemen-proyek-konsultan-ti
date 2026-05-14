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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('chart.js')) return 'charts';
          if (id.includes('jspdf-autotable')) return 'pdf-table';
          if (id.includes('jspdf')) return 'pdf-core';
          if (id.includes('html2canvas')) return 'html2canvas';
          if (id.includes('dompurify')) return 'dompurify';
          if (id.includes('react') || id.includes('react-router-dom')) return 'react-vendor';
          return undefined;
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000'
    }
  }
});

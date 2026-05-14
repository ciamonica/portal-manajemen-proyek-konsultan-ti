/**
 * ========================================================
 * KATEGORI      : Konfigurasi Build Tool (Frontend)
 * DESKRIPSI     : File konfigurasi untuk Vite bundler.
 * FUNGSI UTAMA  : Mengatur plugin React, port server dev, proxy API ke backend, dan strategi code-splitting.
 * ========================================================
 */

// Mengimpor fungsi defineConfig dari Vite untuk mendapatkan type-checking konfigurasi
import { defineConfig } from 'vite';
// Mengimpor plugin React untuk mendukung JSX dan Fast Refresh
import react from '@vitejs/plugin-react';

// Mengekspor konfigurasi Vite
export default defineConfig({
  // Mendaftarkan plugin React agar Vite bisa memproses file .jsx/.tsx
  plugins: [react()],

  /**
   * KONFIGURASI BUILD
   * Mengatur strategi code-splitting (manualChunks) untuk memisahkan library besar
   * ke dalam file chunk terpisah agar loading awal lebih cepat.
   */
  build: {
    rollupOptions: {
      output: {
        // Fungsi manualChunks menentukan bagaimana modul dikelompokkan ke dalam chunk
        manualChunks(id) {
          // Abaikan file yang bukan dari node_modules
          if (!id.includes('node_modules')) return undefined;
          // Pisahkan Chart.js ke chunk tersendiri (library visualisasi besar)
          if (id.includes('chart.js')) return 'charts';
          // Pisahkan jspdf-autotable ke chunk tersendiri
          if (id.includes('jspdf-autotable')) return 'pdf-table';
          // Pisahkan jspdf core ke chunk tersendiri
          if (id.includes('jspdf')) return 'pdf-core';
          // Pisahkan html2canvas ke chunk tersendiri
          if (id.includes('html2canvas')) return 'html2canvas';
          // Pisahkan dompurify ke chunk tersendiri
          if (id.includes('dompurify')) return 'dompurify';
          // Gabungkan React dan React Router ke satu chunk vendor
          if (id.includes('react') || id.includes('react-router-dom')) return 'react-vendor';
          // Library lain tetap di chunk default
          return undefined;
        }
      }
    }
  },

  /**
   * KONFIGURASI SERVER DEVELOPMENT
   * Mengatur port dan proxy untuk pengembangan lokal.
   */
  server: {
    port: 5173, // Port server development frontend (http://localhost:5173)
    proxy: {
      // Semua request ke /api akan di-proxy ke backend di port 4000
      '/api': 'http://localhost:4000'
    }
  }
});

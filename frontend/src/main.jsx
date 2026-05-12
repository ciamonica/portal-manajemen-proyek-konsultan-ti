/**
 * ========================================================
 * KATEGORI      : Entry Point Aplikasi (Frontend)
 * DESKRIPSI     : File utama untuk merender aplikasi React ke dalam DOM.
 * FUNGSI UTAMA  : Menyiapkan routing (BrowserRouter) dan context provider (AuthProvider).
 * ========================================================
 */

// Mengimpor library React
import React from 'react';
// Mengimpor ReactDOM untuk merender aplikasi ke browser
import ReactDOM from 'react-dom/client';
// Mengimpor BrowserRouter untuk manajemen navigasi
import { BrowserRouter } from 'react-router-dom';
// Mengimpor komponen utama aplikasi
import App from './App.jsx';
// Mengimpor penyedia state otentikasi (Auth Context)
import { AuthProvider } from './context/AuthContext.jsx';
// Mengimpor gaya CSS global
import './style.css';

// Merender aplikasi ke dalam elemen HTML dengan id 'root'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* BrowserRouter membungkus aplikasi agar bisa menggunakan fitur routing */}
    <BrowserRouter>
      {/* AuthProvider menyediakan state login dan fungsi otentikasi untuk semua komponen anak */}
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

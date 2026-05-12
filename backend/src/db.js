/**
 * ========================================================
 * KATEGORI      : Konfigurasi Database
 * DESKRIPSI     : File ini menangani koneksi antara aplikasi dan database MySQL.
 * FUNGSI UTAMA  : Membuat dan mengekspor connection pool MySQL yang digunakan oleh sistem.
 * ========================================================
 */

// Mengimpor module promise dari mysql2 agar query mendukung async/await
const mysql = require('mysql2/promise');
// Mengimpor module dotenv untuk memuat variabel lingkungan dari file .env
const dotenv = require('dotenv');

// Memuat variabel lingkungan (seperti DB_HOST, DB_USER, dll)
dotenv.config();

/**
 * MEMBUAT CONNECTION POOL
 * Connection pool digunakan untuk mengelola banyak koneksi secara efisien 
 * dibandingkan dengan membuka dan menutup koneksi baru setiap kali query dijalankan.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1', // Alamat host database (default: localhost)
  port: process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306, // Port database (default MySQL: 3306)
  user: process.env.DB_USER || 'root', // Username database
  password: process.env.DB_PASSWORD || '', // Password database
  database: process.env.DB_NAME || 'project_portal', // Nama database yang dituju
  waitForConnections: true, // Menunggu jika semua koneksi sedang dipakai
  connectionLimit: 10, // Maksimal jumlah koneksi serentak
  queueLimit: 0, // Batas antrean permintaan (0 berarti tanpa batas)
  decimalNumbers: true // Memastikan angka desimal dikembalikan sebagai angka (bukan string)
});

// Mengekspor pool agar dapat di-query dari file lain (seperti file rute API)
module.exports = pool;

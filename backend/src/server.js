/**
 * ========================================================
 * KATEGORI      : Entry Point (Titik Masuk) Backend
 * DESKRIPSI     : File ini merupakan file utama yang dieksekusi saat backend dijalankan.
 * FUNGSI UTAMA  : Memuat aplikasi Express dari app.js dan menjalankannya pada port tertentu.
 * ========================================================
 */

// Mengimpor instance Express yang sudah dikonfigurasi di app.js
const app = require('./app');
// Mengimpor module dotenv untuk membaca port dari variabel lingkungan
const dotenv = require('dotenv');

// Memuat file konfigurasi .env
dotenv.config();

// Menentukan port aplikasi (dari .env atau default ke 4000)
const PORT = process.env.PORT || 4000;

/**
 * MENJALANKAN SERVER
 * Server Express mulai mendengarkan (listen) request yang masuk pada port yang ditentukan.
 */
app.listen(PORT, () => {
  // Menampilkan pesan di konsol saat server berhasil berjalan
  console.log(`Backend API listening on http://localhost:${PORT}`);
});

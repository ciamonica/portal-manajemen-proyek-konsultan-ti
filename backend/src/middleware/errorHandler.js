/**
 * ========================================================
 * KATEGORI      : Middleware (Penanganan Error)
 * DESKRIPSI     : File middleware global untuk menangani error tak terduga.
 * FUNGSI UTAMA  : Menangkap pesan error dari sistem dan merespon Client dengan pesan JSON terstruktur.
 * ========================================================
 */

/**
 * PENANGANAN ERROR GLOBAL
 * Fungsi ini memiliki 4 parameter yang menandakan bahwa ia adalah middleware error handler di Express.
 */
function errorHandler(err, req, res, next) {
  // Mencetak log error ke konsol (berguna untuk proses debug di backend)
  console.error(err);
  
  // Mengambil kode status dari error (jika ada), jika tidak, fallback ke 500 (Internal Server Error)
  const status = err.status || 500;
  
  // Mengembalikan respons dengan format JSON yang rapi ke frontend
  res.status(status).json({
    success: false, // Menandakan bahwa request gagal
    error: err.message || 'Internal Server Error' // Menampilkan pesan error spesifik jika tersedia
  });
}

// Mengekspor errorHandler agar bisa dipasang di file utama app.js
module.exports = errorHandler;

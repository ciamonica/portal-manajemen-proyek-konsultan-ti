/**
 * ========================================================
 * KATEGORI      : Konfigurasi Keamanan (Autentikasi)
 * DESKRIPSI     : File ini mengatur konfigurasi untuk JSON Web Token (JWT).
 * FUNGSI UTAMA  : Mengambil secret key dan masa berlaku token dari environment, serta memberikan fallback untuk environment pengembangan (development).
 * ========================================================
 */

// Mengimpor module dotenv untuk membaca variabel lingkungan (.env)
const dotenv = require('dotenv');

// Memuat variabel lingkungan
dotenv.config();

// Kunci rahasia bawaan yang hanya boleh digunakan pada tahap development
const DEV_JWT_SECRET = 'development_only_jwt_secret_change_me';

/**
 * MENGAMBIL JWT SECRET
 * Fungsi ini digunakan untuk mendapatkan JWT secret yang aman dari .env.
 * Jika environment adalah produksi, maka program akan memaksa penggunaan secret yang aman.
 */
function getJwtSecret() {
  // Mengambil nilai JWT_SECRET dari environment
  const secret = process.env.JWT_SECRET;
  // Memeriksa apakah secret sudah dikonfigurasi dan bukan string default/kosong
  const hasConfiguredSecret = secret && secret.trim() && secret !== 'replace_with_a_strong_secret';

  // Jika sudah dikonfigurasi, gunakan secret tersebut
  if (hasConfiguredSecret) {
    return secret;
  }

  // Jika di tahap produksi (production) namun secret belum aman, lemparkan error
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }

  // Jika masih di tahap development, gunakan kunci rahasia development
  return DEV_JWT_SECRET;
}

/**
 * MENGAMBIL DURASI KEDALUWARSA JWT
 * Fungsi ini mengembalikan berapa lama JWT akan valid.
 */
function getJwtExpiresIn() {
  // Mengembalikan nilai JWT_EXPIRES_IN dari environment, atau default '2h' (2 jam)
  return process.env.JWT_EXPIRES_IN || '2h';
}

// Mengekspor fungsi-fungsi konfigurasi agar bisa dipakai di middleware atau rute
module.exports = { getJwtSecret, getJwtExpiresIn };

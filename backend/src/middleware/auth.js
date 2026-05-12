/**
 * ========================================================
 * KATEGORI      : Middleware (Otorisasi & Autentikasi)
 * DESKRIPSI     : File ini berisi fungsi middleware penengah (interceptor) untuk mengecek hak akses.
 * FUNGSI UTAMA  : Memverifikasi token JWT dari request dan mengecek apakah role user diizinkan mengakses rute tertentu.
 * ========================================================
 */

// Mengimpor library jsonwebtoken untuk memverifikasi token
const jwt = require('jsonwebtoken');
// Mengimpor fungsi getJwtSecret untuk mendapatkan secret key aplikasi
const { getJwtSecret } = require('../config/authConfig');

/**
 * AUTENTIKASI TOKEN
 * Middleware ini mencegat request masuk untuk memastikan user mengirimkan token JWT yang valid.
 */
function authenticateToken(req, res, next) {
  // Mengambil header otorisasi atau dari cookies (jika ada)
  const authHeader = req.headers.authorization || req.cookies?.token;
  // Mengekstrak token dengan membuang prefix 'Bearer ' (jika menggunakan format Bearer token)
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;

  // Jika token tidak ditemukan sama sekali, tolak dengan status 401
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication token missing' });
  }

  try {
    // Memverifikasi validitas token menggunakan secret key
    const payload = jwt.verify(token, getJwtSecret());
    // Menyimpan data payload (seperti ID user & role) ke dalam objek req.user
    req.user = payload;
    // Lanjut ke middleware/rute selanjutnya karena token valid
    next();
  } catch (error) {
    // Jika verifikasi gagal (misal expired/salah), tolak dengan status 401
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

/**
 * OTORISASI ROLE
 * Middleware tambahan untuk membatasi akses berdasarkan role (peran) user.
 * Menerima daftar peran (allowedRoles) yang diizinkan untuk mengakses endpoint.
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    // Jika req.user belum ada (belum melewati authenticateToken), tolak akses
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Jika role user saat ini tidak ada di daftar role yang diizinkan, tolak akses (status 403 Forbidden)
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    // Jika role sesuai, izinkan melanjutkan ke rute
    next();
  };
}

// Mengekspor middleware agar dapat dipasang di rute yang memerlukan proteksi
module.exports = { authenticateToken, authorizeRoles };

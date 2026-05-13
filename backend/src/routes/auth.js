/**
 * ========================================================
 * KATEGORI      : API Route (Autentikasi)
 * DESKRIPSI     : Endpoint untuk menangani proses login dan pengeluaran token.
 * FUNGSI UTAMA  : Menerima kredensial user, memverifikasinya ke database, dan mengembalikan JWT.
 * ========================================================
 */

// Mengimpor library express untuk membuat router
const express = require('express');
// Mengimpor bcrypt untuk membandingkan password yang di-hash
const bcrypt = require('bcrypt');
// Mengimpor jsonwebtoken untuk membuat token sesi
const jwt = require('jsonwebtoken');
// Mengimpor pool koneksi database
const pool = require('../db');
// Mengimpor skema validasi login dan fungsi parse
const { loginSchema, parseSchema } = require('../validators/schemas');
// Mengimpor fungsi pembacaan konfigurasi JWT
const { getJwtSecret, getJwtExpiresIn } = require('../config/authConfig');

// Membuat instance router dari Express
const router = express.Router();

/**
 * ENDPOINT: POST /api/auth/login
 * Digunakan oleh pengguna untuk masuk ke dalam sistem.
 * Endpoint ini mengecek keberadaan username, membandingkan password, dan jika cocok, menghasilkan token JWT.
 */
router.post('/login', async (req, res, next) => {
  try {
    // Memvalidasi data request body dengan loginSchema
    const { data, error } = parseSchema(loginSchema, req.body);
    // Jika validasi gagal, kembalikan respons error 400 (Bad Request)
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    // Menjalankan query untuk mencari pengguna berdasarkan username
    const [rows] = await pool.query('SELECT id, username, password, email, role FROM users WHERE username = ?', [data.username]);
    // Mengambil baris pertama dari hasil query
    const user = rows[0];
    
    // Jika user tidak ditemukan, kembalikan error 401 (Unauthorized)
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Membandingkan password input dengan hash password di database
    const passwordMatch = await bcrypt.compare(data.password, user.password);
    // Jika password salah, kembalikan error 401
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Membuat JSON Web Token (JWT) dengan payload id, role, dan username
    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      getJwtSecret(), // Kunci rahasia dari environment
      { expiresIn: getJwtExpiresIn() } // Masa berlaku token
    );
    
    // Mengirimkan respons sukses beserta token dan data pengguna ke Client
    res.json({ success: true, data: { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } } });
  } catch (err) {
    // Jika terjadi error server (misal database mati), lempar ke errorHandler global
    next(err);
  }
});

// Mengekspor router agar bisa digunakan di app.js
module.exports = router;

/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Pengguna)
 * DESKRIPSI     : File routing untuk pengelolaan entitas pengguna (User).
 * FUNGSI UTAMA  : Menyediakan endpoint untuk mengambil daftar pengguna, membuat pengguna baru, dan melihat profil sendiri.
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor bcrypt untuk hashing password pengguna baru
const bcrypt = require('bcrypt');
// Mengimpor koneksi pool database
const pool = require('../db');
// Mengimpor skema validasi pembuatan user
const { userCreateSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware untuk membatasi akses berdasarkan peran
const { authorizeRoles } = require('../middleware/auth');

// Membuat router Express
const router = express.Router();

/**
 * ENDPOINT: GET /api/users
 * Mengambil semua data pengguna. Hanya bisa diakses oleh Project Manager (pm).
 */
router.get('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Mengeksekusi query untuk mengambil semua user (tanpa password)
    const [rows] = await pool.query('SELECT id, username, email, role, created_at FROM users');
    // Mengembalikan data user dalam bentuk JSON
    res.json({ success: true, data: rows });
  } catch (err) {
    // Meneruskan error ke global handler jika terjadi kegagalan
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/users
 * Membuat akun pengguna baru. Hanya bisa diakses oleh Project Manager (pm).
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Memvalidasi data input menggunakan userCreateSchema
    const { data, error } = parseSchema(userCreateSchema, req.body);
    // Jika ada field yang tidak sesuai kriteria, tolak request
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    
    // Melakukan hashing pada password input menggunakan salt round 10
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Menyimpan data user baru ke dalam database
    const [result] = await pool.query(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [data.username, hashedPassword, data.email, data.role] // Menyisipkan nilai secara aman untuk mencegah SQL Injection
    );
    
    // Mengambil kembali data user yang baru saja dibuat berdasarkan insertId
    const [rows] = await pool.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [result.insertId]);
    
    // Mengirimkan status 201 (Created) beserta data user baru
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Meneruskan error sistem ke global handler
    next(err);
  }
});

/**
 * ENDPOINT: GET /api/users/me
 * Mengambil data profil dari pengguna yang sedang login saat ini.
 */
router.get('/me', async (req, res, next) => {
  try {
    // Mengambil data user berdasarkan ID yang didapat dari token JWT (req.user.id)
    const [rows] = await pool.query('SELECT id, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    // Mengembalikan detail profil pengguna tersebut
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    // Meneruskan error ke middleware penanganan error
    next(err);
  }
});

// Mengekspor modul router
module.exports = router;

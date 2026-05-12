/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Milestone)
 * DESKRIPSI     : Endpoint untuk mengelola entitas milestone.
 * FUNGSI UTAMA  : Menyediakan operasi CRUD untuk pencapaian kunci (milestone) pada suatu proyek.
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor pool koneksi database
const pool = require('../db');
// Mengimpor skema validasi untuk milestone
const { milestoneCreateSchema, parseSchema } = require('../validators/schemas');
// Mengimpor fungsi otorisasi berdasarkan role
const { authorizeRoles } = require('../middleware/auth');

// Membuat router
const router = express.Router();

/**
 * ENDPOINT: GET /api/milestones
 * Mendapatkan daftar milestone. Akses data dibatasi sesuai dengan peran (role) pengguna.
 */
router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role; // Peran pengguna yang login
    const userId = req.user.id; // ID pengguna
    // Query dasar untuk mengambil milestone dan nama proyek
    let query = 'SELECT m.*, p.name AS project_name FROM milestones m LEFT JOIN projects p ON m.project_id = p.id';
    const filters = []; // (unused, retained for consistency)
    const params = []; // Parameter query database

    // Filter berdasarkan hak akses
    if (role === 'pm') {
      query += ' JOIN projects p2 ON m.project_id = p2.id WHERE p2.pm_id = ?'; // PM hanya melihat milestone proyek miliknya
      params.push(userId);
    } else if (role === 'client') {
      query += ' JOIN projects p2 ON m.project_id = p2.id WHERE p2.client_id = ?'; // Client hanya melihat milestone proyeknya
      params.push(userId);
    } else if (role === 'dev') {
      // Dev melihat milestone proyek di mana ia memiliki tugas
      query = 'SELECT DISTINCT m.*, p.name AS project_name FROM milestones m JOIN projects p ON m.project_id = p.id JOIN tasks t ON p.id = t.project_id WHERE t.assigned_to = ?';
      params.push(userId);
    }

    // Mengeksekusi query database
    const [rows] = await pool.query(query, params);
    // Mengembalikan hasil
    res.json({ success: true, data: rows });
  } catch (err) {
    // Melempar error ke middleware penanganan error
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/milestones
 * Membuat milestone baru. Hanya diperbolehkan untuk PM.
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Memvalidasi data yang dikirimkan menggunakan Zod
    const { data, error } = parseSchema(milestoneCreateSchema, req.body);
    if (error) {
      // Jika tidak valid, kirim respons 400 Bad Request
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const { project_id, name, description, due_date, status } = data; // Ekstrak data tervalidasi
    
    // Menyisipkan milestone baru ke tabel database
    const [result] = await pool.query(
      'INSERT INTO milestones (project_id, name, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
      [project_id, name, description || null, due_date || null, status || 'pending']
    );
    
    // Mengambil data yang baru ditambahkan
    const [rows] = await pool.query('SELECT * FROM milestones WHERE id = ?', [result.insertId]);
    // Mengirim respons sukses 201 Created
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err); // Meneruskan ke errorHandler global
  }
});

/**
 * ENDPOINT: PUT /api/milestones/:id
 * Memperbarui milestone yang ada berdasarkan ID. Hanya PM yang diizinkan.
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.id); // Mendapatkan ID milestone
    // Memvalidasi secara parsial karena mungkin hanya sebagian kolom yang di-update
    const { data, error } = parseSchema(milestoneCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    
    const updates = []; // Kumpulan klausa SET untuk SQL
    const params = []; // Kumpulan parameter bind SQL
    
    // Looping key dari request body yang valid
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`); // Misal: name = ?
      params.push(value); // Misal: "Fase 1 Selesai"
    });
    
    params.push(milestoneId); // Parameter untuk WHERE id = ?
    
    // Eksekusi query UPDATE
    await pool.query(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`, params);
    
    // Ambil ulang data yang telah diubah
    const [rows] = await pool.query('SELECT * FROM milestones WHERE id = ?', [milestoneId]);
    // Kirim respons sukses
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err); // Teruskan jika ada kegagalan
  }
});

/**
 * ENDPOINT: DELETE /api/milestones/:id
 * Menghapus milestone berdasarkan ID. Hanya dapat dilakukan oleh PM.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.id); // Mendapatkan ID dari parameter URL
    // Eksekusi query penghapusan
    await pool.query('DELETE FROM milestones WHERE id = ?', [milestoneId]);
    // Mengirim respons status dengan menyertakan ID yang terhapus
    res.json({ success: true, data: { id: milestoneId } });
  } catch (err) {
    // Tangkap dan teruskan error
    next(err);
  }
});

// Ekspor router untuk digunakan di file utama (app.js)
module.exports = router;

/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Proyek)
 * DESKRIPSI     : File routing untuk pengelolaan entitas proyek.
 * FUNGSI UTAMA  : Menyediakan endpoint CRUD (Create, Read, Update, Delete) untuk data proyek beserta filter akses berdasarkan peran (Role).
 * ========================================================
 */

// Mengimpor express
const express = require('express');
// Mengimpor database pool
const pool = require('../db');
// Mengimpor skema validasi proyek
const { projectCreateSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware otorisasi
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * ENDPOINT: GET /api/projects
 * Mengambil daftar proyek yang sesuai dengan hak akses (PM melihat proyeknya, Client melihat proyeknya, Dev melihat proyek yang ada task-nya).
 */
router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role; // Mengambil peran pengguna dari token
    const userId = req.user.id; // Mengambil ID pengguna dari token
    // Query dasar untuk mengambil proyek beserta username client dan PM
    let query = 'SELECT p.*, u.username AS client_username, pm.username AS pm_username FROM projects p LEFT JOIN users u ON p.client_id = u.id LEFT JOIN users pm ON p.pm_id = pm.id';
    let params = []; // Parameter untuk query binding

    // Menyesuaikan query berdasarkan role
    if (role === 'pm') {
      query += ' WHERE p.pm_id = ?'; // PM hanya melihat proyek yang ia kelola
      params.push(userId);
    } else if (role === 'client') {
      query += ' WHERE p.client_id = ?'; // Client hanya melihat proyek miliknya
      params.push(userId);
    } else if (role === 'dev') {
      // Developer melihat proyek di mana ia memiliki tugas (task) yang ditugaskan kepadanya
      query = 'SELECT DISTINCT p.*, u.username AS client_username, pm.username AS pm_username FROM projects p JOIN tasks t ON p.id = t.project_id LEFT JOIN users u ON p.client_id = u.id LEFT JOIN users pm ON p.pm_id = pm.id WHERE t.assigned_to = ?';
      params.push(userId);
    }

    // Mengeksekusi query database
    const [rows] = await pool.query(query, params);
    // Mengembalikan hasil
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err); // Tangani error
  }
});

/**
 * ENDPOINT: POST /api/projects
 * Membuat proyek baru (Hanya PM yang bisa).
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi data pembuatan proyek
    const { data, error } = parseSchema(projectCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    // Destrukturisasi data yang tervalidasi
    const { name, description, start_date, end_date, status, client_id, pm_id, cover_image_url } = data;
    
    // Menyimpan data proyek baru ke DB
    const [result] = await pool.query(
      'INSERT INTO projects (name, description, start_date, end_date, status, client_id, pm_id, cover_image_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, description, start_date || null, end_date || null, status || 'planning', client_id || null, pm_id || req.user.id, cover_image_url || null]
    );

    // Mengambil ulang data proyek yang baru dibuat
    const [projectRows] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    // Mengembalikan data ke klien dengan status 201 Created
    res.status(201).json({ success: true, data: projectRows[0] });
  } catch (err) {
    next(err); // Tangani error
  }
});

/**
 * ENDPOINT: PUT /api/projects/:id
 * Memperbarui data proyek tertentu (Hanya PM yang bisa).
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const projectId = Number(req.params.id); // Mendapatkan ID dari URL
    // Memvalidasi sebagian data (partial) karena update bisa hanya sebagian field
    const { data, error } = parseSchema(projectCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    
    const updates = []; // Array query update
    const params = []; // Parameter query
    
    // Membuat query dinamis berdasarkan data yang dikirim
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });
    
    // Memastikan proyek diperbarui hanya jika PM yang login adalah pemiliknya
    params.push(projectId, req.user.id);
    const [result] = await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ? AND pm_id = ?`, params);
    
    // Jika tidak ada baris yang berubah, berarti ID salah atau bukan milik PM ini
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    // Mengembalikan data proyek yang sudah diperbarui
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err); // Tangani error
  }
});

/**
 * ENDPOINT: DELETE /api/projects/:id
 * Menghapus proyek berdasarkan ID (Hanya PM yang bisa).
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const projectId = Number(req.params.id); // ID proyek dari parameter
    // Menghapus proyek dari DB dengan memastikan kepemilikan PM
    const [result] = await pool.query('DELETE FROM projects WHERE id = ? AND pm_id = ?', [projectId, req.user.id]);
    
    // Jika gagal terhapus
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    
    // Memberi respons sukses beserta ID yang terhapus
    res.json({ success: true, data: { id: projectId } });
  } catch (err) {
    next(err); // Tangani error
  }
});

module.exports = router;

/**
 * ========================================================
 * KATEGORI      : API Route (Pencatatan Waktu / Time Logs)
 * DESKRIPSI     : File routing untuk pengelolaan log waktu pekerja.
 * FUNGSI UTAMA  : Menyediakan endpoint CRUD untuk mencatat jam kerja (time logs) pada suatu tugas.
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor koneksi database
const pool = require('../db');
// Mengimpor skema validasi
const { timeLogSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware otorisasi
const { authorizeRoles } = require('../middleware/auth');
const { taskAccessibleToUser, timeLogEditableByUser } = require('../utils/accessControl');

const router = express.Router();

/**
 * FUNGSI BANTUAN: roleFilter
 * Menghasilkan filter SQL untuk membatasi hak akses berdasarkan peran.
 */
function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] }; // Project Manager melihat log dari proyek yang dipegangnya
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] }; // Client melihat log proyek miliknya
  return { clause: 'tl.user_id = ?', params: [user.id] }; // Dev hanya melihat log waktunya sendiri
}

/**
 * ENDPOINT: GET /api/time-logs
 * Mengambil daftar log waktu berdasarkan filter otorisasi.
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user); // Dapatkan filter
    const [rows] = await pool.query(
      `
        SELECT tl.*, u.username, t.name AS task_name, p.id AS project_id, p.name AS project_name
        FROM time_logs tl
        JOIN users u ON tl.user_id = u.id
        JOIN tasks t ON tl.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE ${filter.clause}
        ORDER BY tl.log_date DESC, tl.created_at DESC
      `,
      filter.params
    );
    res.json({ success: true, data: rows }); // Kembalikan respons
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/time-logs
 * Mencatat jam kerja baru. Dev bisa mencatat waktunya, Project Manager bisa mencatat untuk orang lain atau dirinya.
 */
router.post('/', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    // Validasi input
    const { data, error } = parseSchema(timeLogSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    // Tentukan ID pengguna yang log-nya dicatat
    const userId = req.user.role === 'pm' ? (data.user_id || req.user.id) : req.user.id;

    const canAccessTask = await taskAccessibleToUser(data.task_id, req.user);
    if (!canAccessTask) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    // Insert data ke database
    const [result] = await pool.query(
      'INSERT INTO time_logs (user_id, task_id, hours, log_date) VALUES (?, ?, ?, ?)',
      [userId, data.task_id, data.hours, data.log_date || new Date().toISOString().slice(0, 10)]
    );
    
    // Mengembalikan data hasil insert
    const [rows] = await pool.query('SELECT * FROM time_logs WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/time-logs/:id
 * Mengupdate catatan waktu tertentu.
 */
router.put('/:id', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const timeLogId = Number(req.params.id);
    // Validasi input parsial
    const { data, error } = parseSchema(timeLogSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const canEditTimeLog = await timeLogEditableByUser(timeLogId, req.user);
    if (!canEditTimeLog) {
      return res.status(404).json({ success: false, error: 'Time log not found' });
    }

    if (Object.prototype.hasOwnProperty.call(data, 'task_id')) {
      const canAccessTask = await taskAccessibleToUser(data.task_id, req.user);
      if (!canAccessTask) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const updates = [];
    const params = [];
    // Siapkan data yang akan diupdate
    Object.entries(data).forEach(([key, value]) => {
      // Abaikan jika undefiend. Dev tidak bisa ganti user_id
      if (value === undefined || (req.user.role !== 'pm' && key === 'user_id')) return;
      updates.push(`${key} = ?`);
      params.push(value);
    });

    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(timeLogId);
    let query = `UPDATE time_logs SET ${updates.join(', ')} WHERE id = ?`;
    
    // Jika role = dev, pastikan dia hanya bisa update log miliknya
    if (req.user.role === 'dev') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [result] = await pool.query(query, params);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Time log not found' });
    }

    // Ambil data terbaru
    const [rows] = await pool.query('SELECT * FROM time_logs WHERE id = ?', [timeLogId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/time-logs/:id
 * Menghapus data log waktu. Dev hanya bisa hapus miliknya sendiri.
 */
router.delete('/:id', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const timeLogId = Number(req.params.id);
    const canEditTimeLog = await timeLogEditableByUser(timeLogId, req.user);
    if (!canEditTimeLog) {
      return res.status(404).json({ success: false, error: 'Time log not found' });
    }

    const params = [timeLogId];
    let query = 'DELETE FROM time_logs WHERE id = ?';
    
    // Batasan akses untuk dev
    if (req.user.role === 'dev') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }
    
    await pool.query(query, params);
    res.json({ success: true, data: { id: timeLogId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

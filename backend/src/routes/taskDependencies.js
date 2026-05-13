/**
 * ========================================================
 * KATEGORI      : API Route (Ketergantungan Tugas)
 * DESKRIPSI     : File routing untuk pengelolaan hubungan dependensi antar tugas.
 * FUNGSI UTAMA  : Menyediakan endpoint CRUD untuk menetapkan bahwa suatu tugas bergantung pada tugas lain (Task Dependencies).
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor koneksi database
const pool = require('../db');
// Mengimpor skema validasi
const { taskDependencySchema, parseSchema } = require('../validators/schemas');
// Mengimpor fungsi otorisasi
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * FUNGSI BANTUAN: roleFilter
 * Membuat klausa SQL dinamis untuk filter akses berdasarkan role pengguna.
 */
function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] }; // Project Manager bisa melihat di proyeknya
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] }; // Client melihat di proyeknya
  // Dev bisa melihat jika dia ditugaskan pada tugas utama atau tugas dependensinya
  return { clause: '(t.assigned_to = ? OR dt.assigned_to = ?)', params: [user.id, user.id] };
}

/**
 * ENDPOINT: GET /api/task-dependencies
 * Mendapatkan daftar ketergantungan antar tugas.
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user); // Terapkan filter hak akses
    const [rows] = await pool.query(
      `
        SELECT td.*, t.name AS task_name, dt.name AS depends_on_task_name, p.id AS project_id, p.name AS project_name
        FROM task_dependencies td
        JOIN tasks t ON td.task_id = t.id
        JOIN tasks dt ON td.depends_on_task_id = dt.id
        JOIN projects p ON t.project_id = p.id
        WHERE ${filter.clause}
        ORDER BY p.name, t.name
      `,
      filter.params
    );
    res.json({ success: true, data: rows }); // Kembalikan array data
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/task-dependencies
 * Menambahkan relasi tugas baru (Hanya Project Manager).
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi data masukan
    const { data, error } = parseSchema(taskDependencySchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    // Pengecekan silang: Pastikan kedua task ada di dalam proyek yang sama
    const [[task], [dependency]] = await Promise.all([
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.task_id]).then(([rows]) => rows),
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.depends_on_task_id]).then(([rows]) => rows)
    ]);
    if (!task || !dependency || task.project_id !== dependency.project_id) {
      return res.status(400).json({ success: false, error: 'Dependent tasks must exist in the same project' });
    }

    // Insert relasi dependensi ke database
    const [result] = await pool.query(
      'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)',
      [data.task_id, data.depends_on_task_id]
    );
    // Ambil data yang baru disimpan
    const [rows] = await pool.query('SELECT * FROM task_dependencies WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    // Tangani error jika kombinasi task_id dan depends_on_task_id duplikat
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Dependency already exists' });
    }
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/task-dependencies/:id
 * Mengubah relasi dependensi yang sudah ada (Hanya Project Manager).
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const dependencyId = Number(req.params.id);
    const { data, error } = parseSchema(taskDependencySchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    // Pengecekan silang proyek untuk tugas yang baru
    const [[task], [dependency]] = await Promise.all([
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.task_id]).then(([rows]) => rows),
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.depends_on_task_id]).then(([rows]) => rows)
    ]);
    if (!task || !dependency || task.project_id !== dependency.project_id) {
      return res.status(400).json({ success: false, error: 'Dependent tasks must exist in the same project' });
    }

    // Lakukan update relasi dependensi
    const [result] = await pool.query(
      'UPDATE task_dependencies SET task_id = ?, depends_on_task_id = ? WHERE id = ?',
      [data.task_id, data.depends_on_task_id, dependencyId]
    );
    
    // Jika data tidak ditemukan
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Dependency not found' });
    }

    // Kembalikan data yang telah diperbarui
    const [rows] = await pool.query('SELECT * FROM task_dependencies WHERE id = ?', [dependencyId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Dependency already exists' });
    }
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/task-dependencies/:id
 * Menghapus relasi ketergantungan antar tugas (Hanya Project Manager).
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const dependencyId = Number(req.params.id);
    // Hapus relasi
    await pool.query('DELETE FROM task_dependencies WHERE id = ?', [dependencyId]);
    // Respon dengan format standar yang menyebutkan ID file yang terhapus
    res.json({ success: true, data: { id: dependencyId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

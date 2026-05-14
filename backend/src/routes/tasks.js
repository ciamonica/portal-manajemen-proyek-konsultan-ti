/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Tugas)
 * DESKRIPSI     : File routing untuk pengelolaan entitas tugas (Task).
 * FUNGSI UTAMA  : Endpoint CRUD untuk tugas yang tergabung dalam sebuah proyek.
 * ========================================================
 */

// Mengimpor express
const express = require('express');
// Mengimpor koneksi DB
const pool = require('../db');
// Mengimpor skema validasi untuk tugas
const { taskCreateSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware hak akses
const { authorizeRoles } = require('../middleware/auth');
const { projectManagedByPm } = require('../utils/accessControl');

const router = express.Router();

/**
 * ENDPOINT: GET /api/tasks
 * Mengambil daftar tugas dengan filter (project_id, status, due_date) dan pembatasan hak akses.
 */
router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role; // Peran pengguna
    const userId = req.user.id; // ID pengguna
    const { projectId, status, fromDate, toDate } = req.query; // Query parameter

    // Query utama untuk mengambil data tugas dengan join proyek dan pengguna
    let baseQuery = 'SELECT t.*, p.name AS project_name, u.username AS assigned_username, u.role AS assigned_role FROM tasks t LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id';
    const filters = []; // Array kondisi filter
    const params = []; // Array parameter DB

    // Menerapkan filter pencarian
    if (projectId) {
      filters.push('t.project_id = ?');
      params.push(Number(projectId));
    }
    if (status) {
      filters.push('t.status = ?');
      params.push(status);
    }
    if (fromDate) {
      filters.push('t.due_date >= ?');
      params.push(fromDate);
    }
    if (toDate) {
      filters.push('t.due_date <= ?');
      params.push(toDate);
    }

    // Menerapkan pembatasan data berdasarkan role pengguna yang login
    if (role === 'dev') {
      filters.push('t.assigned_to = ?'); // Dev hanya melihat tugasnya
      params.push(userId);
    } else if (role === 'client') {
      baseQuery += ' JOIN projects p2 ON t.project_id = p2.id';
      filters.push('p2.client_id = ?'); // Client melihat tugas dari proyek miliknya
      params.push(userId);
    } else if (role === 'pm') {
      baseQuery += ' JOIN projects p2 ON t.project_id = p2.id';
      filters.push('p2.pm_id = ?'); // Project Manager melihat tugas dari proyek yang ia pegang
      params.push(userId);
    }

    // Menggabungkan query dasar dengan filter WHERE
    const query = [baseQuery, filters.length ? 'WHERE ' + filters.join(' AND ') : ''].join(' ');
    const [rows] = await pool.query(query, params);
    
    // Mengembalikan hasil tugas
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err); // Lempar error ke middleware
  }
});

/**
 * ENDPOINT: POST /api/tasks
 * Membuat tugas baru. Hanya Project Manager yang bisa membuat tugas.
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi payload
    const { data, error } = parseSchema(taskCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    
    const { project_id, name, description, assigned_to, status, progress, due_date } = data;

    const canManageProject = await projectManagedByPm(project_id, req.user.id);
    if (!canManageProject) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }
    
    // Insert ke tabel tugas
    const [result] = await pool.query(
      'INSERT INTO tasks (project_id, name, description, assigned_to, status, progress, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [project_id, name, description || null, assigned_to || null, status || 'todo', progress || 0, due_date || null]
    );
    
    // Ambil data yang baru dibuat
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/tasks/:id
 * Mengupdate tugas. Project Manager bisa ubah semua field, Dev hanya bisa ubah status dan progress.
 */
router.put('/:id', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    // Validasi data input secara parsial
    const { data, error } = parseSchema(taskCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    
    // Filter field: Jika role dev, hanya izinkan update status & progress
    const safeData = req.user.role === 'dev'
      ? Object.fromEntries(Object.entries(data).filter(([key]) => ['status', 'progress'].includes(key)))
      : data;
      
    const updates = [];
    const params = [];
    
    // Menyiapkan query UPDATE dinamis
    Object.entries(safeData).forEach(([key, value]) => {
      updates.push(`t.${key} = ?`);
      params.push(value);
    });
    
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(taskId, req.user.id);
    // Kondisi WHERE berdasarkan role (Project Manager harus owner project, Dev harus assignee)
    const accessClause = req.user.role === 'pm' ? 'p.pm_id = ?' : 't.assigned_to = ?';
    
    // Update tasks
    const [result] = await pool.query(
      `UPDATE tasks t JOIN projects p ON t.project_id = p.id SET ${updates.join(', ')} WHERE t.id = ? AND ${accessClause}`,
      params
    );
    
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    // Ambil hasil update
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/tasks/:id
 * Menghapus tugas. Hanya Project Manager dari proyek tersebut yang diizinkan.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id); // Mendapatkan ID tugas
    
    // Menghapus hanya jika user login adalah Project Manager dari proyek terkait
    const [result] = await pool.query(
      'DELETE t FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id = ? AND p.pm_id = ?',
      [taskId, req.user.id]
    );
    
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }
    
    // Respons sukses
    res.json({ success: true, data: { id: taskId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

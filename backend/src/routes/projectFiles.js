/**
 * ========================================================
 * KATEGORI      : API Route (File Proyek)
 * DESKRIPSI     : File routing untuk pengelolaan lampiran file atau dokumen.
 * FUNGSI UTAMA  : Menyediakan endpoint CRUD untuk mereferensikan file terkait proyek.
 * ========================================================
 */

// Mengimpor express
const express = require('express');
// Mengimpor koneksi pool DB
const pool = require('../db');
// Mengimpor skema validasi Zod
const { projectFileSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware otorisasi
const { authorizeRoles } = require('../middleware/auth');
const { projectManagedByPm, projectRecordManagedByPm } = require('../utils/accessControl');

const router = express.Router();

/**
 * FUNGSI BANTUAN: roleFilter
 * Membatasi akses file berdasarkan peran pengguna.
 */
function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] }; // Project Manager melihat file proyeknya
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] }; // Client melihat file proyeknya
  // Dev hanya melihat file dari proyek di mana dia memiliki task
  return {
    clause: 'EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = pf.project_id AND t.assigned_to = ?)',
    params: [user.id]
  };
}

/**
 * ENDPOINT: GET /api/project-files
 * Mendapatkan daftar file yang dilampirkan pada suatu proyek.
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user); // Filter berdasarkan role
    const [rows] = await pool.query(
      `
        SELECT pf.*, p.name AS project_name, u.username AS uploaded_by_username
        FROM project_files pf
        JOIN projects p ON pf.project_id = p.id
        LEFT JOIN users u ON pf.uploaded_by = u.id
        WHERE ${filter.clause}
        ORDER BY pf.created_at DESC
      `,
      filter.params
    );
    res.json({ success: true, data: rows }); // Kembalikan data
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/project-files
 * Menambahkan rujukan file baru ke proyek. Hanya Project Manager yang berhak mengupload.
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi input data
    const { data, error } = parseSchema(projectFileSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const canManageProject = await projectManagedByPm(data.project_id, req.user.id);
    if (!canManageProject) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Melakukan operasi Insert ke database
    const [result] = await pool.query(
      'INSERT INTO project_files (project_id, title, file_url, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [data.project_id, data.title, data.file_url, data.file_type || 'dokumen', req.user.id]
    );
    
    // Ambil data file baru yang diinsert
    const [rows] = await pool.query('SELECT * FROM project_files WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/project-files/:id
 * Mengupdate referensi file yang sudah ada (Hanya Project Manager).
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const fileId = Number(req.params.id);
    // Validasi input parsial
    const { data, error } = parseSchema(projectFileSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const canManageFile = await projectRecordManagedByPm('project_files', 'pf', fileId, req.user.id);
    if (!canManageFile) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    if (Object.prototype.hasOwnProperty.call(data, 'project_id')) {
      const canManageProject = await projectManagedByPm(data.project_id, req.user.id);
      if (!canManageProject) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const updates = [];
    const params = [];
    // Bangun kueri update dinamis
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(fileId);
    // Eksekusi pembaruan ke dalam tabel
    await pool.query(`UPDATE project_files SET ${updates.join(', ')} WHERE id = ?`, params);
    
    // Kembalikan objek data hasil update
    const [rows] = await pool.query('SELECT * FROM project_files WHERE id = ?', [fileId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/project-files/:id
 * Menghapus file proyek dari database.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const fileId = Number(req.params.id);
    const canManageFile = await projectRecordManagedByPm('project_files', 'pf', fileId, req.user.id);
    if (!canManageFile) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }

    // Eksekusi query penghapusan
    await pool.query('DELETE FROM project_files WHERE id = ?', [fileId]);
    // Konfirmasi respons OK
    res.json({ success: true, data: { id: fileId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

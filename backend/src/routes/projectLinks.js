/**
 * ========================================================
 * KATEGORI      : API Route (Tautan Proyek)
 * DESKRIPSI     : File routing untuk pengelolaan tautan (link) terkait proyek.
 * FUNGSI UTAMA  : Menyediakan endpoint untuk menyimpan tautan dokumentasi eksternal (API docs, BRD, Repo, dll).
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor koneksi database
const pool = require('../db');
// Mengimpor skema validasi Zod
const { projectLinkSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware hak akses
const { authorizeRoles } = require('../middleware/auth');
const { projectManagedByPm, projectLinkManagedByPm } = require('../utils/accessControl');

const router = express.Router();

/**
 * FUNGSI BANTUAN: appendProjectAccessFilter
 * Menambahkan filter WHERE ke kueri SQL berdasarkan peran pengguna.
 * Memastikan Project Manager/Client hanya melihat tautan dari proyek mereka, dan Dev hanya jika ditugaskan.
 */
function appendProjectAccessFilter(query, params, user, projectColumn = 'pl.project_id') {
  if (user.role === 'pm') {
    return {
      query: `${query} WHERE ${projectColumn} IS NULL OR p.pm_id = ?`,
      params: [...params, user.id]
    };
  }
  if (user.role === 'client') {
    return {
      query: `${query} WHERE ${projectColumn} IS NULL OR p.client_id = ?`,
      params: [...params, user.id]
    };
  }
  return {
    query: `${query} WHERE ${projectColumn} IS NULL OR EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = ${projectColumn} AND t.assigned_to = ?)`,
    params: [...params, user.id]
  };
}

/**
 * FUNGSI BANTUAN: hasExplicitProjectId
 * Mengecek apakah data memiliki project_id yang eksplisit (bukan null/undefined).
 */
function hasExplicitProjectId(data) {
  return Object.prototype.hasOwnProperty.call(data, 'project_id') && data.project_id !== null;
}

/**
 * FUNGSI BANTUAN: normalizeProjectId
 * Mengembalikan project_id dari data jika eksplisit, atau null jika tidak (tautan global).
 */
function normalizeProjectId(data) {
  return hasExplicitProjectId(data) ? data.project_id : null;
}

/**
 * ENDPOINT: GET /api/project-links
 * Mengambil daftar tautan proyek yang diizinkan untuk diakses oleh pengguna.
 */
router.get('/', async (req, res, next) => {
  try {
    // Query dasar untuk mengambil data tautan dan nama proyek
    let query = `
      SELECT pl.*, p.name AS project_name
      FROM project_links pl
      LEFT JOIN projects p ON pl.project_id = p.id
    `;
    let params = [];
    
    // Menambahkan filter keamanan tingkat baris (Row-Level Security)
    ({ query, params } = appendProjectAccessFilter(query, params, req.user));
    // Mengurutkan berdasarkan sort_order dan judul
    query += ' ORDER BY COALESCE(pl.sort_order, 0), pl.title';

    // Menjalankan query
    const [rows] = await pool.query(query, params);
    // Mengembalikan data
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/project-links
 * Menambahkan tautan eksternal baru ke suatu proyek. Hanya Project Manager yang bisa menambahkan.
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Memvalidasi payload
    const { data, error } = parseSchema(projectLinkSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    if (hasExplicitProjectId(data)) {
      const canManageProject = await projectManagedByPm(data.project_id, req.user.id);
      if (!canManageProject) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    // Melakukan query INSERT
    const [result] = await pool.query(
      'INSERT INTO project_links (project_id, title, url, type, sort_order) VALUES (?, ?, ?, ?, ?)',
      [normalizeProjectId(data), data.title, data.url, data.type || 'other', data.sort_order || 0]
    );
    
    // Mengambil data tautan yang baru saja disimpan
    const [rows] = await pool.query('SELECT * FROM project_links WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/project-links/:id
 * Memperbarui data tautan.
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const linkId = Number(req.params.id);
    // Memvalidasi input parsial
    const { data, error } = parseSchema(projectLinkSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const canManageLink = await projectLinkManagedByPm(linkId, req.user.id);
    if (!canManageLink) {
      return res.status(404).json({ success: false, error: 'Project link not found' });
    }

    if (hasExplicitProjectId(data)) {
      const canManageProject = await projectManagedByPm(data.project_id, req.user.id);
      if (!canManageProject) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
    }

    const updates = [];
    const params = [];
    // Menyiapkan list field yang akan di-update
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(key === 'project_id' ? normalizeProjectId(data) : value);
    });
    
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(linkId);
    // Eksekusi update
    await pool.query(`UPDATE project_links SET ${updates.join(', ')} WHERE id = ?`, params);
    
    // Ambil data terbaru
    const [rows] = await pool.query('SELECT * FROM project_links WHERE id = ?', [linkId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/project-links/:id
 * Menghapus tautan proyek.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const linkId = Number(req.params.id);
    const canManageLink = await projectLinkManagedByPm(linkId, req.user.id);
    if (!canManageLink) {
      return res.status(404).json({ success: false, error: 'Project link not found' });
    }

    // Hapus dari database
    await pool.query('DELETE FROM project_links WHERE id = ?', [linkId]);
    // Kirim respons
    res.json({ success: true, data: { id: linkId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

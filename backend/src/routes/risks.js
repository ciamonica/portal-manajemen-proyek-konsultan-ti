/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Risiko)
 * DESKRIPSI     : File routing untuk pengelolaan risiko (Risk) pada proyek.
 * FUNGSI UTAMA  : Menyediakan endpoint CRUD untuk mencatat dan memantau risiko.
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor koneksi DB
const pool = require('../db');
// Mengimpor skema validasi Zod
const { riskSchema, parseSchema } = require('../validators/schemas');
// Mengimpor middleware hak akses
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * FUNGSI BANTUAN: roleFilter
 * Menghasilkan filter SQL dinamis berdasarkan peran pengguna untuk membatasi akses data risiko.
 */
function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] }; // PM melihat risiko proyeknya
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] }; // Client melihat risiko proyeknya
  // Dev melihat risiko proyek di mana ia ditugaskan
  return {
    clause: 'EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = r.project_id AND t.assigned_to = ?)',
    params: [user.id]
  };
}

/**
 * ENDPOINT: GET /api/risks
 * Mendapatkan daftar risiko proyek yang berhak dilihat pengguna.
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user); // Terapkan filter hak akses
    const [rows] = await pool.query(
      `
        SELECT r.*, p.name AS project_name, u.username AS owner_username
        FROM risks r
        JOIN projects p ON r.project_id = p.id
        LEFT JOIN users u ON r.owner_id = u.id
        WHERE ${filter.clause}
        ORDER BY FIELD(r.status, 'open', 'mitigating', 'resolved'), FIELD(r.impact, 'high', 'medium', 'low'), r.due_date IS NULL, r.due_date
      `,
      filter.params
    );
    res.json({ success: true, data: rows }); // Kirim respons sukses
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/risks
 * Membuat risiko baru. Hanya bisa dilakukan oleh PM.
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi input body
    const { data, error } = parseSchema(riskSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    // Insert ke tabel risks
    const [result] = await pool.query(
      'INSERT INTO risks (project_id, title, description, probability, impact, mitigation, status, owner_id, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.project_id,
        data.title,
        data.description || null,
        data.probability || 'medium',
        data.impact || 'medium',
        data.mitigation || null,
        data.status || 'open',
        data.owner_id || null,
        data.due_date || null
      ]
    );
    
    // Ambil data yang baru disimpan
    const [rows] = await pool.query('SELECT * FROM risks WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/risks/:id
 * Mengupdate data risiko berdasarkan ID. Hanya PM yang bisa.
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const riskId = Number(req.params.id);
    // Validasi parsial untuk update sebagian field
    const { data, error } = parseSchema(riskSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    // Siapkan klausa update dinamis
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value === '' ? null : value);
    });
    
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(riskId);
    // Eksekusi update SQL
    await pool.query(`UPDATE risks SET ${updates.join(', ')} WHERE id = ?`, params);
    
    // Ambil data hasil update
    const [rows] = await pool.query('SELECT * FROM risks WHERE id = ?', [riskId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/risks/:id
 * Menghapus data risiko berdasarkan ID. Hanya PM yang bisa.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const riskId = Number(req.params.id);
    // Eksekusi hapus di database
    await pool.query('DELETE FROM risks WHERE id = ?', [riskId]);
    res.json({ success: true, data: { id: riskId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

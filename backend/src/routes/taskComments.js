/**
 * ========================================================
 * KATEGORI      : API Route (Komentar Tugas)
 * DESKRIPSI     : File routing untuk pengelolaan diskusi dan komentar pada tugas.
 * FUNGSI UTAMA  : Menyediakan endpoint CRUD untuk menambahkan komentar (Task Comments) pada tugas tertentu.
 * ========================================================
 */

// Mengimpor library express
const express = require('express');
// Mengimpor koneksi pool database
const pool = require('../db');
// Mengimpor skema validasi khusus untuk komentar tugas
const { taskCommentSchema, parseSchema } = require('../validators/schemas');
// Mengimpor fungsi pembatas hak akses
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * FUNGSI BANTUAN: roleFilter
 * Memastikan bahwa komentar hanya bisa dibaca oleh pengguna yang relevan
 * (PM proyek, Client proyek, atau Developer yang ditugaskan ke task tersebut).
 */
function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] };
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] };
  return { clause: 't.assigned_to = ?', params: [user.id] };
}

/**
 * ENDPOINT: GET /api/task-comments
 * Memuat semua komentar dari semua tugas (di-filter berdasarkan hak akses).
 */
router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user); // Menerapkan filter
    const [rows] = await pool.query(
      `
        SELECT tc.*, u.username, t.name AS task_name, p.id AS project_id, p.name AS project_name
        FROM task_comments tc
        JOIN users u ON tc.user_id = u.id
        JOIN tasks t ON tc.task_id = t.id
        JOIN projects p ON t.project_id = p.id
        WHERE ${filter.clause}
        ORDER BY tc.created_at DESC
      `,
      filter.params
    );
    res.json({ success: true, data: rows }); // Mengembalikan respons data
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/task-comments
 * Menambahkan komentar baru ke tugas. (Semua pengguna yang terotentikasi bisa).
 */
router.post('/', async (req, res, next) => {
  try {
    // Memvalidasi payload JSON
    const { data, error } = parseSchema(taskCommentSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    // Melakukan query Insert
    const [result] = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [data.task_id, req.user.id, data.comment]
    );
    
    // Ambil data komentar yang baru masuk
    const [rows] = await pool.query('SELECT * FROM task_comments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/task-comments/:id
 * Mengupdate isi komentar. PM bisa ganti apa saja, selain PM hanya bisa ganti miliknya sendiri.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    // Validasi data parsial (biasanya payload hanya ada { comment: "..." })
    const { data, error } = parseSchema(taskCommentSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    // Ekstraksi nilai yang valid untuk diupdate
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined) return;
      updates.push(`${key} = ?`);
      params.push(value);
    });

    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(commentId);
    let query = `UPDATE task_comments SET ${updates.join(', ')} WHERE id = ?`;
    
    // Batasi update hanya pada komentar sendiri, kecuali role PM (bisa ubah semua)
    if (req.user.role !== 'pm') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    // Eksekusi pembaruan
    const [result] = await pool.query(query, params);
    // Jika tidak ada baris yang dipengaruhi
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    // Ambil dan kembalikan data yang diupdate
    const [rows] = await pool.query('SELECT * FROM task_comments WHERE id = ?', [commentId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/task-comments/:id
 * Menghapus komentar. Diatur hanya PM yang boleh menghapus di sini.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    // Jalankan perintah hapus
    await pool.query('DELETE FROM task_comments WHERE id = ?', [commentId]);
    // Kirim konfirmasi 
    res.json({ success: true, data: { id: commentId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const pool = require('../db');
const { projectFileSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] };
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] };
  return {
    clause: 'EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = pf.project_id AND t.assigned_to = ?)',
    params: [user.id]
  };
}

router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user);
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
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(projectFileSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const [result] = await pool.query(
      'INSERT INTO project_files (project_id, title, file_url, file_type, uploaded_by) VALUES (?, ?, ?, ?, ?)',
      [data.project_id, data.title, data.file_url, data.file_type || 'dokumen', req.user.id]
    );
    const [rows] = await pool.query('SELECT * FROM project_files WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const fileId = Number(req.params.id);
    const { data, error } = parseSchema(projectFileSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(fileId);
    await pool.query(`UPDATE project_files SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM project_files WHERE id = ?', [fileId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const fileId = Number(req.params.id);
    await pool.query('DELETE FROM project_files WHERE id = ?', [fileId]);
    res.json({ success: true, data: { id: fileId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

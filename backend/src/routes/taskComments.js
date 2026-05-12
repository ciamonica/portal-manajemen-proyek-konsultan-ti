const express = require('express');
const pool = require('../db');
const { taskCommentSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] };
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] };
  return { clause: 't.assigned_to = ?', params: [user.id] };
}

router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user);
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
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = parseSchema(taskCommentSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const [result] = await pool.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [data.task_id, req.user.id, data.comment]
    );
    const [rows] = await pool.query('SELECT * FROM task_comments WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    const { data, error } = parseSchema(taskCommentSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
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
    if (req.user.role !== 'pm') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [result] = await pool.query(query, params);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Comment not found' });
    }

    const [rows] = await pool.query('SELECT * FROM task_comments WHERE id = ?', [commentId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const commentId = Number(req.params.id);
    await pool.query('DELETE FROM task_comments WHERE id = ?', [commentId]);
    res.json({ success: true, data: { id: commentId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

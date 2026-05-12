const express = require('express');
const pool = require('../db');
const { timeLogSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] };
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] };
  return { clause: 'tl.user_id = ?', params: [user.id] };
}

router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user);
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
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(timeLogSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const userId = req.user.role === 'pm' ? (data.user_id || req.user.id) : req.user.id;
    const [result] = await pool.query(
      'INSERT INTO time_logs (user_id, task_id, hours, log_date) VALUES (?, ?, ?, ?)',
      [userId, data.task_id, data.hours, data.log_date || new Date().toISOString().slice(0, 10)]
    );
    const [rows] = await pool.query('SELECT * FROM time_logs WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const timeLogId = Number(req.params.id);
    const { data, error } = parseSchema(timeLogSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || (req.user.role !== 'pm' && key === 'user_id')) return;
      updates.push(`${key} = ?`);
      params.push(value);
    });

    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(timeLogId);
    let query = `UPDATE time_logs SET ${updates.join(', ')} WHERE id = ?`;
    if (req.user.role === 'dev') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [result] = await pool.query(query, params);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Time log not found' });
    }

    const [rows] = await pool.query('SELECT * FROM time_logs WHERE id = ?', [timeLogId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const timeLogId = Number(req.params.id);
    const params = [timeLogId];
    let query = 'DELETE FROM time_logs WHERE id = ?';
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

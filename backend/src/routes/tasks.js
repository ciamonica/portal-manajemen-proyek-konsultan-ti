const express = require('express');
const pool = require('../db');
const { taskCreateSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const { projectId, status, fromDate, toDate } = req.query;

    let baseQuery = 'SELECT t.*, p.name AS project_name, u.username AS assigned_username FROM tasks t LEFT JOIN projects p ON t.project_id = p.id LEFT JOIN users u ON t.assigned_to = u.id';
    const filters = [];
    const params = [];

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

    if (role === 'dev') {
      filters.push('t.assigned_to = ?');
      params.push(userId);
    } else if (role === 'client') {
      baseQuery += ' JOIN projects p2 ON t.project_id = p2.id';
      filters.push('p2.client_id = ?');
      params.push(userId);
    } else if (role === 'pm') {
      baseQuery += ' JOIN projects p2 ON t.project_id = p2.id';
      filters.push('p2.pm_id = ?');
      params.push(userId);
    }

    const query = [baseQuery, filters.length ? 'WHERE ' + filters.join(' AND ') : ''].join(' ');
    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(taskCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    const { project_id, name, description, assigned_to, status, progress, due_date } = data;
    const [result] = await pool.query(
      'INSERT INTO tasks (project_id, name, description, assigned_to, status, progress, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [project_id, name, description || null, assigned_to || null, status || 'todo', progress || 0, due_date || null]
    );
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm', 'dev'), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { data, error } = parseSchema(taskCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });
    params.push(taskId);
    await pool.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM tasks WHERE id = ?', [taskId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    await pool.query('DELETE FROM tasks WHERE id = ?', [taskId]);
    res.json({ success: true, data: { id: taskId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

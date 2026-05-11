const express = require('express');
const pool = require('../db');
const { projectCreateSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    let query = 'SELECT p.*, u.username AS client_username, pm.username AS pm_username FROM projects p LEFT JOIN users u ON p.client_id = u.id LEFT JOIN users pm ON p.pm_id = pm.id';
    let params = [];

    if (role === 'pm') {
      query += ' WHERE p.pm_id = ?';
      params.push(userId);
    } else if (role === 'client') {
      query += ' WHERE p.client_id = ?';
      params.push(userId);
    } else if (role === 'dev') {
      query = 'SELECT DISTINCT p.*, u.username AS client_username, pm.username AS pm_username FROM projects p JOIN tasks t ON p.id = t.project_id LEFT JOIN users u ON p.client_id = u.id LEFT JOIN users pm ON p.pm_id = pm.id WHERE t.assigned_to = ?';
      params.push(userId);
    }

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(projectCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    const { name, description, start_date, end_date, status, client_id, pm_id } = data;
    const [result] = await pool.query(
      'INSERT INTO projects (name, description, start_date, end_date, status, client_id, pm_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, description, start_date || null, end_date || null, status || 'planning', client_id || null, pm_id || req.user.id]
    );

    const [projectRows] = await pool.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: projectRows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    const { data, error } = parseSchema(projectCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });
    params.push(projectId);
    await pool.query(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const projectId = Number(req.params.id);
    await pool.query('DELETE FROM projects WHERE id = ?', [projectId]);
    res.json({ success: true, data: { id: projectId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

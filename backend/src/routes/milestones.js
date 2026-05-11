const express = require('express');
const pool = require('../db');
const { milestoneCreateSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    let query = 'SELECT m.*, p.name AS project_name FROM milestones m LEFT JOIN projects p ON m.project_id = p.id';
    const filters = [];
    const params = [];

    if (role === 'pm') {
      query += ' JOIN projects p2 ON m.project_id = p2.id WHERE p2.pm_id = ?';
      params.push(userId);
    } else if (role === 'client') {
      query += ' JOIN projects p2 ON m.project_id = p2.id WHERE p2.client_id = ?';
      params.push(userId);
    } else if (role === 'dev') {
      query = 'SELECT DISTINCT m.*, p.name AS project_name FROM milestones m JOIN projects p ON m.project_id = p.id JOIN tasks t ON p.id = t.project_id WHERE t.assigned_to = ?';
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
    const { data, error } = parseSchema(milestoneCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const { project_id, name, description, due_date, status } = data;
    const [result] = await pool.query(
      'INSERT INTO milestones (project_id, name, description, due_date, status) VALUES (?, ?, ?, ?, ?)',
      [project_id, name, description || null, due_date || null, status || 'pending']
    );
    const [rows] = await pool.query('SELECT * FROM milestones WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.id);
    const { data, error } = parseSchema(milestoneCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }
    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value);
    });
    params.push(milestoneId);
    await pool.query(`UPDATE milestones SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM milestones WHERE id = ?', [milestoneId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const milestoneId = Number(req.params.id);
    await pool.query('DELETE FROM milestones WHERE id = ?', [milestoneId]);
    res.json({ success: true, data: { id: milestoneId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

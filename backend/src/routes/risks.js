const express = require('express');
const pool = require('../db');
const { riskSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] };
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] };
  return {
    clause: 'EXISTS (SELECT 1 FROM tasks t WHERE t.project_id = r.project_id AND t.assigned_to = ?)',
    params: [user.id]
  };
}

router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user);
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
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(riskSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

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
    const [rows] = await pool.query('SELECT * FROM risks WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const riskId = Number(req.params.id);
    const { data, error } = parseSchema(riskSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(value === '' ? null : value);
    });
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(riskId);
    await pool.query(`UPDATE risks SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM risks WHERE id = ?', [riskId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const riskId = Number(req.params.id);
    await pool.query('DELETE FROM risks WHERE id = ?', [riskId]);
    res.json({ success: true, data: { id: riskId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

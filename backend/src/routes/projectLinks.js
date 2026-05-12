const express = require('express');
const pool = require('../db');
const { projectLinkSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

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

router.get('/', async (req, res, next) => {
  try {
    let query = `
      SELECT pl.*, p.name AS project_name
      FROM project_links pl
      LEFT JOIN projects p ON pl.project_id = p.id
    `;
    let params = [];
    ({ query, params } = appendProjectAccessFilter(query, params, req.user));
    query += ' ORDER BY COALESCE(pl.sort_order, 0), pl.title';

    const [rows] = await pool.query(query, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(projectLinkSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const [result] = await pool.query(
      'INSERT INTO project_links (project_id, title, url, type, sort_order) VALUES (?, ?, ?, ?, ?)',
      [data.project_id || null, data.title, data.url, data.type || 'other', data.sort_order || 0]
    );
    const [rows] = await pool.query('SELECT * FROM project_links WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const linkId = Number(req.params.id);
    const { data, error } = parseSchema(projectLinkSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    Object.entries(data).forEach(([key, value]) => {
      updates.push(`${key} = ?`);
      params.push(key === 'project_id' && !value ? null : value);
    });
    if (!updates.length) {
      return res.status(400).json({ success: false, error: 'No fields to update' });
    }

    params.push(linkId);
    await pool.query(`UPDATE project_links SET ${updates.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT * FROM project_links WHERE id = ?', [linkId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const linkId = Number(req.params.id);
    await pool.query('DELETE FROM project_links WHERE id = ?', [linkId]);
    res.json({ success: true, data: { id: linkId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

const express = require('express');
const pool = require('../db');
const { taskDependencySchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function roleFilter(user) {
  if (user.role === 'pm') return { clause: 'p.pm_id = ?', params: [user.id] };
  if (user.role === 'client') return { clause: 'p.client_id = ?', params: [user.id] };
  return { clause: '(t.assigned_to = ? OR dt.assigned_to = ?)', params: [user.id, user.id] };
}

router.get('/', async (req, res, next) => {
  try {
    const filter = roleFilter(req.user);
    const [rows] = await pool.query(
      `
        SELECT td.*, t.name AS task_name, dt.name AS depends_on_task_name, p.id AS project_id, p.name AS project_name
        FROM task_dependencies td
        JOIN tasks t ON td.task_id = t.id
        JOIN tasks dt ON td.depends_on_task_id = dt.id
        JOIN projects p ON t.project_id = p.id
        WHERE ${filter.clause}
        ORDER BY p.name, t.name
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
    const { data, error } = parseSchema(taskDependencySchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const [[task], [dependency]] = await Promise.all([
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.task_id]).then(([rows]) => rows),
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.depends_on_task_id]).then(([rows]) => rows)
    ]);
    if (!task || !dependency || task.project_id !== dependency.project_id) {
      return res.status(400).json({ success: false, error: 'Dependent tasks must exist in the same project' });
    }

    const [result] = await pool.query(
      'INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)',
      [data.task_id, data.depends_on_task_id]
    );
    const [rows] = await pool.query('SELECT * FROM task_dependencies WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Dependency already exists' });
    }
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const dependencyId = Number(req.params.id);
    const { data, error } = parseSchema(taskDependencySchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const [[task], [dependency]] = await Promise.all([
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.task_id]).then(([rows]) => rows),
      pool.query('SELECT project_id FROM tasks WHERE id = ?', [data.depends_on_task_id]).then(([rows]) => rows)
    ]);
    if (!task || !dependency || task.project_id !== dependency.project_id) {
      return res.status(400).json({ success: false, error: 'Dependent tasks must exist in the same project' });
    }

    const [result] = await pool.query(
      'UPDATE task_dependencies SET task_id = ?, depends_on_task_id = ? WHERE id = ?',
      [data.task_id, data.depends_on_task_id, dependencyId]
    );
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, error: 'Dependency not found' });
    }

    const [rows] = await pool.query('SELECT * FROM task_dependencies WHERE id = ?', [dependencyId]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, error: 'Dependency already exists' });
    }
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const dependencyId = Number(req.params.id);
    await pool.query('DELETE FROM task_dependencies WHERE id = ?', [dependencyId]);
    res.json({ success: true, data: { id: dependencyId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

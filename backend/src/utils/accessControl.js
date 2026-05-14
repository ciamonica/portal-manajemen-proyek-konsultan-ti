/**
 * Shared row-level access checks for role-based routes.
 */

const pool = require('../db');

async function projectManagedByPm(projectId, pmId) {
  const [rows] = await pool.query(
    'SELECT id FROM projects WHERE id = ? AND pm_id = ?',
    [projectId, pmId]
  );
  return rows.length > 0;
}

async function taskAccessibleToUser(taskId, user) {
  const params = [taskId];
  let accessClause = '';

  if (user.role === 'pm') {
    accessClause = 'p.pm_id = ?';
    params.push(user.id);
  } else if (user.role === 'client') {
    accessClause = 'p.client_id = ?';
    params.push(user.id);
  } else {
    accessClause = 't.assigned_to = ?';
    params.push(user.id);
  }

  const [rows] = await pool.query(
    `
      SELECT t.id
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND ${accessClause}
    `,
    params
  );
  return rows.length > 0;
}

async function tasksShareManagedProject(taskId, dependsOnTaskId, pmId) {
  const [rows] = await pool.query(
    `
      SELECT t.project_id
      FROM tasks t
      JOIN tasks dt ON dt.id = ?
      JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
        AND t.project_id = dt.project_id
        AND p.pm_id = ?
    `,
    [dependsOnTaskId, taskId, pmId]
  );
  return rows.length > 0;
}

async function dependencyManagedByPm(dependencyId, pmId) {
  const [rows] = await pool.query(
    `
      SELECT td.id
      FROM task_dependencies td
      JOIN tasks t ON td.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE td.id = ? AND p.pm_id = ?
    `,
    [dependencyId, pmId]
  );
  return rows.length > 0;
}

async function projectRecordManagedByPm(tableName, alias, recordId, pmId) {
  const allowedTables = new Set(['milestones', 'risks', 'project_files']);
  if (!allowedTables.has(tableName)) {
    throw new Error(`Unsupported project record table: ${tableName}`);
  }

  const [rows] = await pool.query(
    `
      SELECT ${alias}.id
      FROM ${tableName} ${alias}
      JOIN projects p ON ${alias}.project_id = p.id
      WHERE ${alias}.id = ? AND p.pm_id = ?
    `,
    [recordId, pmId]
  );
  return rows.length > 0;
}

async function projectLinkManagedByPm(linkId, pmId) {
  const [rows] = await pool.query(
    `
      SELECT pl.id
      FROM project_links pl
      LEFT JOIN projects p ON pl.project_id = p.id
      WHERE pl.id = ? AND (pl.project_id IS NULL OR p.pm_id = ?)
    `,
    [linkId, pmId]
  );
  return rows.length > 0;
}

async function timeLogEditableByUser(timeLogId, user) {
  const params = [timeLogId];
  let accessClause = '';

  if (user.role === 'pm') {
    accessClause = 'p.pm_id = ?';
    params.push(user.id);
  } else {
    accessClause = 'tl.user_id = ?';
    params.push(user.id);
  }

  const [rows] = await pool.query(
    `
      SELECT tl.id
      FROM time_logs tl
      JOIN tasks t ON tl.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE tl.id = ? AND ${accessClause}
    `,
    params
  );
  return rows.length > 0;
}

async function taskCommentEditableByUser(commentId, user) {
  const params = [commentId];
  let accessClause = '';

  if (user.role === 'pm') {
    accessClause = 'p.pm_id = ?';
    params.push(user.id);
  } else if (user.role === 'client') {
    accessClause = 'tc.user_id = ? AND p.client_id = ?';
    params.push(user.id, user.id);
  } else {
    accessClause = 'tc.user_id = ? AND t.assigned_to = ?';
    params.push(user.id, user.id);
  }

  const [rows] = await pool.query(
    `
      SELECT tc.id
      FROM task_comments tc
      JOIN tasks t ON tc.task_id = t.id
      JOIN projects p ON t.project_id = p.id
      WHERE tc.id = ? AND ${accessClause}
    `,
    params
  );
  return rows.length > 0;
}

module.exports = {
  projectManagedByPm,
  taskAccessibleToUser,
  tasksShareManagedProject,
  dependencyManagedByPm,
  projectRecordManagedByPm,
  projectLinkManagedByPm,
  timeLogEditableByUser,
  taskCommentEditableByUser
};

/**
 * ========================================================
 * KATEGORI      : Pengujian (Backend)
 * DESKRIPSI     : File berisi unit testing untuk autentikasi dan RBAC.
 * FUNGSI UTAMA  : Memastikan login, otorisasi peran, dan isolasi akses data berfungsi benar.
 * ========================================================
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret_for_portal_management';
process.env.JWT_EXPIRES_IN = '1h';

const passwordHash = bcrypt.hashSync('adminfairy', 4);
const queryCalls = [];

const mockPool = {
  async query(sql, params = []) {
    queryCalls.push({ sql: String(sql).replace(/\s+/g, ' ').trim(), params });

    if (sql.includes('FROM users WHERE username = ?')) {
      if (params[0] !== 'adminfairy') return [[], []];
      return [[{
        id: 1,
        username: 'adminfairy',
        password: passwordHash,
        email: 'admin@example.com',
        role: 'pm'
      }], []];
    }

    if (sql.includes('FROM teams t')) {
      return [[{
        id: 10,
        project_id: 7,
        name: 'Scoped Team',
        project_name: 'Portal Client'
      }], []];
    }

    if (sql.includes('FROM team_members tm') && sql.includes('WHERE tm.team_id IN')) {
      return [[{
        team_id: 10,
        user_id: 2,
        username: 'dev1',
        role: 'dev'
      }], []];
    }

    if (sql.includes('SELECT id FROM projects WHERE id = ? AND pm_id = ?')) {
      if (Number(params[0]) === 7 && Number(params[1]) === 1) {
        return [[{ id: 7 }], []];
      }
      return [[], []];
    }

    if (sql.includes('FROM tasks t') && sql.includes('JOIN projects p ON t.project_id = p.id') && sql.includes('WHERE t.id = ?')) {
      const taskId = Number(params[0]);
      const userId = Number(params[1]);
      if ((taskId === 7 && userId === 1) || (taskId === 8 && userId === 2) || (taskId === 9 && userId === 3)) {
        return [[{ id: taskId }], []];
      }
      return [[], []];
    }

    if (sql.includes('FROM project_files pf') && sql.includes('JOIN projects p ON pf.project_id = p.id')) {
      if (Number(params[0]) === 7 && Number(params[1]) === 1) {
        return [[{ id: 7 }], []];
      }
      return [[], []];
    }

    if (sql.includes('INSERT INTO projects')) {
      return [{ insertId: 99, affectedRows: 1 }, []];
    }

    if (sql.includes('INSERT INTO tasks')) {
      return [{ insertId: 77, affectedRows: 1 }, []];
    }

    if (sql.includes('SELECT * FROM tasks WHERE id = ?')) {
      return [[{
        id: Number(params[0]),
        project_id: 7,
        name: 'Scoped Task',
        assigned_to: 2,
        status: 'todo'
      }], []];
    }

    if (sql.includes('SELECT * FROM projects WHERE id = ?')) {
      return [[{
        id: Number(params[0]),
        name: 'Portal Test',
        status: 'planning',
        pm_id: 1
      }], []];
    }

    if (sql.includes('FROM projects p')) {
      return [[{
        id: 1,
        name: 'Portal Client',
        status: 'on_track',
        pm_id: 1,
        client_id: 3
      }], []];
    }

    return [[], []];
  }
};

const dbPath = require.resolve('../src/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: mockPool
};

const app = require('../src/app');

function authToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

test.beforeEach(() => {
  queryCalls.length = 0;
});

test('POST /api/auth/login returns JWT and user data for valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'adminfairy', password: 'adminfairy' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.token);
  assert.equal(response.body.data.user.role, 'pm');
});

test('POST /api/auth/login rejects invalid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'adminfairy', password: 'wrongpass' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test('RBAC blocks Client users from creating projects', async () => {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`)
    .send({ name: 'Client Should Not Create', status: 'planning' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.length, 0);
});

test('Project Manager users can create projects through the protected route', async () => {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ name: 'Portal Test', status: 'planning' });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, 99);
});

test('task creation validates required input before inserting', async () => {
  const response = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ name: 'Missing Project' });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.length, 0);
});

test('Project Manager task creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ project_id: 99, name: 'Cross Project Task', status: 'todo' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.match(queryCalls[0].sql, /FROM projects WHERE id = \? AND pm_id = \?/);
  assert.equal(queryCalls.some((call) => /INSERT INTO tasks/.test(call.sql)), false);
});

test('Project Manager can create tasks only after project ownership is verified', async () => {
  const response = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ project_id: 7, name: 'Managed Project Task', assigned_to: 2, status: 'todo' });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, 77);
  assert.match(queryCalls[0].sql, /FROM projects WHERE id = \? AND pm_id = \?/);
  assert.equal(queryCalls.some((call) => /INSERT INTO tasks/.test(call.sql)), true);
});

test('Project Manager risk creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/risks')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ project_id: 99, title: 'Cross Project Risk' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO risks/.test(call.sql)), false);
});

test('Project Manager milestone creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/milestones')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ project_id: 99, name: 'Cross Project Milestone' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO milestones/.test(call.sql)), false);
});

test('Project Manager file creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/project-files')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({
      project_id: 99,
      title: 'Cross Project File',
      file_url: 'https://example.com/private.pdf',
      file_type: 'pdf'
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO project_files/.test(call.sql)), false);
});

test('Project Manager link creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/project-links')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({
      project_id: 99,
      title: 'Cross Project Link',
      url: 'https://example.com/cross-project',
      type: 'other'
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO project_links/.test(call.sql)), false);
});

test('Project Manager link creation does not treat project_id zero as global', async () => {
  const response = await request(app)
    .post('/api/project-links')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({
      project_id: 0,
      title: 'Invalid Project Link',
      url: 'https://example.com/invalid-project',
      type: 'other'
    });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO project_links/.test(call.sql)), false);
});

test('Project Manager dependency creation is limited to tasks in managed projects', async () => {
  const response = await request(app)
    .post('/api/task-dependencies')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ task_id: 99, depends_on_task_id: 7 });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO task_dependencies/.test(call.sql)), false);
});

test('client comments are limited to accessible tasks', async () => {
  const response = await request(app)
    .post('/api/task-comments')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`)
    .send({ task_id: 99, comment: 'Not my project' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO task_comments/.test(call.sql)), false);
});

test('developer time logs are limited to accessible tasks', async () => {
  const response = await request(app)
    .post('/api/time-logs')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`)
    .send({ task_id: 99, hours: 2 });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO time_logs/.test(call.sql)), false);
});

test('Project Manager cannot delete files outside managed projects', async () => {
  const response = await request(app)
    .delete('/api/project-files/99')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /DELETE FROM project_files/.test(call.sql)), false);
});

test('developer project reads are scoped to assigned tasks', async () => {
  const response = await request(app)
    .get('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /t\.assigned_to = \?/);
  assert.deepEqual(queryCalls[0].params, [2]);
});

test('client team reads are scoped to owned projects', async () => {
  const response = await request(app)
    .get('/api/teams')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /p\.client_id = \?/);
  assert.deepEqual(queryCalls[0].params, [3]);
});

test('developer team reads are scoped to explicit team membership', async () => {
  const response = await request(app)
    .get('/api/teams')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /access_tm\.user_id = \?/);
  assert.deepEqual(queryCalls[0].params, [2]);
});

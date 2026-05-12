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

    if (sql.includes('INSERT INTO projects')) {
      return [{ insertId: 99, affectedRows: 1 }, []];
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

test('RBAC blocks client users from creating projects', async () => {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`)
    .send({ name: 'Client Should Not Create', status: 'planning' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.length, 0);
});

test('PM users can create projects through the protected route', async () => {
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

test('developer project reads are scoped to assigned tasks', async () => {
  const response = await request(app)
    .get('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /t\.assigned_to = \?/);
  assert.deepEqual(queryCalls[0].params, [2]);
});

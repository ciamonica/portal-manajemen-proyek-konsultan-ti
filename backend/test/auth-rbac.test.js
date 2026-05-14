/**
 * ========================================================
 * KATEGORI      : Pengujian (Backend)
 * DESKRIPSI     : File berisi unit testing untuk autentikasi dan RBAC (Role-Based Access Control).
 * FUNGSI UTAMA  : Memastikan login, otorisasi peran, dan isolasi akses data berfungsi benar.
 * TEKNOLOGI     : Node.js built-in test runner, supertest untuk HTTP testing.
 * ========================================================
 */

// Mengimpor modul test bawaan Node.js
const test = require('node:test');
// Mengimpor modul assert untuk validasi hasil test
const assert = require('node:assert/strict');
// Mengimpor bcrypt untuk membuat hash password test
const bcrypt = require('bcrypt');
// Mengimpor jsonwebtoken untuk membuat token test
const jwt = require('jsonwebtoken');
// Mengimpor supertest untuk melakukan HTTP request ke Express app
const request = require('supertest');

// Menetapkan environment ke 'test' agar konfigurasi menyesuaikan
process.env.NODE_ENV = 'test';
// Menetapkan JWT secret khusus untuk testing
process.env.JWT_SECRET = 'test_jwt_secret_for_portal_management';
// Menetapkan masa berlaku token test
process.env.JWT_EXPIRES_IN = '1h';

// Membuat hash password 'adminfairy' dengan salt round rendah (4) untuk kecepatan test
const passwordHash = bcrypt.hashSync('adminfairy', 4);
// Array untuk merekam semua panggilan query database (untuk verifikasi)
const queryCalls = [];

/**
 * MOCK DATABASE POOL
 * Objek tiruan (mock) yang menggantikan koneksi database asli.
 * Mengembalikan data palsu berdasarkan pola SQL yang diterima.
 */
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

/**
 * INJEKSI MOCK KE MODUL CACHE
 * Mengganti modul database asli (db.js) dengan mockPool di cache require Node.js.
 * Ini memastikan semua route yang mengimpor '../db' akan mendapatkan mock ini.
 */
const dbPath = require.resolve('../src/db');
require.cache[dbPath] = {
  id: dbPath,
  filename: dbPath,
  loaded: true,
  exports: mockPool
};

// Mengimpor aplikasi Express setelah mock terpasang
const app = require('../src/app');

/**
 * FUNGSI BANTUAN: authToken
 * Membuat token JWT untuk simulasi pengguna yang login dalam test.
 */
function authToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

// Membersihkan rekaman query sebelum setiap test case
test.beforeEach(() => {
  queryCalls.length = 0;
});

// Test: Login berhasil dengan kredensial yang valid
test('POST /api/auth/login returns JWT and user data for valid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'adminfairy', password: 'adminfairy' });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.token);
  assert.equal(response.body.data.user.role, 'pm');
});

// Test: Login ditolak dengan kredensial yang salah
test('POST /api/auth/login rejects invalid credentials', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ username: 'adminfairy', password: 'wrongpass' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

// Test: RBAC memblokir Client dari membuat proyek
test('RBAC blocks Client users from creating projects', async () => {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`)
    .send({ name: 'Client Should Not Create', status: 'planning' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.length, 0);
});

// Test: Project Manager bisa membuat proyek melalui rute yang dilindungi
test('Project Manager users can create projects through the protected route', async () => {
  const response = await request(app)
    .post('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ name: 'Portal Test', status: 'planning' });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id, 99);
});

// Test: Validasi input tugas sebelum insert ke database
test('task creation validates required input before inserting', async () => {
  const response = await request(app)
    .post('/api/tasks')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ name: 'Missing Project' });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.length, 0);
});

// Test: PM hanya bisa membuat tugas di proyek yang dikelolanya
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

// Test: PM bisa membuat tugas setelah kepemilikan proyek diverifikasi
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

// Test: PM hanya bisa membuat risiko di proyek yang dikelolanya
test('Project Manager risk creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/risks')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ project_id: 99, title: 'Cross Project Risk' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO risks/.test(call.sql)), false);
});

// Test: PM hanya bisa membuat milestone di proyek yang dikelolanya
test('Project Manager milestone creation is limited to managed projects', async () => {
  const response = await request(app)
    .post('/api/milestones')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ project_id: 99, name: 'Cross Project Milestone' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO milestones/.test(call.sql)), false);
});

// Test: PM hanya bisa membuat file di proyek yang dikelolanya
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

// Test: PM hanya bisa membuat link di proyek yang dikelolanya
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

// Test: PM tidak bisa memperlakukan project_id 0 sebagai global
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

// Test: PM hanya bisa membuat dependensi untuk tugas di proyek yang dikelolanya
test('Project Manager dependency creation is limited to tasks in managed projects', async () => {
  const response = await request(app)
    .post('/api/task-dependencies')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`)
    .send({ task_id: 99, depends_on_task_id: 7 });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO task_dependencies/.test(call.sql)), false);
});

// Test: Client hanya bisa berkomentar pada tugas yang bisa diaksesnya
test('client comments are limited to accessible tasks', async () => {
  const response = await request(app)
    .post('/api/task-comments')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`)
    .send({ task_id: 99, comment: 'Not my project' });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO task_comments/.test(call.sql)), false);
});

// Test: Developer hanya bisa mencatat waktu pada tugas yang bisa diaksesnya
test('developer time logs are limited to accessible tasks', async () => {
  const response = await request(app)
    .post('/api/time-logs')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`)
    .send({ task_id: 99, hours: 2 });

  assert.equal(response.status, 403);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /INSERT INTO time_logs/.test(call.sql)), false);
});

// Test: PM tidak bisa menghapus file di luar proyek yang dikelolanya
test('Project Manager cannot delete files outside managed projects', async () => {
  const response = await request(app)
    .delete('/api/project-files/99')
    .set('Authorization', `Bearer ${authToken({ id: 1, role: 'pm', username: 'adminfairy' })}`);

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(queryCalls.some((call) => /DELETE FROM project_files/.test(call.sql)), false);
});

// Test: Developer hanya bisa melihat proyek yang memiliki tugas yang ditugaskan kepadanya
test('developer project reads are scoped to assigned tasks', async () => {
  const response = await request(app)
    .get('/api/projects')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /t\.assigned_to = \?/);
  assert.deepEqual(queryCalls[0].params, [2]);
});

// Test: Client hanya bisa melihat tim di proyek yang dimilikinya
test('client team reads are scoped to owned projects', async () => {
  const response = await request(app)
    .get('/api/teams')
    .set('Authorization', `Bearer ${authToken({ id: 3, role: 'client', username: 'client1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /p\.client_id = \?/);
  assert.deepEqual(queryCalls[0].params, [3]);
});

// Test: Developer hanya bisa melihat tim yang dia menjadi anggotanya
test('developer team reads are scoped to explicit team membership', async () => {
  const response = await request(app)
    .get('/api/teams')
    .set('Authorization', `Bearer ${authToken({ id: 2, role: 'dev', username: 'dev1' })}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.match(queryCalls[0].sql, /access_tm\.user_id = \?/);
  assert.deepEqual(queryCalls[0].params, [2]);
});

/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Tim)
 * DESKRIPSI     : Endpoint untuk mengelola tim dan anggotanya.
 * FUNGSI UTAMA  : Membaca daftar tim, serta menambah, mengubah, dan menghapus tim dan anggota tim (khusus Project Manager).
 * ========================================================
 */

const express = require('express');
const pool = require('../db');
const { teamCreateSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

function buildTeamAccessQuery(user) {
  let query = `
    SELECT DISTINCT t.*, p.name AS project_name
    FROM teams t
    LEFT JOIN projects p ON t.project_id = p.id
  `;
  const params = [];

  if (user.role === 'pm') {
    query += ' WHERE t.project_id IS NULL OR p.pm_id = ?';
    params.push(user.id);
  } else if (user.role === 'client') {
    query += ' WHERE p.client_id = ?';
    params.push(user.id);
  } else {
    query += ' JOIN team_members access_tm ON access_tm.team_id = t.id WHERE access_tm.user_id = ?';
    params.push(user.id);
  }

  query += ' ORDER BY t.name';
  return { query, params };
}

async function ensureProjectManagedByPm(projectId, pmId) {
  const [rows] = await pool.query(
    'SELECT id FROM projects WHERE id = ? AND pm_id = ?',
    [projectId, pmId]
  );
  return rows.length > 0;
}

async function ensureTeamManagedByPm(teamId, pmId) {
  const [rows] = await pool.query(
    `
      SELECT t.id
      FROM teams t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ? AND (t.project_id IS NULL OR p.pm_id = ?)
    `,
    [teamId, pmId]
  );
  return rows.length > 0;
}

/**
 * ENDPOINT: GET /api/teams
 * Mengambil tim sesuai hak akses role beserta daftar anggotanya.
 */
router.get('/', async (req, res, next) => {
  try {
    const { query, params } = buildTeamAccessQuery(req.user);
    const [teams] = await pool.query(query, params);

    if (!teams.length) {
      return res.json({ success: true, data: [] });
    }

    const teamIds = teams.map((team) => team.id);
    const placeholders = teamIds.map(() => '?').join(', ');
    // Ambil data keanggotaan dan gabungkan dengan data user
    const [members] = await pool.query(
      `
        SELECT tm.team_id, u.id AS user_id, u.username, u.role
        FROM team_members tm
        JOIN users u ON tm.user_id = u.id
        WHERE tm.team_id IN (${placeholders})
        ORDER BY u.username
      `,
      teamIds
    );

    const teamMap = {}; // Struktur data bantu untuk mengelompokkan
    // Inisialisasi setiap tim dengan array members kosong
    teams.forEach((team) => {
      teamMap[team.id] = { ...team, members: [] };
    });
    
    // Memasukkan setiap anggota ke dalam tim yang sesuai
    members.forEach((member) => {
      if (teamMap[member.team_id]) {
        teamMap[member.team_id].members.push({ id: member.user_id, username: member.username, role: member.role });
      }
    });
    
    // Mengubah object map kembali menjadi array dan kirimkan respons
    res.json({ success: true, data: Object.values(teamMap) });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: POST /api/teams
 * Membuat tim baru dan langsung memasukkan anggotanya (Hanya Project Manager).
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi input nama tim dan array member_ids
    const { data, error } = parseSchema(teamCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const { name, project_id: projectId, member_ids = [] } = data;
    if (!projectId) {
      return res.status(400).json({ success: false, error: 'Proyek wajib dipilih untuk tim' });
    }

    const canManageProject = await ensureProjectManagedByPm(projectId, req.user.id);
    if (!canManageProject) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    // Insert ke tabel teams
    const [result] = await pool.query('INSERT INTO teams (project_id, name) VALUES (?, ?)', [projectId, name]);
    const teamId = result.insertId; // Dapatkan ID tim baru

    // Jika ada ID anggota, insert ke tabel team_members secara batch
    if (member_ids.length) {
      const memberRows = member_ids.map((userId) => [teamId, userId]);
      await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ?', [memberRows]);
    }

    // Ambil data tim baru (members masih kosong di respons balikan awal)
    const [rows] = await pool.query(
      'SELECT t.*, p.name AS project_name FROM teams t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ?',
      [teamId]
    );
    res.status(201).json({ success: true, data: { ...rows[0], members: [] } });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/teams/:id
 * Mengupdate nama tim dan menyinkronkan ulang anggotanya (Hanya Project Manager).
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    // Validasi data parsial
    const { data, error } = parseSchema(teamCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const canManageTeam = await ensureTeamManagedByPm(teamId, req.user.id);
    if (!canManageTeam) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    const updates = [];
    const params = [];
    // Cek apakah ada update nama tim
    if (data.name) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (Object.prototype.hasOwnProperty.call(data, 'project_id')) {
      if (!data.project_id) {
        return res.status(400).json({ success: false, error: 'Proyek wajib dipilih untuk tim' });
      }
      const canManageProject = await ensureProjectManagedByPm(data.project_id, req.user.id);
      if (!canManageProject) {
        return res.status(403).json({ success: false, error: 'Forbidden' });
      }
      updates.push('project_id = ?');
      params.push(data.project_id);
    }
    // Jika ada update, jalankan query UPDATE
    if (updates.length) {
      params.push(teamId);
      await pool.query(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    // Jika ada list member baru, sinkronkan (hapus semua lalu masukkan ulang)
    if (Array.isArray(data.member_ids)) {
      // Hapus keanggotaan lama
      await pool.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
      // Masukkan keanggotaan baru jika tidak kosong
      if (data.member_ids.length) {
        const memberRows = data.member_ids.map((userId) => [teamId, userId]);
        await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ?', [memberRows]);
      }
    }

    // Ambil data tim setelah di-update
    const [rows] = await pool.query(
      'SELECT t.*, p.name AS project_name FROM teams t LEFT JOIN projects p ON t.project_id = p.id WHERE t.id = ?',
      [teamId]
    );
    // Ambil daftar anggota terbaru
    const [members] = await pool.query(
      'SELECT u.id AS user_id, u.username, u.role FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?',
      [teamId]
    );
    // Kembalikan respons yang digabung
    res.json({ success: true, data: { ...rows[0], members } });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: DELETE /api/teams/:id
 * Menghapus tim. Akan menghapus keanggotaan terlebih dahulu sebelum tim.
 */
router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const canManageTeam = await ensureTeamManagedByPm(teamId, req.user.id);
    if (!canManageTeam) {
      return res.status(404).json({ success: false, error: 'Team not found' });
    }

    // Hapus keanggotaan agar tidak ada foreign key constraint violation
    await pool.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
    // Hapus data tim utama
    await pool.query('DELETE FROM teams WHERE id = ?', [teamId]);
    // Kirim respons berhasil
    res.json({ success: true, data: { id: teamId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

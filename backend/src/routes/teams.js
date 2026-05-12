/**
 * ========================================================
 * KATEGORI      : API Route (Manajemen Tim)
 * DESKRIPSI     : Endpoint untuk mengelola tim dan anggotanya.
 * FUNGSI UTAMA  : Membaca daftar tim, serta menambah, mengubah, dan menghapus tim dan anggota tim (khusus PM).
 * ========================================================
 */

const express = require('express');
const pool = require('../db');
const { teamCreateSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * ENDPOINT: GET /api/teams
 * Mengambil semua tim beserta daftar anggotanya.
 */
router.get('/', async (req, res, next) => {
  try {
    // Ambil semua data tim dasar
    const [teams] = await pool.query('SELECT * FROM teams');
    // Ambil data keanggotaan dan gabungkan dengan data user
    const [members] = await pool.query(
      'SELECT tm.team_id, u.id AS user_id, u.username, u.role FROM team_members tm JOIN users u ON tm.user_id = u.id'
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
 * Membuat tim baru dan langsung memasukkan anggotanya (Hanya PM).
 */
router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    // Validasi input nama tim dan array member_ids
    const { data, error } = parseSchema(teamCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const { name, member_ids = [] } = data;
    // Insert ke tabel teams
    const [result] = await pool.query('INSERT INTO teams (name) VALUES (?)', [name]);
    const teamId = result.insertId; // Dapatkan ID tim baru

    // Jika ada ID anggota, insert ke tabel team_members secara batch
    if (member_ids.length) {
      const memberRows = member_ids.map((userId) => [teamId, userId]);
      await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ?', [memberRows]);
    }

    // Ambil data tim baru (members masih kosong di respons balikan awal)
    const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [teamId]);
    res.status(201).json({ success: true, data: { ...rows[0], members: [] } });
  } catch (err) {
    next(err);
  }
});

/**
 * ENDPOINT: PUT /api/teams/:id
 * Mengupdate nama tim dan menyinkronkan ulang anggotanya (Hanya PM).
 */
router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    // Validasi data parsial
    const { data, error } = parseSchema(teamCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    // Cek apakah ada update nama tim
    if (data.name) {
      updates.push('name = ?');
      params.push(data.name);
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
    const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [teamId]);
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

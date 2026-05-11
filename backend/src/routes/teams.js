const express = require('express');
const pool = require('../db');
const { teamCreateSchema, parseSchema } = require('../validators/schemas');
const { authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const [teams] = await pool.query('SELECT * FROM teams');
    const [members] = await pool.query(
      'SELECT tm.team_id, u.id AS user_id, u.username, u.role FROM team_members tm JOIN users u ON tm.user_id = u.id'
    );

    const teamMap = {};
    teams.forEach((team) => {
      teamMap[team.id] = { ...team, members: [] };
    });
    members.forEach((member) => {
      if (teamMap[member.team_id]) {
        teamMap[member.team_id].members.push({ id: member.user_id, username: member.username, role: member.role });
      }
    });
    res.json({ success: true, data: Object.values(teamMap) });
  } catch (err) {
    next(err);
  }
});

router.post('/', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const { data, error } = parseSchema(teamCreateSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const { name, member_ids = [] } = data;
    const [result] = await pool.query('INSERT INTO teams (name) VALUES (?)', [name]);
    const teamId = result.insertId;

    if (member_ids.length) {
      const memberRows = member_ids.map((userId) => [teamId, userId]);
      await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ?', [memberRows]);
    }

    const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [teamId]);
    res.status(201).json({ success: true, data: { ...rows[0], members: [] } });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    const { data, error } = parseSchema(teamCreateSchema.partial(), req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const updates = [];
    const params = [];
    if (data.name) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (updates.length) {
      params.push(teamId);
      await pool.query(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    if (Array.isArray(data.member_ids)) {
      await pool.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
      if (data.member_ids.length) {
        const memberRows = data.member_ids.map((userId) => [teamId, userId]);
        await pool.query('INSERT INTO team_members (team_id, user_id) VALUES ?', [memberRows]);
      }
    }

    const [rows] = await pool.query('SELECT * FROM teams WHERE id = ?', [teamId]);
    const [members] = await pool.query(
      'SELECT u.id AS user_id, u.username, u.role FROM team_members tm JOIN users u ON tm.user_id = u.id WHERE tm.team_id = ?',
      [teamId]
    );
    res.json({ success: true, data: { ...rows[0], members } });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authorizeRoles('pm'), async (req, res, next) => {
  try {
    const teamId = Number(req.params.id);
    await pool.query('DELETE FROM team_members WHERE team_id = ?', [teamId]);
    await pool.query('DELETE FROM teams WHERE id = ?', [teamId]);
    res.json({ success: true, data: { id: teamId } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

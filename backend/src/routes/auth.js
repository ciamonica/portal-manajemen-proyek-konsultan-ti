const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { loginSchema, parseSchema } = require('../validators/schemas');
const { getJwtSecret, getJwtExpiresIn } = require('../config/authConfig');

const router = express.Router();

router.post('/login', async (req, res, next) => {
  try {
    const { data, error } = parseSchema(loginSchema, req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.errors.map(e => e.message).join(', ') });
    }

    const [rows] = await pool.query('SELECT id, username, password, email, role FROM users WHERE username = ?', [data.username]);
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(data.password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, username: user.username },
      getJwtSecret(),
      { expiresIn: getJwtExpiresIn() }
    );
    res.json({ success: true, data: { token, user: { id: user.id, username: user.username, email: user.email, role: user.role } } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

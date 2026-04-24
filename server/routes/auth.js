const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const store = require('../db/store');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', (req, res) => {
  const { name, email, password, role, skills } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields required' });
  }
  if (!['manager', 'volunteer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  if (store.getUserByEmail(email)) {
    return res.status(409).json({ error: 'Email already registered' });
  }
  const user = store.createUser({ name, email, password, role, skills });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  return res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, uniqueCode: user.uniqueCode },
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const user = store.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role, uniqueCode: user.uniqueCode, skills: user.skills, experienceScore: user.experienceScore },
  });
});

module.exports = router;

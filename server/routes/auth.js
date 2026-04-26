const express = require('express');
const store = require('../db/store');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/signup (Profile Sync)
router.post('/signup', authenticate, async (req, res) => {
  const { name, role, skills } = req.body;
  if (!name || !role) {
    return res.status(400).json({ error: 'Name and role required' });
  }
  if (!['manager', 'volunteer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const existingUser = await store.getUserById(req.user.id);
  if (existingUser) {
    return res.status(409).json({ error: 'User profile already exists' });
  }

  const user = await store.createUser({ 
    id: req.user.id, // Set the Firebase UID as the user ID
    name, 
    email: req.user.email, 
    role, 
    skills 
  });
  
  return res.status(201).json({ user });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  // authenticate middleware already fetched the user and migrated if necessary
  const user = await store.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User profile not found' });
  
  const { password, ...safe } = user;

  // Include events if volunteer
  if (safe.role === 'volunteer') {
    const rawEvents = await store.getEventsByVolunteer(user.id);
    const myEvents = rawEvents.map((event) => {
      const vol = event.volunteers.find((v) => v.userId === user.id);
      const task = vol && vol.taskId ? event.tasks.find((t) => t.id === vol.taskId) : null;
      return {
        id: event.id,
        name: event.name,
        description: event.description,
        date: event.date,
        time: event.time,
        isLive: event.isLive || false,
        taskId: vol ? vol.taskId : null,
        taskName: task ? task.name : null,
        attendance: vol ? vol.attendance : null,
      };
    });
    return res.json({ ...safe, events: myEvents });
  }

  return res.json(safe);
});

module.exports = router;

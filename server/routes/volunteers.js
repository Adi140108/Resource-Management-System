const express = require('express');
const store = require('../db/store');
const { authenticate, requireManager } = require('../middleware/auth');

const router = express.Router();

// GET /api/volunteers/me
router.get('/me', authenticate, (req, res) => {
  const user = store.getUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { password, ...safe } = user;
  // Include events volunteer is part of
  const myEvents = store.getEventsByVolunteer(user.id).map((event) => {
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
});

// GET /api/volunteers/code/:code  — manager looks up volunteer by unique code
router.get('/code/:code', authenticate, requireManager, (req, res) => {
  const user = store.getUserByCode(req.params.code.toUpperCase());
  if (!user) return res.status(404).json({ error: 'Volunteer not found with that code' });
  if (user.role !== 'volunteer') return res.status(400).json({ error: 'Code does not belong to a volunteer' });
  const { password, ...safe } = user;
  return res.json(safe);
});

// PUT /api/volunteers/me/skills  — volunteer updates their skills
router.put('/me/skills', authenticate, (req, res) => {
  const { skills } = req.body;
  if (!Array.isArray(skills)) return res.status(400).json({ error: 'skills must be an array' });
  const updated = store.updateUser(req.user.id, { skills });
  const { password, ...safe } = updated;
  return res.json(safe);
});

module.exports = router;

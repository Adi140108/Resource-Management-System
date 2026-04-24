const express = require('express');
const store = require('../db/store');
const { authenticate, requireManager } = require('../middleware/auth');
const { autoAssignVolunteer, rankTasksForVolunteer } = require('../utils/scoring');

const router = express.Router();

// Broadcast helper — attached by index.js
router.broadcast = () => {};

// GET /api/events
router.get('/', authenticate, (req, res) => {
  let events;
  if (req.user.role === 'manager') {
    events = store.getEventsByManager(req.user.id);
  } else {
    events = store.getEventsByVolunteer(req.user.id);
  }
  return res.json(events);
});

// POST /api/events
router.post('/', authenticate, requireManager, (req, res) => {
  const { name, description, date, time } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'name and date required' });
  const event = store.createEvent({ name, description, date, time, managerId: req.user.id });
  router.broadcast({ type: 'EVENT_CREATED', payload: event });
  return res.status(201).json(event);
});

// GET /api/events/:id
router.get('/:id', authenticate, (req, res) => {
  const event = store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  // Enrich volunteers with user info
  const enriched = {
    ...event,
    volunteers: event.volunteers.map((v) => {
      const user = store.getUserById(v.userId);
      const task = v.taskId ? event.tasks.find((t) => t.id === v.taskId) : null;
      return {
        ...v,
        name: user ? user.name : 'Unknown',
        email: user ? user.email : '',
        skills: user ? user.skills : [],
        experienceScore: user ? user.experienceScore : 0,
        noShowCount: user ? user.noShowCount : 0,
        taskName: task ? task.name : null,
      };
    }),
  };
  return res.json(enriched);
});

// PUT /api/events/:id
router.put('/:id', authenticate, requireManager, (req, res) => {
  const event = store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.managerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const updated = store.updateEvent(req.params.id, req.body);
  router.broadcast({ type: 'EVENT_UPDATED', payload: updated });
  return res.json(updated);
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireManager, (req, res) => {
  const event = store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.managerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  store.deleteEvent(req.params.id);
  router.broadcast({ type: 'EVENT_DELETED', payload: { id: req.params.id } });
  return res.json({ success: true });
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

// POST /api/events/:id/tasks
router.post('/:id/tasks', authenticate, requireManager, (req, res) => {
  const event = store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const { name, requiredSkills, priority, requiredCount } = req.body;
  if (!name) return res.status(400).json({ error: 'Task name required' });
  const task = store.addTask(req.params.id, { name, requiredSkills, priority, requiredCount });
  router.broadcast({ type: 'TASK_CREATED', payload: { eventId: req.params.id, task } });
  return res.status(201).json(task);
});

// PUT /api/events/:id/tasks/:taskId
router.put('/:id/tasks/:taskId', authenticate, requireManager, (req, res) => {
  const task = store.updateTask(req.params.id, req.params.taskId, req.body);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  router.broadcast({ type: 'TASK_UPDATED', payload: { eventId: req.params.id, task } });
  return res.json(task);
});

// DELETE /api/events/:id/tasks/:taskId
router.delete('/:id/tasks/:taskId', authenticate, requireManager, (req, res) => {
  const ok = store.deleteTask(req.params.id, req.params.taskId);
  if (!ok) return res.status(404).json({ error: 'Task not found' });
  router.broadcast({ type: 'TASK_DELETED', payload: { eventId: req.params.id, taskId: req.params.taskId } });
  return res.json({ success: true });
});

// ─── Volunteer Assignment ─────────────────────────────────────────────────────

// POST /api/events/:id/volunteers  — add volunteer to event
router.post('/:id/volunteers', authenticate, requireManager, (req, res) => {
  const { volunteerCode, taskId, autoAssign } = req.body;
  const event = store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const volunteer = store.getUserByCode(volunteerCode);
  if (!volunteer) return res.status(404).json({ error: 'Volunteer code not found' });

  // Check already in event
  if (event.volunteers.find((v) => v.userId === volunteer.id)) {
    return res.status(409).json({ error: 'Volunteer already added to this event' });
  }

  let assignedTaskId = taskId || null;

  if (autoAssign) {
    const result = autoAssignVolunteer(volunteer, event);
    assignedTaskId = result ? result.taskId : null;
  }

  const entry = store.addVolunteerToEvent(req.params.id, volunteer.id, assignedTaskId);
  if (!entry) return res.status(500).json({ error: 'Could not add volunteer' });

  const updatedEvent = store.getEventById(req.params.id);
  router.broadcast({ type: 'VOLUNTEER_ADDED', payload: { eventId: req.params.id, event: updatedEvent } });

  return res.status(201).json({
    ...entry,
    name: volunteer.name,
    skills: volunteer.skills,
    taskId: assignedTaskId,
  });
});

// GET /api/events/:id/volunteers/rank/:code — get ranked tasks for manual assign
router.get('/:id/volunteers/rank/:code', authenticate, requireManager, (req, res) => {
  const event = store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const volunteer = store.getUserByCode(req.params.code.toUpperCase());
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const ranked = rankTasksForVolunteer(volunteer, event);
  return res.json(ranked);
});

// PUT /api/events/:id/volunteers/:userId — reassign or mark attendance
router.put('/:id/volunteers/:userId', authenticate, requireManager, (req, res) => {
  const { taskId, attendance } = req.body;
  let result;
  if (taskId !== undefined) {
    result = store.reassignVolunteer(req.params.id, req.params.userId, taskId);
  }
  if (attendance !== undefined) {
    result = store.markAttendance(req.params.id, req.params.userId, attendance);
  }
  if (!result) return res.status(404).json({ error: 'Volunteer not in event' });
  const updatedEvent = store.getEventById(req.params.id);
  router.broadcast({ type: 'VOLUNTEER_UPDATED', payload: { eventId: req.params.id, event: updatedEvent } });
  return res.json(result);
});

// DELETE /api/events/:id/volunteers/:userId — remove volunteer
router.delete('/:id/volunteers/:userId', authenticate, requireManager, (req, res) => {
  const ok = store.removeVolunteerFromEvent(req.params.id, req.params.userId);
  if (!ok) return res.status(404).json({ error: 'Volunteer not in event' });
  const updatedEvent = store.getEventById(req.params.id);
  router.broadcast({ type: 'VOLUNTEER_REMOVED', payload: { eventId: req.params.id, event: updatedEvent } });
  return res.json({ success: true });
});

module.exports = router;

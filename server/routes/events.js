const express = require('express');
const store = require('../db/store');
const { authenticate, requireManager } = require('../middleware/auth');
const { autoAssignVolunteer, rankTasksForVolunteer } = require('../utils/scoring');

const router = express.Router();

// Broadcast helper — attached by index.js
router.broadcast = () => {};

// GET /api/events
router.get('/', authenticate, async (req, res) => {
  let events;
  if (req.user.role === 'manager') {
    events = await store.getEventsByManager(req.user.id);
  } else {
    events = await store.getEventsByVolunteer(req.user.id);
  }

  // Enrich events with volunteer details
  const enrichedEvents = await Promise.all(events.map(async (event) => {
    const volunteers = await Promise.all(event.volunteers.map(async (v) => {
      const user = await store.getUserById(v.userId);
      return {
        ...v,
        name: user ? user.name : 'Unknown',
        email: user ? user.email : ''
      };
    }));
    return { ...event, volunteers };
  }));

  return res.json(enrichedEvents);
});

// POST /api/events
router.post('/', authenticate, requireManager, async (req, res) => {
  const { name, description, date, time } = req.body;
  if (!name || !date) return res.status(400).json({ error: 'name and date required' });
  const event = await store.createEvent({ name, description, date, time, managerId: req.user.id });
  router.broadcast({ type: 'EVENT_CREATED', payload: event });
  return res.status(201).json(event);
});

// GET /api/events/:id
router.get('/:id', authenticate, async (req, res) => {
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  // Enrich volunteers with user info
  const volunteers = await Promise.all(event.volunteers.map(async (v) => {
    const user = await store.getUserById(v.userId);
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
  }));
  const enriched = { ...event, volunteers };
  return res.json(enriched);
});

// PUT /api/events/:id
router.put('/:id', authenticate, requireManager, async (req, res) => {
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.managerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  const updated = await store.updateEvent(req.params.id, req.body);
  router.broadcast({ type: 'EVENT_UPDATED', payload: updated });
  return res.json(updated);
});

// DELETE /api/events/:id
router.delete('/:id', authenticate, requireManager, async (req, res) => {
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.managerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await store.deleteEvent(req.params.id);
  router.broadcast({ type: 'EVENT_DELETED', payload: { id: req.params.id } });
  return res.json({ success: true });
});

// PATCH /api/events/:id/toggle-live
router.patch('/:id/toggle-live', authenticate, requireManager, async (req, res) => {
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.managerId !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  await store.updateEvent(req.params.id, { isLive: !event.isLive });
  router.broadcast({ type: 'EVENT_LIVE_TOGGLED', payload: { id: event.id, isLive: !event.isLive } });
  return res.json({ id: event.id, isLive: !event.isLive });
});

// ─── Tasks ───────────────────────────────────────────────────────────────────

// POST /api/events/:id/tasks
router.post('/:id/tasks', authenticate, requireManager, async (req, res) => {
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const { name, requiredSkills, priority, requiredCount } = req.body;
  if (!name) return res.status(400).json({ error: 'Task name required' });
  const task = await store.addTask(req.params.id, { name, requiredSkills, priority, requiredCount });
  router.broadcast({ type: 'TASK_CREATED', payload: { eventId: req.params.id, task } });
  return res.status(201).json(task);
});

// PUT /api/events/:id/tasks/:taskId
router.put('/:id/tasks/:taskId', authenticate, requireManager, async (req, res) => {
  const task = await store.updateTask(req.params.id, req.params.taskId, req.body);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  router.broadcast({ type: 'TASK_UPDATED', payload: { eventId: req.params.id, task } });
  return res.json(task);
});

// DELETE /api/events/:id/tasks/:taskId
router.delete('/:id/tasks/:taskId', authenticate, requireManager, async (req, res) => {
  const ok = await store.deleteTask(req.params.id, req.params.taskId);
  if (!ok) return res.status(404).json({ error: 'Task not found' });
  router.broadcast({ type: 'TASK_DELETED', payload: { eventId: req.params.id, taskId: req.params.taskId } });
  return res.json({ success: true });
});

// ─── Volunteer Assignment ─────────────────────────────────────────────────────

// POST /api/events/:id/volunteers  — add volunteer to event
router.post('/:id/volunteers', authenticate, requireManager, async (req, res) => {
  const { volunteerCode, taskId, autoAssign } = req.body;
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const volunteer = await store.getUserByCode(volunteerCode);
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

  const entry = await store.addVolunteerToEvent(req.params.id, volunteer.id, assignedTaskId);
  if (!entry) return res.status(500).json({ error: 'Could not add volunteer' });

  const updatedEvent = await store.getEventById(req.params.id);
  router.broadcast({ type: 'VOLUNTEER_ADDED', payload: { eventId: req.params.id, event: updatedEvent } });

  return res.status(201).json({
    ...entry,
    name: volunteer.name,
    skills: volunteer.skills,
    taskId: assignedTaskId,
  });
});

// GET /api/events/:id/volunteers/rank/:code — get ranked tasks for manual assign
router.get('/:id/volunteers/rank/:code', authenticate, requireManager, async (req, res) => {
  const event = await store.getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const volunteer = await store.getUserByCode(req.params.code.toUpperCase());
  if (!volunteer) return res.status(404).json({ error: 'Volunteer not found' });
  const ranked = rankTasksForVolunteer(volunteer, event);
  return res.json(ranked);
});

// PUT /api/events/:id/volunteers/:userId — reassign or mark attendance
router.put('/:id/volunteers/:userId', authenticate, requireManager, async (req, res) => {
  const { taskId, attendance } = req.body;
  let result;
  if (taskId !== undefined) {
    result = await store.reassignVolunteer(req.params.id, req.params.userId, taskId);
  }
  if (attendance !== undefined) {
    result = await store.markAttendance(req.params.id, req.params.userId, attendance);
  }
  if (!result) return res.status(404).json({ error: 'Volunteer not in event' });
  const updatedEvent = await store.getEventById(req.params.id);
  router.broadcast({ type: 'VOLUNTEER_UPDATED', payload: { eventId: req.params.id, event: updatedEvent } });
  return res.json(result);
});

// DELETE /api/events/:id/volunteers/:userId — remove volunteer
router.delete('/:id/volunteers/:userId', authenticate, requireManager, async (req, res) => {
  const ok = await store.removeVolunteerFromEvent(req.params.id, req.params.userId);
  if (!ok) return res.status(404).json({ error: 'Volunteer not in event' });
  const updatedEvent = await store.getEventById(req.params.id);
  router.broadcast({ type: 'VOLUNTEER_REMOVED', payload: { eventId: req.params.id, event: updatedEvent } });
  return res.json({ success: true });
});

module.exports = router;

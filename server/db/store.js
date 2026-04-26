const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/firebase-admin');

const usersCol = db.collection('users');
const eventsCol = db.collection('events');

const store = {
  // Users
  getUserById: async (id) => {
    const doc = await usersCol.doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  getUserByEmail: async (email) => {
    const snapshot = await usersCol.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },
  getUserByCode: async (code) => {
    const snapshot = await usersCol.where('uniqueCode', '==', code).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  },
  createUser: async (data) => {
    const id = data.id || uuidv4();
    const user = {
      name: data.name,
      email: data.email,
      role: data.role,
      uniqueCode: data.role === 'volunteer' ? generateCode() : null,
      skills: data.skills || [],
      experienceScore: 0,
      noShowCount: 0,
    };
    await usersCol.doc(id).set(user);
    return { id, ...user };
  },
  updateUser: async (id, data) => {
    await usersCol.doc(id).update(data);
    return await store.getUserById(id);
  },

  // Events
  getEvents: async () => {
    const snapshot = await eventsCol.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  getEventsByManager: async (managerId) => {
    const snapshot = await eventsCol.where('managerId', '==', managerId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  },
  getEventsByVolunteer: async (userId) => {
    const snapshot = await eventsCol.get();
    return snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(e => e.volunteers && e.volunteers.some(v => v.userId === userId));
  },
  getEventById: async (id) => {
    const doc = await eventsCol.doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  },
  createEvent: async (data) => {
    const id = uuidv4();
    const event = {
      name: data.name,
      description: data.description,
      date: data.date,
      time: data.time,
      managerId: data.managerId,
      isLive: false,
      tasks: [],
      volunteers: [],
      createdAt: new Date().toISOString(),
    };
    await eventsCol.doc(id).set(event);
    return { id, ...event };
  },
  updateEvent: async (id, data) => {
    await eventsCol.doc(id).update(data);
    return await store.getEventById(id);
  },
  deleteEvent: async (id) => {
    await eventsCol.doc(id).delete();
    return true;
  },

  // Tasks (nested in events)
  addTask: async (eventId, taskData) => {
    const event = await store.getEventById(eventId);
    if (!event) return null;
    const task = {
      id: uuidv4(),
      name: taskData.name,
      requiredSkills: taskData.requiredSkills || [],
      priority: taskData.priority || 3,
      requiredCount: taskData.requiredCount || 1,
      assignedVolunteers: [],
    };
    event.tasks.push(task);
    await eventsCol.doc(eventId).update({ tasks: event.tasks });
    return task;
  },
  updateTask: async (eventId, taskId, data) => {
    const event = await store.getEventById(eventId);
    if (!event) return null;
    const idx = event.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;
    event.tasks[idx] = { ...event.tasks[idx], ...data };
    await eventsCol.doc(eventId).update({ tasks: event.tasks });
    return event.tasks[idx];
  },
  deleteTask: async (eventId, taskId) => {
    const event = await store.getEventById(eventId);
    if (!event) return false;
    event.tasks = event.tasks.filter((t) => t.id !== taskId);
    await eventsCol.doc(eventId).update({ tasks: event.tasks });
    return true;
  },

  // Volunteers in event
  addVolunteerToEvent: async (eventId, userId, taskId) => {
    const event = await store.getEventById(eventId);
    if (!event) return null;
    if (event.volunteers.find((v) => v.userId === userId)) return null;
    const entry = { userId, taskId, attendance: null, joinedAt: new Date().toISOString() };
    event.volunteers.push(entry);
    if (taskId) {
      const task = event.tasks.find((t) => t.id === taskId);
      if (task && !task.assignedVolunteers.includes(userId)) {
        task.assignedVolunteers.push(userId);
      }
    }
    await eventsCol.doc(eventId).update({ volunteers: event.volunteers, tasks: event.tasks });
    return entry;
  },
  removeVolunteerFromEvent: async (eventId, userId) => {
    const event = await store.getEventById(eventId);
    if (!event) return false;
    const vol = event.volunteers.find((v) => v.userId === userId);
    if (vol && vol.taskId) {
      const task = event.tasks.find((t) => t.id === vol.taskId);
      if (task) task.assignedVolunteers = task.assignedVolunteers.filter((id) => id !== userId);
    }
    event.volunteers = event.volunteers.filter((v) => v.userId !== userId);
    await eventsCol.doc(eventId).update({ volunteers: event.volunteers, tasks: event.tasks });
    return true;
  },
  reassignVolunteer: async (eventId, userId, newTaskId) => {
    const event = await store.getEventById(eventId);
    if (!event) return null;
    const vol = event.volunteers.find((v) => v.userId === userId);
    if (!vol) return null;
    // Remove from old task
    if (vol.taskId) {
      const oldTask = event.tasks.find((t) => t.id === vol.taskId);
      if (oldTask) oldTask.assignedVolunteers = oldTask.assignedVolunteers.filter((id) => id !== userId);
    }
    // Assign to new task
    vol.taskId = newTaskId;
    if (newTaskId) {
      const newTask = event.tasks.find((t) => t.id === newTaskId);
      if (newTask && !newTask.assignedVolunteers.includes(userId)) {
        newTask.assignedVolunteers.push(userId);
      }
    }
    await eventsCol.doc(eventId).update({ volunteers: event.volunteers, tasks: event.tasks });
    return vol;
  },
  markAttendance: async (eventId, userId, status) => {
    const event = await store.getEventById(eventId);
    if (!event) return null;
    const vol = event.volunteers.find((v) => v.userId === userId);
    if (!vol) return null;
    vol.attendance = status;
    await eventsCol.doc(eventId).update({ volunteers: event.volunteers });
    if (status === 'absent') {
      const user = await store.getUserById(userId);
      if (user) {
        await store.updateUser(userId, { noShowCount: (user.noShowCount || 0) + 1 });
      }
    }
    return vol;
  },
};

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'EVS-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = store;

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

// ─── Seed Data ────────────────────────────────────────────────────────────────
const users = [
  {
    id: 'u1',
    name: 'Alex Manager',
    email: 'manager@vg.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'manager',
    uniqueCode: null,
    skills: [],
    experienceScore: 0,
    noShowCount: 0,
  },
  {
    id: 'u2',
    name: 'Jordan Reeves',
    email: 'jordan@vg.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'volunteer',
    uniqueCode: 'VG-4F8A2B',
    skills: ['first-aid', 'communication', 'logistics'],
    experienceScore: 4,
    noShowCount: 0,
  },
  {
    id: 'u3',
    name: 'Sam Clarke',
    email: 'sam@vg.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'volunteer',
    uniqueCode: 'VG-9C3D7E',
    skills: ['tech-support', 'coordination', 'driving'],
    experienceScore: 2,
    noShowCount: 0,
  },
  {
    id: 'u4',
    name: 'Riley Morgan',
    email: 'riley@vg.com',
    password: bcrypt.hashSync('password123', 10),
    role: 'volunteer',
    uniqueCode: 'VG-1B5E3F',
    skills: ['first-aid', 'cooking', 'coordination'],
    experienceScore: 5,
    noShowCount: 1,
  },
];

const events = [
  {
    id: 'e1',
    name: 'Community Health Fair',
    description: 'Annual health and wellness fair for the local community.',
    date: '2026-05-15',
    time: '09:00',
    managerId: 'u1',
    isLive: false,
    tasks: [
      {
        id: 't1',
        name: 'First Aid Station',
        requiredSkills: ['first-aid'],
        priority: 5,
        requiredCount: 2,
        assignedVolunteers: ['u2'],
      },
      {
        id: 't2',
        name: 'Registration Desk',
        requiredSkills: ['communication', 'coordination'],
        priority: 3,
        requiredCount: 2,
        assignedVolunteers: [],
      },
      {
        id: 't3',
        name: 'Logistics & Setup',
        requiredSkills: ['logistics', 'driving'],
        priority: 4,
        requiredCount: 2,
        assignedVolunteers: [],
      },
    ],
    volunteers: [
      { userId: 'u2', taskId: 't1', attendance: null, joinedAt: new Date().toISOString() },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'e2',
    name: 'Tech for Good Hackathon',
    description: 'A 24-hour hackathon focused on social impact solutions.',
    date: '2026-06-01',
    time: '08:00',
    managerId: 'u1',
    isLive: false,
    tasks: [
      {
        id: 't4',
        name: 'Tech Support Desk',
        requiredSkills: ['tech-support'],
        priority: 4,
        requiredCount: 3,
        assignedVolunteers: [],
      },
      {
        id: 't5',
        name: 'Catering Coordinator',
        requiredSkills: ['cooking', 'coordination'],
        priority: 2,
        requiredCount: 2,
        assignedVolunteers: [],
      },
    ],
    volunteers: [],
    createdAt: new Date().toISOString(),
  },
];

// ─── Store API ─────────────────────────────────────────────────────────────────
const store = {
  // Users
  getUsers: () => users,
  getUserById: (id) => users.find((u) => u.id === id),
  getUserByEmail: (email) => users.find((u) => u.email === email),
  getUserByCode: (code) => users.find((u) => u.uniqueCode === code),
  createUser: (data) => {
    const user = {
      id: uuidv4(),
      name: data.name,
      email: data.email,
      password: bcrypt.hashSync(data.password, 10),
      role: data.role,
      uniqueCode: data.role === 'volunteer' ? generateCode() : null,
      skills: data.skills || [],
      experienceScore: 0,
      noShowCount: 0,
    };
    users.push(user);
    return user;
  },
  updateUser: (id, data) => {
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx] = { ...users[idx], ...data };
    return users[idx];
  },

  // Events
  getEvents: () => events,
  getEventsByManager: (managerId) => events.filter((e) => e.managerId === managerId),
  getEventsByVolunteer: (userId) =>
    events.filter((e) => e.volunteers.some((v) => v.userId === userId)),
  getEventById: (id) => events.find((e) => e.id === id),
  createEvent: (data) => {
    const event = {
      id: uuidv4(),
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
    events.push(event);
    return event;
  },
  updateEvent: (id, data) => {
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    events[idx] = { ...events[idx], ...data };
    return events[idx];
  },
  deleteEvent: (id) => {
    const idx = events.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    events.splice(idx, 1);
    return true;
  },

  // Tasks
  addTask: (eventId, taskData) => {
    const event = events.find((e) => e.id === eventId);
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
    return task;
  },
  updateTask: (eventId, taskId, data) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return null;
    const idx = event.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return null;
    event.tasks[idx] = { ...event.tasks[idx], ...data };
    return event.tasks[idx];
  },
  deleteTask: (eventId, taskId) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return false;
    const idx = event.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;
    event.tasks.splice(idx, 1);
    return true;
  },

  // Volunteers in event
  addVolunteerToEvent: (eventId, userId, taskId) => {
    const event = events.find((e) => e.id === eventId);
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
    return entry;
  },
  removeVolunteerFromEvent: (eventId, userId) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return false;
    const vol = event.volunteers.find((v) => v.userId === userId);
    if (vol && vol.taskId) {
      const task = event.tasks.find((t) => t.id === vol.taskId);
      if (task) task.assignedVolunteers = task.assignedVolunteers.filter((id) => id !== userId);
    }
    event.volunteers = event.volunteers.filter((v) => v.userId !== userId);
    return true;
  },
  reassignVolunteer: (eventId, userId, newTaskId) => {
    const event = events.find((e) => e.id === eventId);
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
    return vol;
  },
  markAttendance: (eventId, userId, status) => {
    const event = events.find((e) => e.id === eventId);
    if (!event) return null;
    const vol = event.volunteers.find((v) => v.userId === userId);
    if (!vol) return null;
    vol.attendance = status;
    if (status === 'absent') {
      const user = users.find((u) => u.id === userId);
      if (user) user.noShowCount += 1;
    }
    return vol;
  },
};

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'VG-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

module.exports = store;

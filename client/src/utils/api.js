import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

// Helper to generate IDs similar to UUIDs
const genId = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Helper to generate EVS codes
const generateCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'EVS-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

// ─── Auth / Profiles ─────────────────────────────────────────────────────────

export const signup = async (data) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  const userProfile = {
    name: data.name,
    email: auth.currentUser.email,
    role: data.role,
    uniqueCode: data.role === 'volunteer' ? generateCode() : null,
    skills: data.skills || [],
    experienceScore: 0,
    noShowCount: 0,
    createdAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'users', userId), userProfile);
  return { data: { user: { id: userId, ...userProfile } } };
};

export const getMe = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  const userDoc = await getDoc(doc(db, 'users', userId));
  if (!userDoc.exists()) throw new Error('User profile not found');

  const userData = { id: userDoc.id, ...userDoc.data() };

  // If volunteer, fetch their events
  if (userData.role === 'volunteer') {
    const eventsSnapshot = await getDocs(collection(db, 'events'));
    const allEvents = eventsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    const myEvents = allEvents
      .filter(e => e.volunteers && e.volunteers.some(v => v.userId === userId))
      .map(event => {
        const vol = event.volunteers.find(v => v.userId === userId);
        const task = vol && vol.taskId ? event.tasks.find(t => t.id === vol.taskId) : null;
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
    return { data: { ...userData, events: myEvents } };
  }

  return { data: userData };
};

export const updateMySkills = async (skills) => {
  const userId = auth.currentUser?.uid;
  await updateDoc(doc(db, 'users', userId), { skills });
  return { data: { success: true } };
};

export const getVolunteerByCode = async (code) => {
  const q = query(collection(db, 'users'), where('uniqueCode', '==', code));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('Volunteer not found');
  const d = snapshot.docs[0];
  return { data: { id: d.id, ...d.data() } };
};

// ─── Events ──────────────────────────────────────────────────────────────────

export const getEvents = async (managerId = null) => {
  let q = collection(db, 'events');
  if (managerId) {
    q = query(q, where('managerId', '==', managerId));
  }
  const snapshot = await getDocs(q);
  const events = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  return { data: events };
};

export const getEvent = async (id) => {
  const d = await getDoc(doc(db, 'events', id));
  return { data: { id: d.id, ...d.data() } };
};

export const createEvent = async (data) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('Not authenticated');

  const id = genId();
  const event = {
    ...data,
    id,
    managerId: userId,
    isLive: false,
    tasks: [],
    volunteers: [],
    createdAt: new Date().toISOString()
  };
  await setDoc(doc(db, 'events', id), event);
  return { data: event };
};

export const updateEvent = async (id, data) => {
  await updateDoc(doc(db, 'events', id), data);
  return { data: { success: true } };
};

export const deleteEvent = async (id) => {
  await deleteDoc(doc(db, 'events', id));
  return { data: { success: true } };
};

export const toggleEventLive = async (id) => {
  const d = await getDoc(doc(db, 'events', id));
  const isLive = !d.data().isLive;
  await updateDoc(doc(db, 'events', id), { isLive });
  return { data: { isLive } };
};

// ─── Tasks ───────────────────────────────────────────────────────────────────

export const createTask = async (eventId, data) => {
  const task = {
    id: genId(),
    name: data.name,
    requiredSkills: data.requiredSkills || [],
    priority: data.priority || 3,
    requiredCount: data.requiredCount || 1,
    assignedVolunteers: []
  };
  await updateDoc(doc(db, 'events', eventId), {
    tasks: arrayUnion(task)
  });
  return { data: task };
};

export const updateTask = async (eventId, taskId, data) => {
  const eventDoc = await getDoc(doc(db, 'events', eventId));
  const tasks = eventDoc.data().tasks;
  const idx = tasks.findIndex(t => t.id === taskId);
  tasks[idx] = { ...tasks[idx], ...data };
  await updateDoc(doc(db, 'events', eventId), { tasks });
  return { data: tasks[idx] };
};

export const deleteTask = async (eventId, taskId) => {
  const eventDoc = await getDoc(doc(db, 'events', eventId));
  const tasks = eventDoc.data().tasks.filter(t => t.id !== taskId);
  await updateDoc(doc(db, 'events', eventId), { tasks });
  return { data: { success: true } };
};

// ─── Volunteer Assignments ───────────────────────────────────────────────────

export const addVolunteerToEvent = async (eventId, data) => {
  const { userId, taskId } = data;
  const eventDoc = await getDoc(doc(db, 'events', eventId));
  const eventData = eventDoc.data();

  if (eventData.volunteers.find(v => v.userId === userId)) return null;

  const entry = { userId, taskId, attendance: null, joinedAt: new Date().toISOString() };
  const tasks = eventData.tasks;
  if (taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (task && !task.assignedVolunteers.includes(userId)) {
      task.assignedVolunteers.push(userId);
    }
  }

  await updateDoc(doc(db, 'events', eventId), {
    volunteers: arrayUnion(entry),
    tasks
  });
  return { data: entry };
};

export const updateEventVolunteer = async (eventId, userId, data) => {
  const eventDoc = await getDoc(doc(db, 'events', eventId));
  const eventData = eventDoc.data();
  const vIdx = eventData.volunteers.findIndex(v => v.userId === userId);
  
  // Handle status update (attendance)
  if (data.status) {
    eventData.volunteers[vIdx].attendance = data.status;
    if (data.status === 'absent') {
      const userDoc = await getDoc(doc(db, 'users', userId));
      await updateDoc(doc(db, 'users', userId), { noShowCount: (userDoc.data().noShowCount || 0) + 1 });
    }
  }

  // Handle reassignment
  if (data.taskId !== undefined) {
    const oldTaskId = eventData.volunteers[vIdx].taskId;
    if (oldTaskId) {
      const oldTask = eventData.tasks.find(t => t.id === oldTaskId);
      if (oldTask) oldTask.assignedVolunteers = oldTask.assignedVolunteers.filter(id => id !== userId);
    }
    eventData.volunteers[vIdx].taskId = data.taskId;
    if (data.taskId) {
      const newTask = eventData.tasks.find(t => t.id === data.taskId);
      if (newTask) newTask.assignedVolunteers.push(userId);
    }
  }

  await updateDoc(doc(db, 'events', eventId), {
    volunteers: eventData.volunteers,
    tasks: eventData.tasks
  });
  return { data: eventData.volunteers[vIdx] };
};

export const removeEventVolunteer = async (eventId, userId) => {
  const eventDoc = await getDoc(doc(db, 'events', eventId));
  const eventData = eventDoc.data();
  const vol = eventData.volunteers.find(v => v.userId === userId);
  
  if (vol && vol.taskId) {
    const task = eventData.tasks.find(t => t.id === vol.taskId);
    if (task) task.assignedVolunteers = task.assignedVolunteers.filter(id => id !== userId);
  }

  const updatedVolunteers = eventData.volunteers.filter(v => v.userId !== userId);
  await updateDoc(doc(db, 'events', eventId), {
    volunteers: updatedVolunteers,
    tasks: eventData.tasks
  });
  return { data: { success: true } };
};

export const getRankedTasks = async (eventId, code) => {
  // Logic from backend moved here
  const volunteerResp = await getVolunteerByCode(code);
  const volunteer = volunteerResp.data;
  const eventResp = await getEvent(eventId);
  const event = eventResp.data;

  const tasks = event.tasks.map(task => {
    let score = 0;
    const match = task.requiredSkills.filter(s => volunteer.skills.includes(s)).length;
    score += match * 10;
    score += (5 - task.priority) * 2;
    return { ...task, score };
  }).sort((a, b) => b.score - a.score);

  return { data: tasks };
};

const api = {
  signup,
  getMe,
  updateMySkills,
  getVolunteerByCode,
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventLive,
  createTask,
  updateTask,
  deleteTask,
  addVolunteerToEvent,
  updateEventVolunteer,
  removeEventVolunteer,
  getRankedTasks
};

export default api;

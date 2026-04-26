import axios from 'axios';

const BASE = '/api';

const api = axios.create({ baseURL: BASE });

import { auth } from '../config/firebase';

api.interceptors.request.use(async (config) => {
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      auth.signOut().then(() => {
        window.location.href = '/login';
      });
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (data) => api.post('/auth/login', data);
export const signup = (data) => api.post('/auth/signup', data);
export const getMe = () => api.get('/auth/me');
export const getVolunteerByCode = (code) => api.get(`/volunteers/code/${code}`);
export const updateMySkills = (skills) => api.put('/volunteers/me/skills', { skills });

// Events
export const getEvents = () => api.get('/events');
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);
export const toggleEventLive = (id) => api.patch(`/events/${id}/toggle-live`);

// Tasks
export const createTask = (eventId, data) => api.post(`/events/${eventId}/tasks`, data);
export const updateTask = (eventId, taskId, data) => api.put(`/events/${eventId}/tasks/${taskId}`, data);
export const deleteTask = (eventId, taskId) => api.delete(`/events/${eventId}/tasks/${taskId}`);

// Volunteer Assignment
export const addVolunteerToEvent = (eventId, data) => api.post(`/events/${eventId}/volunteers`, data);
export const getRankedTasks = (eventId, code) => api.get(`/events/${eventId}/volunteers/rank/${code}`);
export const updateEventVolunteer = (eventId, userId, data) => api.put(`/events/${eventId}/volunteers/${userId}`, data);
export const removeEventVolunteer = (eventId, userId) => api.delete(`/events/${eventId}/volunteers/${userId}`);

export default api;

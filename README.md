# Volunteer Grid 🎯

A smart, real-time volunteer resource allocation system — **no AI, pure rule-based logic**.

---

## 🚀 Quick Start

### Terminal 1 — Backend
```bash
cd server
npm install
node index.js
```

### Terminal 2 — Frontend
```bash
cd client
npm install
npm run dev
```

Open **http://localhost:5173**

---

## 🔑 Demo Accounts

| Role | Email | Password | Volunteer Code |
|------|-------|----------|---------------|
| 👑 Manager | manager@vg.com | password123 | — |
| 👤 Jordan | jordan@vg.com | password123 | VG-4F8A2B |
| 👤 Sam | sam@vg.com | password123 | VG-9C3D7E |
| 👤 Riley | riley@vg.com | password123 | VG-1B5E3F |

---

## 🧱 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| HTTP Client | Axios |
| Backend | Node.js + Express |
| Real-time | WebSockets (`ws`) |
| Auth | JWT + bcryptjs |
| Database | In-memory store (no setup needed) |
| Styling | Vanilla CSS design system |

---

## 📊 Scoring Algorithm (No AI)

```
Score = (SkillMatch × 5) + (Availability × 3) + (Distance × 2) + (Experience × 1)
```

- **SkillMatch**: % of required skills volunteer has
- **Availability**: 1 if not double-booked, 0 if already assigned
- **Distance**: default 1 (extensible)
- **Experience**: normalized 0–1 (max score 5)
- **No-show penalty**: −5 if >2 no-shows

---

## 🎯 Core Features

### Manager
- Create / edit / delete events
- Add tasks with skills, priority (1–5), and required count
- Add volunteer by unique code → **Auto or Manual assign**
- Reassign volunteers between tasks
- Mark attendance (present / absent)
- Real-time fill rate tracking (red → yellow → green)
- Live monitoring dashboard across all events

### Volunteer
- Auto-generated unique code (VG-XXXXXX)
- View assigned event + task
- Edit skills profile
- No-show tracking

### Real-time
- WebSocket broadcasts on every change
- Task cards update color: 🔴 empty → 🟡 partial → 🟢 full
- Live dot indicator in topbar

---

## 📁 Project Structure

```
RMS/
├── server/
│   ├── index.js          ← Express + WebSocket server
│   ├── db/store.js       ← In-memory data store + seed data
│   ├── utils/scoring.js  ← Deterministic scoring engine
│   ├── middleware/auth.js ← JWT guard
│   └── routes/
│       ├── auth.js       ← /api/auth/*
│       ├── events.js     ← /api/events/*
│       └── volunteers.js ← /api/volunteers/*
└── client/
    └── src/
        ├── context/      ← Auth, Socket, Toast providers
        ├── pages/
        │   ├── Login.jsx
        │   ├── Signup.jsx
        │   ├── volunteer/Dashboard.jsx
        │   └── manager/
        │       ├── Dashboard.jsx
        │       ├── CreateEvent.jsx
        │       ├── EventControlPanel.jsx  ← KEY SCREEN
        │       ├── EventsList.jsx
        │       ├── VolunteersPage.jsx
        │       └── LiveMonitor.jsx
        ├── components/   ← Sidebar, Topbar, Icons, AppLayout
        └── utils/api.js  ← Axios client
```

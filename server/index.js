const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const authRoutes = require('./routes/auth');
const eventsRoutes = require('./routes/events');
const volunteersRoutes = require('./routes/volunteers');

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/volunteers', volunteersRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── HTTP + WebSocket Server ──────────────────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);
  ws.send(JSON.stringify({ type: 'CONNECTED', payload: { message: 'Volunteer Grid real-time ready' } }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });
});

// Attach broadcast to router so routes can call it
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

eventsRoutes.broadcast = broadcast;

// ─── Start ─────────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`\n🚀 Volunteer Grid API running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}`);
  console.log('\n📋 Seed Accounts:');
  console.log('  Manager : manager@vg.com / password123');
  console.log('  Volunteer: jordan@vg.com / password123 (code: VG-4F8A2B)');
  console.log('  Volunteer: sam@vg.com    / password123 (code: VG-9C3D7E)');
  console.log('  Volunteer: riley@vg.com  / password123 (code: VG-1B5E3F)');
});

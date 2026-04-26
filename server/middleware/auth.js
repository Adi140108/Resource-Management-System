const { admin } = require('../config/firebase-admin');
const store = require('../db/store');

async function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Malformed token' });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    let user = await store.getUserById(decoded.uid);
    
    // Seamless migration: If user not found by UID, check if they exist by email (e.g. seed users)
    if (!user) {
      const userByEmail = await store.getUserByEmail(decoded.email);
      if (userByEmail) {
        // In a real migration, you'd create a new doc with decoded.uid and delete the old one,
        // but since store.createUser takes data, we can just do that.
        // Actually, let's just create a new doc with the decoded.uid and the old data.
        const { db } = require('../config/firebase-admin');
        await db.collection('users').doc(decoded.uid).set({ ...userByEmail, id: decoded.uid });
        await db.collection('users').doc(userByEmail.id).delete();
        user = await store.getUserById(decoded.uid);
      }
    }

    if (!user) {
      // User is authenticated in Firebase but doesn't have a profile in our DB yet.
      req.user = { id: decoded.uid, email: decoded.email, role: 'unknown' };
    } else {
      req.user = user;
    }
    next();
  } catch (error) {
    console.error('[AUTH ERROR]', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireManager(req, res, next) {
  if (req.user.role !== 'manager') return res.status(403).json({ error: 'Manager access required' });
  next();
}

module.exports = { authenticate, requireManager };

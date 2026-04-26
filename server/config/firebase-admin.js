const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'evs-56217',
  });
} else {
  // Fallback for Auth verification only (Firestore will fail without credentials)
  console.warn("⚠️  serviceAccountKey.json not found! Firestore writes/reads will fail.");
  admin.initializeApp({
    projectId: 'evs-56217',
  });
}

const db = admin.firestore();

module.exports = { admin, db };

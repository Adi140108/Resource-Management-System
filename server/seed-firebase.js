const admin = require('./config/firebase-admin');

const users = [
  { email: 'manager@vg.com', password: 'password123', displayName: 'Manager' },
  { email: 'jordan@vg.com', password: 'password123', displayName: 'Jordan' },
  { email: 'sam@vg.com', password: 'password123', displayName: 'Sam' },
  { email: 'riley@vg.com', password: 'password123', displayName: 'Riley' },
];

async function seed() {
  for (const user of users) {
    try {
      await admin.auth().createUser({
        email: user.email,
        password: user.password,
        displayName: user.displayName,
      });
      console.log(`Created ${user.email} in Firebase Auth`);
    } catch (e) {
      if (e.code === 'auth/email-already-exists') {
        console.log(`${user.email} already exists`);
      } else {
        console.error(`Failed to create ${user.email}:`, e.message);
      }
    }
  }
  process.exit(0);
}

seed();

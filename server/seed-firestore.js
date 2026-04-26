const { db } = require('./config/firebase-admin');
const { v4: uuidv4 } = require('uuid');

const users = [
  {
    id: 'u1',
    name: 'Alex Manager',
    email: 'manager@evs.com',
    role: 'manager',
    uniqueCode: null,
    skills: [],
    experienceScore: 0,
    noShowCount: 0,
  },
  {
    id: 'u2',
    name: 'Jordan Reeves',
    email: 'jordan@evs.com',
    role: 'volunteer',
    uniqueCode: 'EVS-4F8A2B',
    skills: ['first-aid', 'communication', 'logistics'],
    experienceScore: 4,
    noShowCount: 0,
  },
  {
    id: 'u3',
    name: 'Sam Clarke',
    email: 'sam@evs.com',
    role: 'volunteer',
    uniqueCode: 'EVS-9C3D7E',
    skills: ['tech-support', 'coordination', 'driving'],
    experienceScore: 2,
    noShowCount: 0,
  },
  {
    id: 'u4',
    name: 'Riley Morgan',
    email: 'riley@evs.com',
    role: 'volunteer',
    uniqueCode: 'EVS-1B5E3F',
    skills: ['first-aid', 'cooking', 'coordination'],
    experienceScore: 5,
    noShowCount: 1,
  },
];

async function seed() {
  try {
    for (const user of users) {
      await db.collection('users').doc(user.id).set(user);
      console.log(`Seeded user: ${user.name}`);
    }

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
        ],
        volunteers: [
          { userId: 'u2', taskId: 't1', attendance: null, joinedAt: new Date().toISOString() },
        ],
        createdAt: new Date().toISOString(),
      }
    ];

    for (const event of events) {
      await db.collection('events').doc(event.id).set(event);
      console.log(`Seeded event: ${event.name}`);
    }

    console.log('Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();

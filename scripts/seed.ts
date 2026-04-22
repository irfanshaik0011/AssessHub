import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as dotenv from 'dotenv';

// Load environment variables from .env in the current working directory
dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const users = [
  {
    email: 'mujtabaakthar6109@gmail.com',
    password: '123456',
    name: 'System Admin',
    role: 'admin',
    status: 'active'
  },
  {
    email: 'mujtabamd398@gmail.com',
    password: '123456',
    name: 'Dr. Smith',
    role: 'faculty',
    status: 'active'
  },
  {
    email: 'mujjufriendproj1@gmail.com',
    password: '123456',
    name: 'John Doe',
    role: 'student',
    status: 'active'
  }
];

async function seed() {
  console.log('Starting seed process...');

  for (const user of users) {
    try {
      console.log(`Creating user: ${user.email}...`);
      
      // Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, user.email, user.password);
      const firebaseUser = userCredential.user;

      // Create Firestore Document
      await setDoc(doc(db, 'users', firebaseUser.uid), {
        name: user.name,
        role: user.role,
        status: user.status,
        created_at: new Date().toISOString()
      });

      console.log(`Successfully created ${user.role}: ${user.email}`);
      
      // Sign out to clear session for next user creation
      await signOut(auth);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.warn(`User ${user.email} already exists, skipping...`);
      } else {
        console.error(`Error creating ${user.email}:`, error.message);
      }
    }
  }

  console.log('Seed process completed.');
  process.exit(0);
}

seed();
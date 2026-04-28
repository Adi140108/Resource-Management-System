import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "evs-56217",
  appId: "1:119020413159:web:03cb594d130d6b4c714242",
  storageBucket: "evs-56217.firebasestorage.app",
  apiKey: "AIzaSyDMPCReG_28cFwP8-9Iijg13VEm9tBEehg",
  authDomain: "evs-56217.firebaseapp.com",
  messagingSenderId: "119020413159",
  measurementId: "G-E6QFG87N1H"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

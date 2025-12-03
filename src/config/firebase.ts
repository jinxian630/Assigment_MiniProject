import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: "AIzaSyDaXlRP4lPsW566s41jfeoo1UpsJSBOvCw",
  authDomain: "myminiproject-f6d7e.firebaseapp.com",
  projectId: "myminiproject-f6d7e",
  storageBucket: "myminiproject-f6d7e.firebasestorage.app",
  messagingSenderId: "586003701721",
  appId: "1:586003701721:web:6fd82962bc46f98fcb83c8",
};

// Validate environment variables
if (!firebaseConfig.apiKey) {
  throw new Error("Missing EXPO_PUBLIC_FIREBASE_API_KEY environment variable");
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  console.log("✅ Firebase initialized successfully");
} catch (error) {
  console.error("❌ Firebase initialization error:", error);
  throw error;
}

export { app, auth, db, storage };

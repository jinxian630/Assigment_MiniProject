import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, Auth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration - MyMiniProjectNkk
const firebaseConfig = {
  apiKey: "AIzaSyBkilQM5vynuUfJGPGYoLrNWHvq9JN476U",
  authDomain: "miniprojectgp1-a52e3.firebaseapp.com",
  projectId: "miniprojectgp1-a52e3",
  storageBucket: "miniprojectgp1-a52e3.firebasestorage.app",
  messagingSenderId: "945715787836",
  appId: "1:945715787836:web:0860e2d49a319cadd4eb39",
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Missing required Firebase configuration values");
}

// Initialize Firebase (only if not already initialized)
const existingApps = getApps();
let app: FirebaseApp;

if (existingApps.length > 0) {
  app = existingApps[0];
  console.log("✅ Using existing Firebase app");
  console.log("📊 Project ID:", app.options.projectId);
  console.log("🌐 Auth Domain:", app.options.authDomain);
} else {
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase initialized successfully");
  console.log("📊 Project ID:", app.options.projectId);
  console.log("🌐 Auth Domain:", app.options.authDomain);
  console.log("🔑 API Key:", firebaseConfig.apiKey.substring(0, 10) + "...");
}

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

console.log(
  "🔧 Firebase services initialized for project:",
  app.options.projectId
);

export { app, auth, db, storage, googleProvider, GoogleAuthProvider };

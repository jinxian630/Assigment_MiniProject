import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";

// Firebase configuration - Friend's project
const firebaseConfig = {
  apiKey: "AIzaSyDaXlRP4lPsW566s41jfeoo1UpsJSBOvCw",
  authDomain: "myminiproject-f6d7e.firebaseapp.com",
  projectId: "myminiproject-f6d7e",
  storageBucket: "myminiproject-f6d7e.firebasestorage.app",
  messagingSenderId: "586003701721",
  appId: "1:586003701721:web:6fd82962bc46f98fcb83c8",
};

// Validate configuration
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  throw new Error("Missing required Firebase configuration values");
}

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  // Check if Firebase is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    // Use existing app
    app = existingApps[0];
    console.log("✅ Using existing Firebase app");
    console.log("📊 Project ID:", app.options.projectId);
    console.log("🌐 Auth Domain:", app.options.authDomain);
  } else {
    // Initialize new app
    app = initializeApp(firebaseConfig);
    console.log("✅ Firebase initialized successfully");
    console.log("📊 Project ID:", app.options.projectId);
    console.log("🌐 Auth Domain:", app.options.authDomain);
    console.log("🔑 API Key:", firebaseConfig.apiKey.substring(0, 10) + "...");
  }

  // Initialize services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  console.log(
    "🔧 Firebase services initialized for project:",
    app.options.projectId
  );
} catch (error: any) {
  console.error("❌ Firebase initialization error:", error);

  // Provide helpful error message
  if (error.code === "app/duplicate-app") {
    console.warn("Firebase app already exists, using existing instance");
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
      auth = getAuth(app);
      db = getFirestore(app);
      storage = getStorage(app);
    } else {
      throw new Error("Firebase initialization failed: " + error.message);
    }
  } else {
    throw new Error(
      "Firebase initialization failed: " + (error.message || "Unknown error")
    );
  }
}

export { app, auth, db, storage };

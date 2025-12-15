import { initializeApp, FirebaseApp, getApps } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
<<<<<<< HEAD
// Firebase configuration from environment variables
// Previous project: myminiproject-f6d7e (deprecated)
// Current project: miniprojectgp1-a52e3 (active)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Comprehensive environment variable validation
const requiredEnvVars = {
  apiKey: 'EXPO_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'EXPO_PUBLIC_FIREBASE_APP_ID',
} as const;

const missingVars: string[] = [];
const presentVars: string[] = [];

// Check each required variable
for (const [key, envVarName] of Object.entries(requiredEnvVars)) {
  const value = firebaseConfig[key as keyof typeof firebaseConfig];
  if (!value || value === 'undefined' || value === '') {
    missingVars.push(envVarName);
  } else {
    presentVars.push(envVarName);
  }
}

// If any variables are missing, throw detailed error
if (missingVars.length > 0) {
  console.error('❌ Firebase Configuration Error:');
  console.error('Missing environment variables:', missingVars);
  console.error('\nPresent environment variables:', presentVars);
  console.error('\n📋 Setup Instructions:');
  console.error('1. Ensure you have a .env file in the project root');
  console.error('2. Add the following variables:');
  missingVars.forEach(varName => {
    console.error(`   ${varName}=your_value_here`);
  });
  console.error('3. Restart your development server (npx expo start -c)');
  console.error('\n💡 Tip: Check .env.example for reference');

  throw new Error(
    `Missing Firebase environment variables: ${missingVars.join(', ')}. ` +
    `Please check your .env file and restart the development server.`
  );
}

// Validate format of critical fields
if (firebaseConfig.projectId && !firebaseConfig.authDomain?.includes(firebaseConfig.projectId)) {
  console.warn(
    '⚠️  Warning: authDomain does not match projectId. ' +
    `Expected authDomain to include '${firebaseConfig.projectId}' but got '${firebaseConfig.authDomain}'`
  );
=======

// Firebase configuration - MyMiniProjectNkk
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

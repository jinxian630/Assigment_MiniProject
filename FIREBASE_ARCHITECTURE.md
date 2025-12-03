# Firebase Architecture Guide
## React Native + Expo + Firebase

**For Students:** This guide explains how Firebase Authentication, Firestore Database, and Storage work together in your app.

---

## Table of Contents
1. [Overview](#overview)
2. [Environment Configuration (.env)](#environment-configuration-env)
3. [Firebase Initialization](#firebase-initialization)
4. [User Registration Flow](#user-registration-flow)
5. [Firestore User Document Creation](#firestore-user-document-creation)
6. [Storage Upload Flow (Future)](#storage-upload-flow-future)
7. [Complete Registration Sequence](#complete-registration-sequence)

---

## Overview

Your app uses **3 Firebase services**:

| Service | Purpose | File |
|---------|---------|------|
| **Firebase Auth** | User login/signup | `src/services/auth.service.ts` |
| **Firestore Database** | Store user profiles | `src/services/firestore.service.ts` |
| **Firebase Storage** | Store profile photos | `src/config/firebase.ts` (initialized) |

---

## Environment Configuration (.env)

### What is `.env`?
A `.env` file stores **secret configuration values** that shouldn't be hardcoded in your source code.

### Your `.env` file:
```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyBkilQM5vynuUfJGPGYoLrNWHvq9JN476U
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=miniprojectgp1-a52e3.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=miniprojectgp1-a52e3
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=miniprojectgp1-a52e3.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=945715787836
EXPO_PUBLIC_FIREBASE_APP_ID=1:945715787836:web:0860e2d49a319cadd4eb39
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=G-Z6H1ZGMHC0
```

### Why `EXPO_PUBLIC_` prefix?
- Expo requires this prefix for environment variables to be accessible in your app
- Variables are loaded by `react-native-dotenv` (configured in `babel.config.js`)

### How does it connect to Firebase?

**Step 1:** Babel reads `.env`
```javascript
// babel.config.js
plugins: [
  ['module:react-native-dotenv', {
    moduleName: '@env',  // Import as '@env'
    path: '.env',        // Read from .env file
  }]
]
```

**Step 2:** Firebase config imports variables
```typescript
// src/config/firebase.ts
import {
  EXPO_PUBLIC_FIREBASE_API_KEY,
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // ... other variables
} from '@env';

const firebaseConfig = {
  apiKey: EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  // ... other config
};
```

**Step 3:** Firebase SDK initializes
```typescript
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
```

**Analogy:** Think of `.env` as a **locked cabinet** storing your keys, and `firebase.ts` takes those keys to unlock Firebase services.

---

## Firebase Initialization

**File:** `src/config/firebase.ts`

### What happens here?
1. Import Firebase SDK modules
2. Read environment variables from `.env`
3. Create Firebase configuration object
4. Initialize Firebase app
5. Initialize Auth, Firestore, and Storage services
6. Export them for use throughout the app

### Code flow:
```typescript
import { initializeApp } from 'firebase/app';           // Step 1
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { EXPO_PUBLIC_FIREBASE_API_KEY, ... } from '@env'; // Step 2

const firebaseConfig = { ... };                          // Step 3

const app = initializeApp(firebaseConfig);               // Step 4
const auth = getAuth(app);                               // Step 5
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };                       // Step 6
```

**Analogy:** This is like **setting up your phone** - you enter your account credentials (config) and activate different apps (Auth, Firestore, Storage).

---

## User Registration Flow

**File:** `src/services/auth.service.ts`

### Method: `registerUser()`

This method does **3 things** in sequence:

### Step 1: Create Firebase Auth Account
```typescript
const userCredential = await createUserWithEmailAndPassword(
  auth,
  userData.email,
  userData.password
);
```
**What happens:**
- Firebase creates a user account in Authentication
- Returns a unique user ID (uid): `"xK9mP2nL4jQ8rT1vW5zY3bN6cM8"`
- User can now log in with email/password

### Step 2: Update Auth Profile
```typescript
await updateProfile(user, {
  displayName: userData.displayName,
});
```
**What happens:**
- Adds displayName to Firebase Auth user
- This syncs with the Auth user object

### Step 3: Create Firestore Document
```typescript
await firestoreService.createUserDocument(user.uid, firestoreUserData);
```
**What happens:**
- Creates a document in Firestore at `users/{uid}`
- Stores full profile: name, email, birthDate, gender, phone, photo
- Automatically adds `createdAt` and `updatedAt` timestamps

**Analogy:**
- Step 1 = Creating a **login account** (like your email account)
- Step 2 = Adding your **display name** to your account
- Step 3 = Creating your **detailed profile** (like your social media profile)

---

## Firestore User Document Creation

**File:** `src/services/firestore.service.ts`

### Method: `createUserDocument()`

### What is Firestore?
Firestore is a **NoSQL cloud database** that stores data in **collections** and **documents**.

```
Firestore Database
└── users (collection)
    ├── uid1 (document)
    ├── uid2 (document)
    └── uid3 (document)
```

### Collection Path: `users/{uid}`

Example: `users/xK9mP2nL4jQ8rT1vW5zY3bN6cM8`

### Document Structure:
```json
{
  "displayName": "John Doe",
  "email": "john.doe@example.com",
  "birthDate": "1995-06-15",
  "gender": "male",
  "phoneNumber": "+1234567890",
  "photoURL": "",
  "createdAt": Timestamp(2024-11-30 16:30:00),
  "updatedAt": Timestamp(2024-11-30 16:30:00)
}
```

### Code flow:
```typescript
async createUserDocument(uid, userData) {
  // Step 1: Reference the document location
  const userRef = doc(db, 'users', uid);

  // Step 2: Write document with serverTimestamp
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),  // Auto-generated by server
    updatedAt: serverTimestamp(),
  });
}
```

### Why `serverTimestamp()`?
- Generates timestamp on **Firebase server** (not your phone)
- Ensures all users have consistent timestamps regardless of device time
- Prevents time-zone issues

**Analogy:** Like filling out a **registration form** at a school office - they stamp it with the official school timestamp, not your watch time.

---

## Storage Upload Flow (Future)

**What is Firebase Storage?**
Firebase Storage is like **Google Drive** - it stores files (images, videos, PDFs).

### Typical Upload Flow (when implemented):

```
User picks photo → Upload to Storage → Get download URL → Save URL in Firestore
```

### Step-by-step:
1. **User picks photo** using `expo-image-picker`
2. **Convert to blob** (binary data)
3. **Upload to Storage** at path: `users/{uid}/profile.jpg`
4. **Get download URL** from Storage
5. **Save URL in Firestore** (photoURL field)

### Example code structure:
```typescript
// 1. User picks photo
const photo = await ImagePicker.launchImageLibraryAsync();

// 2. Upload to Storage
const storageRef = ref(storage, `users/${uid}/profile.jpg`);
await uploadBytes(storageRef, blob);

// 3. Get download URL
const photoURL = await getDownloadURL(storageRef);

// 4. Update Firestore with URL
await firestoreService.updateUserDocument(uid, { photoURL });
```

**Analogy:**
- Storage = Your **photo album** (stores the actual photo)
- Firestore = Your **address book** (stores the link to the photo)

---

## Complete Registration Sequence

### Visual Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       USER REGISTRATION FLOW                         │
└─────────────────────────────────────────────────────────────────────┘

   USER                    APP                FIREBASE AUTH       FIRESTORE
    │                       │                       │                 │
    │  1. Fill form         │                       │                 │
    │  (name, email, etc)   │                       │                 │
    │──────────────────────>│                       │                 │
    │                       │                       │                 │
    │                       │  2. createUserWithEmailAndPassword()    │
    │                       │──────────────────────>│                 │
    │                       │                       │                 │
    │                       │  3. Returns UserCredential (uid)        │
    │                       │<──────────────────────│                 │
    │                       │                       │                 │
    │                       │  4. updateProfile(displayName)          │
    │                       │──────────────────────>│                 │
    │                       │                       │                 │
    │                       │  5. Profile updated   │                 │
    │                       │<──────────────────────│                 │
    │                       │                       │                 │
    │                       │  6. createUserDocument(uid, data)       │
    │                       │─────────────────────────────────────────>│
    │                       │                       │                 │
    │                       │  7. Document created with serverTimestamp│
    │                       │<─────────────────────────────────────────│
    │                       │                       │                 │
    │  8. Success!          │                       │                 │
    │  Navigate to home     │                       │                 │
    │<──────────────────────│                       │                 │
    │                       │                       │                 │
```

### Step-by-Step Breakdown

#### **Step 1:** User fills registration form
```
Input:
- Display Name: "John Doe"
- Email: "john.doe@example.com"
- Password: "SecurePass123"
- Birth Date: "1995-06-15"
- Gender: "male"
- Phone: "+1234567890"
```

#### **Step 2:** App calls `authService.registerUser()`
```typescript
const userCredential = await authService.registerUser({
  displayName: 'John Doe',
  email: 'john.doe@example.com',
  password: 'SecurePass123',
  birthDate: '1995-06-15',
  gender: 'male',
  phoneNumber: '+1234567890',
});
```

#### **Step 3:** Create Firebase Auth user
```typescript
// Inside registerUser()
const userCredential = await createUserWithEmailAndPassword(
  auth,
  userData.email,
  userData.password
);

// Returns:
{
  user: {
    uid: "xK9mP2nL4jQ8rT1vW5zY3bN6cM8",
    email: "john.doe@example.com",
    emailVerified: false,
    displayName: null  // Not set yet
  }
}
```

#### **Step 4:** Update Auth profile with displayName
```typescript
await updateProfile(user, {
  displayName: userData.displayName,
});

// Now user object has:
{
  uid: "xK9mP2nL4jQ8rT1vW5zY3bN6cM8",
  email: "john.doe@example.com",
  displayName: "John Doe"  // ✅ Updated
}
```

#### **Step 5:** Prepare Firestore data
```typescript
const firestoreUserData = {
  displayName: "John Doe",
  email: "john.doe@example.com",
  birthDate: "1995-06-15",
  gender: "male",
  phoneNumber: "+1234567890",
  photoURL: "",  // Empty for now
  // createdAt and updatedAt will be auto-added
};
```

#### **Step 6:** Create Firestore document
```typescript
await firestoreService.createUserDocument(
  "xK9mP2nL4jQ8rT1vW5zY3bN6cM8",
  firestoreUserData
);

// Creates document at: users/xK9mP2nL4jQ8rT1vW5zY3bN6cM8
```

#### **Step 7:** Firestore document created
```json
// Location: users/xK9mP2nL4jQ8rT1vW5zY3bN6cM8
{
  "displayName": "John Doe",
  "email": "john.doe@example.com",
  "birthDate": "1995-06-15",
  "gender": "male",
  "phoneNumber": "+1234567890",
  "photoURL": "",
  "createdAt": {
    "_seconds": 1701360000,
    "_nanoseconds": 123000000
  },
  "updatedAt": {
    "_seconds": 1701360000,
    "_nanoseconds": 123000000
  }
}
```

#### **Step 8:** User is registered!
- User can now log in with email/password
- User profile is stored in Firestore
- App navigates to home screen

---

## Summary: The Big Picture

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR APP                                 │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   .env      │──>│ firebase.ts  │──>│  Services   │          │
│  │ (secrets)   │  │ (config)     │  │ auth.service │          │
│  └─────────────┘  └──────────────┘  │ firestore.   │          │
│                                      │ service      │          │
│                                      └──────┬───────┘          │
└─────────────────────────────────────────────┼──────────────────┘
                                              │
                                              │ API Calls
                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      FIREBASE CLOUD                              │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Firebase     │  │  Firestore   │  │  Firebase    │         │
│  │ Auth         │  │  Database    │  │  Storage     │         │
│  │              │  │              │  │              │         │
│  │ • Users      │  │ • users/     │  │ • Profile    │         │
│  │ • Login      │  │   {uid}      │  │   photos     │         │
│  │ • Passwords  │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

### Key Takeaways

1. **`.env`** → Stores Firebase credentials securely
2. **`firebase.ts`** → Initializes Firebase services
3. **`auth.service.ts`** → Handles user registration/login
4. **`firestore.service.ts`** → Manages database operations
5. **`serverTimestamp()`** → Auto-generates consistent timestamps

### What happens when a user registers?

```
User fills form
    ↓
App creates Auth account (email + password)
    ↓
App updates Auth profile (displayName)
    ↓
App creates Firestore document (full profile)
    ↓
User is registered! ✅
```

### Firebase Services Explained Simply

| Service | Real-world analogy | What it stores |
|---------|-------------------|----------------|
| **Firebase Auth** | School ID card | Email, password, uid |
| **Firestore** | Student records | Full profile data |
| **Storage** | Photo album | Profile pictures |

---

## Common Questions

### Q: Why separate Auth and Firestore?
**A:** Firebase Auth handles **authentication** (login/password), while Firestore stores **additional data** (birthdate, phone, etc). Auth doesn't store custom fields.

### Q: Why use serverTimestamp?
**A:** So all users have the same time regardless of their phone's timezone or clock settings.

### Q: Can I change the `.env` values?
**A:** Only if you create a new Firebase project. These values identify YOUR specific project.

### Q: Where is the password stored?
**A:** In Firebase Auth, **encrypted**. It's NEVER stored in Firestore (for security).

### Q: What if registration fails?
**A:** The try-catch block handles errors. If Auth fails, Firestore document is never created. If Firestore fails, you still have an Auth user (you'd need to handle cleanup).

---

## Files Reference

| File | Purpose |
|------|---------|
| `.env` | Firebase credentials |
| `src/config/firebase.ts` | Initialize Firebase services |
| `src/services/auth.service.ts` | Authentication logic |
| `src/services/firestore.service.ts` | Database operations |
| `src/types/user.ts` | TypeScript user types |
| `src/types/firebase.ts` | TypeScript Firebase types |
| `babel.config.js` | Configure dotenv plugin |

---

**Happy coding! 🚀**

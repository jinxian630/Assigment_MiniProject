 Project Setup Guide

This guide will help you set up and run the **Group 1 Task Management** project on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed:

1.  **Node.js** (LTS version recommended): [Download Node.js](https://nodejs.org/)
2.  **Git**: [Download Git](https://git-scm.com/)
3.  **Expo Go App** (Optional, for testing on physical device):
    *   [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
    *   [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)

## Step 1: Clone the Repository

If you haven't already, clone the repository to your local machine:

```bash
git clone <repository-url>
cd "Mini Project Asg"
```

## Step 2: Install Dependencies

Install the required project dependencies using npm:

```bash
npm install
```

## Step 3: Environment Configuration

This project uses Firebase and requires environment variables to function correctly.

1.  Duplicate the `.env.example` file and rename it to `.env`:
    *   **Windows (Command Prompt):** `copy .env.example .env`
    *   **Mac/Linux:** `cp .env.example .env`
    *   *Or simply copy-paste the file manually in your file explorer.*

2.  Open the `.env` file and fill in the Firebase configuration keys. You should get these values from the project administrator or the Firebase Console (Project Settings > General > Your Apps).

    ```ini
    EXPO_PUBLIC_FIREBASE_API_KEY=...
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
    EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
    EXPO_PUBLIC_FIREBASE_APP_ID=...
    EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=...
    ```

    > **Note:** Since these variables start with `EXPO_PUBLIC_`, they will be available in the app without extra configuration.

## Step 4: Run the Application

Start the development server:

```bash
npx expo start
```

This will start the Metro Bundler. You can now run the app in different ways:

*   **Physical Device:** Scan the QR code displayed in the terminal using the **Expo Go** app (Android) or the Camera app (iOS).
*   **Android Emulator:** Press `a` in the terminal (requires Android Studio setup).
*   **iOS Simulator:** Press `i` in the terminal (requires Xcode setup, macOS only).
*   **Web:** Press `w` in the terminal.

## Project Documentation

For a deeper understanding of the Firebase integration and architecture, please refer to the [FIREBASE_ARCHITECTURE.md](FIREBASE_ARCHITECTURE.md) file included in this repository. It explains:
*   How Authentication, Firestore, and Storage work together.
*   The detailed user registration flow.
*   Why we use specific environment variables.

## Project Structure

*   `app/`: Expo Router pages (file-based routing).
*   `src/components/`: Reusable UI components.
*   `src/services/`: Firebase service logic (Auth, Firestore).
*   `src/types/`: TypeScript definitions.
*   `src/config/`: Configuration files (e.g., `firebase.ts`).

## Troubleshooting

*   **Cache Issues:** If you encounter weird errors, try clearing the cache:
    ```bash
    npx expo start --clear
    ```
*   **Dependency Issues:** If `npm install` fails, try deleting `node_modules` and `package-lock.json`, then run `npm install` again.

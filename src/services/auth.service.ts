import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { auth } from '@/config/firebase';
import { LoginCredentials } from '@/types/user';
import { firestoreService } from './firestore.service';
import { FirestoreUser } from '@/types/firebase';

class AuthService {
  /**
   * Create a new user with email and password
   */
  async createUser(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log('✅ User created in Firebase Auth:', userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Register a new user with complete profile data
   * Creates both Firebase Auth account and Firestore user document
   */
  async registerUser(userData: {
    displayName: string;
    email: string;
    password: string;
    birthDate: string;
    gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
    phoneNumber: string;
    photoURL?: string;
  }): Promise<UserCredential> {
    try {
      // Step 1: Create Firebase Auth user with email and password
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const user = userCredential.user;
      console.log('✅ User created in Firebase Auth:', user.uid);

      // Step 2: Update Firebase Auth profile with displayName
      await updateProfile(user, {
        displayName: userData.displayName,
      });
      console.log('✅ Firebase Auth profile updated with displayName');

      // Step 3: Prepare Firestore user data (exclude password, add default photoURL)
      const firestoreUserData: Omit<FirestoreUser, 'createdAt' | 'updatedAt'> = {
        displayName: userData.displayName,
        email: userData.email,
        birthDate: userData.birthDate,
        gender: userData.gender,
        phoneNumber: userData.phoneNumber,
        photoURL: userData.photoURL || '', // Empty string if no photo yet
      };

      // Step 4: Create Firestore user document (with serverTimestamp for createdAt/updatedAt)
      await firestoreService.createUserDocument(user.uid, firestoreUserData);
      console.log('✅ Firestore user document created');

      return userCredential;
    } catch (error) {
      console.error('❌ Error registering user:', error);
      throw error;
    }
  }

  /**
   * Sign in existing user with email and password
   */
  async signIn({ email, password }: LoginCredentials): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      console.log('✅ User signed in:', userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error('❌ Error signing in:', error);
      throw error;
    }
  }

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    try {
      await signOut(auth);
      console.log('✅ User signed out successfully');
    } catch (error) {
      console.error('❌ Error signing out:', error);
      throw error;
    }
  }

  /**
   * Update Firebase Auth user profile (displayName, photoURL)
   */
  async updateUserProfile(
    user: FirebaseUser,
    updates: { displayName?: string; photoURL?: string }
  ): Promise<void> {
    try {
      await updateProfile(user, updates);
      console.log('✅ User profile updated in Firebase Auth');
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Get current Firebase user
   */
  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
}

// Export singleton instance
export const authService = new AuthService();

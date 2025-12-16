import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User as FirebaseUser,
  UserCredential,
} from 'firebase/auth';
import { Platform } from 'react-native';
import { auth, googleProvider } from '@/config/firebase';
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
        authProviders: ['password'], // Email/password authentication
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

  /**
   * Sign in with Google (Web only for now)
   */
  async signInWithGoogle(): Promise<UserCredential> {
    try {
      console.log('🔐 Starting Google Sign-In...');
      console.log('📱 Platform:', Platform.OS);

      if (Platform.OS === 'web') {
        // Web: Use Firebase popup flow
        const result = await signInWithPopup(auth, googleProvider);
        console.log('✅ Google Sign-In successful:', result.user.uid);
        
        // Handle user profile creation/update
        await this.handleGoogleAuthResult(result);
        return result;
      } else {
        throw new Error('Google Sign-In is currently only supported on web');
      }
    } catch (error) {
      console.error('❌ Google Sign-In error:', error);
      throw error;
    }
  }

  /**
   * Handle Google authentication result
   * Creates or updates user profile in Firestore
   */
  private async handleGoogleAuthResult(result: UserCredential): Promise<void> {
    try {
      const user = result.user;
      
      // Check if user document already exists
      const existingUser = await firestoreService.getUserDocument(user.uid);
      
      if (existingUser) {
        console.log('✅ Existing user found, updating auth providers');
        
        // Update authProviders if Google not already included
        const currentProviders = existingUser.authProviders || [];
        if (!currentProviders.includes('google.com')) {
          await firestoreService.updateUserDocument(user.uid, {
            authProviders: [...currentProviders, 'google.com'],
            photoURL: user.photoURL || existingUser.photoURL,
          });
        }
      } else {
        console.log('✅ New Google user, creating profile');
        
        // Create new user document with Google data
        const firestoreUserData: Omit<FirestoreUser, 'createdAt' | 'updatedAt'> = {
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          birthDate: '', // Will be filled in profile completion
          gender: 'prefer-not-to-say',
          phoneNumber: '',
          photoURL: user.photoURL || '',
          authProviders: ['google.com'],
        };
        
        await firestoreService.createUserDocument(user.uid, firestoreUserData);
      }
    } catch (error) {
      console.error('❌ Error handling Google auth result:', error);
      // Don't throw - allow sign-in to succeed even if Firestore update fails
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

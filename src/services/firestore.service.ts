import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FirestoreUser } from '@/types/firebase';
import { User } from '@/types/user';

class FirestoreService {
  private readonly USERS_COLLECTION = 'users';

  /**
   * Create user document in Firestore
   */
  async createUserDocument(
    uid: string,
    userData: Omit<FirestoreUser, 'createdAt' | 'updatedAt'>
  ): Promise<void> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, uid);
      await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log('✅ User document created in Firestore:', uid);
    } catch (error) {
      console.error('❌ Error creating user document:', error);
      throw error;
    }
  }

  /**
   * Get user document from Firestore
   */
  async getUserDocument(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data() as FirestoreUser;

        // Safely convert Firestore Timestamp to Date
        let createdAt: Date = new Date();
        if (data.createdAt) {
          if (data.createdAt instanceof Timestamp) {
            createdAt = data.createdAt.toDate();
          } else if (typeof data.createdAt === 'object' && 'toDate' in data.createdAt && typeof (data.createdAt as any).toDate === 'function') {
            createdAt = (data.createdAt as Timestamp).toDate();
          } else if (data.createdAt instanceof Date) {
            createdAt = data.createdAt;
          } else if (typeof data.createdAt === 'number') {
            createdAt = new Date(data.createdAt);
          } else if (typeof data.createdAt === 'string') {
            createdAt = new Date(data.createdAt);
          }
        }

        let updatedAt: Date | undefined = undefined;
        if (data.updatedAt) {
          if (data.updatedAt instanceof Timestamp) {
            updatedAt = data.updatedAt.toDate();
          } else if (typeof data.updatedAt === 'object' && 'toDate' in data.updatedAt && typeof (data.updatedAt as any).toDate === 'function') {
            updatedAt = (data.updatedAt as Timestamp).toDate();
          } else if (data.updatedAt instanceof Date) {
            updatedAt = data.updatedAt;
          } else if (typeof data.updatedAt === 'number') {
            updatedAt = new Date(data.updatedAt);
          } else if (typeof data.updatedAt === 'string') {
            updatedAt = new Date(data.updatedAt);
          }
        }

        // Convert Firestore document to User interface
        return {
          id: uid,
          email: data.email,
          displayName: data.displayName,
          birthDate: data.birthDate,
          gender: data.gender,
          phoneNumber: data.phoneNumber,
          photoURL: data.photoURL,
          createdAt,
          updatedAt,
        };
      }

      console.warn('⚠️ User document not found:', uid);
      return null;
    } catch (error) {
      console.error('❌ Error getting user document:', error);
      throw error;
    }
  }

  /**
   * Update user document in Firestore
   */
  async updateUserDocument(
    uid: string,
    updates: Partial<Omit<FirestoreUser, 'createdAt' | 'email'>>
  ): Promise<void> {
    try {
      const userRef = doc(db, this.USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
      console.log('✅ User document updated in Firestore:', uid);
    } catch (error) {
      console.error('❌ Error updating user document:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const firestoreService = new FirestoreService();

import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/config/firebase';

class StorageService {
  /**
   * Upload profile photo to Firebase Storage
   * @param uid - User ID
   * @param imageUri - Local image URI
   * @returns Download URL of uploaded image
   */
  async uploadProfilePhoto(uid: string, imageUri: string): Promise<string> {
    try {
      console.log('📤 Uploading profile photo for user:', uid);

      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create storage reference
      const storageRef = ref(storage, `users/${uid}/profile.jpg`);

      // Upload blob to Firebase Storage
      await uploadBytes(storageRef, blob);
      console.log('✅ Photo uploaded to Firebase Storage');

      // Get download URL
      const downloadURL = await getDownloadURL(storageRef);
      console.log('✅ Download URL obtained:', downloadURL);

      return downloadURL;
    } catch (error) {
      console.error('❌ Error uploading profile photo:', error);
      throw error;
    }
  }

  /**
   * Delete profile photo from Firebase Storage
   * @param uid - User ID
   */
  async deleteProfilePhoto(uid: string): Promise<void> {
    try {
      const storageRef = ref(storage, `users/${uid}/profile.jpg`);
      await deleteObject(storageRef);
      console.log('✅ Profile photo deleted from Firebase Storage');
    } catch (error) {
      console.error('❌ Error deleting profile photo:', error);
      throw error;
    }
  }

  /**
   * Get profile photo download URL
   * @param uid - User ID
   * @returns Download URL or null if doesn't exist
   */
  async getProfilePhotoURL(uid: string): Promise<string | null> {
    try {
      const storageRef = ref(storage, `users/${uid}/profile.jpg`);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error: any) {
      if (error.code === 'storage/object-not-found') {
        return null;
      }
      console.error('❌ Error getting profile photo URL:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const storageService = new StorageService();

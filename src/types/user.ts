import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  email: string;
  displayName: string;
  birthDate?: string; // ISO date string (YYYY-MM-DD)
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phoneNumber?: string;
  photoURL?: string; // Firebase Storage download URL
  avatar?: string; // Legacy field for backwards compatibility
  authProviders?: string[]; // Track auth providers
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Extended profile details for Step 2 of registration
export interface ProfileDetails {
  birthDate: string; // ISO date string (YYYY-MM-DD)
  gender: 'male' | 'female' | 'other' | 'prefer-not-to-say';
  phoneNumber: string;
}

// Complete registration data combining all steps
export interface RegistrationData extends ProfileDetails {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  photoUri?: string; // Local URI before upload
}

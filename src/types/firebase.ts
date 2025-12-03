import { FirebaseError } from "firebase/app";

// Firestore user document structure
export interface FirestoreUser {
  displayName: string;
  email: string;
  birthDate: string;
  gender: "male" | "female" | "other" | "prefer-not-to-say";
  phoneNumber: string;
  photoURL: string;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
}

// Common Firebase Auth error codes
export enum AuthErrorCode {
  EMAIL_EXISTS = "auth/email-already-in-use",
  WEAK_PASSWORD = "auth/weak-password",
  INVALID_EMAIL = "auth/invalid-email",
  USER_NOT_FOUND = "auth/user-not-found",
  WRONG_PASSWORD = "auth/wrong-password",
  TOO_MANY_REQUESTS = "auth/too-many-requests",
  NETWORK_ERROR = "auth/network-request-failed",
  USER_DISABLED = "auth/user-disabled",
  OPERATION_NOT_ALLOWED = "auth/operation-not-allowed",
}

/**
 * Convert Firebase error codes to user-friendly messages
 */
export const getAuthErrorMessage = (error: FirebaseError): string => {
  switch (error.code) {
    case AuthErrorCode.EMAIL_EXISTS:
      return "An account with this email already exists";
    case AuthErrorCode.WEAK_PASSWORD:
      return "Password should be at least 6 characters";
    case AuthErrorCode.INVALID_EMAIL:
      return "Invalid email address";
    case AuthErrorCode.USER_NOT_FOUND:
    case AuthErrorCode.WRONG_PASSWORD:
      return "Invalid email or password";
    case AuthErrorCode.TOO_MANY_REQUESTS:
      return "Too many attempts. Please try again later";
    case AuthErrorCode.NETWORK_ERROR:
      return "Network error. Please check your connection";
    case AuthErrorCode.USER_DISABLED:
      return "This account has been disabled";
    case AuthErrorCode.OPERATION_NOT_ALLOWED:
      return "This operation is not allowed";
    default:
      return error.message || "An error occurred. Please try again";
  }
};

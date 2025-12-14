/**
 * User-friendly error message mapping
 * Converts technical errors to user-friendly messages
 */

export function getUserFriendlyError(error: any): string {
  const errorCode = error?.code || "";
  const errorMessage = error?.message || "";

  // Firebase Auth errors
  if (errorCode === "auth/user-not-found") {
    return "User account not found. Please check your credentials.";
  }
  if (errorCode === "auth/wrong-password") {
    return "Incorrect password. Please try again.";
  }
  if (errorCode === "auth/email-already-in-use") {
    return "This email is already registered. Please use a different email.";
  }
  if (errorCode === "auth/weak-password") {
    return "Password is too weak. Please use a stronger password.";
  }
  if (errorCode === "auth/network-request-failed") {
    return "Network error. Please check your internet connection and try again.";
  }

  // Firestore errors
  if (errorCode === "permission-denied") {
    return "You don't have permission to perform this action. Please contact support if this persists.";
  }
  if (errorCode === "unavailable") {
    return "Service temporarily unavailable. Please try again in a moment.";
  }
  if (errorCode === "deadline-exceeded") {
    return "Request took too long. Please check your connection and try again.";
  }
  if (errorCode === "invalid-argument") {
    return "Invalid data provided. Please check your input and try again.";
  }
  if (errorCode === "not-found") {
    return "The requested item could not be found.";
  }
  if (errorCode === "already-exists") {
    return "This item already exists.";
  }
  if (errorCode === "resource-exhausted") {
    return "Service limit reached. Please try again later.";
  }
  if (errorCode === "failed-precondition") {
    return "Operation cannot be completed. Please try again.";
  }
  if (errorCode === "aborted") {
    return "Operation was cancelled. Please try again.";
  }
  if (errorCode === "out-of-range") {
    return "Value is out of allowed range.";
  }
  if (errorCode === "unimplemented") {
    return "This feature is not yet available.";
  }
  if (errorCode === "internal") {
    return "An internal error occurred. Please try again later.";
  }
  if (errorCode === "unauthenticated") {
    return "Please log in to continue.";
  }

  // Storage errors
  if (errorCode === "storage/object-not-found") {
    return "File not found. It may have been deleted.";
  }
  if (errorCode === "storage/unauthorized") {
    return "You don't have permission to access this file.";
  }
  if (errorCode === "storage/canceled") {
    return "Upload was cancelled.";
  }
  if (errorCode === "storage/unknown") {
    return "An unknown error occurred with file storage.";
  }

  // Network errors
  if (errorMessage.includes("Network request failed") || errorMessage.includes("network")) {
    return "Network error. Please check your internet connection.";
  }
  if (errorMessage.includes("timeout") || errorMessage.includes("Timeout")) {
    return "Request timed out. Please try again.";
  }

  // Generic fallbacks
  if (errorMessage) {
    // Remove technical details for user-facing messages
    const cleanMessage = errorMessage
      .replace(/Error: /gi, "")
      .replace(/TypeError: /gi, "")
      .replace(/ReferenceError: /gi, "")
      .replace(/FirebaseError: /gi, "")
      .replace(/\[.*?\]/g, "") // Remove brackets
      .trim();
    
    if (cleanMessage.length > 0 && cleanMessage.length < 200) {
      return cleanMessage;
    }
  }

  return "Something went wrong. Please try again.";
}

/**
 * Get error title based on error type
 */
export function getErrorTitle(error: any): string {
  const errorCode = error?.code || "";
  
  if (errorCode.startsWith("auth/")) {
    return "Authentication Error";
  }
  if (errorCode.startsWith("storage/")) {
    return "File Error";
  }
  if (errorCode === "permission-denied") {
    return "Permission Denied";
  }
  if (errorCode === "network-request-failed" || errorCode.includes("network")) {
    return "Connection Error";
  }
  
  return "Error";
}


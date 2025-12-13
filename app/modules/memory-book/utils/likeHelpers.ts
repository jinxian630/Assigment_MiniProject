import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  increment,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";

/**
 * Check if a memory is liked by the current user
 */
export async function isMemoryLiked(
  memoryId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if user is authenticated
    if (!auth.currentUser) {
      return false;
    }

    // Try to access the Likes subcollection
    const likesRef = collection(db, "MemoryPosts", memoryId, "Likes");
    const q = query(likesRef, where("userId", "==", userId));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error: any) {
    // Handle permission errors gracefully
    if (
      error?.code === "permission-denied" ||
      error?.code === "missing-or-insufficient-permissions"
    ) {
      // Silently fail - user may not have permission to read likes
      // This is expected if security rules restrict access
      console.log("Like status check skipped due to permissions");
      return false;
    }
    // Log other errors but don't crash
    console.log("Error checking like status:", error?.message || error);
    return false;
  }
}

/**
 * Like a memory post
 */
export async function likeMemory(memoryId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to like posts");
  }

  const likesRef = collection(db, "MemoryPosts", memoryId, "Likes");

  // Check if already liked
  const checkQuery = query(likesRef, where("userId", "==", user.uid));
  const existingDocs = await getDocs(checkQuery);

  if (!existingDocs.empty) {
    // Already liked
    return;
  }

  // Add like
  await addDoc(likesRef, {
    userId: user.uid,
    likedAt: Date.now(),
  });

  // Increment like count on the memory post
  const memoryRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(memoryRef, {
    likes: increment(1),
    likesCount: increment(1),
  });
}

/**
 * Unlike a memory post
 */
export async function unlikeMemory(memoryId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User must be logged in to unlike posts");
  }

  const likesRef = collection(db, "MemoryPosts", memoryId, "Likes");
  const q = query(likesRef, where("userId", "==", user.uid));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Not liked
    return;
  }

  // Delete like document
  for (const likeDoc of snapshot.docs) {
    await deleteDoc(doc(likesRef, likeDoc.id));
  }

  // Decrement like count on the memory post
  const memoryRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(memoryRef, {
    likes: increment(-1),
    likesCount: increment(-1),
  });
}

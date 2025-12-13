import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  increment,
  updateDoc,
  Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";

export type Comment = {
  id: string;
  text: string;
  createdAt: number;
  userId: string;
  userName: string;
  userPhoto?: string;
};

/**
 * Subscribe to comments for a memory post
 */
export function subscribeToComments(
  memoryId: string,
  callback: (comments: Comment[]) => void
): Unsubscribe {
  const commentsRef = collection(db, "MemoryPosts", memoryId, "Comments");
  const q = query(commentsRef, orderBy("createdAt", "asc"));

  return onSnapshot(q, (snapshot) => {
    const comments: Comment[] = [];
    snapshot.forEach((doc) => {
      comments.push({ id: doc.id, ...doc.data() } as Comment);
    });
    callback(comments);
  });
}

/**
 * Add a comment to a memory post
 */
export async function addComment(
  memoryId: string,
  text: string
): Promise<string> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be logged in to comment");
  }

  const commentsRef = collection(db, "MemoryPosts", memoryId, "Comments");

  const commentData = {
    text: text.trim(),
    createdAt: Date.now(),
    userId: user.uid,
    userName: user.displayName || "Unknown User",
    userPhoto: user.photoURL || null,
  };

  const docRef = await addDoc(commentsRef, commentData);

  // Increment comment count on the memory post
  const memoryRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(memoryRef, {
    comments: increment(1),
    commentsCount: increment(1),
  });

  return docRef.id;
}

/**
 * Delete a comment
 */
export async function deleteComment(
  memoryId: string,
  commentId: string
): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be logged in to delete comments");
  }

  const commentRef = doc(db, "MemoryPosts", memoryId, "Comments", commentId);

  // Get comment to check ownership
  const commentDoc = await getDoc(commentRef);
  const commentData = commentDoc.data();

  if (commentData?.userId !== user.uid) {
    throw new Error("You can only delete your own comments");
  }

  await deleteDoc(commentRef);

  // Decrement comment count on the memory post
  const memoryRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(memoryRef, {
    comments: increment(-1),
    commentsCount: increment(-1),
  });
}


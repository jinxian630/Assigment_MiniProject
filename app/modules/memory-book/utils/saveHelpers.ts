import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Unsubscribe,
  increment,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { Memory } from "./memoryHelpers";

/**
 * Check if a memory is saved by the current user
 */
export async function isMemorySaved(
  memoryId: string,
  userId: string
): Promise<boolean> {
  const savesRef = collection(db, "SavedPosts");
  const q = query(
    savesRef,
    where("memoryId", "==", memoryId),
    where("userId", "==", userId)
  );

  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      resolve(!snapshot.empty);
      unsubscribe();
    });
  });
}

/**
 * Subscribe to saved posts for a user
 */
export function subscribeToSavedPosts(
  userId: string,
  callback: (
    savedPosts: Array<{ id: string; memoryId: string; savedAt: number }>
  ) => void
): Unsubscribe {
  const savesRef = collection(db, "SavedPosts");
  const q = query(savesRef, where("userId", "==", userId));

  return onSnapshot(q, (snapshot) => {
    const savedPosts: Array<{ id: string; memoryId: string; savedAt: number }> =
      [];
    snapshot.forEach((doc) => {
      savedPosts.push({ id: doc.id, ...doc.data() } as any);
    });
    callback(savedPosts);
  });
}

// Track ongoing save operations to prevent duplicates
const savingOperations = new Set<string>();

/**
 * Save a memory post
 */
export async function saveMemory(memoryId: string): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be logged in to save posts");
  }

  // Create a unique key for this save operation
  const operationKey = `${user.uid}_${memoryId}`;

  // Prevent duplicate simultaneous saves
  if (savingOperations.has(operationKey)) {
    console.log("Save operation already in progress for this memory");
    return;
  }

  savingOperations.add(operationKey);

  try {
    const savesRef = collection(db, "SavedPosts");

    // Check if already saved using a query
    const checkQuery = query(
      savesRef,
      where("memoryId", "==", memoryId),
      where("userId", "==", user.uid)
    );

    // Use getDocs to check if already saved
    const existingDocs = await getDocs(checkQuery);

    if (!existingDocs.empty) {
      // Already saved - remove duplicates if any exist
      if (existingDocs.docs.length > 1) {
        console.log(
          `Found ${existingDocs.docs.length} duplicate saves, cleaning up...`
        );
        // Keep the first one, delete the rest
        const deletePromises = existingDocs.docs
          .slice(1)
          .map((docSnap) => deleteDoc(docSnap.ref));
        await Promise.all(deletePromises);
      }
      return;
    }

    // Add to SavedPosts collection
    await addDoc(savesRef, {
      userId: user.uid,
      memoryId: memoryId,
      savedAt: Date.now(),
    });

    // Increment save count on the memory post
    const memoryRef = doc(db, "MemoryPosts", memoryId);
    await updateDoc(memoryRef, {
      saves: increment(1),
      savesCount: increment(1),
    });
  } finally {
    // Remove from ongoing operations
    savingOperations.delete(operationKey);
  }
}

/**
 * Unsave a memory post
 */
export async function unsaveMemory(memoryId: string): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be logged in to unsave posts");
  }

  const savesRef = collection(db, "SavedPosts");
  const q = query(
    savesRef,
    where("memoryId", "==", memoryId),
    where("userId", "==", user.uid)
  );

  // Get the save document and delete it
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    // Not saved, nothing to do
    return;
  }

  // Delete all matching save documents (should only be one)
  const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
  await Promise.all(deletePromises);

  // Decrement save count on the memory post
  const memoryRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(memoryRef, {
    saves: increment(-1),
    savesCount: increment(-1),
  });
}

/**
 * Get saved memory IDs for a user
 */
export async function getSavedMemoryIds(userId: string): Promise<string[]> {
  const savesRef = collection(db, "SavedPosts");
  const q = query(savesRef, where("userId", "==", userId));

  return new Promise((resolve) => {
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const memoryIds: string[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.memoryId) {
          memoryIds.push(data.memoryId);
        }
      });
      resolve(memoryIds);
      unsubscribe();
    });
  });
}

/**
 * Get saved memories with full data
 */
export function subscribeToSavedMemories(
  userId: string,
  callback: (memories: Memory[]) => void
): Unsubscribe {
  const savesRef = collection(db, "SavedPosts");
  const q = query(savesRef, where("userId", "==", userId));

  return onSnapshot(q, async (snapshot) => {
    const memoryIds: string[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.memoryId) {
        memoryIds.push(data.memoryId);
      }
    });

    // Fetch full memory data for each saved ID
    const memories: Memory[] = [];
    for (const memoryId of memoryIds) {
      try {
        const memoryDoc = await getDoc(doc(db, "MemoryPosts", memoryId));
        if (memoryDoc.exists()) {
          memories.push({ id: memoryDoc.id, ...memoryDoc.data() } as Memory);
        }
      } catch (error) {
        console.error(`Error fetching memory ${memoryId}:`, error);
      }
    }

    // Sort by savedAt (most recently saved first)
    const savedData = snapshot.docs.map((d) => ({
      id: d.id,
      memoryId: d.data().memoryId,
      savedAt: d.data().savedAt,
    }));

    memories.sort((a, b) => {
      const aSaved = savedData.find((s) => s.memoryId === a.id);
      const bSaved = savedData.find((s) => s.memoryId === b.id);
      return (bSaved?.savedAt || 0) - (aSaved?.savedAt || 0);
    });

    callback(memories);
  });
}

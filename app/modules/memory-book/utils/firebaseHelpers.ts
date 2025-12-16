import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  Unsubscribe,
  where,
  limit,
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { Memory } from "./memoryHelpers";
import { extractStoragePathFromURL } from "./storageHelpers";

// Real-time subscription to all memories
export function subscribeToMemories(
  callback: (memories: Memory[]) => void
): Unsubscribe {
  const postsRef = collection(db, "MemoryPosts");
  const q = query(postsRef, orderBy("startDate", "desc"));

  return onSnapshot(q, (snapshot) => {
    const list: Memory[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Memory);
    });
    callback(list);
  });
}

// Real-time subscription to latest N memories
export function subscribeToLatestMemories(
  limitCount: number,
  callback: (memories: Memory[]) => void
): Unsubscribe {
  try {
    const postsRef = collection(db, "MemoryPosts");

    // Try query with orderBy first (requires index)
    const q = query(postsRef, orderBy("startDate", "desc"), limit(limitCount));

    return onSnapshot(
      q,
      (snapshot) => {
        console.log(
          "📖 subscribeToLatestMemories: Received",
          snapshot.size,
          "documents"
        );
        const list: Memory[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          console.log(
            "📄 Document:",
            doc.id,
            "startDate:",
            data.startDate,
            "userId:",
            data.userId
          );
          list.push({ id: doc.id, ...data } as Memory);
        });
        console.log(
          "✅ subscribeToLatestMemories: Total memories loaded:",
          list.length
        );
        callback(list);
      },
      (error: any) => {
        console.error("❌ Error in subscribeToLatestMemories:", error);
        console.error("❌ Error code:", error.code);
        console.error("❌ Error message:", error.message);

        // If index is missing, try fallback query without orderBy
        if (error.code === "failed-precondition" || error.code === 9) {
          console.log(
            "⚠️ Index missing, trying fallback query (no orderBy)..."
          );
          const fallbackQ = query(postsRef, limit(limitCount * 2)); // Get more to sort manually

          return onSnapshot(
            fallbackQ,
            (snapshot) => {
              console.log(
                "📖 Fallback query: Received",
                snapshot.size,
                "documents"
              );
              const list: Memory[] = [];
              snapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() } as Memory);
              });
              // Sort manually by startDate descending
              list.sort((a, b) => (b.startDate || 0) - (a.startDate || 0));
              // Take only the requested limit
              const limited = list.slice(0, limitCount);
              console.log(
                "✅ Fallback: Total memories loaded:",
                limited.length
              );
              callback(limited);
            },
            (fallbackError: any) => {
              console.error("❌ Fallback query also failed:", fallbackError);
              callback([]);
            }
          );
        } else {
          callback([]);
        }
      }
    );
  } catch (error: any) {
    console.error("❌ Error setting up subscribeToLatestMemories:", error);
    callback([]);
    return () => {};
  }
}

// Real-time subscription to user-specific memories
export function subscribeToUserMemories(
  userId: string,
  callback: (memories: Memory[]) => void
): Unsubscribe {
  try {
    const postsRef = collection(db, "MemoryPosts");

    // Use simpler query without orderBy to avoid index requirement
    // We'll sort manually instead
    const q = query(postsRef, where("userId", "==", userId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(
          "📖 subscribeToUserMemories: Received snapshot with",
          snapshot.size,
          "documents"
        );
        const list: Memory[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Memory);
        });
        // Sort manually by startDate descending
        list.sort((a, b) => (b.startDate || 0) - (a.startDate || 0));
        console.log(
          "✅ subscribeToUserMemories: Calling callback with",
          list.length,
          "memories"
        );
        callback(list);
      },
      (error: any) => {
        console.error("❌ Error in subscribeToUserMemories:", error);
        console.error("❌ Error code:", error.code);
        console.error("❌ Error message:", error.message);
        // Always call callback with empty array on error so UI doesn't hang
        callback([]);
      }
    );

    return unsubscribe;
  } catch (error: any) {
    console.error("❌ Error setting up subscribeToUserMemories:", error);
    // Call callback with empty array immediately so UI doesn't hang
    callback([]);
    // Return a no-op unsubscribe function
    return () => {};
  }
}

// Get a single memory by ID
export async function getMemoryById(memoryId: string): Promise<Memory | null> {
  const docRef = doc(db, "MemoryPosts", memoryId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Memory;
  }
  return null;
}

// Create a new memory
export async function createMemory(data: Omit<Memory, "id">): Promise<string> {
  const postsRef = collection(db, "MemoryPosts");
  const docRef = await addDoc(postsRef, {
    ...data,
    likes: 0,
    comments: 0,
    saves: 0,
    createdAt: Date.now(),
  });
  return docRef.id;
}

// Update an existing memory
export async function updateMemory(
  memoryId: string,
  updates: Partial<Omit<Memory, "id">>
): Promise<void> {
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, updates as any);
}

// Delete a memory (and its image if exists)
export async function deleteMemory(
  memoryId: string,
  imageURL?: string
): Promise<void> {
  await deleteDoc(doc(db, "MemoryPosts", memoryId));

  if (imageURL) {
    try {
      const storagePath = extractStoragePathFromURL(imageURL);
      if (storagePath) {
        const imageRef = ref(storage, storagePath);
        await deleteObject(imageRef);
        console.log("✅ Image deleted from storage:", storagePath);
      } else {
        console.warn("⚠️ Could not extract storage path from URL:", imageURL);
      }
    } catch (error: any) {
      // Image might already be deleted or not exist - this is okay
      if (error.code !== "storage/object-not-found") {
        console.warn("Failed to delete image:", error);
      }
    }
  }
}

// Upload memory image to Firebase Storage
export async function uploadMemoryImage(imageUri: string): Promise<string> {
  const filename = `memory_${Date.now()}.jpg`;
  const storageRef = ref(storage, `MemoryImages/${filename}`);

  const response = await fetch(imageUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// Increment likes count
export async function incrementLikes(memoryId: string): Promise<void> {
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, {
    likes: increment(1),
  });
}

// Increment comments count
export async function incrementComments(memoryId: string): Promise<void> {
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, {
    comments: increment(1),
  });
}

// Increment saves count
export async function incrementSaves(memoryId: string): Promise<void> {
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, {
    saves: increment(1),
  });
}

// Get total memory count
export async function getMemoryCount(): Promise<number> {
  return new Promise((resolve) => {
    const postsRef = collection(db, "MemoryPosts");
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      resolve(snapshot.size);
      unsubscribe();
    });
  });
}

// User profile operations
export async function getUserProfile(userId: string): Promise<any | null> {
  const docRef = doc(db, "users", userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  return null;
}

// Search users (simplified)
export async function searchUsers(searchText: string): Promise<any[]> {
  // Note: Firebase doesn't support efficient text search
  // This is a simplified implementation
  // For production, consider using Algolia or similar service
  const usersRef = collection(db, "users");
  const q = query(usersRef, limit(50));

  return new Promise((resolve) => {
    onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() } as any;
        const name = (data.displayName || "").toLowerCase();
        if (name.includes(searchText.toLowerCase())) {
          users.push(data);
        }
      });
      resolve(users);
    });
  });
}

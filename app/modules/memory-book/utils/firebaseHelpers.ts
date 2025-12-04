import {
  getFirestore,
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
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Memory } from "./memoryHelpers";

// Real-time subscription to all memories
export function subscribeToMemories(
  callback: (memories: Memory[]) => void
): Unsubscribe {
  const db = getFirestore();
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
  const db = getFirestore();
  const postsRef = collection(db, "MemoryPosts");
  const q = query(postsRef, orderBy("startDate", "desc"), limit(limitCount));

  return onSnapshot(q, (snapshot) => {
    const list: Memory[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Memory);
    });
    callback(list);
  });
}

// Real-time subscription to user-specific memories
export function subscribeToUserMemories(
  userId: string,
  callback: (memories: Memory[]) => void
): Unsubscribe {
  const db = getFirestore();
  const postsRef = collection(db, "MemoryPosts");
  const q = query(
    postsRef,
    where("userId", "==", userId),
    orderBy("startDate", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const list: Memory[] = [];
    snapshot.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Memory);
    });
    callback(list);
  });
}

// Get a single memory by ID
export async function getMemoryById(memoryId: string): Promise<Memory | null> {
  const db = getFirestore();
  const docRef = doc(db, "MemoryPosts", memoryId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Memory;
  }
  return null;
}

// Create a new memory
export async function createMemory(data: Omit<Memory, "id">): Promise<string> {
  const db = getFirestore();
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
  const db = getFirestore();
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, updates as any);
}

// Delete a memory (and its image if exists)
export async function deleteMemory(
  memoryId: string,
  imageURL?: string
): Promise<void> {
  const db = getFirestore();
  await deleteDoc(doc(db, "MemoryPosts", memoryId));

  if (imageURL && imageURL.includes("firebase")) {
    try {
      const storage = getStorage();
      const imageRef = ref(storage, imageURL);
      await deleteObject(imageRef);
    } catch (error) {
      console.warn("Failed to delete image:", error);
    }
  }
}

// Upload memory image to Firebase Storage
export async function uploadMemoryImage(imageUri: string): Promise<string> {
  const storage = getStorage();
  const filename = `memory_${Date.now()}.jpg`;
  const storageRef = ref(storage, `MemoryImages/${filename}`);

  const response = await fetch(imageUri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  return await getDownloadURL(storageRef);
}

// Increment likes count
export async function incrementLikes(memoryId: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, {
    likes: increment(1),
  });
}

// Increment comments count
export async function incrementComments(memoryId: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, {
    comments: increment(1),
  });
}

// Increment saves count
export async function incrementSaves(memoryId: string): Promise<void> {
  const db = getFirestore();
  const docRef = doc(db, "MemoryPosts", memoryId);
  await updateDoc(docRef, {
    saves: increment(1),
  });
}

// Get total memory count
export async function getMemoryCount(): Promise<number> {
  return new Promise((resolve) => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts");
    const unsubscribe = onSnapshot(postsRef, (snapshot) => {
      resolve(snapshot.size);
      unsubscribe();
    });
  });
}

// User profile operations
export async function getUserProfile(userId: string): Promise<any | null> {
  const db = getFirestore();
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
  const db = getFirestore();
  const usersRef = collection(db, "users");
  const q = query(usersRef, limit(50));

  return new Promise((resolve) => {
    onSnapshot(q, (snapshot) => {
      const users: any[] = [];
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        const name = (data.displayName || "").toLowerCase();
        if (name.includes(searchText.toLowerCase())) {
          users.push(data);
        }
      });
      resolve(users);
    });
  });
}

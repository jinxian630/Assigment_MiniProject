// Test Firestore connection utility
import { collection, addDoc, getDocs } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import { Alert } from "react-native";

/**
 * Test function to verify Firestore connection and write permissions
 * Call this from your component to test if Firestore is working
 */
export async function testFirestoreConnection(): Promise<void> {
  try {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert("Test Failed", "User not logged in");
      return;
    }

    console.log("🧪 Testing Firestore connection...");
    console.log("👤 User:", user.uid, user.email);

    // Test 1: Try to read from MemoryPosts
    console.log("📖 Test 1: Reading from MemoryPosts collection...");
    const postsRef = collection(db, "MemoryPosts");
    const snapshot = await getDocs(postsRef);
    console.log(`✅ Read successful! Found ${snapshot.size} documents`);

    // Test 2: Try to write a test document
    console.log("✍️ Test 2: Writing test document...");
    const testData = {
      test: true,
      timestamp: Date.now(),
      userId: user.uid,
      message: "This is a test document - you can delete it",
    };

    const docRef = await addDoc(collection(db, "MemoryPosts"), testData);
    console.log(`✅ Write successful! Document ID: ${docRef.id}`);

    Alert.alert(
      "Test Successful",
      `Firestore is working!\n\n- Read: ✅\n- Write: ✅\n- Test Document ID: ${docRef.id}\n\nYou can delete the test document from Firestore console.`
    );
  } catch (error: any) {
    console.error("❌ Firestore test failed:", error);
    
    let errorMsg = "Unknown error";
    if (error.code === "permission-denied") {
      errorMsg = "Permission denied. Your Firestore security rules are blocking writes.\n\nGo to Firebase Console > Firestore Database > Rules and update them.";
    } else if (error.code === "unavailable") {
      errorMsg = "Firestore unavailable. Check your internet connection.";
    } else {
      errorMsg = error.message || String(error);
    }

    Alert.alert("Test Failed", `Error: ${errorMsg}\n\nCode: ${error.code || "Unknown"}`);
  }
}


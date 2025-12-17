import { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { canUserCommentOnTask } from "../utils/commentUtils";
import { notifyAssignees } from "../utils/notifications";
import type { TaskType, ChatMessageType } from "../utils/types";

export function useChatHandlers(selectedTask: TaskType | null) {
  const db = getFirestore();
  const auth = getAuth();

  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [chatText, setChatText] = useState<string>("");

  // Load chat messages
  useEffect(() => {
    if (!selectedTask?.id) {
      setChatMessages([]);
      return;
    }

    const unsubChat = onSnapshot(
      query(
        collection(db, "Tasks", selectedTask.id, "ChatMessages"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const all: ChatMessageType[] = snapshot.docs.map(
          (docSnap) =>
            ({ id: docSnap.id, ...docSnap.data() } as ChatMessageType)
        );
        setChatMessages(all);
      }
    );

    return () => unsubChat();
  }, [selectedTask?.id, db]);

  const handleSendChat = useCallback(async () => {
    if (!selectedTask) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to chat.");
      return;
    }
    if (!canUserCommentOnTask(selectedTask, user)) {
      Alert.alert(
        "Permission denied",
        "Only creator, assignees, and invited guests can chat."
      );
      return;
    }

    const clean = chatText.trim();
    if (!clean) return;

    try {
      await addDoc(collection(db, "Tasks", selectedTask.id, "ChatMessages"), {
        text: clean,
        createdAt: Date.now(),
        user: {
          id: user.uid,
          name: user.displayName || "User",
          email: user.email || "",
        },
      });

      // Notify assignees
      const assignees = Array.isArray(selectedTask.assignedTo)
        ? selectedTask.assignedTo
        : selectedTask.assignedTo
        ? [selectedTask.assignedTo]
        : [];

      const guests = Array.isArray(selectedTask.guests)
        ? selectedTask.guests
        : [];

      const creatorEmail = selectedTask.CreatedUser?.email;

      if (user.email) {
        await notifyAssignees(
          assignees,
          creatorEmail,
          guests,
          user.email,
          selectedTask.taskName,
          user.displayName || "User",
          "chat",
          clean,
          selectedTask.id
        ).catch((error) => {
          console.error("Notification error (non-critical):", error);
        });
      }

      setChatText("");
    } catch (e) {
      Alert.alert("Error", "Failed to send chat message.");
    }
  }, [selectedTask, chatText, db, auth]);

  return {
    chatMessages,
    chatText,
    setChatText,
    handleSendChat,
  };
}

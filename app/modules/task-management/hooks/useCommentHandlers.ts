import React, { useState, useCallback, useEffect } from "react";
import { Alert } from "react-native";
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  onSnapshot,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { extractMentions } from "../utils/taskUtils";
import { canUserCommentOnTask } from "../utils/commentUtils";
import { notifyAssignees } from "../utils/notifications";
import type { TaskType, CommentType } from "../utils/types";

export function useCommentHandlers(selectedTask: TaskType | null) {
  const db = getFirestore();
  const auth = getAuth();

  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState<string>("");
  const [replyTo, setReplyTo] = useState<CommentType | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");

  // Load comments
  useEffect(() => {
    if (!selectedTask?.id) {
      setComments([]);
      return;
    }

    const unsubComments = onSnapshot(
      query(
        collection(db, "Tasks", selectedTask.id, "Comments"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const all: CommentType[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CommentType)
        );
        setComments(all);
      }
    );

    return () => unsubComments();
  }, [selectedTask?.id, db]);

  const isMyComment = useCallback(
    (c: CommentType) => {
      const user = auth.currentUser;
      return !!user && c?.user?.id === user.uid;
    },
    [auth]
  );

  const handleAddComment = useCallback(async () => {
    if (!selectedTask) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to comment.");
      return;
    }

    if (!canUserCommentOnTask(selectedTask, user)) {
      Alert.alert(
        "Permission denied",
        "Only creator, assignees, and invited guests can comment."
      );
      return;
    }

    if (!commentText.trim()) return;

    if (editingCommentId) {
      Alert.alert(
        "Editing",
        "Finish editing first before adding a new comment."
      );
      return;
    }

    try {
      const now = Date.now();
      const cleanText = commentText.trim();
      const mentions = extractMentions(cleanText);

      await addDoc(collection(db, "Tasks", selectedTask.id, "Comments"), {
        text: cleanText,
        createdAt: now,
        updatedAt: now,
        user: {
          id: user.uid,
          name: user.displayName || "User",
          email: user.email || "",
        },
        parentId: replyTo?.id ?? null,
        mentions,
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
          "comment",
          cleanText,
          selectedTask.id
        ).catch((error) => {
          console.error("Notification error (non-critical):", error);
        });
      }

      setCommentText("");
      setReplyTo(null);
    } catch (e) {
      Alert.alert("Error", "Failed to add comment.");
    }
  }, [selectedTask, commentText, editingCommentId, replyTo, db, auth]);

  const handleDeleteComment = useCallback(
    async (comment: CommentType) => {
      if (!selectedTask) return;

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to manage comments.");
        return;
      }

      if (!isMyComment(comment)) {
        Alert.alert(
          "Permission denied",
          "You can only delete your own comment."
        );
        return;
      }
      if (!canUserCommentOnTask(selectedTask, user)) {
        Alert.alert(
          "Permission denied",
          "You cannot manage comments for this task."
        );
        return;
      }

      try {
        await deleteDoc(
          doc(db, "Tasks", selectedTask.id, "Comments", comment.id)
        );
      } catch (e) {
        Alert.alert("Error", "Failed to delete comment.");
      }
    },
    [selectedTask, db, auth, isMyComment]
  );

  const startEditComment = useCallback(
    (comment: CommentType) => {
      const user = auth.currentUser;
      if (!user) return;

      if (!isMyComment(comment)) {
        Alert.alert("Permission denied", "You can only edit your own comment.");
        return;
      }

      setEditingCommentId(comment.id);
      setEditingCommentText(comment.text);
    },
    [auth, isMyComment]
  );

  const cancelEditComment = useCallback(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
  }, []);

  const saveEditComment = useCallback(async () => {
    if (!selectedTask || !editingCommentId) return;

    const user = auth.currentUser;
    if (!user) return;

    if (!canUserCommentOnTask(selectedTask, user)) {
      Alert.alert(
        "Permission denied",
        "Only creator, assignees, and invited guests can comment."
      );
      return;
    }

    const newText = editingCommentText.trim();
    if (!newText) {
      Alert.alert("Invalid", "Comment cannot be empty.");
      return;
    }

    try {
      const mentions = extractMentions(newText);

      await updateDoc(
        doc(db, "Tasks", selectedTask.id, "Comments", editingCommentId),
        {
          text: newText,
          updatedAt: Date.now(),
          mentions,
        }
      );

      cancelEditComment();
    } catch (e) {
      Alert.alert("Error", "Failed to update comment.");
    }
  }, [
    selectedTask,
    editingCommentId,
    editingCommentText,
    db,
    auth,
    cancelEditComment,
  ]);

  return {
    comments,
    commentText,
    setCommentText,
    replyTo,
    setReplyTo,
    editingCommentId,
    editingCommentText,
    setEditingCommentText,
    handleAddComment,
    handleDeleteComment,
    startEditComment,
    cancelEditComment,
    saveEditComment,
    isMyComment,
  };
}

import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { getFirestore, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { awardTaskCompletionOnce } from "../utils/gamification";
import { computePriorityScore } from "../utils/taskUtils";
import type { TaskType } from "../utils/types";

export function useTaskOperations() {
  const db = getFirestore();
  const auth = getAuth();

  const handleCompleteTaskToggle = useCallback(
    async (task: TaskType) => {
      if (!task) return;

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to update tasks.");
        return;
      }

      try {
        const newCompleted = !task.completed;

        await updateDoc(doc(db, "Tasks", task.id), {
          completed: newCompleted,
          updatedAt: Date.now(),
        });

        if (newCompleted) {
          await awardTaskCompletionOnce(user.uid, task.id);
        }
      } catch (error) {
        console.error("Failed to update task:", error);
        Alert.alert("Error", "Failed to update task");
      }
    },
    [db, auth]
  );

  const handleDeleteTask = useCallback(
    async (
      taskId: string,
      onSuccess?: () => void,
      onTaskRemoved?: (taskId: string) => void
    ) => {
      if (!taskId) return;

      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to delete tasks.");
        return;
      }

      try {
        await deleteDoc(doc(db, "Tasks", taskId));
        onTaskRemoved?.(taskId);
        onSuccess?.();
      } catch (error) {
        console.error("Failed to delete task:", error);
        Alert.alert("Error", "Failed to delete task");
      }
    },
    [db, auth]
  );

  const handleSaveMainTask = useCallback(
    async (
      task: TaskType,
      taskName: string,
      taskDetails: string,
      taskStartDate: Date | null,
      taskDueDate: Date | null,
      assignedList: string[]
    ) => {
      if (!task) return;

      const trimmedName = taskName.trim();
      if (!trimmedName) {
        Alert.alert("Error", "Task name cannot be empty");
        return;
      }

      try {
        const startTimestamp = taskStartDate ? taskStartDate.getTime() : null;
        const dueTimestamp = taskDueDate ? taskDueDate.getTime() : null;
        const assigneeCount = assignedList.length;

        const priorityScore = computePriorityScore({
          dueDate: dueTimestamp ?? undefined,
          startDate: startTimestamp ?? undefined,
          completed: task.completed,
          assigneeCount,
        });

        const ref = doc(db, "Tasks", task.id);

        await updateDoc(ref, {
          taskName: trimmedName,
          details: taskDetails,
          startDate: startTimestamp,
          dueDate: dueTimestamp,
          assignedTo: assignedList,
          priorityScore,
          updatedAt: Date.now(),
        });

        Alert.alert("Saved", "Task updated successfully.");
      } catch (error) {
        console.error("Failed to update task:", error);
        Alert.alert("Error", "Failed to update task");
      }
    },
    [db]
  );

  return {
    handleCompleteTaskToggle,
    handleDeleteTask,
    handleSaveMainTask,
  };
}



import { useEffect, useState, useMemo } from "react";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { TaskType, ViewMode, BucketKey } from "../utils/types";
import {
  canUserSeeTask,
  computePriorityScore,
  isOverdue,
  isTaskAssignedToUser,
} from "../utils/taskUtils";

export const useTasks = (viewMode: ViewMode = "all") => {
  const db = getFirestore();
  const auth = getAuth();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const myEmail = auth.currentUser?.email?.toLowerCase() ?? null;

  useEffect(() => {
    const q = query(collection(db, "Tasks"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: TaskType[] = snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
          } as TaskType)
      );

      const user = auth.currentUser;
      const visible = user ? list.filter((t) => canUserSeeTask(t, user)) : [];
      setTasks(visible);
    });

    return () => unsub();
  }, [db, auth]);

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .filter((t) => {
        if (viewMode !== "assignedToMe" || !myEmail) return true;
        return isTaskAssignedToUser(t, myEmail);
      })
      .map((t) => {
        const assigneeCount = Array.isArray(t.assignedTo)
          ? t.assignedTo.length
          : t.assignedTo
          ? 1
          : 0;

        const score = computePriorityScore({
          dueDate: t.dueDate ?? null,
          startDate: t.startDate ?? null,
          completed: t.completed,
          assigneeCount,
        });

        return { ...t, priorityScore: score };
      })
      .sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));
  }, [tasks, viewMode, myEmail]);

  const buckets = useMemo(() => {
    const grouped: Record<BucketKey, TaskType[]> = {
      doNow: [],
      doSoon: [],
      plan: [],
      low: [],
    };

    activeTasks.forEach((t) => {
      const score = t.priorityScore ?? 0;
      if (score >= 90) grouped.doNow.push(t);
      else if (score >= 60) grouped.doSoon.push(t);
      else if (score >= 30) grouped.plan.push(t);
      else grouped.low.push(t);
    });

    return grouped;
  }, [activeTasks]);

  const stats = useMemo(() => {
    const totalActive = activeTasks.length;
    const totalTasksAll = tasks.length;
    const completedTasksAll = tasks.filter((t) => t.completed).length;
    const overdueTasksAll = tasks.filter(
      (t) => !t.completed && isOverdue(t.dueDate)
    ).length;
    const completionRate =
      totalTasksAll > 0 ? completedTasksAll / totalTasksAll : 0;

    return {
      totalActive,
      totalTasksAll,
      completedTasksAll,
      overdueTasksAll,
      completionRate,
    };
  }, [tasks, activeTasks]);

  return {
    tasks,
    activeTasks,
    buckets,
    stats,
    topFocusTasks: activeTasks.slice(0, 3),
  };
};

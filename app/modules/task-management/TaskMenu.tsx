import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Alert,
  TextInput as RNTextInput,
  ScrollView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { useTheme } from "@/hooks/useTheme";
import {
  awardSubtaskCompletion,
  removeSubtaskCompletion,
} from "./taskGamifications";

const MODULE_COLOR = "#6C4DFF";

// ------------ TYPES ------------

type TaskType = {
  id: string;
  taskName: string;
  details?: string;
  startDate?: number;
  dueDate?: number;
  assignedTo?: string | string[];
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
  CreatedUser: { id: string; name: string; email?: string };
  priorityScore?: number;
};

type CommentType = {
  id: string;
  text: string;
  createdAt: number;
  completed?: boolean;
  user: { id: string; name: string; email?: string };
};

type FilterType = "all" | "active" | "completed" | "overdue";

// ------------ PRIORITY HELPER ------------

const computePriorityScore = (params: {
  dueDate?: number | null;
  startDate?: number | null;
  completed?: boolean;
  assigneeCount?: number;
}) => {
  const { dueDate, startDate, completed, assigneeCount = 0 } = params;

  if (completed) return 0;

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStart = now.getTime();

  let score = 10;

  if (typeof dueDate === "number") {
    const d = new Date(dueDate);
    d.setHours(0, 0, 0, 0);
    const diffDays = Math.floor(
      (d.getTime() - todayStart) / (24 * 60 * 60 * 1000)
    );

    if (diffDays < 0) {
      score = 100 + Math.min(30, Math.abs(diffDays) * 3);
    } else if (diffDays === 0) {
      score = 90;
    } else {
      score = Math.max(20, 80 - diffDays * 4);
    }
  } else {
    score = 15;
  }

  if (startDate && startDate <= todayStart) {
    score += 5;
  }

  score += Math.min(15, assigneeCount * 3);

  if (score < 0) score = 0;
  if (score > 150) score = 150;

  return Math.round(score);
};

// ------------ MAIN COMPONENT ------------

export default function TaskMenuScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const db = getFirestore();
  const auth = getAuth();

  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // main task editing
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingTaskDetails, setEditingTaskDetails] = useState("");
  const [taskStartDate, setTaskStartDate] = useState<Date | null>(null);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);
  const [showTaskStartCalendar, setShowTaskStartCalendar] = useState(false);
  const [showTaskDueCalendar, setShowTaskDueCalendar] = useState(false);

  // main assignees
  const [mainAssignedInput, setMainAssignedInput] = useState("");
  const [mainAssignedList, setMainAssignedList] = useState<string[]>([]);

  // subtasks
  const [subtasks, setSubtasks] = useState<TaskType[]>([]);
  const [subtaskName, setSubtaskName] = useState<string>("");
  const [subtaskDetails, setSubtaskDetails] = useState<string>("");
  const [subtaskStartDate, setSubtaskStartDate] = useState<Date | null>(null);
  const [subtaskDueDate, setSubtaskDueDate] = useState<Date | null>(null);
  const [showSubtaskCalendar, setShowSubtaskCalendar] = useState(false);
  const [showSubtaskStartCalendar, setShowSubtaskStartCalendar] =
    useState(false);

  // comments
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState<string>("");

  // menus
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showListMenu, setShowListMenu] = useState(false);

  // filter mode
  const [filter, setFilter] = useState<FilterType>("all");

  const todayStr = new Date().toISOString().split("T")[0];

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
        },
        list: {
          flex: 1,
        },
        listContent: {
          paddingHorizontal: theme.spacing.screenPadding,
          paddingBottom: theme.spacing.xxl + 80,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        },
        headerTitle: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
        },
        headerSpacer: { width: 48 },
        iconSection: {
          alignItems: "center",
          marginBottom: theme.spacing.xl,
        },
        iconContainer: {
          width: 120,
          height: 120,
          borderRadius: 60,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: theme.spacing.md,
          ...theme.shadows.medium,
        },
        moduleTitle: {
          fontSize: theme.typography.fontSizes.xxl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
        },
        moduleSubtitle: {
          fontSize: theme.typography.fontSizes.md,
          color: theme.colors.textSecondary,
        },
        section: {
          marginBottom: theme.spacing.lg,
        },
        calendarRibbon: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: theme.spacing.md,
        },
        calendarEmoji: {
          fontSize: 24,
          marginRight: theme.spacing.sm,
        },
        calendarText: {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.textPrimary,
        },
        summaryRow: {
          flexDirection: "row",
          columnGap: theme.spacing.sm,
        },
        summaryCard: {
          flex: 1,
          borderRadius: 14,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.sm,
        },
        summaryLabel: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
        },
        summaryValue: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          marginTop: 4,
        },
        actionsRow: {
          flexDirection: "row",
          columnGap: theme.spacing.sm,
          marginTop: theme.spacing.md,
        },
        smallButton: {
          flex: 1,
          borderRadius: 999,
          paddingVertical: theme.spacing.sm,
          alignItems: "center",
          justifyContent: "center",
        },
        smallButtonText: {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        filterRow: {
          flexDirection: "row",
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.xs,
        },
        filterChip: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          borderRadius: 999,
          borderWidth: 1,
          marginRight: theme.spacing.sm,
        },
        filterChipText: {
          fontSize: theme.typography.fontSizes.xs,
        },
        filterMeta: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.sm,
        },
        taskCard: {
          flexDirection: "row",
          alignItems: "center",
          padding: theme.spacing.md,
          borderRadius: 16,
          marginBottom: theme.spacing.sm,
          borderWidth: 1,
        },
        taskTitle: {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        taskDetails: {
          fontSize: theme.typography.fontSizes.sm,
          color: theme.colors.textSecondary,
          marginTop: 2,
        },
        taskDatesRow: {
          flexDirection: "row",
          marginTop: 4,
        },
        taskDateText: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
        },

        // MODAL STYLES (updated to match index.ts look)
        modalBackdrop: {
          flex: 1,
          justifyContent: "center",
          padding: theme.spacing.md,
          backgroundColor: theme.isDark
            ? "rgba(15, 23, 42, 0.55)"
            : "rgba(241, 245, 249, 0.55)",
        },
        modalCard: {
          borderRadius: 20,
          padding: theme.spacing.lg,
          maxHeight: "90%",
          backgroundColor: theme.isDark ? "#0F172A" : "#FFFFFF",
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
          borderWidth: 1,
          borderColor: theme.isDark ? "#1E293B" : "#E2E8F0",
        },
        modalHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          marginBottom: theme.spacing.sm,
        },
        modalHero: {
          padding: theme.spacing.md,
          borderRadius: 16,
          marginBottom: theme.spacing.md,
          alignItems: "center",
          backgroundColor: theme.isDark
            ? "rgba(108,77,255,0.25)"
            : "rgba(108,77,255,0.08)",
        },
        modalHeroTitle: {
          fontSize: theme.typography.fontSizes.lg,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
        },
        modalHeroSubtitle: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
          marginTop: 2,
          textAlign: "center",
        },

        label: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
          marginBottom: 4,
        },
        input: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 12,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical:
            Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.xs,
          color: theme.colors.textPrimary,
          backgroundColor: theme.isDark ? "#020617" : theme.colors.card,
          fontSize: theme.typography.fontSizes.sm,
          marginBottom: theme.spacing.sm,
        },

        chipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
        },
        emailChip: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          borderRadius: 999,
          marginRight: theme.spacing.xs,
          marginBottom: theme.spacing.xs,
          backgroundColor: `${MODULE_COLOR}22`,
        },
        emailChipText: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textPrimary,
          marginRight: 4,
        },
        subtaskRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 4,
        },
        subtaskText: {
          fontSize: theme.typography.fontSizes.sm,
        },
        commentCard: {
          marginTop: 6,
          padding: 8,
          borderRadius: 8,
          backgroundColor: theme.colors.cardMuted || theme.colors.card,
        },
        commentHeaderRow: {
          flexDirection: "row",
          justifyContent: "space-between",
        },
        commentAuthor: {
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        commentText: {
          fontSize: theme.typography.fontSizes.sm,
          marginTop: 2,
        },
        commentRow: {
          flexDirection: "row",
          columnGap: theme.spacing.sm,
          marginTop: theme.spacing.sm,
        },
        commentInput: {
          flex: 1,
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: 999,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical:
            Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.xs,
          color: theme.colors.textPrimary,
          backgroundColor: theme.colors.card,
          fontSize: theme.typography.fontSizes.sm,
        },
        chipButton: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        },
        chipButtonText: {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        floatingAdd: {
          position: "absolute",
          right: theme.spacing.screenPadding,
          bottom: theme.spacing.screenPadding,
        },
      }),
    [theme]
  );

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // ---------- FIRESTORE LOADERS ----------

  useEffect(() => {
    const q = query(collection(db, "Tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks: TaskType[] = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as TaskType)
      );
      setTasks(allTasks);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedTask) return;

    const unsubscribeComments = onSnapshot(
      query(
        collection(db, "Tasks", selectedTask.id, "Comments"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const allComments: CommentType[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CommentType)
        );
        setComments(allComments);
      }
    );

    const unsubscribeSubtasks = onSnapshot(
      query(
        collection(db, "Tasks", selectedTask.id, "Subtasks"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const allSubtasks: TaskType[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as TaskType)
        );
        setSubtasks(allSubtasks);
      }
    );

    return () => {
      unsubscribeComments();
      unsubscribeSubtasks();
    };
  }, [selectedTask]);

  useEffect(() => {
    if (selectedTask) {
      setEditingTaskName(selectedTask.taskName);
      setEditingTaskDetails(selectedTask.details || "");
      setTaskStartDate(
        selectedTask.startDate ? new Date(selectedTask.startDate) : null
      );
      setTaskDueDate(
        selectedTask.dueDate ? new Date(selectedTask.dueDate) : null
      );

      let initialAssignees: string[] = [];
      if (selectedTask.assignedTo) {
        if (Array.isArray(selectedTask.assignedTo)) {
          initialAssignees = selectedTask.assignedTo;
        } else {
          initialAssignees = [selectedTask.assignedTo];
        }
      }
      setMainAssignedList(initialAssignees);
      setMainAssignedInput("");
    } else {
      setEditingTaskName("");
      setEditingTaskDetails("");
      setTaskStartDate(null);
      setTaskDueDate(null);
      setMainAssignedList([]);
      setMainAssignedInput("");
    }
  }, [selectedTask]);

  // ---------- OVERDUE & FILTER ----------

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();

  const isTimestampOverdue = (due?: number) => {
    if (typeof due !== "number") return false;
    const d = new Date(due);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < todayStart;
  };

  const filteredTasks = useMemo(() => {
    let list = tasks;

    list = list.filter((t) => {
      const overdue = isTimestampOverdue(t.dueDate);
      switch (filter) {
        case "active":
          return !t.completed;
        case "completed":
          return !!t.completed;
        case "overdue":
          return overdue && !t.completed;
        default:
          return true;
      }
    });

    return [...list].sort((a, b) => {
      const aCompleted = !!a.completed;
      const bCompleted = !!b.completed;

      if (!aCompleted && !bCompleted) {
        const ad = typeof a.dueDate === "number" ? a.dueDate : Infinity;
        const bd = typeof b.dueDate === "number" ? b.dueDate : Infinity;
        if (ad !== bd) return ad - bd;
      }

      return b.createdAt - a.createdAt;
    });
  }, [tasks, filter]);

  const overdueCount = filteredTasks.filter(
    (t) => !t.completed && isTimestampOverdue(t.dueDate)
  ).length;
  const activeCount = filteredTasks.filter((t) => !t.completed).length;
  const completedCount = filteredTasks.filter((t) => t.completed).length;

  // ---------- MAIN ASSIGNEE HANDLERS ----------

  const handleAddMainAssignee = () => {
    const trimmed = mainAssignedInput.trim();
    if (!trimmed) return;
    if (!gmailPattern.test(trimmed)) {
      Alert.alert("Error", "Please enter a valid Gmail address");
      return;
    }
    const exists = mainAssignedList.some(
      (email) => email.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      Alert.alert("Info", "This Gmail is already added");
      return;
    }
    setMainAssignedList((prev) => [...prev, trimmed]);
    setMainAssignedInput("");
  };

  const handleRemoveMainAssignee = (index: number) => {
    setMainAssignedList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveMainTask = async () => {
    if (!selectedTask) return;

    const trimmedName = editingTaskName.trim();
    if (!trimmedName) {
      Alert.alert("Error", "Task name cannot be empty");
      return;
    }

    try {
      const startTimestamp = taskStartDate ? taskStartDate.getTime() : null;
      const dueTimestamp = taskDueDate ? taskDueDate.getTime() : null;
      const assigneeCount = mainAssignedList.length;

      const priorityScore = computePriorityScore({
        dueDate: dueTimestamp,
        startDate: startTimestamp,
        completed: selectedTask.completed,
        assigneeCount,
      });

      const ref = doc(db, "Tasks", selectedTask.id);

      await updateDoc(ref, {
        taskName: trimmedName,
        details: editingTaskDetails,
        startDate: startTimestamp,
        dueDate: dueTimestamp,
        assignedTo: mainAssignedList,
        priorityScore,
        updatedAt: new Date().getTime(),
      });

      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              taskName: trimmedName,
              details: editingTaskDetails,
              startDate: startTimestamp ?? undefined,
              dueDate: dueTimestamp ?? undefined,
              assignedTo: mainAssignedList,
              priorityScore,
            }
          : prev
      );

      Alert.alert("Saved", "Task updated successfully.");
    } catch (error) {
      console.error("Failed to update task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const onSelectTaskStartDate = (day: any) => {
    const date = new Date(day.dateString);
    setTaskStartDate(date);
    setShowTaskStartCalendar(false);
  };

  const onSelectTaskDueDate = (day: any) => {
    const date = new Date(day.dateString);
    setTaskDueDate(date);
    setShowTaskDueCalendar(false);
  };

  const handleCompleteTaskToggle = async (task: TaskType) => {
    if (!task) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to update tasks.");
      return;
    }

    try {
      const ref = doc(db, "Tasks", task.id);
      await updateDoc(ref, {
        completed: !task.completed,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!taskId) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to delete tasks.");
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // inner function kept as in your original
    const handleCompleteTaskToggleInner = async (task: TaskType) => {
      if (!task) return;
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to update tasks.");
        return;
      }
      try {
        const ref = doc(db, "Tasks", task.id);
        await updateDoc(ref, {
          completed: !task.completed,
          updatedAt: Date.now(),
        });
      } catch (error) {
        console.error("Failed to update task:", error);
        Alert.alert("Error", "Failed to update task");
      }
    };

    try {
      await deleteDoc(doc(db, "Tasks", taskId));
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setSelectedTask(null);
        setModalVisible(false);
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      Alert.alert("Error", "Failed to delete task");
    }
  };

  // ---------- SUBTASKS ----------

  const handleCompleteSubtask = async (subtask: TaskType) => {
    if (!selectedTask) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to update subtasks.");
      return;
    }

    if (!subtask.CreatedUser || subtask.CreatedUser.id !== user.uid) {
      Alert.alert(
        "Permission denied",
        "You can only update subtasks that you created."
      );
      return;
    }

    const newCompleted = !subtask.completed;

    try {
      const ref = doc(db, "Tasks", selectedTask.id, "Subtasks", subtask.id);
      await updateDoc(ref, {
        completed: newCompleted,
        updatedAt: new Date().getTime(),
      });

      if (newCompleted) {
        await awardSubtaskCompletion(user.uid);
      } else {
        await removeSubtaskCompletion(user.uid);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update subtask");
    }
  };

  const handleAddSubtask = async () => {
    if (!selectedTask) return;
    if (!subtaskName.trim()) {
      Alert.alert("Error", "Subtask name is required");
      return;
    }
    if (!subtaskDueDate) {
      Alert.alert("Error", "Please select a due date");
      return;
    }

    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "Tasks", selectedTask.id, "Subtasks"), {
      taskName: subtaskName.trim(),
      details: subtaskDetails,
      startDate: subtaskStartDate ? subtaskStartDate.getTime() : null,
      dueDate: subtaskDueDate.getTime(),
      completed: false,
      createdAt: new Date().getTime(),
      updatedAt: new Date().getTime(),
      CreatedUser: {
        id: user.uid,
        name: user.displayName || "User",
        email: user.email || "",
      },
    });

    setSubtaskName("");
    setSubtaskDetails("");
    setSubtaskStartDate(null);
    setSubtaskDueDate(null);
  };

  const onSelectSubtaskDate = (day: any) => {
    const date = new Date(day.dateString);
    setSubtaskDueDate(date);
    setShowSubtaskCalendar(false);
  };

  const onSelectSubtaskStartDate = (day: any) => {
    const date = new Date(day.dateString);
    setSubtaskStartDate(date);
    setShowSubtaskStartCalendar(false);
  };

  const handleDeleteSubtask = async (subtask: TaskType) => {
    if (!selectedTask) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to delete subtasks.");
      return;
    }

    if (!subtask.CreatedUser || subtask.CreatedUser.id !== user.uid) {
      Alert.alert(
        "Permission denied",
        "You can only delete subtasks that you created."
      );
      return;
    }

    try {
      await deleteDoc(
        doc(db, "Tasks", selectedTask.id, "Subtasks", subtask.id)
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete subtask");
    }
  };

  // ---------- COMMENTS ----------

  const handleDeleteComment = async (commentId: string) => {
    if (!selectedTask) return;
    await deleteDoc(doc(db, "Tasks", selectedTask.id, "Comments", commentId));
  };

  const handleAddComment = async () => {
    if (!selectedTask || !commentText.trim()) return;
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "Tasks", selectedTask.id, "Comments"), {
      text: commentText.trim(),
      createdAt: new Date().getTime(),
      user: {
        id: user.uid,
        name: user.displayName || "User",
        email: user.email || "",
      },
    });

    setCommentText("");
  };

  // ---------- PRINT ----------

  const handlePrintTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to export your tasks.");
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();

      const isOverdue = (due?: number) => {
        if (typeof due !== "number") return false;
        const d = new Date(due);
        d.setHours(0, 0, 0, 0);
        return d.getTime() < todayMs;
      };

      const totalTasks = tasks.length;
      const completedTasks = tasks.filter((t) => t.completed).length;
      const overdueTasks = tasks.filter(
        (t) => !t.completed && isOverdue(t.dueDate as any)
      ).length;
      const activeTasks = totalTasks - completedTasks;

      const taskRowsHtml =
        tasks.length === 0
          ? `<tr><td colspan="6" class="empty-cell">No tasks found.</td></tr>`
          : tasks
              .map((t, index) => {
                const start =
                  t.startDate && new Date(t.startDate)
                    ? formatDate(new Date(t.startDate))
                    : "-";
                const due =
                  t.dueDate && new Date(t.dueDate)
                    ? formatDate(new Date(t.dueDate))
                    : "-";

                const statusBadge = t.completed
                  ? `<span class="status status-done">Completed</span>`
                  : `<span class="status status-pending">Pending</span>`;

                const safeName = (t.taskName || "")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");
                const safeDetails = (t.details || "")
                  .replace(/</g, "&lt;")
                  .replace(/>/g, "&gt;");

                const priority =
                  typeof t.priorityScore === "number" ? t.priorityScore : "–";

                return `
                <tr>
                  <td>${index + 1}</td>
                  <td>
                    <div class="task-title">${safeName}</div>
                    ${
                      safeDetails
                        ? `<div class="task-details">${safeDetails}</div>`
                        : ""
                    }
                  </td>
                  <td class="date-cell">${start}</td>
                  <td class="date-cell">${due}</td>
                  <td class="priority-cell">${priority}</td>
                  <td class="status-cell">${statusBadge}</td>
                </tr>
              `;
              })
              .join("");

      const generatedAt = new Date().toLocaleString();

      const html = `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 0;
              background: #f3f4f6;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI",
                Roboto, Helvetica, Arial, sans-serif;
              color: #111827;
            }
            .page {
              max-width: 800px;
              margin: 0 auto;
              padding: 16px;
            }
            .header-card {
              background: linear-gradient(135deg, #2563eb, #1d4ed8);
              border-radius: 16px;
              padding: 16px 18px;
              color: #ffffff;
              margin-bottom: 16px;
              box-shadow: 0 10px 25px rgba(15, 23, 42, 0.25);
            }
            .app-name {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              opacity: 0.9;
            }
            .title-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              margin-top: 4px;
              gap: 8px;
            }
            .main-title {
              font-size: 22px;
              font-weight: 700;
            }
            .user-email {
              font-size: 11px;
              opacity: 0.85;
              text-align: right;
            }
            .generated-text {
              margin-top: 6px;
              font-size: 11px;
              opacity: 0.8;
            }
            .section-card {
              background: #ffffff;
              border-radius: 14px;
              padding: 14px;
              box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
              margin-bottom: 16px;
              border: 1px solid #e5e7eb;
            }
            .section-title {
              font-size: 14px;
              font-weight: 600;
              margin: 0 0 8px 0;
            }
            .section-subtitle {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 10px;
            }
            .summary-row {
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-bottom: 10px;
            }
            .summary-card {
              flex: 1;
              min-width: 120px;
              border-radius: 10px;
              padding: 8px 10px;
              background: #eff6ff;
              border: 1px solid #dbeafe;
            }
            .summary-title {
              font-size: 11px;
              color: #6b7280;
              margin-bottom: 2px;
            }
            .summary-value {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
            }
            .summary-chip {
              font-size: 10px;
              color: #1d4ed8;
              margin-top: 2px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            thead { background-color: #f3f4f6; }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 6px 7px;
              text-align: left;
              vertical-align: top;
            }
            th {
              font-size: 11px;
              font-weight: 600;
              color: #374151;
            }
            tbody tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .empty-cell {
              text-align: center;
              color: #6b7280;
              padding: 10px 0;
            }
            .task-title {
              font-weight: 600;
              margin-bottom: 2px;
              color: #111827;
            }
            .task-details {
              font-size: 10px;
              color: #6b7280;
            }
            .date-cell {
              white-space: nowrap;
              font-size: 11px;
            }
            .priority-cell {
              text-align: center;
              font-weight: 600;
              font-size: 11px;
            }
            .status-cell { text-align: center; }
            .status {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 600;
            }
            .status-done {
              background-color: #dcfce7;
              color: #166534;
            }
            .status-pending {
              background-color: #fee2e2;
              color: #b91c1c;
            }
            .footer-text {
              margin-top: 4px;
              font-size: 9px;
              color: #9ca3af;
              text-align: right;
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="header-card">
              <div class="app-name">FinTrack Pro – Task Module</div>
              <div class="title-row">
                <div class="main-title">My Tasks Overview</div>
                <div class="user-email">${user.email || ""}</div>
              </div>
              <div class="generated-text">Generated on ${generatedAt}</div>
            </div>
            <div class="section-card">
              <div class="section-title">Summary</div>
              <div class="section-subtitle">
                Quick overview of your tasks.
              </div>
              <div class="summary-row">
                <div class="summary-card">
                  <div class="summary-title">Total Tasks</div>
                  <div class="summary-value">${totalTasks}</div>
                  <div class="summary-chip">${
                    activeTasks > 0
                      ? activeTasks + " active"
                      : "No active tasks"
                  }</div>
                </div>
                <div class="summary-card">
                  <div class="summary-title">Completed</div>
                  <div class="summary-value">${completedTasks}</div>
                  <div class="summary-chip">${
                    completedTasks > 0
                      ? "Nice progress!"
                      : "Complete your first task!"
                  }</div>
                </div>
                <div class="summary-card">
                  <div class="summary-title">Overdue</div>
                  <div class="summary-value">${overdueTasks}</div>
                  <div class="summary-chip">${
                    overdueTasks > 0
                      ? "Try to resolve overdue tasks first."
                      : "No overdue tasks. Great!"
                  }</div>
                </div>
              </div>
            </div>
            <div class="section-card">
              <div class="section-title">Task List</div>
              <div class="section-subtitle">
                Detailed list of your current tasks including dates, priority and status.
              </div>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Task</th>
                    <th>Start</th>
                    <th>Due</th>
                    <th>Priority</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${taskRowsHtml}
                </tbody>
              </table>
              <div class="footer-text">
                Report generated from mobile app.
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message ?? "Failed to generate PDF.");
    }
  };

  // ---------- UI HELPERS ----------

  const renderFilterChip = (mode: FilterType, label: string) => {
    const isActive = filter === mode;
    return (
      <TouchableOpacity
        key={mode}
        onPress={() => setFilter(mode)}
        style={[
          styles.filterChip,
          {
            borderColor: isActive ? MODULE_COLOR : theme.colors.border,
            backgroundColor: isActive ? `${MODULE_COLOR}22` : "transparent",
          },
        ]}
      >
        <Text
          style={[
            styles.filterChipText,
            {
              color: isActive ? MODULE_COLOR : theme.colors.textSecondary,
              fontWeight: isActive
                ? theme.typography.fontWeights.semibold
                : theme.typography.fontWeights.regular,
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const getPriorityChip = (score?: number) => {
    if (score == null) return null;

    let label = "Low";
    let bg = "#e5e7eb";
    let textColor = "#111827";

    if (score >= 100) {
      label = "High";
      bg = "#fee2e2";
      textColor = "#b91c1c";
    } else if (score >= 60) {
      label = "Medium";
      bg = "#dbeafe";
      textColor = "#1d4ed8";
    }

    return (
      <View
        style={{
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          backgroundColor: bg,
          marginLeft: 8,
        }}
      >
        <Text
          style={{
            fontSize: theme.typography.fontSizes.xs,
            fontWeight: theme.typography.fontWeights.semibold,
            color: textColor,
          }}
        >
          {label} · {score}
        </Text>
      </View>
    );
  };

  // ---------- RENDER ----------

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>My Task</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* MAIN LIST with HEADER COMPONENT */}
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {/* Module icon + title */}
              <View style={styles.iconSection}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${MODULE_COLOR}20` },
                  ]}
                >
                  <Ionicons
                    name="checkmark-done-outline"
                    size={64}
                    color={MODULE_COLOR}
                  />
                </View>
                <Text style={styles.moduleTitle}>Task Management</Text>
                <Text style={styles.moduleSubtitle}>
                  Stay organized and productive
                </Text>
              </View>

              {/* Date ribbon */}
              <View style={styles.section}>
                <Card>
                  <View style={styles.calendarRibbon}>
                    <Text style={styles.calendarEmoji}>📅</Text>
                    <Text style={styles.calendarText}>
                      {new Date().toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                </Card>
              </View>

              {/* Summary cards */}
              <View style={[styles.section]}>
                <View style={styles.summaryRow}>
                  <Card
                    style={[styles.summaryCard, { backgroundColor: "#fee2e2" }]}
                  >
                    <Text style={styles.summaryLabel}>Overdue</Text>
                    <Text style={[styles.summaryValue, { color: "#b91c1c" }]}>
                      {overdueCount}
                    </Text>
                  </Card>
                  <Card
                    style={[styles.summaryCard, { backgroundColor: "#dcfce7" }]}
                  >
                    <Text style={styles.summaryLabel}>Active</Text>
                    <Text style={[styles.summaryValue, { color: "#166534" }]}>
                      {activeCount}
                    </Text>
                  </Card>
                  <Card
                    style={[styles.summaryCard, { backgroundColor: "#e5e7eb" }]}
                  >
                    <Text style={styles.summaryLabel}>Completed</Text>
                    <Text style={[styles.summaryValue, { color: "#374151" }]}>
                      {completedCount}
                    </Text>
                  </Card>
                </View>

                {/* AI + Print buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/modules/task-management/TaskDashboard")
                    }
                    style={[
                      styles.smallButton,
                      { backgroundColor: `${MODULE_COLOR}20` },
                    ]}
                  >
                    <Text
                      style={[styles.smallButtonText, { color: MODULE_COLOR }]}
                    >
                      AI Task Dashboard
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handlePrintTasks}
                    style={[
                      styles.smallButton,
                      { backgroundColor: "#16a34a20" },
                    ]}
                  >
                    <Text
                      style={[styles.smallButtonText, { color: "#166534" }]}
                    >
                      Print Tasks (PDF)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filter chips */}
              <View style={styles.filterRow}>
                {renderFilterChip("all", "All")}
                {renderFilterChip("active", "Active")}
                {renderFilterChip("completed", "Completed")}
                {renderFilterChip("overdue", "Overdue")}
              </View>
              <Text style={styles.filterMeta}>
                {filteredTasks.length} task(s) · filter: {filter}
              </Text>
            </>
          }
          renderItem={({ item }) => {
            const isCompleted = !!item.completed;
            const isOverdue = isTimestampOverdue(item.dueDate);

            const bg = isOverdue
              ? "#fee2e2"
              : isCompleted
              ? "#e5e7eb"
              : "#e0f2fe";
            const border = isOverdue
              ? "#f97373"
              : isCompleted
              ? "#cbd5e1"
              : "#38bdf8";

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedTask(item);
                  setModalVisible(true);
                }}
              >
                <View
                  style={[
                    styles.taskCard,
                    {
                      backgroundColor: bg,
                      borderColor: border,
                      opacity: isCompleted ? 0.6 : 1,
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleCompleteTaskToggle(item)}
                    style={{ marginRight: 10 }}
                  >
                    <Ionicons
                      name={
                        isCompleted
                          ? "checkmark-circle"
                          : "checkmark-circle-outline"
                      }
                      size={24}
                      color={isCompleted ? "#9ca3af" : "#16a34a"}
                    />
                  </TouchableOpacity>

                  <View style={{ flex: 1 }}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={[
                          styles.taskTitle,
                          {
                            textDecorationLine: isCompleted
                              ? "line-through"
                              : "none",
                            color: isCompleted
                              ? "#6b7280"
                              : theme.colors.textPrimary,
                          },
                        ]}
                      >
                        {item.taskName}
                      </Text>
                      {isOverdue && (
                        <Badge variant="danger" style={{ marginLeft: 6 }}>
                          OVERDUE
                        </Badge>
                      )}
                      {getPriorityChip(item.priorityScore)}
                    </View>

                    {!!item.details && (
                      <Text
                        style={[
                          styles.taskDetails,
                          {
                            textDecorationLine: isCompleted
                              ? "line-through"
                              : "none",
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {item.details}
                      </Text>
                    )}

                    <View style={styles.taskDatesRow}>
                      {item.startDate && (
                        <Text style={styles.taskDateText}>
                          Start: {formatDate(new Date(item.startDate))}
                          {"  "}
                        </Text>
                      )}
                      {item.dueDate && (
                        <Text style={styles.taskDateText}>
                          Due: {formatDate(new Date(item.dueDate))}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#f97373" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: 8 }}>📝</Text>
              <Text style={{ color: theme.colors.textSecondary }}>
                No tasks yet. Tap + to add one.
              </Text>
            </View>
          }
        />

        {/* FLOATING + BUTTON */}
        <View style={styles.floatingAdd}>
          <IconButton
            icon="add"
            onPress={() => setShowAddMenu(true)}
            variant="primary"
            size="large"
          />
        </View>

        {/* TASK DETAIL MODAL */}
        {selectedTask && (
          <Modal
            visible={modalVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.modalBackdrop}
            >
              <View style={styles.modalCard}>
                {/* top-right close */}
                <View style={styles.modalHeaderRow}>
                  <TouchableOpacity
                    onPress={() => setModalVisible(false)}
                    style={{ padding: 4 }}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                {/* hero header inside modal (gradient-feel block) */}
                <View style={styles.modalHero}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={40}
                    color={MODULE_COLOR}
                    style={{ marginBottom: 6 }}
                  />
                  <Text style={styles.modalHeroTitle}>Task Details</Text>
                  <Text style={styles.modalHeroSubtitle}>
                    Edit task info, assignees, subtasks and comments.
                  </Text>
                </View>

                <ScrollView
                  style={{ marginTop: 4 }}
                  contentContainerStyle={{ paddingBottom: 16 }}
                >
                  {/* Title & details */}
                  <Text style={styles.label}>Title</Text>
                  <RNTextInput
                    value={editingTaskName}
                    onChangeText={setEditingTaskName}
                    placeholder="Task name"
                    placeholderTextColor={theme.colors.textMuted}
                    style={styles.input}
                  />

                  <Text style={styles.label}>Details</Text>
                  <RNTextInput
                    value={editingTaskDetails}
                    onChangeText={setEditingTaskDetails}
                    placeholder="Task details"
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    style={[
                      styles.input,
                      { minHeight: 70, textAlignVertical: "top" },
                    ]}
                  />

                  {/* Dates */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      marginVertical: theme.spacing.sm,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: theme.spacing.sm }}>
                      <Text style={styles.label}>Start Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowTaskStartCalendar(true)}
                        style={[
                          styles.chipButton,
                          {
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.chipButtonText}>
                          {taskStartDate
                            ? formatDate(taskStartDate)
                            : "Set date"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flex: 1, marginLeft: theme.spacing.sm }}>
                      <Text style={styles.label}>Due Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowTaskDueCalendar(true)}
                        style={[
                          styles.chipButton,
                          {
                            backgroundColor: theme.colors.card,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                          },
                        ]}
                      >
                        <Text style={styles.chipButtonText}>
                          {taskDueDate ? formatDate(taskDueDate) : "Set date"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Assignees */}
                  <Text style={styles.label}>Assign to (Gmail)</Text>
                  <View
                    style={{
                      flexDirection: "row",
                      columnGap: theme.spacing.sm,
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    <RNTextInput
                      placeholder="friend@gmail.com"
                      placeholderTextColor={theme.colors.textMuted}
                      value={mainAssignedInput}
                      onChangeText={setMainAssignedInput}
                      style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    />
                    <TouchableOpacity
                      onPress={handleAddMainAssignee}
                      style={[
                        styles.chipButton,
                        { backgroundColor: MODULE_COLOR },
                      ]}
                    >
                      <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.chipRow}>
                    {mainAssignedList.map((email, idx) => (
                      <View key={email + idx} style={styles.emailChip}>
                        <Text style={styles.emailChipText}>{email}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveMainAssignee(idx)}
                        >
                          <Ionicons
                            name="close"
                            size={14}
                            color={theme.colors.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  {/* Subtasks */}
                  <View style={{ marginTop: theme.spacing.md }}>
                    <Text style={styles.modalHeroTitle}>Subtasks</Text>
                    {subtasks.length === 0 && (
                      <Text
                        style={{
                          fontSize: theme.typography.fontSizes.xs,
                          color: theme.colors.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        No subtasks yet.
                      </Text>
                    )}
                    {subtasks.map((st) => (
                      <View key={st.id} style={styles.subtaskRow}>
                        <TouchableOpacity
                          onPress={() => handleCompleteSubtask(st)}
                          style={{ marginRight: 8 }}
                        >
                          <Ionicons
                            name={st.completed ? "checkbox" : "square-outline"}
                            size={18}
                            color={st.completed ? "#16a34a" : "#6b7280"}
                          />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[
                              styles.subtaskText,
                              {
                                textDecorationLine: st.completed
                                  ? "line-through"
                                  : "none",
                              },
                            ]}
                          >
                            {st.taskName}
                          </Text>
                          {st.dueDate && (
                            <Text
                              style={{
                                fontSize: theme.typography.fontSizes.xs,
                                color: theme.colors.textSecondary,
                              }}
                            >
                              Due: {formatDate(new Date(st.dueDate))}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteSubtask(st)}
                          style={{ paddingHorizontal: 4 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#f97373"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}

                    {/* Add subtask */}
                    <Card style={{ marginTop: theme.spacing.sm }}>
                      <Text style={styles.label}>New Subtask</Text>
                      <RNTextInput
                        placeholder="Subtask name"
                        placeholderTextColor={theme.colors.textMuted}
                        value={subtaskName}
                        onChangeText={setSubtaskName}
                        style={styles.input}
                      />
                      <RNTextInput
                        placeholder="Subtask details (optional)"
                        placeholderTextColor={theme.colors.textMuted}
                        value={subtaskDetails}
                        onChangeText={setSubtaskDetails}
                        style={styles.input}
                      />
                      <View
                        style={{
                          flexDirection: "row",
                          columnGap: theme.spacing.sm,
                          marginBottom: theme.spacing.sm,
                        }}
                      >
                        <TouchableOpacity
                          onPress={() => setShowSubtaskStartCalendar(true)}
                          style={[
                            styles.chipButton,
                            {
                              flex: 1,
                              backgroundColor: theme.colors.card,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                            },
                          ]}
                        >
                          <Text style={styles.chipButtonText}>
                            {subtaskStartDate
                              ? formatDate(subtaskStartDate)
                              : "Start date"}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => setShowSubtaskCalendar(true)}
                          style={[
                            styles.chipButton,
                            {
                              flex: 1,
                              backgroundColor: theme.colors.card,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                            },
                          ]}
                        >
                          <Text style={styles.chipButtonText}>
                            {subtaskDueDate
                              ? formatDate(subtaskDueDate)
                              : "Due date"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <TouchableOpacity
                        onPress={handleAddSubtask}
                        style={[
                          styles.chipButton,
                          { backgroundColor: MODULE_COLOR },
                        ]}
                      >
                        <Text
                          style={[styles.chipButtonText, { color: "#fff" }]}
                        >
                          Add Subtask
                        </Text>
                      </TouchableOpacity>
                    </Card>
                  </View>

                  {/* Comments */}
                  <View style={{ marginTop: theme.spacing.md }}>
                    <Text style={styles.modalHeroTitle}>Comments</Text>
                    {comments.length === 0 && (
                      <Text
                        style={{
                          fontSize: theme.typography.fontSizes.xs,
                          color: theme.colors.textSecondary,
                          marginTop: 4,
                        }}
                      >
                        No comments yet.
                      </Text>
                    )}
                    {comments.map((c) => (
                      <View key={c.id} style={styles.commentCard}>
                        <View style={styles.commentHeaderRow}>
                          <Text style={styles.commentAuthor}>
                            {c.user?.name || "User"}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleDeleteComment(c.id)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color={theme.colors.textSecondary}
                            />
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.commentText}>{c.text}</Text>
                      </View>
                    ))}

                    <View style={styles.commentRow}>
                      <RNTextInput
                        placeholder="Add comment..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={commentText}
                        onChangeText={setCommentText}
                        style={styles.commentInput}
                      />
                      <TouchableOpacity
                        onPress={handleAddComment}
                        style={[
                          styles.chipButton,
                          { backgroundColor: MODULE_COLOR },
                        ]}
                      >
                        <Text
                          style={[styles.chipButtonText, { color: "#fff" }]}
                        >
                          Comment
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Save & Delete buttons */}
                  <View style={{ marginTop: theme.spacing.lg }}>
                    <TouchableOpacity
                      onPress={handleSaveMainTask}
                      style={[
                        styles.chipButton,
                        { backgroundColor: MODULE_COLOR },
                      ]}
                    >
                      <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                        Save Changes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteTask(selectedTask.id)}
                      style={[
                        styles.chipButton,
                        {
                          marginTop: theme.spacing.sm,
                          backgroundColor: "#fee2e2",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.chipButtonText, { color: "#b91c1c" }]}
                      >
                        Delete Task
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        )}

        {/* CALENDAR MODALS (unchanged logic) */}
        {showTaskStartCalendar && (
          <Modal transparent animationType="fade">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPress={() => setShowTaskStartCalendar(false)}
            >
              <View
                style={{
                  width: "90%",
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: theme.spacing.sm,
                }}
              >
                <Calendar
                  current={
                    taskStartDate
                      ? taskStartDate.toISOString().split("T")[0]
                      : todayStr
                  }
                  onDayPress={onSelectTaskStartDate}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showTaskDueCalendar && (
          <Modal transparent animationType="fade">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPress={() => setShowTaskDueCalendar(false)}
            >
              <View
                style={{
                  width: "90%",
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: theme.spacing.sm,
                }}
              >
                <Calendar
                  current={
                    taskDueDate
                      ? taskDueDate.toISOString().split("T")[0]
                      : todayStr
                  }
                  onDayPress={onSelectTaskDueDate}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showSubtaskStartCalendar && (
          <Modal transparent animationType="fade">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPress={() => setShowSubtaskStartCalendar(false)}
            >
              <View
                style={{
                  width: "90%",
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: theme.spacing.sm,
                }}
              >
                <Calendar
                  current={
                    subtaskStartDate
                      ? subtaskStartDate.toISOString().split("T")[0]
                      : todayStr
                  }
                  onDayPress={onSelectSubtaskStartDate}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {showSubtaskCalendar && (
          <Modal transparent animationType="fade">
            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: "rgba(0,0,0,0.5)",
                justifyContent: "center",
                alignItems: "center",
              }}
              activeOpacity={1}
              onPress={() => setShowSubtaskCalendar(false)}
            >
              <View
                style={{
                  width: "90%",
                  backgroundColor: theme.colors.card,
                  borderRadius: 12,
                  padding: theme.spacing.sm,
                }}
              >
                <Calendar current={todayStr} onDayPress={onSelectSubtaskDate} />
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* ADD MENU */}
        <Modal
          visible={showAddMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddMenu(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={1}
            onPressOut={() => setShowAddMenu(false)}
          >
            <Card
              style={{
                width: "70%",
                borderRadius: 16,
                padding: theme.spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: theme.typography.fontSizes.md,
                  fontWeight: theme.typography.fontWeights.bold,
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.textPrimary,
                }}
              >
                Add...
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/TaskAdd");
                }}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: MODULE_COLOR,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                  Add Task
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/EventAdd");
                }}
                style={[
                  styles.chipButton,
                  { backgroundColor: theme.colors.cardMuted || "#e5e7eb" },
                ]}
              >
                <Text
                  style={[
                    styles.chipButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Add Event
                </Text>
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        </Modal>

        {/* LIST MENU */}
        <Modal
          visible={showListMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowListMenu(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={1}
            onPressOut={() => setShowListMenu(false)}
          >
            <Card
              style={{
                width: "70%",
                borderRadius: 16,
                padding: theme.spacing.md,
              }}
            >
              <Text
                style={{
                  fontSize: theme.typography.fontSizes.md,
                  fontWeight: theme.typography.fontWeights.bold,
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.textPrimary,
                }}
              >
                Go to...
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/EventList");
                }}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: theme.colors.cardMuted || "#e5e7eb",
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  My Event
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/TaskDashboard");
                }}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: `${MODULE_COLOR}20`,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                <Text style={[styles.chipButtonText, { color: MODULE_COLOR }]}>
                  AI Task Dashboard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/Gamification");
                }}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: theme.colors.cardMuted || "#e5e7eb",
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  My Productivity
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/TaskChart");
                }}
                style={[
                  styles.chipButton,
                  { backgroundColor: theme.colors.cardMuted || "#e5e7eb" },
                ]}
              >
                <Text
                  style={[
                    styles.chipButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  My Chart
                </Text>
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

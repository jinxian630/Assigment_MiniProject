import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Alert,
  TextInput as RNTextInput,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import * as Print from "expo-print"; // 👈 NEW
import { shareAsync } from "expo-sharing";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  Button,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
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
  getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { Calendar } from "react-native-calendars";
import {
  awardSubtaskCompletion,
  removeSubtaskCompletion,
} from "./taskGamifications";

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
  // reminderIds?: string[]; // 👈 we’ll skip notifications for now
};

type CommentType = {
  id: string;
  text: string;
  createdAt: number;
  completed?: boolean;
  user: { id: string; name: string; email?: string };
};

// same priority helper used by Dashboard / TaskAdd
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

type FilterType = "all" | "active" | "completed" | "overdue";

export default function TaskMenuScreen() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
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

  // NEW: filter mode for list
  const [filter, setFilter] = useState<FilterType>("all");

  const todayStr = new Date().toISOString().split("T")[0];

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // load tasks
  useEffect(() => {
    const q = query(collection(db, "Tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks: TaskType[] = snapshot.docs.map(
        (docSnap) =>
          ({
            id: docSnap.id,
            ...docSnap.data(),
          } as TaskType)
      );
      setTasks(allTasks);
    });
    return () => unsubscribe();
  }, []);

  // load comments + subtasks when open a task
  useEffect(() => {
    if (!selectedTask) return;

    const unsubscribeComments = onSnapshot(
      query(
        collection(db, "Tasks", selectedTask.id, "Comments"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const allComments: CommentType[] = snapshot.docs.map(
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            } as CommentType)
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
          (docSnap) =>
            ({
              id: docSnap.id,
              ...docSnap.data(),
            } as TaskType)
        );
        setSubtasks(allSubtasks);
      }
    );

    return () => {
      unsubscribeComments();
      unsubscribeSubtasks();
    };
  }, [selectedTask]);

  // sync editing fields when open/close modal
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

  // overdue helper
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime();
  const isTimestampOverdue = (due?: number) => {
    if (typeof due !== "number") return false;
    const d = new Date(due);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < todayStart;
  };

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  // MAIN assignees
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

  // ✅ save main task
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

  // main task date pickers
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

    // 👉 Allow any logged-in user to toggle completed
    // (good enough for your FYP single-user scenario)
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

  // delete main task
  const handleDeleteTask = async (taskId: string) => {
    if (!taskId) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to delete tasks.");
      return;
    }

    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

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

  // ✅ subtask toggle complete
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

      // ⭐ GAMIFICATION for subtasks
      if (newCompleted) {
        await awardSubtaskCompletion(user.uid);
      } else {
        await removeSubtaskCompletion(user.uid);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update subtask");
    }
  };

  // add subtask
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

  // subtask date pickers
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

  // delete subtask
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

  // comments
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
  const handlePrintTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in", "Please log in to export your tasks.");
        return;
      }

      // ----- Summary stats -----
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

      // ----- Table rows -----
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

      // ----- HTML -----
      const html = `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
          <style>
            * {
              box-sizing: border-box;
            }
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

            /* Summary cards */
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
            thead {
              background-color: #f3f4f6;
            }
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
            .status-cell {
              text-align: center;
            }
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

            @media print {
              .page {
                padding: 12px;
              }
              .header-card {
                box-shadow: none;
              }
              .section-card {
                box-shadow: none;
              }
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

  // ---------- FILTERED + SORTED TASKS ----------
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

    // sort: active ones by due date (soonest first), others by createdAt desc
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

  const renderFilterChip = (mode: FilterType, label: string) => {
    const isActive = filter === mode;
    return (
      <TouchableOpacity
        key={mode}
        onPress={() => setFilter(mode)}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isActive ? "#2563EB" : "#4b5563",
          backgroundColor: isActive ? "#2563EB" : "transparent",
          marginRight: 8,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: isActive ? "#ffffff" : "#e5e7eb",
            fontWeight: isActive ? "bold" : "normal",
          }}
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
        <Text style={{ fontSize: 10, fontWeight: "600", color: textColor }}>
          {label} · {score}
        </Text>
      </View>
    );
  };

  // ---------- UI ----------
  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <Layout>
        <TopNav
          middleContent="My Task"
          leftContent={
            <Ionicons
              name="arrow-back"
              size={22}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => {
            router.back();
          }}
          rightContent={
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <TouchableOpacity
                onPress={() => setTheme(isDarkmode ? "light" : "dark")}
                style={{ marginRight: 12 }}
              >
                <Ionicons
                  name={isDarkmode ? "sunny" : "moon"}
                  size={20}
                  color={isDarkmode ? themeColor.white100 : themeColor.dark}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowListMenu(true)}>
                <Ionicons
                  name="list"
                  size={22}
                  color={isDarkmode ? themeColor.white100 : themeColor.dark}
                />
              </TouchableOpacity>
            </View>
          }
        />

        <View style={{ flex: 1, padding: 20 }}>
          {/* Header + AI Dashboard shortcut */}
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <Text fontWeight="bold" style={{ fontSize: 24 }}>
              My Task
            </Text>
            <Text size="sm" style={{ marginTop: 4, opacity: 0.7 }}>
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </Text>
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginBottom: 12,
            }}
          >
            <Button
              text="AI Task Dashboard"
              size="sm"
              status="info"
              onPress={() =>
                router.push("/modules/task-management/TaskDashboard")
              }
              style={{ marginRight: 8 }}
            />

            <Button
              text="Export Tasks (PDF)"
              size="sm"
              onPress={handlePrintTasks}
            />
          </View>

          {/* Filter bar */}
          <View
            style={{
              flexDirection: "row",
              marginBottom: 6,
            }}
          >
            {renderFilterChip("all", "All")}
            {renderFilterChip("active", "Active")}
            {renderFilterChip("completed", "Completed")}
            {renderFilterChip("overdue", "Overdue")}
          </View>
          <Text size="sm" style={{ opacity: 0.6, marginBottom: 8 }}>
            {filteredTasks.length} task(s) · filter: {filter}
          </Text>

          {/* TASK LIST */}
          <FlatList
            data={filteredTasks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 80 }}
            renderItem={({ item }) => {
              const isCompleted = !!item.completed;
              const isOverdue = isTimestampOverdue(item.dueDate);

              const cardBackgroundColor = isOverdue
                ? "#fee2e2"
                : isCompleted
                ? "#e5e7eb"
                : "#e0f2fe";

              const cardBorderColor = isOverdue
                ? "#f97373"
                : isCompleted
                ? "#cbd5e1"
                : "#38bdf8";

              return (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: cardBorderColor,
                    borderRadius: 10,
                    backgroundColor: cardBackgroundColor,
                    padding: 12,
                    opacity: isCompleted ? 0.6 : 1,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => handleCompleteTaskToggle(item)}
                    style={{ marginRight: 10 }}
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={24}
                      color={isCompleted ? "#9ca3af" : "#16a34a"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedTask(item);
                      setModalVisible(true);
                    }}
                  >
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Text
                        fontWeight="bold"
                        style={{
                          textDecorationLine: isCompleted
                            ? "line-through"
                            : "none",
                          color: isCompleted ? "#6b7280" : "#111827",
                          marginRight: 4,
                          fontSize: 16,
                        }}
                      >
                        {item.taskName}
                      </Text>

                      {isOverdue && (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 2,
                            borderRadius: 999,
                            backgroundColor: "#ef4444",
                          }}
                        >
                          <Text
                            style={{
                              color: "#fff",
                              fontSize: 10,
                              fontWeight: "bold",
                            }}
                          >
                            OVERDUE
                          </Text>
                        </View>
                      )}

                      {getPriorityChip(item.priorityScore)}
                    </View>

                    {item.details && (
                      <Text
                        style={{
                          marginTop: 2,
                          textDecorationLine: isCompleted
                            ? "line-through"
                            : "none",
                          color: isCompleted ? "#6b7280" : "#374151",
                          fontSize: 13,
                        }}
                        numberOfLines={2}
                      >
                        {item.details}
                      </Text>
                    )}
                    <View style={{ marginTop: 4, flexDirection: "row" }}>
                      {item.startDate && (
                        <Text style={{ fontSize: 11, color: "#4b5563" }}>
                          Start: {formatDate(new Date(item.startDate))}
                          {"  "}
                        </Text>
                      )}
                      {item.dueDate && (
                        <Text style={{ fontSize: 11, color: "#4b5563" }}>
                          Due: {formatDate(new Date(item.dueDate))}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => handleDeleteTask(item.id)}>
                    <Ionicons name="trash-outline" size={22} color="#f97373" />
                  </TouchableOpacity>
                </View>
              );
            }}
          />

          {/* Task Modal (unchanged layout, just uses new handlers) */}
          {selectedTask && (
            <Modal
              visible={modalVisible}
              transparent
              animationType="slide"
              onRequestClose={() => {
                setModalVisible(false);
                setSelectedTask(null);
              }}
            >
              <KeyboardAvoidingView
                behavior="height"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  alignItems: "center",
                  backgroundColor: "rgba(0,0,0,0.45)",
                }}
              >
                <View
                  style={{
                    width: "92%",
                    maxHeight: "92%",
                    backgroundColor: isDarkmode ? "#111827" : themeColor.white,
                    borderRadius: 16,
                    padding: 16,
                    position: "relative",
                  }}
                >
                  {/* Close button */}
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      setSelectedTask(null);
                    }}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      padding: 6,
                      borderRadius: 999,
                      backgroundColor: isDarkmode
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    }}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color={isDarkmode ? themeColor.white : themeColor.dark}
                    />
                  </TouchableOpacity>

                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 24 }}
                  >
                    {/* Task Info */}
                    <Text
                      fontWeight="bold"
                      style={{ fontSize: 16, marginBottom: 6 }}
                    >
                      Task Info
                    </Text>
                    <RNTextInput
                      value={editingTaskName}
                      onChangeText={setEditingTaskName}
                      placeholder="Task title"
                      style={{
                        fontSize: 18,
                        fontWeight: "700",
                        marginBottom: 8,
                        borderBottomWidth: 1,
                        borderColor: "#d1d5db",
                        paddingVertical: 4,
                        color: isDarkmode ? "#f9fafb" : "#111827",
                      }}
                    />

                    <RNTextInput
                      value={editingTaskDetails}
                      onChangeText={setEditingTaskDetails}
                      placeholder="Add description..."
                      multiline
                      scrollEnabled={false}
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        lineHeight: 18,
                        paddingVertical: 2,
                        paddingHorizontal: 0,
                        textAlignVertical: "top",
                        color: isDarkmode ? "#f9fafb" : "#111827",
                        backgroundColor: "transparent",
                        borderWidth: 0,
                      }}
                      placeholderTextColor={isDarkmode ? "#6b7280" : "#9ca3af"}
                    />

                    {selectedTask.CreatedUser && (
                      <Text
                        style={{
                          marginTop: 6,
                          color: "#6b7280",
                          fontSize: 12,
                        }}
                      >
                        Created By: {selectedTask.CreatedUser.name}
                        {selectedTask.CreatedUser.email
                          ? ` (${selectedTask.CreatedUser.email})`
                          : ""}
                      </Text>
                    )}

                    <View
                      style={{
                        height: 1,
                        backgroundColor: isDarkmode ? "#1f2937" : "#e5e7eb",
                        marginVertical: 10,
                      }}
                    />

                    {/* Schedule */}
                    <Text
                      fontWeight="bold"
                      style={{ fontSize: 16, marginBottom: 6 }}
                    >
                      Schedule
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        marginBottom: 4,
                        color: "#6b7280",
                      }}
                    >
                      Start Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowTaskStartCalendar(true)}
                      style={{
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#d1d5db",
                        borderRadius: 8,
                        marginBottom: 8,
                        backgroundColor: isDarkmode ? "#020617" : "#f9fafb",
                      }}
                    >
                      <Text
                        style={{
                          color: isDarkmode ? "#e5e7eb" : "#111827",
                          fontSize: 13,
                        }}
                      >
                        {taskStartDate
                          ? formatDate(taskStartDate)
                          : "Select start date (optional)"}
                      </Text>
                    </TouchableOpacity>

                    <Text
                      style={{
                        fontSize: 13,
                        marginBottom: 4,
                        color: "#6b7280",
                      }}
                    >
                      Due Date
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowTaskDueCalendar(true)}
                      style={{
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "#d1d5db",
                        borderRadius: 8,
                        marginBottom: 8,
                        backgroundColor: isDarkmode ? "#020617" : "#f9fafb",
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          color: isDarkmode ? "#e5e7eb" : "#111827",
                          fontSize: 13,
                        }}
                      >
                        {taskDueDate
                          ? formatDate(taskDueDate)
                          : "Select due date"}
                      </Text>
                      {taskDueDate &&
                        isTimestampOverdue(taskDueDate.getTime()) && (
                          <View
                            style={{
                              marginLeft: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 2,
                              borderRadius: 999,
                              backgroundColor: "#ef4444",
                            }}
                          >
                            <Text
                              style={{
                                color: "#fff",
                                fontSize: 10,
                                fontWeight: "bold",
                              }}
                            >
                              OVERDUE
                            </Text>
                          </View>
                        )}
                    </TouchableOpacity>

                    {/* Assignees */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: isDarkmode ? "#1f2937" : "#e5e7eb",
                        marginVertical: 10,
                      }}
                    />
                    <Text
                      fontWeight="bold"
                      style={{ fontSize: 16, marginBottom: 6 }}
                    >
                      Assignees
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 6,
                      }}
                    >
                      Add or remove users (Gmail) for this task.
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        marginBottom: 8,
                      }}
                    >
                      {mainAssignedList.map((email, index) => (
                        <View
                          key={`${email}-${index}`}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            paddingHorizontal: 10,
                            paddingVertical: 4,
                            borderRadius: 999,
                            backgroundColor: isDarkmode ? "#0ea5e9" : "#e0f2fe",
                            marginRight: 6,
                            marginBottom: 6,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: isDarkmode ? "#0b1120" : "#0f172a",
                            }}
                          >
                            {email}
                          </Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveMainAssignee(index)}
                            style={{ marginLeft: 6 }}
                          >
                            <Ionicons name="close" size={14} color="#4b5563" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        columnGap: 8,
                        marginTop: 4,
                      }}
                    >
                      <RNTextInput
                        placeholder="Enter user's Gmail..."
                        value={mainAssignedInput}
                        onChangeText={setMainAssignedInput}
                        style={{
                          flex: 1,
                          borderWidth: 1,
                          color: isDarkmode ? "#f9fafb" : "#111827",
                          backgroundColor: isDarkmode ? "#020617" : "#f9fafb",
                          borderColor: "#d1d5db",
                          borderRadius: 8,
                          padding: 8,
                          fontSize: 13,
                        }}
                      />
                      <Button
                        text="Add"
                        onPress={handleAddMainAssignee}
                        style={{ alignSelf: "center" }}
                      />
                    </View>

                    {/* Save main task */}
                    <Button
                      text="Save Changes"
                      onPress={handleSaveMainTask}
                      style={{ marginTop: 12 }}
                    />

                    {/* Subtasks */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: isDarkmode ? "#1f2937" : "#e5e7eb",
                        marginVertical: 12,
                      }}
                    />
                    <Text
                      fontWeight="bold"
                      style={{ fontSize: 16, marginBottom: 6 }}
                    >
                      Subtasks
                    </Text>

                    {subtasks.map((s) => {
                      const isSubtaskCompleted = !!s.completed;
                      return (
                        <View
                          key={s.id}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 6,
                            opacity: isSubtaskCompleted ? 0.7 : 1,
                            backgroundColor: isSubtaskCompleted
                              ? isDarkmode
                                ? "#020617"
                                : "#e5e7eb"
                              : isDarkmode
                              ? "#0f172a"
                              : "#f9fafb",
                            borderRadius: 10,
                            paddingVertical: 8,
                            paddingHorizontal: 10,
                            borderWidth: 1,
                            borderColor: isDarkmode ? "#1f2937" : "#e5e7eb",
                          }}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              flex: 1,
                              marginRight: 8,
                            }}
                          >
                            <TouchableOpacity
                              onPress={() => handleCompleteSubtask(s)}
                              disabled={isSubtaskCompleted}
                              style={{ marginRight: 10 }}
                            >
                              <Ionicons
                                name="checkmark-circle-outline"
                                size={20}
                                color={
                                  isSubtaskCompleted ? "#9ca3af" : "#22c55e"
                                }
                              />
                            </TouchableOpacity>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  textDecorationLine: isSubtaskCompleted
                                    ? "line-through"
                                    : "none",
                                  color: isSubtaskCompleted
                                    ? "#9ca3af"
                                    : isDarkmode
                                    ? "#f9fafb"
                                    : "#111827",
                                  fontSize: 14,
                                }}
                              >
                                {s.taskName}
                              </Text>
                              {s.details && (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: "#6b7280",
                                    textDecorationLine: isSubtaskCompleted
                                      ? "line-through"
                                      : "none",
                                  }}
                                  numberOfLines={2}
                                >
                                  {s.details}
                                </Text>
                              )}
                              <View
                                style={{ marginTop: 2, flexDirection: "row" }}
                              >
                                {s.startDate && (
                                  <Text
                                    style={{ fontSize: 11, color: "#6b7280" }}
                                  >
                                    Start: {formatDate(new Date(s.startDate))}
                                    {"  "}
                                  </Text>
                                )}
                                {s.dueDate && (
                                  <Text
                                    style={{ fontSize: 11, color: "#6b7280" }}
                                  >
                                    Due: {formatDate(new Date(s.dueDate))}
                                  </Text>
                                )}
                              </View>
                              {s.CreatedUser && (
                                <Text
                                  style={{ fontSize: 11, color: "#9ca3af" }}
                                >
                                  By: {s.CreatedUser.name}
                                </Text>
                              )}
                            </View>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDeleteSubtask(s)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={20}
                              color="#f97373"
                            />
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* add subtask form */}
                    <View
                      style={{
                        marginTop: 8,
                        padding: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: isDarkmode ? "#1f2937" : "#e5e7eb",
                        backgroundColor: isDarkmode ? "#020617" : "#f9fafb",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          marginBottom: 6,
                        }}
                      >
                        Add Subtask
                      </Text>
                      <RNTextInput
                        placeholder="Subtask name"
                        value={subtaskName}
                        onChangeText={setSubtaskName}
                        style={{
                          borderWidth: 1,
                          backgroundColor: isDarkmode ? "#020617" : "#ffffff",
                          color: isDarkmode ? "#f9fafb" : "#111827",
                          borderColor: "#d1d5db",
                          borderRadius: 8,
                          padding: 8,
                          marginBottom: 6,
                          fontSize: 13,
                        }}
                      />
                      <RNTextInput
                        placeholder="Subtask description"
                        value={subtaskDetails}
                        onChangeText={setSubtaskDetails}
                        style={{
                          borderWidth: 1,
                          backgroundColor: isDarkmode ? "#020617" : "#ffffff",
                          color: isDarkmode ? "#f9fafb" : "#111827",
                          borderColor: "#d1d5db",
                          borderRadius: 8,
                          padding: 8,
                          marginBottom: 6,
                          fontSize: 13,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          marginBottom: 4,
                          color: "#6b7280",
                        }}
                      >
                        Start Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowSubtaskStartCalendar(true)}
                        style={{
                          padding: 8,
                          borderWidth: 1,
                          borderColor: "#d1d5db",
                          borderRadius: 8,
                          marginBottom: 6,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: isDarkmode ? "#e5e7eb" : "#111827",
                          }}
                        >
                          {subtaskStartDate
                            ? formatDate(subtaskStartDate)
                            : "Select start date (optional)"}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 12,
                          marginBottom: 4,
                          color: "#6b7280",
                        }}
                      >
                        Due Date
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowSubtaskCalendar(true)}
                        style={{
                          padding: 8,
                          borderWidth: 1,
                          borderColor: "#d1d5db",
                          borderRadius: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: isDarkmode ? "#e5e7eb" : "#111827",
                          }}
                        >
                          {subtaskDueDate
                            ? formatDate(subtaskDueDate)
                            : "Select due date"}
                        </Text>
                      </TouchableOpacity>
                      <Button text="Add Subtask" onPress={handleAddSubtask} />
                    </View>

                    {/* Comments */}
                    <View
                      style={{
                        height: 1,
                        backgroundColor: isDarkmode ? "#1f2937" : "#e5e7eb",
                        marginVertical: 12,
                      }}
                    />
                    <Text
                      fontWeight="bold"
                      style={{ fontSize: 16, marginBottom: 6 }}
                    >
                      Comments
                    </Text>
                    {comments.map((c) => (
                      <View
                        key={c.id}
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          paddingVertical: 6,
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <Text
                            style={{
                              color: isDarkmode ? "#f9fafb" : "#111827",
                              fontSize: 13,
                            }}
                          >
                            {c.text}
                          </Text>
                          {c.createdAt && (
                            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                              {new Date(c.createdAt).toLocaleString()}
                            </Text>
                          )}
                          {c.user && (
                            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                              By: {c.user.name}
                            </Text>
                          )}
                        </View>
                        <TouchableOpacity
                          onPress={() => handleDeleteComment(c.id)}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color="#f97373"
                          />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <View
                      style={{
                        flexDirection: "row",
                        columnGap: 8,
                        marginTop: 4,
                      }}
                    >
                      <RNTextInput
                        placeholder="Add comment..."
                        value={commentText}
                        onChangeText={setCommentText}
                        style={{
                          flex: 1,
                          backgroundColor: isDarkmode ? "#020617" : "#ffffff",
                          color: isDarkmode ? "#f9fafb" : "#111827",
                          borderColor: "#d1d5db",
                          borderWidth: 1,
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          height: 40,
                          fontSize: 13,
                        }}
                      />
                      <Button text="Comment" onPress={handleAddComment} />
                    </View>

                    {/* Delete Task */}
                    <Button
                      text="Delete Task"
                      color="red"
                      onPress={() => handleDeleteTask(selectedTask.id)}
                      style={{ marginTop: 12 }}
                    />
                  </ScrollView>

                  {/* Calendars inside modal */}
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
                            backgroundColor: isDarkmode
                              ? "#020617"
                              : themeColor.white,
                            borderRadius: 12,
                            padding: 10,
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
                          <Button
                            text="Close"
                            onPress={() => setShowTaskStartCalendar(false)}
                            style={{ marginTop: 10 }}
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
                            backgroundColor: isDarkmode
                              ? "#020617"
                              : themeColor.white,
                            borderRadius: 12,
                            padding: 10,
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
                          <Button
                            text="Close"
                            onPress={() => setShowTaskDueCalendar(false)}
                            style={{ marginTop: 10 }}
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
                            backgroundColor: isDarkmode
                              ? "#020617"
                              : themeColor.white,
                            borderRadius: 12,
                            padding: 10,
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
                          <Button
                            text="Close"
                            onPress={() => setShowSubtaskStartCalendar(false)}
                            style={{ marginTop: 10 }}
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
                            backgroundColor: isDarkmode
                              ? "#020617"
                              : themeColor.white,
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <Calendar
                            current={todayStr}
                            onDayPress={onSelectSubtaskDate}
                          />
                          <Button
                            text="Close"
                            onPress={() => setShowSubtaskCalendar(false)}
                            style={{ marginTop: 10 }}
                          />
                        </View>
                      </TouchableOpacity>
                    </Modal>
                  )}
                </View>
              </KeyboardAvoidingView>
            </Modal>
          )}
        </View>

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
            <View
              style={{
                width: "70%",
                backgroundColor: isDarkmode
                  ? themeColor.dark
                  : themeColor.white,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text fontWeight="bold" style={{ marginBottom: 10 }}>
                Add...
              </Text>
              <Button
                text="Add Task"
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/TaskAdd");
                }}
                style={{ marginBottom: 8 }}
              />
              <Button
                text="Add Event"
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/EventAdd");
                }}
              />
            </View>
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
            <View
              style={{
                width: "70%",
                backgroundColor: isDarkmode
                  ? themeColor.dark
                  : themeColor.white,
                borderRadius: 12,
                padding: 16,
              }}
            >
              <Text fontWeight="bold" style={{ marginBottom: 10 }}>
                Go to...
              </Text>
              <Button
                text="My Event"
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/EventList");
                }}
                style={{ marginBottom: 8 }}
              />
              <Button
                text="AI Task Dashboard"
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/TaskDashboard");
                }}
                style={{ marginBottom: 8 }}
              />

              <Button
                text="My Productivity"
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/Gamification");
                }}
                style={{ marginBottom: 8 }}
              />
              <Button
                text="My Chart"
                onPress={() => {
                  setShowListMenu(false);
                  router.push("/modules/task-management/TaskChart");
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Floating + button */}
        <TouchableOpacity
          onPress={() => setShowAddMenu(true)}
          style={{
            position: "absolute",
            right: 24,
            bottom: 24,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: "#2563EB",
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 4,
          }}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      </Layout>
    </KeyboardAvoidingView>
  );
}

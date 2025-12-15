// app/modules/task-management/TaskMenuScreen.tsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
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
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import {
  awardTaskCompletionOnce,
  awardSubtaskCompletion,
  removeSubtaskCompletion,
} from "./taskGamifications";
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
import { useTheme } from "@/hooks/useTheme";

const { width: SCREEN_W } = Dimensions.get("window");
import {
  MODULE_COLOR,
  DatePickerModal,
  createNeonCardShell,
} from "../task-management/TS FILE/TaskSharedUI";
import { buildTaskPdfHtml } from "../task-management/TS FILE/taskPdf";

// ------------ TYPES ------------

type TaskType = {
  id: string;
  taskName: string;
  details?: string;
  startDate?: number | null;
  dueDate?: number | null;
  assignedTo?: string | string[];
  completed?: boolean;
  createdAt: number;
  updatedAt: number;
  CreatedUser: { id: string; name: string; email?: string };
  priorityScore?: number;
  guests?: string[];
};

type CommentType = {
  id: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  user: { id: string; name: string; email?: string };
  parentId?: string | null;
  mentions?: string[];
};

type ChatMessageType = {
  id: string;
  text: string;
  createdAt: number;
  user: { id: string; name: string; email?: string };
};

type FilterType = "all" | "active" | "completed" | "overdue";
type CommentNode = CommentType & { replies: CommentNode[] };

type CalendarTarget =
  | "taskStart"
  | "taskDue"
  | "subtaskStart"
  | "subtaskDue"
  | "newStart"
  | "newDue"
  | null;

// ------------ PERMISSION ------------

const canUserSeeTask = (task: TaskType, user: any | null): boolean => {
  if (!user) return false;

  const uid = user.uid;
  const email = (user.email || "").toLowerCase();

  if (task?.CreatedUser?.id === uid) return true;

  const assignedList: string[] = Array.isArray(task.assignedTo)
    ? task.assignedTo
    : task.assignedTo
    ? [task.assignedTo]
    : [];

  if (
    assignedList.some(
      (addr) => typeof addr === "string" && addr.toLowerCase() === email
    )
  ) {
    return true;
  }

  if (Array.isArray(task.guests)) {
    const guestEmails = task.guests
      .filter((g) => typeof g === "string")
      .map((g) => g.toLowerCase());
    if (guestEmails.includes(email)) return true;
  }

  return false;
};

const canUserCommentOnTask = (task: TaskType, user: any | null): boolean => {
  return canUserSeeTask(task, user);
};

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

  if (startDate && startDate <= todayStart) score += 5;
  score += Math.min(15, assigneeCount * 3);

  if (score < 0) score = 0;
  if (score > 150) score = 150;

  return Math.round(score);
};

const summaryCardStyle = (
  theme: any,
  type: "overdue" | "active" | "completed"
) => {
  const colors = {
    overdue: { lightBorder: "#EF4444", darkBorder: "#EF4444" },
    active: { lightBorder: "#22C55E", darkBorder: "#22C55E" },
    completed: { lightBorder: MODULE_COLOR, darkBorder: MODULE_COLOR },
  } as const;

  const c = colors[type];
  const accent = theme.isDark ? c.darkBorder : c.lightBorder;

  return createNeonCardShell(accent, theme, {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    backgroundColor: theme.isDark ? "#020617" : "#F9FAFB",
  });
};

const extractMentions = (text: string): string[] => {
  const matches = text.match(/@([a-zA-Z0-9._%+-]+@gmail\.com)/g) || [];
  const emails = matches.map((m) => m.slice(1).toLowerCase());
  return Array.from(new Set(emails));
};

const escapeHtml = (s: string) =>
  (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ------------ THREAD TREE ------------

const buildThreadTree = (items: CommentType[]): CommentNode[] => {
  const map = new Map<string, CommentNode>();
  items.forEach((c) => map.set(c.id, { ...c, replies: [] }));

  const roots: CommentNode[] = [];

  map.forEach((node) => {
    const pid = node.parentId ? String(node.parentId) : "";
    if (pid && map.has(pid)) map.get(pid)!.replies.push(node);
    else roots.push(node);
  });

  const sortRec = (arr: CommentNode[]) => {
    arr.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    arr.forEach((n) => sortRec(n.replies));
  };
  sortRec(roots);

  return roots;
};

// ------------ MAIN COMPONENT ------------

export default function TaskMenuScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const db = getFirestore();
  const auth = getAuth();

  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // ✅ ADD TASK
  const [addOpen, setAddOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskDetails, setNewTaskDetails] = useState("");
  const [newStartDate, setNewStartDate] = useState<Date | null>(null);
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);

  // main task editing
  const [editingTaskName, setEditingTaskName] = useState("");
  const [editingTaskDetails, setEditingTaskDetails] = useState("");
  const [taskStartDate, setTaskStartDate] = useState<Date | null>(null);
  const [taskDueDate, setTaskDueDate] = useState<Date | null>(null);

  // main assignees
  const [mainAssignedInput, setMainAssignedInput] = useState("");
  const [mainAssignedList, setMainAssignedList] = useState<string[]>([]);

  // subtasks
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [subtaskName, setSubtaskName] = useState<string>("");
  const [subtaskDetails, setSubtaskDetails] = useState<string>("");
  const [subtaskStartDate, setSubtaskStartDate] = useState<Date | null>(null);
  const [subtaskDueDate, setSubtaskDueDate] = useState<Date | null>(null);

  const [calendarTarget, setCalendarTarget] = useState<CalendarTarget>(null);

  // comments
  const [comments, setComments] = useState<CommentType[]>([]);
  const [commentText, setCommentText] = useState<string>("");
  const [replyTo, setReplyTo] = useState<CommentType | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState<string>("");

  // ✅ Expand/collapse
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // filter mode
  const [filter, setFilter] = useState<FilterType>("all");

  // ✅ Task chat drawer
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [chatText, setChatText] = useState("");

  // mention suggestions
  const [showMentionBox, setShowMentionBox] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const formatTime = (ms?: number) => {
    if (!ms) return "";
    const d = new Date(ms);
    return d.toLocaleString();
  };

  // ---------- FIRESTORE LOADERS ----------

  useEffect(() => {
    const q = query(collection(db, "Tasks"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTasks: TaskType[] = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as TaskType)
      );

      allTasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      const user = auth.currentUser;
      const visibleTasks = user
        ? allTasks.filter((task) => canUserSeeTask(task, user))
        : [];

      setTasks(visibleTasks);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedTask?.id) return;

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

    const unsubSubtasks = onSnapshot(
      query(
        collection(db, "Tasks", selectedTask.id, "Subtasks"),
        orderBy("createdAt", "asc")
      ),
      (snapshot) => {
        const all: any[] = snapshot.docs.map(
          (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as any)
        );
        setSubtasks(all);
      }
    );

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

    return () => {
      unsubComments();
      unsubSubtasks();
      unsubChat();
    };
  }, [selectedTask?.id, db]);

  useEffect(() => {
    setEditingCommentId(null);
    setEditingCommentText("");
    setCommentText("");
    setReplyTo(null);
    setExpanded({});
    setShowMentionBox(false);
    setMentionQuery("");
    setChatOpen(false);
    setChatText("");
  }, [selectedTask?.id]);

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
        initialAssignees = Array.isArray(selectedTask.assignedTo)
          ? selectedTask.assignedTo
          : [selectedTask.assignedTo];
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

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);
  const todayStart = today.getTime();

  const isTimestampOverdue = (due?: number | null) => {
    if (typeof due !== "number") return false;
    const d = new Date(due);
    d.setHours(0, 0, 0, 0);
    return d.getTime() < todayStart;
  };

  const filteredTasks = useMemo(() => {
    let list = tasks;

    list = list.filter((t) => {
      const overdue = isTimestampOverdue(t.dueDate ?? undefined);
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
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [tasks, filter]);

  const overdueCount = filteredTasks.filter(
    (t) => !t.completed && isTimestampOverdue(t.dueDate ?? undefined)
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
        dueDate: dueTimestamp ?? undefined,
        startDate: startTimestamp ?? undefined,
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
        updatedAt: Date.now(),
      });

      Alert.alert("Saved", "Task updated successfully.");
    } catch (error) {
      console.error("Failed to update task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  const handleCompleteTaskToggle = async (task: TaskType) => {
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
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!taskId) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to delete tasks.");
      return;
    }

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

  const handleCompleteSubtask = async (subtask: any) => {
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
      await updateDoc(
        doc(db, "Tasks", selectedTask.id, "Subtasks", subtask.id),
        {
          completed: newCompleted,
          updatedAt: Date.now(),
        }
      );

      if (newCompleted) await awardSubtaskCompletion(user.uid);
      else await removeSubtaskCompletion(user.uid);
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
      createdAt: Date.now(),
      updatedAt: Date.now(),
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

  const handleDeleteSubtask = async (subtask: any) => {
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

  const isMyComment = (c: CommentType) => {
    const user = auth.currentUser;
    return !!user && c?.user?.id === user.uid;
  };

  const handleDeleteComment = async (comment: CommentType) => {
    if (!selectedTask) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to manage comments.");
      return;
    }

    if (!isMyComment(comment)) {
      Alert.alert("Permission denied", "You can only delete your own comment.");
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
  };

  const handleAddComment = async () => {
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

      setCommentText("");
      setReplyTo(null);
    } catch (e) {
      Alert.alert("Error", "Failed to add comment.");
    }
  };

  const startEditComment = (comment: CommentType) => {
    const user = auth.currentUser;
    if (!user) return;

    if (!isMyComment(comment)) {
      Alert.alert("Permission denied", "You can only edit your own comment.");
      return;
    }

    setEditingCommentId(comment.id);
    setEditingCommentText(comment.text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const saveEditComment = async () => {
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
  };

  // ---------- MENTION CANDIDATES ----------

  const getMentionCandidates = useCallback(() => {
    const emails = new Set<string>();

    if (selectedTask?.CreatedUser?.email)
      emails.add(String(selectedTask.CreatedUser.email).toLowerCase());

    const assigned = Array.isArray(selectedTask?.assignedTo)
      ? selectedTask!.assignedTo
      : selectedTask?.assignedTo
      ? [selectedTask.assignedTo]
      : [];

    assigned.forEach(
      (e) => typeof e === "string" && emails.add(e.toLowerCase())
    );
    (selectedTask?.guests || []).forEach(
      (e) => typeof e === "string" && emails.add(e.toLowerCase())
    );

    return Array.from(emails);
  }, [selectedTask]);

  const mentionCandidates = useMemo(
    () => getMentionCandidates(),
    [getMentionCandidates]
  );

  const filteredMentionCandidates = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!q) return mentionCandidates.slice(0, 6);
    return mentionCandidates.filter((e) => e.includes(q)).slice(0, 6);
  }, [mentionCandidates, mentionQuery]);

  const handleChangeCommentText = (t: string) => {
    setCommentText(t);

    const lastAt = t.lastIndexOf("@");
    if (lastAt === -1) {
      setShowMentionBox(false);
      setMentionQuery("");
      return;
    }

    const afterAt = t.slice(lastAt + 1);
    if (afterAt.includes(" ") || afterAt.includes("\n")) {
      setShowMentionBox(false);
      setMentionQuery("");
      return;
    }

    setShowMentionBox(true);
    setMentionQuery(afterAt);
  };

  const insertMention = (email: string) => {
    const t = commentText;
    const lastAt = t.lastIndexOf("@");
    if (lastAt === -1) return;

    const newText = t.slice(0, lastAt) + `@${email} `;
    setCommentText(newText);
    setShowMentionBox(false);
    setMentionQuery("");
  };

  const renderMentionText = (text: string, stylesObj: any) => {
    const parts = (text || "").split(/(@[a-zA-Z0-9._%+-]+@gmail\.com)/g);

    return (
      <Text style={stylesObj.commentTextCompact}>
        {parts.map((p, idx) => {
          const isMention = /^@[a-zA-Z0-9._%+-]+@gmail\.com$/.test(p);
          if (!isMention) return <Text key={idx}>{p}</Text>;
          return (
            <Text key={idx} style={stylesObj.mentionInline}>
              {p}
            </Text>
          );
        })}
      </Text>
    );
  };

  // ---------- TASK CHAT ----------

  const handleSendChat = async () => {
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
      setChatText("");
    } catch (e) {
      Alert.alert("Error", "Failed to send chat message.");
    }
  };

  // ---------- PRINT ----------

  const handlePrintTasks = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Not logged in");
        return;
      }

      const html = buildTaskPdfHtml({
        tasks,
        userEmail: user.email || "",
        counts: {
          overdue: overdueCount,
          active: activeCount,
          completed: completedCount,
        },
      });

      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to export PDF");
    }
  };

  // ---------- ADD TASK (new task) ----------

  const handleCreateTask = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to add task.");
      return;
    }

    const name = newTaskName.trim();
    if (!name) {
      Alert.alert("Error", "Task name is required.");
      return;
    }

    try {
      const startMs = newStartDate ? newStartDate.getTime() : null;
      const dueMs = newDueDate ? newDueDate.getTime() : null;

      const priorityScore = computePriorityScore({
        dueDate: dueMs ?? undefined,
        startDate: startMs ?? undefined,
        completed: false,
        assigneeCount: 0,
      });

      await addDoc(collection(db, "Tasks"), {
        taskName: name,
        details: newTaskDetails,
        startDate: startMs,
        dueDate: dueMs,
        assignedTo: [],
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        priorityScore,
        CreatedUser: {
          id: user.uid,
          name: user.displayName || "User",
          email: user.email || "",
        },
        guests: [],
      });

      setAddOpen(false);
      setNewTaskName("");
      setNewTaskDetails("");
      setNewStartDate(null);
      setNewDueDate(null);
    } catch (e) {
      console.error(e);
      Alert.alert("Error", "Failed to create task.");
    }
  };

  // ---------- UI HELPERS ----------

  const renderFilterChip = (
    mode: FilterType,
    label: string,
    stylesObj: any
  ) => {
    const isActive = filter === mode;
    return (
      <TouchableOpacity
        key={mode}
        onPress={() => setFilter(mode)}
        style={[
          stylesObj.filterChip,
          {
            borderColor: isActive ? MODULE_COLOR : theme.colors.border,
            backgroundColor: isActive ? `${MODULE_COLOR}22` : "transparent",
          },
        ]}
      >
        <Text
          style={[
            stylesObj.filterChipText,
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

  const threadRoots = useMemo(() => buildThreadTree(comments), [comments]);

  // ---------- STYLES ----------

  const isDark = theme?.isDark === true;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },

        list: { flex: 1 },
        listContent: {
          paddingHorizontal: theme.spacing.screenPadding,
          paddingBottom: theme.spacing.xxl + 190,
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
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
          columnGap: theme.spacing.xs,
        },

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
          backgroundColor: `${MODULE_COLOR}10`,
          shadowColor: MODULE_COLOR,
          shadowOpacity: theme.isDark ? 0.7 : 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        },
        moduleTitle: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
        },
        moduleSubtitle: {
          fontSize: theme.typography.fontSizes.md,
          color: theme.colors.textSecondary,
        },

        section: { marginBottom: theme.spacing.lg },

        neonShellCard: createNeonCardShell(MODULE_COLOR, theme, {
          padding: theme.spacing.md,
          backgroundColor: theme.isDark ? "#020617" : "#F9FAFB",
        }),
        neonBottomLine: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        },

        calendarRibbon: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: theme.spacing.md,
        },
        calendarEmoji: { fontSize: 24, marginRight: theme.spacing.sm },
        calendarText: {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.textPrimary,
        },

        summaryRow: { flexDirection: "row", columnGap: theme.spacing.sm },
        summaryCard: { flex: 1 },
        summaryLabel: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
        },
        summaryValue: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          marginTop: 4,
          color: theme.colors.textPrimary,
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
        filterChipText: { fontSize: theme.typography.fontSizes.xs },
        filterMeta: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
          marginBottom: theme.spacing.sm,
        },

        // ✅ NEW: “EventList-like” task layout
        taskCard: {
          flexDirection: "row",
          alignItems: "stretch",
          padding: theme.spacing.sm,
          borderRadius: 24,
          marginBottom: theme.spacing.sm,
          overflow: "hidden",
        },
        taskLeftColumn: {
          alignItems: "center",
          marginRight: theme.spacing.md,
          paddingTop: 2,
        },
        taskDateBubble: {
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
          minWidth: 54,
        },
        taskDateDay: { fontSize: 18, fontWeight: "800" },
        taskDateMon: { fontSize: 10, letterSpacing: 1, fontWeight: "800" },
        taskStatusTag: {
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        taskStatusTagText: { fontSize: 10, fontWeight: "800" },

        taskContent: { flex: 1, minWidth: 0 },
        taskHeaderRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        },
        taskTitleRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          flexShrink: 1,
          minWidth: 0,
        },
        taskTitle: {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        taskDetails: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
          marginTop: 2,
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 6,
          flexWrap: "wrap",
          columnGap: 10,
          rowGap: 6,
        },
        metaPill: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderWidth: 1,
        },
        metaPillText: {
          fontSize: 11,
          fontWeight: "700",
        },

        // MODAL
        modalBackdrop: {
          flex: 1,
          justifyContent: "center",
          padding: theme.spacing.md,
          backgroundColor: "rgba(15,23,42,0.55)",
        },
        modalCard: {
          borderRadius: 20,
          padding: theme.spacing.lg,
          maxHeight: "90%",
          backgroundColor: "#020617",
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 10,
          borderWidth: 1,
          borderColor: "#1E293B",
          overflow: "hidden",
        },
        modalHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: theme.spacing.sm,
        },
        modalTitle: {
          fontSize: theme.typography.fontSizes.lg,
          fontWeight: theme.typography.fontWeights.bold,
          color: "#F9FAFB",
        },
        modalHeaderActions: {
          flexDirection: "row",
          alignItems: "center",
          columnGap: 10,
        },

        label: {
          fontSize: theme.typography.fontSizes.xs,
          color: "#9CA3AF",
          marginBottom: 4,
        },
        input: {
          borderWidth: 1,
          borderColor: "#4B5563",
          borderRadius: 10,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical:
            Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.xs,
          color: "#F9FAFB",
          backgroundColor: "#020617",
          fontSize: theme.typography.fontSizes.sm,
          marginBottom: theme.spacing.sm,
        },

        chipRow: { flexDirection: "row", flexWrap: "wrap" },
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
          color: "#E5E7EB",
          marginRight: 4,
        },

        subtaskRow: {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 4,
        },
        subtaskText: {
          fontSize: theme.typography.fontSizes.sm,
          color: "#E5E7EB",
        },

        // COMMENTS
        commentListBox: {
          marginTop: 10,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}33`,
          backgroundColor: "#050B16",
          padding: 10,
          maxHeight: 260,
        },

        commentBubble: {
          borderRadius: 14,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: "#0B1220",
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}33`,
        },

        replyLine: {
          position: "absolute",
          left: 8,
          top: 0,
          bottom: 0,
          width: 2,
          borderRadius: 999,
          backgroundColor: `${MODULE_COLOR}33`,
        },

        commentHeaderRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        },

        commentAuthor: {
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.semibold,
          color: "#E5E7EB",
        },
        commentMeta: {
          fontSize: theme.typography.fontSizes.xs,
          color: "#94A3B8",
          fontWeight: theme.typography.fontWeights.normal,
        },

        commentTextCompact: {
          fontSize: 13,
          marginTop: 6,
          color: "#E5E7EB",
          lineHeight: 18,
        },

        commentActions: {
          flexDirection: "row",
          columnGap: 10,
          alignItems: "center",
        },

        mentionInline: {
          color: MODULE_COLOR,
          fontWeight: "900",
        },

        viewRepliesBtn: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}55`,
          backgroundColor: `${MODULE_COLOR}14`,
          marginTop: 8,
        },
        viewRepliesText: {
          fontSize: 12,
          fontWeight: "800",
          color: MODULE_COLOR,
        },

        commentEditInput: {
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}55`,
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: "#E5E7EB",
          backgroundColor: "#020617",
          fontSize: theme.typography.fontSizes.sm,
        },

        replyBanner: {
          marginTop: 10,
          padding: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}55`,
          backgroundColor: "#0B1220",
        },

        mentionBox: {
          marginTop: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}55`,
          backgroundColor: "#07101E",
          overflow: "hidden",
        },
        mentionItem: {
          paddingVertical: 10,
          paddingHorizontal: 12,
          borderBottomWidth: 1,
          borderBottomColor: "#0f172a",
        },
        mentionItemText: {
          color: "#E5E7EB",
          fontSize: 13,
          fontWeight: "700",
        },

        commentRow: {
          flexDirection: "row",
          columnGap: theme.spacing.sm,
          marginTop: theme.spacing.sm,
        },
        commentInput: {
          flex: 1,
          borderWidth: 1,
          borderColor: "#4B5563",
          borderRadius: 999,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical:
            Platform.OS === "ios" ? theme.spacing.sm : theme.spacing.xs,
          color: "#F9FAFB",
          backgroundColor: "#020617",
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

        // CHAT DRAWER
        chatDrawerBackdrop: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(0,0,0,0.35)",
        },
        chatDrawer: {
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: Math.min(360, Math.floor(SCREEN_W * 0.86)),
          backgroundColor: "#050B16",
          borderLeftWidth: 1,
          borderLeftColor: "#1E293B",
          padding: 12,
        },
        chatHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderBottomColor: "#0f172a",
          marginBottom: 10,
        },
        chatTitle: {
          color: "#E5E7EB",
          fontSize: 14,
          fontWeight: "900",
        },
        chatList: {
          flex: 1,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}22`,
          backgroundColor: "#07101E",
          padding: 10,
        },
        chatBubbleMine: {
          alignSelf: "flex-end",
          maxWidth: "88%",
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}55`,
          backgroundColor: `${MODULE_COLOR}14`,
          marginBottom: 8,
        },
        chatBubbleOther: {
          alignSelf: "flex-start",
          maxWidth: "88%",
          paddingVertical: 8,
          paddingHorizontal: 10,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: "#1E293B",
          backgroundColor: "#0B1220",
          marginBottom: 8,
        },
        chatName: {
          color: "#94A3B8",
          fontSize: 11,
          fontWeight: "800",
          marginBottom: 2,
        },
        chatText: {
          color: "#E5E7EB",
          fontSize: 13,
          lineHeight: 18,
          fontWeight: "600",
        },
        chatTime: {
          color: "#64748B",
          fontSize: 10,
          marginTop: 4,
          fontWeight: "700",
        },
        chatInputRow: {
          flexDirection: "row",
          columnGap: 10,
          paddingTop: 10,
        },
        chatInput: {
          flex: 1,
          borderWidth: 1,
          borderColor: "#334155",
          borderRadius: 999,
          paddingHorizontal: 12,
          paddingVertical: Platform.OS === "ios" ? 10 : 8,
          color: "#E5E7EB",
          backgroundColor: "#020617",
          fontSize: 13,
        },

        // ✅ Floating Add Button (kept)
        floatingAdd: {
          position: "absolute",
          top: -34,
          alignSelf: "center",
          zIndex: 10,
          elevation: 10,
        },
        floatingAddButton: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: MODULE_COLOR,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 3,
          borderColor: MODULE_COLOR + "AA",
          shadowColor: MODULE_COLOR,
          shadowOpacity: 0.9,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 25,
          zIndex: 400,
        },

        // ✅ Taskbar
        bottomBar: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Platform.OS === "ios" ? 16 : 12,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 10,
          backgroundColor: isDark
            ? "rgba(10,10,15,0.98)"
            : "rgba(15,23,42,0.95)",
          borderRadius: 26,
          borderWidth: 1,
          borderColor: isDark ? "#1F2937" : "#111827",
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -2 },
          zIndex: 10,
          elevation: 10,
        },
        bottomBarItem: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        bottomBarIconWrapper: {
          padding: 6,
          borderRadius: 999,
        },
        bottomBarLabel: {
          fontSize: 11,
          marginTop: 2,
          color: theme.colors.textSecondary,
        },
      }),
    [theme, isDark]
  );

  // ---------- COMMENT RENDER (recursive) ----------
  const renderCommentNode = (node: CommentNode, depth: number) => {
    const isMine = isMyComment(node);

    const indent = Math.min(depth * 14, 56);
    const hasReplies = node.replies?.length > 0;
    const isExpanded = expanded[node.id] ?? depth === 0;

    return (
      <View key={node.id} style={{ marginLeft: indent, marginTop: 10 }}>
        {depth > 0 ? <View style={styles.replyLine} /> : null}

        <View
          style={[
            styles.commentBubble,
            editingCommentId === node.id && {
              borderColor: `${MODULE_COLOR}AA`,
            },
          ]}
        >
          <View style={styles.commentHeaderRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={styles.commentAuthor}>
                {node.user?.name || "User"}
                <Text style={styles.commentMeta}>
                  {"  "}• {formatTime(node.createdAt)}
                  {node.updatedAt && node.updatedAt !== node.createdAt
                    ? " (edited)"
                    : ""}
                </Text>
              </Text>
            </View>

            <View style={styles.commentActions}>
              <TouchableOpacity
                onPress={() => {
                  setReplyTo(node);
                  setEditingCommentId(null);
                  setEditingCommentText("");
                }}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={16}
                  color={MODULE_COLOR}
                />
              </TouchableOpacity>

              {isMine ? (
                <>
                  <TouchableOpacity onPress={() => startEditComment(node)}>
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color={MODULE_COLOR}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteComment(node)}>
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>

          {editingCommentId === node.id ? (
            <View style={{ marginTop: 8 }}>
              <RNTextInput
                value={editingCommentText}
                onChangeText={setEditingCommentText}
                style={styles.commentEditInput}
                placeholder="Edit comment..."
                placeholderTextColor="#64748B"
                multiline
              />
              <View
                style={{ flexDirection: "row", columnGap: 10, marginTop: 8 }}
              >
                <TouchableOpacity
                  onPress={cancelEditComment}
                  style={[styles.chipButton, { backgroundColor: "#111827" }]}
                >
                  <Text style={[styles.chipButtonText, { color: "#E5E7EB" }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveEditComment}
                  style={[styles.chipButton, { backgroundColor: MODULE_COLOR }]}
                >
                  <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            renderMentionText(node.text, styles)
          )}

          {hasReplies ? (
            <TouchableOpacity
              onPress={() => toggleExpand(node.id)}
              style={styles.viewRepliesBtn}
            >
              <Text style={styles.viewRepliesText}>
                {isExpanded
                  ? "Hide replies"
                  : `View replies (${node.replies.length})`}
              </Text>
            </TouchableOpacity>
          ) : null}

          {hasReplies && isExpanded
            ? node.replies.map((r) => renderCommentNode(r, depth + 1))
            : null}
        </View>
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
            onPress={() => router.push("/")}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>My Task</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon={theme.isDark ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        {/* MAIN LIST */}
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredTasks}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              <View style={styles.iconSection}>
                <View style={styles.iconContainer}>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={64}
                    color={MODULE_COLOR}
                  />
                </View>
                <Text style={styles.moduleTitle}>Task</Text>
                <Text style={styles.moduleSubtitle}>
                  Stay organized and productive
                </Text>
              </View>

              {/* Date ribbon */}
              <View style={styles.section}>
                <Card
                  style={[
                    styles.neonShellCard,
                    { backgroundColor: theme.colors.cardBackground },
                  ]}
                >
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
                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: MODULE_COLOR,
                        shadowColor: MODULE_COLOR,
                        shadowOpacity: 0.9,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  />
                </Card>
              </View>

              {/* Summary cards */}
              <View style={styles.section}>
                <View style={styles.summaryRow}>
                  <Card
                    style={[
                      styles.summaryCard,
                      summaryCardStyle(theme, "overdue"),
                      { backgroundColor: theme.colors.cardBackground },
                    ]}
                  >
                    <Text style={styles.summaryLabel}>Overdue</Text>
                    <Text style={styles.summaryValue}>{overdueCount}</Text>
                    <View
                      style={[
                        styles.neonBottomLine,
                        {
                          backgroundColor: "#EF4444",
                          shadowColor: "#EF4444",
                          shadowOpacity: 0.9,
                          shadowRadius: 12,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    />
                  </Card>

                  <Card
                    style={[
                      styles.summaryCard,
                      summaryCardStyle(theme, "active"),
                      { backgroundColor: theme.colors.cardBackground },
                    ]}
                  >
                    <Text style={styles.summaryLabel}>Active</Text>
                    <Text style={styles.summaryValue}>{activeCount}</Text>
                    <View
                      style={[
                        styles.neonBottomLine,
                        {
                          backgroundColor: "#22C55E",
                          shadowColor: "#22C55E",
                          shadowOpacity: 0.9,
                          shadowRadius: 12,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    />
                  </Card>

                  <Card
                    style={[
                      styles.summaryCard,
                      summaryCardStyle(theme, "completed"),
                      { backgroundColor: theme.colors.cardBackground },
                    ]}
                  >
                    <Text style={styles.summaryLabel}>Completed</Text>
                    <Text style={styles.summaryValue}>{completedCount}</Text>
                    <View
                      style={[
                        styles.neonBottomLine,
                        {
                          backgroundColor: MODULE_COLOR,
                          shadowColor: MODULE_COLOR,
                          shadowOpacity: 0.9,
                          shadowRadius: 12,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    />
                  </Card>
                </View>

                {/* Buttons */}
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    onPress={() =>
                      router.push("/modules/task-management/TaskDashboard")
                    }
                    style={[
                      styles.smallButton,
                      {
                        backgroundColor: `${MODULE_COLOR}22`,
                        borderWidth: 1,
                        borderColor: MODULE_COLOR,
                      },
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
                      {
                        backgroundColor: "#16a34a20",
                        borderWidth: 1,
                        borderColor: "#16A34A",
                      },
                    ]}
                  >
                    <Text
                      style={[styles.smallButtonText, { color: "#16A34A" }]}
                    >
                      Print Tasks
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Filter chips */}
              <View style={styles.filterRow}>
                {renderFilterChip("all", "All", styles)}
                {renderFilterChip("active", "Active", styles)}
                {renderFilterChip("completed", "Completed", styles)}
                {renderFilterChip("overdue", "Overdue", styles)}
              </View>
              <Text style={styles.filterMeta}>
                {filteredTasks.length} task(s) · filter: {filter}
              </Text>
            </>
          }
          renderItem={({ item }) => {
            const isCompleted = !!item.completed;
            const isOverdue = isTimestampOverdue(item.dueDate ?? undefined);

            let accentColor = MODULE_COLOR;
            if (isCompleted) accentColor = "#9CA3AF";
            else if (isOverdue) accentColor = "#EF4444";

            const neonColor = isCompleted
              ? "rgba(148,163,184,0.45)"
              : accentColor;

            // ✅ “EventList-like” date bubble (use dueDate if exist, else show --)
            const dateObj =
              typeof item.dueDate === "number" ? new Date(item.dueDate) : null;
            const day = dateObj?.getDate().toString().padStart(2, "0") ?? "--";
            const mon =
              dateObj
                ?.toLocaleDateString("en-US", { month: "short" })
                .toUpperCase() ?? "---";

            const dateBubbleBg = isDark ? "#020617" : "#DBEAFE";
            const dateBubbleDayColor = isDark ? "#E0F2FE" : "#1D4ED8";

            const statusText = isCompleted
              ? "DONE"
              : isOverdue
              ? "OVERDUE"
              : "ACTIVE";
            const statusBg = isCompleted
              ? "rgba(148,163,184,0.18)"
              : isOverdue
              ? "rgba(239,68,68,0.18)"
              : "rgba(34,197,94,0.18)";
            const statusColor = isCompleted
              ? "#9CA3AF"
              : isOverdue
              ? "#EF4444"
              : "#22C55E";

            const startLabel =
              typeof item.startDate === "number"
                ? formatDate(new Date(item.startDate))
                : null;
            const dueLabel =
              typeof item.dueDate === "number"
                ? formatDate(new Date(item.dueDate))
                : null;

            const assignedCount = Array.isArray(item.assignedTo)
              ? item.assignedTo.length
              : item.assignedTo
              ? 1
              : 0;

            return (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedTask(item);
                  setModalVisible(true);
                }}
              >
                <Card
                  style={[
                    styles.taskCard,
                    createNeonCardShell(accentColor, theme, {
                      padding: theme.spacing.sm,
                    }),
                    {
                      backgroundColor: theme.colors.cardBackground,
                      opacity: isCompleted ? 0.85 : 1,
                    },
                  ]}
                >
                  {/* LEFT COLUMN */}
                  <View style={styles.taskLeftColumn}>
                    <View
                      style={[
                        styles.taskDateBubble,
                        { backgroundColor: dateBubbleBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskDateDay,
                          { color: dateBubbleDayColor },
                        ]}
                      >
                        {day}
                      </Text>
                      <Text
                        style={[
                          styles.taskDateMon,
                          { color: isDark ? "#E5E7EB" : "#6B7280" },
                        ]}
                      >
                        {mon}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.taskStatusTag,
                        { backgroundColor: statusBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.taskStatusTagText,
                          { color: statusColor },
                        ]}
                      >
                        {statusText}
                      </Text>
                    </View>
                  </View>

                  {/* MAIN */}
                  <View style={styles.taskContent}>
                    <View style={styles.taskHeaderRow}>
                      <View style={styles.taskTitleRow}>
                        <TouchableOpacity
                          onPress={(e: any) => {
                            e?.stopPropagation?.();
                            handleCompleteTaskToggle(item);
                          }}
                          style={{ marginRight: 10, marginTop: 2 }}
                        >
                          <Ionicons
                            name={
                              isCompleted
                                ? "checkmark-circle"
                                : "checkmark-circle-outline"
                            }
                            size={22}
                            color={isCompleted ? "#9ca3af" : "#22C55E"}
                          />
                        </TouchableOpacity>

                        <View style={{ flexShrink: 1, minWidth: 0 }}>
                          <Text
                            style={[
                              styles.taskTitle,
                              {
                                textDecorationLine: isCompleted
                                  ? "line-through"
                                  : "none",
                                color: theme.colors.textPrimary,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.taskName}
                          </Text>

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
                              numberOfLines={1}
                            >
                              {item.details}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>

                    {/* Meta pills (cleaner + more readable) */}
                    <View style={styles.metaRow}>
                      {startLabel ? (
                        <View
                          style={[
                            styles.metaPill,
                            {
                              borderColor: isDark ? "#1F2937" : "#CBD5E1",
                              backgroundColor: isDark ? "#0B1220" : "#FFFFFF",
                            },
                          ]}
                        >
                          <Ionicons
                            name="play-outline"
                            size={12}
                            color={theme.colors.textSecondary}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.metaPillText,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {startLabel}
                          </Text>
                        </View>
                      ) : null}

                      {dueLabel ? (
                        <View
                          style={[
                            styles.metaPill,
                            {
                              borderColor: isOverdue
                                ? "#EF4444"
                                : isDark
                                ? "#1F2937"
                                : "#CBD5E1",
                              backgroundColor: isOverdue
                                ? isDark
                                  ? "rgba(239,68,68,0.12)"
                                  : "#FEE2E2"
                                : isDark
                                ? "#0B1220"
                                : "#FFFFFF",
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={12}
                            color={
                              isOverdue ? "#EF4444" : theme.colors.textSecondary
                            }
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.metaPillText,
                              {
                                color: isOverdue
                                  ? "#EF4444"
                                  : theme.colors.textSecondary,
                              },
                            ]}
                          >
                            {dueLabel}
                          </Text>
                        </View>
                      ) : null}

                      {assignedCount > 0 ? (
                        <View
                          style={[
                            styles.metaPill,
                            {
                              borderColor: `${MODULE_COLOR}55`,
                              backgroundColor: `${MODULE_COLOR}14`,
                            },
                          ]}
                        >
                          <Ionicons
                            name="people-outline"
                            size={12}
                            color={MODULE_COLOR}
                            style={{ marginRight: 6 }}
                          />
                          <Text
                            style={[
                              styles.metaPillText,
                              { color: MODULE_COLOR },
                            ]}
                          >
                            {assignedCount} assignee
                            {assignedCount > 1 ? "s" : ""}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {/* RIGHT ACTION */}
                  <TouchableOpacity
                    onPress={(e: any) => {
                      e?.stopPropagation?.();
                      handleDeleteTask(item.id);
                    }}
                    style={{
                      paddingHorizontal: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#F97373" />
                  </TouchableOpacity>

                  {/* Neon bottom line */}
                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: neonColor,
                        shadowColor: neonColor,
                        shadowOpacity: 1,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  />
                </Card>
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
              style={[
                styles.neonShellCard,
                {
                  width: "70%",
                  backgroundColor: theme.isDark ? "#020617" : "#0B1220",
                },
              ]}
            >
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: MODULE_COLOR,
                    shadowColor: MODULE_COLOR,
                    shadowOpacity: 0.9,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
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
                style={[styles.chipButton, { backgroundColor: "#0256ffff" }]}
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

        {/* 🔻 BOTTOM TASKBAR NAVIGATION */}
        <View style={styles.bottomBar}>
          {/* Center FAB attached to bar */}
          <View style={styles.floatingAdd}>
            <View
              style={{
                width: 65,
                height: 65,
                borderRadius: 32,
                borderColor: MODULE_COLOR,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#000",
                shadowColor: MODULE_COLOR,
                shadowOpacity: 1,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <TouchableOpacity
                style={styles.floatingAddButton}
                onPress={() => setShowAddMenu(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={34} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Task (current) */}
          <TouchableOpacity style={styles.bottomBarItem} disabled>
            <View
              style={[
                styles.bottomBarIconWrapper,
                { backgroundColor: `${MODULE_COLOR}22` },
              ]}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={MODULE_COLOR}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: MODULE_COLOR, fontWeight: "600" },
              ]}
            >
              Task
            </Text>
          </TouchableOpacity>

          {/* Event */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/EventList")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Event
            </Text>
          </TouchableOpacity>

          {/* Productivity */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/Gamification")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Productivity
            </Text>
          </TouchableOpacity>

          {/* Chart */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/TaskChart")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Chart
            </Text>
          </TouchableOpacity>
        </View>

        {/* TASK DETAIL MODAL (chat + comments kept) */}
        {selectedTask && (
          <Modal
            visible={modalVisible}
            transparent
            animationType="slide"
            presentationStyle="overFullScreen"
            statusBarTranslucent
            hardwareAccelerated
            onRequestClose={() => setModalVisible(false)}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={{ flex: 1 }}
            >
              <DatePickerModal
                visible={calendarTarget !== null}
                onClose={() => setCalendarTarget(null)}
                theme={theme}
                title={
                  calendarTarget === "taskStart"
                    ? "Select Start Date"
                    : calendarTarget === "taskDue"
                    ? "Select Due Date"
                    : calendarTarget === "subtaskStart"
                    ? "Select Subtask Start Date"
                    : calendarTarget === "subtaskDue"
                    ? "Select Subtask Due Date"
                    : calendarTarget === "newStart"
                    ? "Select Start Date"
                    : "Select Due Date"
                }
                selectedDate={
                  calendarTarget === "taskStart"
                    ? taskStartDate
                    : calendarTarget === "taskDue"
                    ? taskDueDate
                    : calendarTarget === "subtaskStart"
                    ? subtaskStartDate
                    : calendarTarget === "subtaskDue"
                    ? subtaskDueDate
                    : calendarTarget === "newStart"
                    ? newStartDate
                    : calendarTarget === "newDue"
                    ? newDueDate
                    : null
                }
                onSelectDate={(date) => {
                  switch (calendarTarget) {
                    case "taskStart":
                      setTaskStartDate(date);
                      break;
                    case "taskDue":
                      setTaskDueDate(date);
                      break;
                    case "subtaskStart":
                      setSubtaskStartDate(date);
                      break;
                    case "subtaskDue":
                      setSubtaskDueDate(date);
                      break;
                    case "newStart":
                      setNewStartDate(date);
                      break;
                    case "newDue":
                      setNewDueDate(date);
                      break;
                  }
                  setCalendarTarget(null);
                }}
              />

              <Pressable
                style={styles.modalBackdrop}
                onPress={() => setModalVisible(false)}
              >
                <Pressable style={styles.modalCard} onPress={() => {}}>
                  <View style={styles.modalHeaderRow}>
                    <Text style={styles.modalTitle}>Task Details</Text>

                    <View style={styles.modalHeaderActions}>
                      <TouchableOpacity
                        onPress={() => setChatOpen((p) => !p)}
                        style={{ padding: 4 }}
                      >
                        <Ionicons
                          name={
                            chatOpen ? "chatbubbles" : "chatbubbles-outline"
                          }
                          size={20}
                          color={MODULE_COLOR}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => {
                          setModalVisible(false);
                          setEditingCommentId(null);
                          setEditingCommentText("");
                          setChatOpen(false);
                        }}
                        style={{ padding: 4 }}
                      >
                        <Ionicons name="close" size={22} color="#94A3B8" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <ScrollView
                    style={{ marginTop: 4 }}
                    contentContainerStyle={{ paddingBottom: 16 }}
                  >
                    <Text style={styles.label}>Title</Text>
                    <RNTextInput
                      value={editingTaskName}
                      onChangeText={setEditingTaskName}
                      placeholder="Task name"
                      placeholderTextColor="#64748B"
                      style={styles.input}
                    />

                    <Text style={styles.label}>Details</Text>
                    <RNTextInput
                      value={editingTaskDetails}
                      onChangeText={setEditingTaskDetails}
                      placeholder="Task details"
                      placeholderTextColor="#64748B"
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
                        marginVertical: 12,
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <Text style={styles.label}>Start Date</Text>
                        <TouchableOpacity
                          onPress={() => setCalendarTarget("taskStart")}
                          style={[
                            styles.chipButton,
                            {
                              backgroundColor: "#4B5563",
                              borderWidth: 1,
                              borderColor: "#4B5563",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipButtonText,
                              { color: "#E5E7EB" },
                            ]}
                          >
                            {taskStartDate
                              ? formatDate(taskStartDate)
                              : "Set date"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.label}>Due Date</Text>
                        <TouchableOpacity
                          onPress={() => setCalendarTarget("taskDue")}
                          style={[
                            styles.chipButton,
                            {
                              backgroundColor: "#4B5563",
                              borderWidth: 1,
                              borderColor: "#4B5563",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipButtonText,
                              { color: "#E5E7EB" },
                            ]}
                          >
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
                        columnGap: 10,
                        marginBottom: 10,
                      }}
                    >
                      <RNTextInput
                        placeholder="friend@gmail.com"
                        placeholderTextColor="#64748B"
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
                        <Text
                          style={[styles.chipButtonText, { color: "#fff" }]}
                        >
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
                            <Ionicons name="close" size={14} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>

                    {/* Subtasks */}
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.modalTitle}>Subtasks</Text>

                      {subtasks.length === 0 && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#9CA3AF",
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
                              name={
                                st.completed ? "checkbox" : "square-outline"
                              }
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
                              <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
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
                      <Card
                        style={{
                          marginTop: 10,
                          backgroundColor: "#020617",
                          borderRadius: 16,
                          borderWidth: 1,
                          borderColor: "#1F2937",
                          padding: 12,
                        }}
                      >
                        <Text style={styles.label}>New Subtask</Text>
                        <RNTextInput
                          placeholder="Subtask name"
                          placeholderTextColor="#64748B"
                          value={subtaskName}
                          onChangeText={setSubtaskName}
                          style={styles.input}
                        />
                        <RNTextInput
                          placeholder="Subtask details (optional)"
                          placeholderTextColor="#64748B"
                          value={subtaskDetails}
                          onChangeText={setSubtaskDetails}
                          style={styles.input}
                        />

                        <View
                          style={{
                            flexDirection: "row",
                            columnGap: 10,
                            marginBottom: 10,
                          }}
                        >
                          <TouchableOpacity
                            onPress={() => setCalendarTarget("subtaskStart")}
                            style={[
                              styles.chipButton,
                              {
                                flex: 1,
                                backgroundColor: "#4B5563",
                                borderWidth: 1,
                                borderColor: "#4B5563",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipButtonText,
                                { color: "#E5E7EB" },
                              ]}
                            >
                              {subtaskStartDate
                                ? formatDate(subtaskStartDate)
                                : "Start date"}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setCalendarTarget("subtaskDue")}
                            style={[
                              styles.chipButton,
                              {
                                flex: 1,
                                backgroundColor: "#4B5563",
                                borderWidth: 1,
                                borderColor: "#4B5563",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipButtonText,
                                { color: "#E5E7EB" },
                              ]}
                            >
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
                    <View style={{ marginTop: 14 }}>
                      <Text style={styles.modalTitle}>Comments</Text>

                      {comments.length === 0 && (
                        <Text
                          style={{
                            fontSize: 12,
                            color: "#9CA3AF",
                            marginTop: 4,
                          }}
                        >
                          No comments yet.
                        </Text>
                      )}

                      {replyTo ? (
                        <View style={styles.replyBanner}>
                          <Text
                            style={{
                              color: "#E5E7EB",
                              fontSize: 12,
                              fontWeight: "800",
                            }}
                          >
                            Replying to {replyTo.user?.name || "User"}
                          </Text>
                          <Text
                            style={{
                              color: "#94A3B8",
                              fontSize: 12,
                              marginTop: 2,
                            }}
                            numberOfLines={2}
                          >
                            {replyTo.text}
                          </Text>

                          <TouchableOpacity
                            onPress={() => setReplyTo(null)}
                            style={{ position: "absolute", right: 10, top: 10 }}
                          >
                            <Ionicons name="close" size={16} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      <View style={styles.commentListBox}>
                        <ScrollView
                          showsVerticalScrollIndicator
                          contentContainerStyle={{ paddingBottom: 6 }}
                        >
                          {threadRoots.map((root) =>
                            renderCommentNode(root, 0)
                          )}
                        </ScrollView>
                      </View>

                      {showMentionBox &&
                      filteredMentionCandidates.length > 0 ? (
                        <View style={styles.mentionBox}>
                          {filteredMentionCandidates.map((email) => (
                            <TouchableOpacity
                              key={email}
                              onPress={() => insertMention(email)}
                              style={styles.mentionItem}
                            >
                              <Text style={styles.mentionItemText}>
                                @{email}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ) : null}

                      <View style={styles.commentRow}>
                        <RNTextInput
                          placeholder="Add comment... (type @ to mention)"
                          placeholderTextColor="#64748B"
                          value={commentText}
                          onChangeText={handleChangeCommentText}
                          style={styles.commentInput}
                          multiline
                        />

                        <TouchableOpacity
                          onPress={handleAddComment}
                          disabled={!!editingCommentId}
                          style={[
                            styles.chipButton,
                            {
                              backgroundColor: MODULE_COLOR,
                              opacity: editingCommentId ? 0.5 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[styles.chipButtonText, { color: "#fff" }]}
                          >
                            Send
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Save & Delete */}
                    <View style={{ marginTop: 16 }}>
                      <TouchableOpacity
                        onPress={handleSaveMainTask}
                        style={[
                          styles.chipButton,
                          { backgroundColor: MODULE_COLOR },
                        ]}
                      >
                        <Text
                          style={[styles.chipButtonText, { color: "#fff" }]}
                        >
                          Save Changes
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() =>
                          selectedTask && handleDeleteTask(selectedTask.id)
                        }
                        style={[
                          styles.chipButton,
                          { marginTop: 10, backgroundColor: "#fee2e2" },
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

                  {/* ✅ CHAT DRAWER */}
                  {chatOpen ? (
                    <>
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setChatOpen(false)}
                        style={styles.chatDrawerBackdrop}
                      />
                      <View style={styles.chatDrawer}>
                        <View style={styles.chatHeader}>
                          <Text style={styles.chatTitle}>Task Chat</Text>
                          <TouchableOpacity
                            onPress={() => setChatOpen(false)}
                            style={{ padding: 6 }}
                          >
                            <Ionicons name="close" size={18} color="#94A3B8" />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.chatList}>
                          <ScrollView
                            showsVerticalScrollIndicator
                            contentContainerStyle={{ paddingBottom: 10 }}
                          >
                            {chatMessages.length === 0 ? (
                              <Text
                                style={{
                                  color: "#94A3B8",
                                  fontSize: 12,
                                  fontWeight: "700",
                                }}
                              >
                                No messages yet.
                              </Text>
                            ) : (
                              chatMessages.map((m) => {
                                const me = auth.currentUser?.uid === m.user?.id;
                                return (
                                  <View
                                    key={m.id}
                                    style={
                                      me
                                        ? styles.chatBubbleMine
                                        : styles.chatBubbleOther
                                    }
                                  >
                                    <Text style={styles.chatName}>
                                      {me ? "You" : m.user?.name || "User"}
                                    </Text>
                                    <Text style={styles.chatText}>
                                      {m.text}
                                    </Text>
                                    <Text style={styles.chatTime}>
                                      {formatTime(m.createdAt)}
                                    </Text>
                                  </View>
                                );
                              })
                            )}
                          </ScrollView>
                        </View>

                        <View style={styles.chatInputRow}>
                          <RNTextInput
                            placeholder="Type a message..."
                            placeholderTextColor="#64748B"
                            value={chatText}
                            onChangeText={setChatText}
                            style={styles.chatInput}
                            multiline
                          />
                          <TouchableOpacity
                            onPress={handleSendChat}
                            style={[
                              styles.chipButton,
                              { backgroundColor: MODULE_COLOR },
                            ]}
                          >
                            <Text
                              style={[styles.chipButtonText, { color: "#fff" }]}
                            >
                              Send
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </>
                  ) : null}
                </Pressable>
              </Pressable>
            </KeyboardAvoidingView>
          </Modal>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

// app/modules/task-management/TaskMenuScreen.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
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
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
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
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

import {
  MODULE_COLOR,
  DatePickerModal,
  createNeonCardShell,
} from "./utils/sharedUI";
import { buildTaskIndexStyles } from "./TaskStyles";
import { buildTaskPdfHtml } from "./utils/pdfUtils";
import {
  initializeNotifications,
  sendTestNotification,
  setupNotificationListener,
} from "./utils/notifications";
import {
  awardTaskCompletionOnce,
  awardSubtaskCompletion,
} from "./utils/gamification";
import {
  canUserSeeTask,
  computePriorityScore,
  isOverdue,
} from "./utils/taskUtils";
import { buildThreadTree } from "./utils/commentUtils";
import { useTaskOperations } from "./hooks/useTaskOperations";
import { useCommentHandlers } from "./hooks/useCommentHandlers";
import { useChatHandlers } from "./hooks/useChatHandlers";
import { useMentions } from "./hooks/useMentions";

import type {
  TaskType,
  CommentType,
  ChatMessageType,
  FilterType,
  CommentNode,
  CalendarTarget,
} from "./utils/types";

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

// Main component

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

  // ✅ Expand/collapse
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (id: string) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // filter mode
  const [filter, setFilter] = useState<FilterType>("all");

  // ✅ Task chat drawer
  const [chatOpen, setChatOpen] = useState(false);

  // Custom hooks
  const { handleCompleteTaskToggle, handleDeleteTask, handleSaveMainTask } =
    useTaskOperations();

  const {
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
  } = useCommentHandlers(selectedTask);

  const { chatMessages, chatText, setChatText, handleSendChat } =
    useChatHandlers(selectedTask);

  const {
    showMentionBox,
    mentionQuery,
    filteredMentionCandidates,
    handleChangeCommentText: handleMentionTextChange,
    insertMention: insertMentionHandler,
  } = useMentions(selectedTask, commentText);

  const handleChangeCommentText = (t: string) => {
    handleMentionTextChange(t, setCommentText);
  };

  const insertMention = (email: string) => {
    insertMentionHandler(email, setCommentText);
  };

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const formatDate = (date: Date | null) => {
    if (!date) return "Set date";
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (ms?: number) => {
    if (!ms) return "";
    const d = new Date(ms);
    return d.toLocaleString();
  };

  // Data loading

  // Initialize notifications and setup Firestore listener on mount
  useEffect(() => {
    let unsubscribeNotifications: (() => void) | null = null;

    initializeNotifications()
      .then((granted) => {
        if (granted) {
          console.log("✅ Notification permissions granted");

          // Setup Firestore listener for notifications
          const user = auth.currentUser;
          if (user?.email) {
            unsubscribeNotifications = setupNotificationListener(user.email);
            console.log("✅ Firestore notification listener setup");
          }
        } else {
          console.warn("⚠️ Notification permissions not granted");
          Alert.alert(
            "Notifications",
            "Please enable notifications in your device settings to receive task updates."
          );
        }
      })
      .catch((error) => {
        console.error("❌ Failed to initialize notifications:", error);
      });

    // Cleanup: unsubscribe when component unmounts
    return () => {
      if (unsubscribeNotifications) {
        unsubscribeNotifications();
        console.log("🔇 Notification listener unsubscribed");
      }
    };
  }, []);

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

  // Load subtasks (comments and chat are handled by hooks)
  useEffect(() => {
    if (!selectedTask?.id) {
      setSubtasks([]);
      return;
    }

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

    return () => unsubSubtasks();
  }, [selectedTask?.id, db]);

  useEffect(() => {
    setExpanded({});
    setChatOpen(false);
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

  // Filtering and overdue tasks

  const filteredTasks = useMemo(() => {
    let list = tasks;

    list = list.filter((t) => {
      const overdue = isOverdue(t.dueDate ?? undefined);
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
    (t) => !t.completed && isOverdue(t.dueDate ?? undefined)
  ).length;
  const activeCount = filteredTasks.filter((t) => !t.completed).length;
  const completedCount = filteredTasks.filter((t) => t.completed).length;

  // Assignee management

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

  // Task operations handlers
  const handleSaveMainTaskWrapper = useCallback(() => {
    if (!selectedTask) return;
    handleSaveMainTask(
      selectedTask,
      editingTaskName,
      editingTaskDetails,
      taskStartDate,
      taskDueDate,
      mainAssignedList
    );
  }, [
    selectedTask,
    editingTaskName,
    editingTaskDetails,
    taskStartDate,
    taskDueDate,
    mainAssignedList,
    handleSaveMainTask,
  ]);

  const handleDeleteTaskWrapper = useCallback(
    async (taskId: string) => {
      await handleDeleteTask(
        taskId,
        () => {
          if (selectedTask?.id === taskId) {
            setSelectedTask(null);
            setModalVisible(false);
          }
        },
        (id) => {
          setTasks((prev) => prev.filter((t) => t.id !== id));
        }
      );
    },
    [selectedTask, handleDeleteTask]
  );

  // Subtask operations

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

      if (newCompleted) {
        await awardSubtaskCompletion(user.uid);
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

  // Render mention text helper
  const renderMentionText = useCallback((text: string, stylesObj: any) => {
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
  }, []);

  // Chat handlers are now in useChatHandlers hook

  // PDF generation

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

  // UI helper functions

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

  // Component styles

  const isDark = theme?.isDark === true;

  const styles = useMemo(() => buildTaskIndexStyles(theme), [theme, isDark]);

  // Comment rendering
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
                  cancelEditComment();
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

  // Rendering
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
              icon="notifications-outline"
              onPress={async () => {
                try {
                  console.log("🔔 Test notification button pressed");
                  const notificationId = await sendTestNotification();
                  console.log("✅ Notification ID returned:", notificationId);
                  Alert.alert(
                    "Test Notification",
                    `Notification scheduled! ID: ${notificationId}\n\nA notification should appear in 1 second. Check your notification tray!`
                  );
                } catch (error: any) {
                  console.error("❌ Test notification error details:", error);
                  const errorMessage =
                    error?.message || String(error) || "Unknown error";
                  Alert.alert(
                    "Notification Error",
                    `${errorMessage}\n\nTroubleshooting:\n1. Check device settings → Notifications\n2. Make sure you're on a physical device\n3. Check console logs for details`
                  );
                }
              }}
              variant="secondary"
              size="small"
            />
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
            const isOverdueTask = isOverdue(item.dueDate ?? undefined);

            let accentColor = MODULE_COLOR;
            if (isCompleted) accentColor = "#9CA3AF";
            else if (isOverdueTask) accentColor = "#EF4444";

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
              : isOverdueTask
              ? "OVERDUE"
              : "ACTIVE";
            const statusBg = isCompleted
              ? "rgba(148,163,184,0.18)"
              : isOverdueTask
              ? "rgba(239,68,68,0.18)"
              : "rgba(34,197,94,0.18)";
            const statusColor = isCompleted
              ? "#9CA3AF"
              : isOverdueTask
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
                      handleDeleteTaskWrapper(item.id);
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
                          cancelEditComment();
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
                        onPress={handleSaveMainTaskWrapper}
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
                          selectedTask &&
                          handleDeleteTaskWrapper(selectedTask.id)
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

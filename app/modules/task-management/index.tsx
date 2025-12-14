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
import { Calendar } from "react-native-calendars";
import { awardTaskCompletionOnce } from "./taskGamifications";
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
  awardSubtaskCompletion,
  removeSubtaskCompletion,
} from "./taskGamifications";

import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const MODULE_COLOR = "#38BDF8";
const { width: SCREEN_W } = Dimensions.get("window");

// ------------ DATE MODAL (from TaskAdd.tsx) ------------

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  theme: any;
  title?: string;
};

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  theme,
  title,
}) => {
  const initial = selectedDate || new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1);
  const [calendarCurrent, setCalendarCurrent] = useState(
    `${year}-${pad2(month)}-01`
  );

  useEffect(() => {
    if (visible) {
      const base = selectedDate || new Date();
      const y = base.getFullYear();
      const m = base.getMonth() + 1;
      setYear(y);
      setMonth(m);
      setCalendarCurrent(`${y}-${pad2(m)}-01`);
    }
  }, [visible, selectedDate]);

  useEffect(() => {
    setCalendarCurrent(`${year}-${pad2(month)}-01`);
  }, [year, month]);

  const goToPrevMonth = () => {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const goToPrevYear = () => setYear((y) => y - 1);
  const goToNextYear = () => setYear((y) => y + 1);

  const handleDayPress = (day: any) => {
    const d = new Date(day.dateString);
    onSelectDate(d);
    onClose();
  };

  const selectedKey =
    selectedDate != null ? selectedDate.toISOString().split("T")[0] : undefined;

  const markedDates =
    selectedKey != null
      ? {
          [selectedKey]: {
            selected: true,
            selectedColor: MODULE_COLOR,
            selectedTextColor: "#0f172a",
          },
        }
      : {};

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 20,
            padding: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.isDark ? "#1f2937" : "#d1d5db",
            shadowColor: MODULE_COLOR,
            shadowOpacity: theme.isDark ? 0.4 : 0.25,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
          }}
        >
          {title && (
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                marginBottom: 12,
                textAlign: "center",
                color: theme.colors.textPrimary,
              }}
            >
              {title}
            </Text>
          )}

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: theme.isDark ? "#1e293b" : "#cbd5e1",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={goToPrevYear} style={{ padding: 4 }}>
                <Ionicons
                  name="play-back"
                  size={19}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}>
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.textPrimary,
              }}
            >
              {MONTH_NAMES[month - 1]} {year}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={goToNextYear} style={{ padding: 4 }}>
                <Ionicons
                  name="play-forward"
                  size={19}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Calendar
            current={calendarCurrent}
            hideArrows
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.colors.card,
              calendarBackground: theme.colors.card,
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: MODULE_COLOR,
              selectedDayTextColor: "#0f172a",
              todayTextColor: MODULE_COLOR,
              dayTextColor: theme.colors.textPrimary,
              textDisabledColor: "#6b7280",
              monthTextColor: theme.colors.textPrimary,
            }}
          />

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: MODULE_COLOR,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#0f172a", fontSize: 14, fontWeight: "700" }}>
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

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
  notifStartId?: string | null;
  notifDueId?: string | null;
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

// ------------ UI HELPERS ------------

const createNeonCardShell = (
  accentColor: string,
  theme: any,
  extra: any = {}
) => {
  return {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: accentColor + "66",
    shadowColor: accentColor,
    shadowOpacity: theme.isDark ? 0.9 : 0.5,
    shadowRadius: theme.isDark ? 30 : 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: theme.isDark ? 18 : 8,
    ...extra,
  };
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

// ------------ NOTIFICATIONS HELPERS ------------

const getProjectIdForExpoPush = (): string | undefined => {
  const anyConst: any = Constants as any;
  return (
    anyConst?.easConfig?.projectId ||
    anyConst?.expoConfig?.extra?.eas?.projectId ||
    anyConst?.expoConfig?.projectId
  );
};

async function registerForPushNotificationsAsync(): Promise<string> {
  let token = "";

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("task-reminders", {
      name: "Task Reminders",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: MODULE_COLOR,
    });
  }

  if (!Device.isDevice) {
    Alert.alert("Device needed", "Push Notifications need a physical device.");
    return token;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    Alert.alert("Permission denied", "Notifications permission not granted.");
    return token;
  }

  try {
    const projectId = getProjectIdForExpoPush();
    if (!projectId) throw new Error("Project ID not found in Constants (EAS)");

    token = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
  } catch (e: any) {
    console.log("Push token error:", e?.message || e);
  }

  return token;
}

const to9AM = (ms: number) => {
  const d = new Date(ms);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
};

const isFuture = (ms: number) => ms > Date.now() + 30 * 1000;

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

  // ✅ Notifications
  const [expoPushToken, setExpoPushToken] = useState("");
  const notificationListener = useRef<Notifications.EventSubscription | null>(
    null
  );
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

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
  type CalendarTarget =
    | "taskStart"
    | "taskDue"
    | "subtaskStart"
    | "subtaskDue"
    | "newStart"
    | "newDue"
    | null;

  // ✅ Task chat drawer
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessageType[]>([]);
  const [chatText, setChatText] = useState("");

  // mention suggestions
  const [showMentionBox, setShowMentionBox] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");

  const todayStr = new Date().toISOString().split("T")[0];
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

  // ---------- NOTIFICATIONS INIT ----------

  useEffect(() => {
    registerForPushNotificationsAsync().then((token) => {
      if (token) setExpoPushToken(token);
    });

    notificationListener.current =
      Notifications.addNotificationReceivedListener(() => {});

    responseListener.current =
      Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const cancelNotificationSafe = async (id?: string | null) => {
    if (!id) return;
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {}
  };

  const scheduleAtTime = async (params: {
    title: string;
    body: string;
    atMs: number;
    data?: any;
  }) => {
    const { title, body, atMs, data } = params;
    if (!isFuture(atMs)) return null;

    const trigger = new Date(atMs);

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {} },
      trigger,
    });

    return id;
  };

  const upsertTaskReminders = async (
    taskId: string,
    payload: {
      taskName: string;
      startMs?: number | null;
      dueMs?: number | null;
      prevStartId?: string | null;
      prevDueId?: string | null;
    }
  ) => {
    const { taskName, startMs, dueMs, prevStartId, prevDueId } = payload;

    await cancelNotificationSafe(prevStartId);
    await cancelNotificationSafe(prevDueId);

    let notifStartId: string | null = null;
    let notifDueId: string | null = null;

    if (typeof startMs === "number") {
      const at = to9AM(startMs);
      notifStartId = await scheduleAtTime({
        title: "Task starts today",
        body: `🟦 ${taskName}`,
        atMs: at,
        data: { taskId, type: "start" },
      });
    }

    if (typeof dueMs === "number") {
      const at = to9AM(dueMs);
      notifDueId = await scheduleAtTime({
        title: "Task due today",
        body: `⏰ ${taskName}`,
        atMs: at,
        data: { taskId, type: "due" },
      });
    }

    await updateDoc(doc(db, "Tasks", taskId), {
      notifStartId,
      notifDueId,
    });

    return { notifStartId, notifDueId };
  };

  const upsertSubtaskDueReminder = async (
    taskId: string,
    subtaskId: string,
    payload: {
      subtaskName: string;
      dueMs?: number | null;
      prevDueId?: string | null;
    }
  ) => {
    await cancelNotificationSafe(payload.prevDueId);

    let notifDueId: string | null = null;
    if (typeof payload.dueMs === "number") {
      const at = to9AM(payload.dueMs);
      notifDueId = await scheduleAtTime({
        title: "Subtask due today",
        body: `✅ ${payload.subtaskName}`,
        atMs: at,
        data: { taskId, subtaskId, type: "subtask_due" },
      });
    }

    await updateDoc(doc(db, "Tasks", taskId, "Subtasks", subtaskId), {
      notifDueId,
    });

    return notifDueId;
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

      if (!selectedTask.completed) {
        const ids = await upsertTaskReminders(selectedTask.id, {
          taskName: trimmedName,
          startMs: startTimestamp,
          dueMs: dueTimestamp,
          prevStartId: selectedTask.notifStartId ?? null,
          prevDueId: selectedTask.notifDueId ?? null,
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
                notifStartId: ids.notifStartId,
                notifDueId: ids.notifDueId,
              }
            : prev
        );
      }

      Alert.alert("Saved", "Task updated successfully.");
    } catch (error) {
      console.error("Failed to update task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  // ✅ keep date calculations, just change modal UI

  const handleCompleteTaskToggle = async (task: TaskType) => {
    if (!task) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to update tasks.");
      return;
    }

    try {
      const newCompleted = !task.completed;

      if (newCompleted) {
        await cancelNotificationSafe(task.notifStartId ?? null);
        await cancelNotificationSafe(task.notifDueId ?? null);

        await updateDoc(doc(db, "Tasks", task.id), {
          completed: true,
          notifStartId: null,
          notifDueId: null,
          updatedAt: Date.now(),
        });

        await updateDoc(doc(db, "Tasks", task.id), {
          completed: true,
          notifStartId: null,
          notifDueId: null,
          updatedAt: Date.now(),
        });
        if (newCompleted) {
          await cancelNotificationSafe(task.notifStartId ?? null);
          await cancelNotificationSafe(task.notifDueId ?? null);

          await updateDoc(doc(db, "Tasks", task.id), {
            completed: true,
            notifStartId: null,
            notifDueId: null,
            updatedAt: Date.now(),
          });

          // ✅ Award XP/streak only once per task
          await awardTaskCompletionOnce(user.uid, task.id);
        }

        await upsertTaskReminders(task.id, {
          taskName: task.taskName,
          startMs: typeof task.startDate === "number" ? task.startDate : null,
          dueMs: typeof task.dueDate === "number" ? task.dueDate : null,
          prevStartId: task.notifStartId ?? null,
          prevDueId: task.notifDueId ?? null,
        });
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
      const t = tasks.find((x) => x.id === taskId);
      if (t) {
        await cancelNotificationSafe(t.notifStartId ?? null);
        await cancelNotificationSafe(t.notifDueId ?? null);
      }

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

      if (newCompleted) {
        await cancelNotificationSafe(subtask.notifDueId ?? null);
        await updateDoc(
          doc(db, "Tasks", selectedTask.id, "Subtasks", subtask.id),
          { notifDueId: null }
        );
      } else {
        if (typeof subtask.dueDate === "number") {
          await upsertSubtaskDueReminder(selectedTask.id, subtask.id, {
            subtaskName: subtask.taskName,
            dueMs: subtask.dueDate,
            prevDueId: subtask.notifDueId ?? null,
          });
        }
      }

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

    const docRef = await addDoc(
      collection(db, "Tasks", selectedTask.id, "Subtasks"),
      {
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
        notifDueId: null,
      }
    );

    try {
      await upsertSubtaskDueReminder(selectedTask.id, docRef.id, {
        subtaskName: subtaskName.trim(),
        dueMs: subtaskDueDate.getTime(),
        prevDueId: null,
      });
    } catch {}

    setSubtaskName("");
    setSubtaskDetails("");
    setSubtaskStartDate(null);
    setSubtaskDueDate(null);
  };

  // ✅ keep calculations, just use DatePickerModal UI

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
      await cancelNotificationSafe(subtask.notifDueId ?? null);
      await deleteDoc(
        doc(db, "Tasks", selectedTask.id, "Subtasks", subtask.id)
      );
    } catch (error) {
      Alert.alert("Error", "Failed to delete subtask");
    }
  };

  // ---------- COMMENTS ----------
  // (unchanged below)
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
        Alert.alert("Not logged in", "Please log in to export your tasks.");
        return;
      }

      const safe = (s: string) => escapeHtml(s || "");

      const isOverduePdf = (due?: number | null, completed?: boolean) => {
        if (!due || completed) return false;
        const d = new Date(due);
        d.setHours(0, 0, 0, 0);
        const t = new Date();
        t.setHours(0, 0, 0, 0);
        return d.getTime() < t.getTime();
      };

      const fmt = (ms?: number | null) =>
        typeof ms === "number" ? formatDate(new Date(ms)) : "-";

      // Summary
      const overdue = tasks.filter((t) =>
        isOverduePdf(t.dueDate, t.completed)
      ).length;
      const active = tasks.filter((t) => !t.completed).length;
      const completed = tasks.filter((t) => !!t.completed).length;

      const rows = tasks
        .map((t, i) => {
          const start = t.startDate ? formatDate(new Date(t.startDate)) : "-";
          const due = t.dueDate ? formatDate(new Date(t.dueDate)) : "-";
          const status = t.completed ? "Completed" : "Pending";

          const score =
            typeof t.priorityScore === "number" ? t.priorityScore : null;

          let priorityLabel = "Low";
          let priorityClass = "p-low";
          if (score != null && score >= 100) {
            priorityLabel = "High";
            priorityClass = "p-high";
          } else if (score != null && score >= 60) {
            priorityLabel = "Medium";
            priorityClass = "p-med";
          }

          const isOverdue =
            !t.completed &&
            typeof t.dueDate === "number" &&
            new Date(t.dueDate).setHours(0, 0, 0, 0) <
              new Date().setHours(0, 0, 0, 0);

          return `<tr class="${isOverdue ? "row-overdue" : ""}">
      <td class="col-no">${i + 1}</td>
      <td class="col-task">
        <div class="task-title ${t.completed ? "task-done" : ""}">
          ${escapeHtml(t.taskName || "")}
        </div>
        ${
          t.details
            ? `<div class="task-sub ${
                t.completed ? "task-done" : ""
              }">${escapeHtml(t.details)}</div>`
            : ""
        }
      </td>
      <td class="col-date">${start}</td>
      <td class="col-date">${due}</td>
      <td class="col-priority">
        ${
          score == null
            ? `<span class="badge p-low">—</span>`
            : `<span class="badge ${priorityClass}">${priorityLabel} <span class="badge-muted">(${score})</span></span>`
        }
      </td>
      <td class="col-status">
        <span class="badge ${t.completed ? "s-done" : "s-pending"}">
          ${status}
        </span>
        ${isOverdue ? `<span class="badge s-overdue">Overdue</span>` : ""}
      </td>
    </tr>`;
        })
        .join("");

      const generatedAt = new Date().toLocaleString();
      const accent = MODULE_COLOR;

      const html = `
<html>
  <head>
    <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
    <style>
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        background: #070a12;
        color: #e5e7eb;
        padding: 20px;
      }

      /* Page container */
      .page {
        max-width: 920px;
        margin: 0 auto;
      }

      /* Header */
      .header {
        border: 1px solid rgba(56,189,248,0.22);
        background: linear-gradient(180deg, rgba(2,6,23,1) 0%, rgba(7,12,24,1) 100%);
        border-radius: 16px;
        padding: 16px 16px 14px 16px;
        position: relative;
        overflow: hidden;
      }
      .header:before {
        content: "";
        position: absolute;
        inset: -40px -40px auto -40px;
        height: 120px;
        background: radial-gradient(circle at 20% 30%, rgba(56,189,248,0.20), transparent 60%);
        pointer-events: none;
      }
      .header-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
      }
      .title {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0.3px;
        margin: 0;
      }
      .subtitle {
        margin-top: 6px;
        font-size: 12px;
        color: #9ca3af;
        line-height: 1.4;
      }
      .chip {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(56,189,248,0.35);
        background: rgba(56,189,248,0.10);
        color: #c7f0ff;
        font-size: 11px;
        font-weight: 700;
        white-space: nowrap;
      }
      .accent-line {
        height: 3px;
        border-radius: 999px;
        margin-top: 14px;
        background: linear-gradient(90deg, rgba(56,189,248,0.15), rgba(56,189,248,0.95), rgba(56,189,248,0.15));
      }

      /* Summary cards */
      .summary {
        margin-top: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 12px;
      }
      .card {
        border: 1px solid rgba(148,163,184,0.18);
        background: rgba(2,6,23,0.85);
        border-radius: 16px;
        padding: 12px 12px 10px 12px;
        position: relative;
        overflow: hidden;
      }
      .card:after {
        content: "";
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: 3px;
        opacity: 0.9;
      }
      .card .k {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 700;
        letter-spacing: 0.3px;
        text-transform: uppercase;
      }
      .card .v {
        margin-top: 6px;
        font-size: 22px;
        font-weight: 900;
        color: #e5e7eb;
      }
      .card .hint {
        margin-top: 4px;
        font-size: 11px;
        color: #94a3b8;
      }
      .card.overdue:after { background: rgba(239,68,68,0.95); }
      .card.active:after { background: rgba(34,197,94,0.95); }
      .card.done:after { background: rgba(56,189,248,0.95); }

      /* Table container */
      .table-wrap {
        margin-top: 14px;
        border-radius: 16px;
        overflow: hidden;
        border: 1px solid rgba(56,189,248,0.18);
        background: rgba(2,6,23,0.75);
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      thead th {
        text-align: left;
        padding: 12px 12px;
        font-size: 11px;
        color: #b6c3d6;
        letter-spacing: 0.35px;
        text-transform: uppercase;
        border-bottom: 1px solid rgba(30,41,59,0.9);
        background: rgba(2,6,23,0.95);
      }
      tbody td {
        padding: 11px 12px;
        border-bottom: 1px solid rgba(30,41,59,0.6);
        vertical-align: top;
      }
      tbody tr {
        background: rgba(11,18,32,0.35);
      }
      tbody tr:nth-child(even) {
        background: rgba(7,16,30,0.55);
      }
      tbody tr:hover { background: rgba(56,189,248,0.06); }

      .row-overdue {
        background: rgba(239,68,68,0.08) !important;
      }

      /* Columns */
      .col-no { width: 40px; color: #94a3b8; font-weight: 800; }
      .col-date { width: 110px; color: #cbd5e1; }
      .col-priority { width: 150px; }
      .col-status { width: 170px; }

      /* Task cell */
      .task-title {
        font-weight: 900;
        color: #e5e7eb;
        line-height: 1.25;
      }
      .task-sub {
        margin-top: 4px;
        color: #9ca3af;
        line-height: 1.35;
        font-size: 11px;
      }
      .task-done { opacity: 0.65; text-decoration: line-through; }

      /* Badges */
      .badge {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 800;
        border: 1px solid rgba(148,163,184,0.22);
        background: rgba(15,23,42,0.65);
        color: #e5e7eb;
        margin-right: 6px;
        margin-bottom: 6px;
        white-space: nowrap;
      }
      .badge-muted { font-weight: 800; opacity: 0.7; }

      /* Priority colors (subtle, not bright) */
      .p-high { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.12); color: #fecaca; }
      .p-med  { border-color: rgba(96,165,250,0.35); background: rgba(96,165,250,0.12); color: #dbeafe; }
      .p-low  { border-color: rgba(148,163,184,0.22); background: rgba(148,163,184,0.10); color: #e5e7eb; }

      /* Status badges */
      .s-done    { border-color: rgba(34,197,94,0.35); background: rgba(34,197,94,0.12); color: #bbf7d0; }
      .s-pending { border-color: rgba(250,204,21,0.30); background: rgba(250,204,21,0.10); color: #fef9c3; }
      .s-overdue { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.12); color: #fecaca; }

      /* Footer */
      .footer {
        margin-top: 12px;
        display: flex;
        justify-content: space-between;
        color: #64748b;
        font-size: 10px;
      }

      /* Print spacing (expo-print behaves like print) */
      @page { margin: 18px; }
    </style>
  </head>

  <body>
    <div class="page">
      <div class="header">
        <div class="header-top">
          <div>
            <h1 class="title">Task Management • Task List</h1>
            <div class="subtitle">
              User: ${escapeHtml(user.email || "")}<br/>
              Generated: ${new Date().toLocaleString()}
            </div>
          </div>
          <div class="chip">MODULE • ${accent}</div>
        </div>
        <div class="accent-line"></div>
      </div>

      <div class="summary">
        <div class="card overdue">
          <div class="k">Overdue</div>
          <div class="v">${overdueCount}</div>
          <div class="hint">Pending tasks past due date</div>
        </div>
        <div class="card active">
          <div class="k">Active</div>
          <div class="v">${activeCount}</div>
          <div class="hint">Tasks not completed yet</div>
        </div>
        <div class="card done">
          <div class="k">Completed</div>
          <div class="v">${completedCount}</div>
          <div class="hint">Finished tasks</div>
        </div>
      </div>

      <div class="table-wrap">
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
            ${
              rows ||
              `<tr><td colspan="6" style="padding:16px;color:#94a3b8;">No tasks found.</td></tr>`
            }
          </tbody>
        </table>
      </div>

      <div class="footer">
        <div>Generated by PEARL • Task Module</div>
        <div>Theme: Dark Report</div>
      </div>
    </div>
  </body>
</html>
`;

      const { uri } = await Print.printToFileAsync({ html });
      await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err?.message ?? "Failed to generate PDF.");
    }
  };

  // ---------- ADD TASK (new task) ----------
  // ✅ keep calculations, just use DatePickerModal UI

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

      const docRef = await addDoc(collection(db, "Tasks"), {
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
        notifStartId: null,
        notifDueId: null,
      });

      try {
        await upsertTaskReminders(docRef.id, {
          taskName: name,
          startMs,
          dueMs,
          prevStartId: null,
          prevDueId: null,
        });
      } catch {}

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
          {label}
        </Text>
      </View>
    );
  };

  const threadRoots = useMemo(() => buildThreadTree(comments), [comments]);

  // ---------- STYLES ----------

  const isDark = theme?.isDark === true;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },

        // ✅ IMPORTANT: keep bottom padding so list doesn't hide behind taskbar
        list: { flex: 1 },
        listContent: {
          paddingHorizontal: theme.spacing.screenPadding,
          paddingBottom: theme.spacing.xxl + 190, // keeps space for bottom bar + floating add
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
        calendarOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(2,6,23,0.72)",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          elevation: 9999,
        },
        calendarSheet: {
          width: "92%",
          maxWidth: 420,
          borderRadius: 18,
          padding: 12,
          backgroundColor: theme.isDark ? "#050B16" : "#F8FAFC",
          borderWidth: 1,
          borderColor: `${MODULE_COLOR}55`,
          shadowColor: MODULE_COLOR,
          shadowOpacity: theme.isDark ? 0.9 : 0.35,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 9999,
        },
        calendarHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        },
        calendarHeaderTitle: {
          fontSize: 14,
          fontWeight: "900",
          color: theme.isDark ? "#E5E7EB" : "#0F172A",
        },
        calendarCloseBtn: {
          width: 34,
          height: 34,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.isDark ? "#1E293B" : "#CBD5E1",
          backgroundColor: theme.isDark ? "#0B1220" : "#FFFFFF",
        },
        calendarNeonLine: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          backgroundColor: MODULE_COLOR,
          shadowColor: MODULE_COLOR,
          shadowOpacity: 0.95,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 0 },
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

        taskCard: {
          flexDirection: "row",
          alignItems: "stretch",
          padding: theme.spacing.sm,
          borderRadius: 24,
          marginBottom: theme.spacing.sm,
          overflow: "hidden",
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
        taskContent: { flex: 1 },
        taskHeaderRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
        },
        taskTitleRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          flexShrink: 1,
        },
        taskMetaRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 4,
          flexWrap: "wrap",
        },
        taskMetaText: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
          marginRight: 8,
        },
        statusPill: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: 999,
          alignSelf: "flex-end",
          marginBottom: 4,
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

        // ✅✅✅ Taskbar B (applied)
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

                {!!expoPushToken && (
                  <Text
                    style={{ color: "#64748B", fontSize: 11, marginTop: 6 }}
                  >
                    Push Token: {expoPushToken.slice(0, 18)}...
                  </Text>
                )}
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
                      opacity: isCompleted ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={styles.taskContent}>
                    <View style={styles.taskHeaderRow}>
                      <View style={styles.taskTitleRow}>
                        <TouchableOpacity
                          onPress={() => handleCompleteTaskToggle(item)}
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

                        <View style={{ flexShrink: 1 }}>
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

                      <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                        {isOverdue && !isCompleted && (
                          <View
                            style={[
                              styles.statusPill,
                              { backgroundColor: "#FEE2E2" },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: theme.typography.fontSizes.xs,
                                fontWeight:
                                  theme.typography.fontWeights.semibold,
                                color: "#B91C1C",
                              }}
                            >
                              OVERDUE
                            </Text>
                          </View>
                        )}
                        {getPriorityChip(item.priorityScore)}
                      </View>
                    </View>

                    <View style={styles.taskMetaRow}>
                      {item.startDate && (
                        <Text style={styles.taskMetaText}>
                          Start: {formatDate(new Date(item.startDate))}
                        </Text>
                      )}
                      {item.dueDate && (
                        <Text style={styles.taskMetaText}>
                          • Due: {formatDate(new Date(item.dueDate))}
                        </Text>
                      )}
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => handleDeleteTask(item.id)}
                    style={{
                      paddingHorizontal: 6,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="trash-outline" size={20} color="#F97373" />
                  </TouchableOpacity>

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

          {/* My Task */}
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

          {/* My Event (current) */}
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
              {/* ✅✅✅ REPLACED CALENDAR MODALS (UI only) */}
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
                            style={{
                              position: "absolute",
                              right: 10,
                              top: 10,
                            }}
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

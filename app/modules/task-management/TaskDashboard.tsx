// src/screens/Task/TaskDashboard.tsx
import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text, TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";
import { RAG_API_HOST } from "./localRag";

const MODULE_COLOR = "#38BDF8";

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

type BucketKey = "doNow" | "doSoon" | "plan" | "low";
type ViewMode = "all" | "assignedToMe" | "ai";

// ---------- helpers ----------
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

const formatDate = (timestamp?: number) => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const isOverdue = (due?: number) => {
  if (typeof due !== "number") return false;
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

const canUserSeeTask = (task: TaskType, user: any | null): boolean => {
  if (!user) return false;
  const uid = user.uid;
  const email = (user.email || "").toLowerCase();

  if (task.CreatedUser?.id === uid) return true;

  const assigned = task.assignedTo;
  if (Array.isArray(assigned)) {
    if (
      assigned.some((e) => typeof e === "string" && e.toLowerCase() === email)
    ) {
      return true;
    }
  } else if (typeof assigned === "string") {
    if (assigned.toLowerCase() === email) return true;
  }

  const guests: any = (task as any).guests;
  if (Array.isArray(guests) && email) {
    const guestEmails = guests
      .filter((g: any) => typeof g === "string")
      .map((g: string) => g.toLowerCase());
    if (guestEmails.includes(email)) return true;
  }

  return false;
};

// ---------- screen ----------
export default function TaskDashboard() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const db = getFirestore();
  const auth = getAuth();

  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const [aiQuestion, setAiQuestion] = useState(
    "What are the top 3 tasks I should do today?"
  );
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // ---------- styles ----------
  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 6,
        },
        headerTitle: {
          fontSize: 20,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
          columnGap: 8,
        },
        contentScroll: {
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 10,
        },
        heroCard: {
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 16,
          marginBottom: 14,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
          shadowColor: theme.isDark ? "#000" : MODULE_COLOR,
          shadowOpacity: theme.isDark ? 0.45 : 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        },
        heroRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
        },
        heroTitle: {
          fontSize: 16,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        heroSubtitle: {
          fontSize: 12,
          color: theme.colors.textSecondary,
          marginTop: 2,
        },
        heroBadge: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.isDark ? "#022C22" : "#DCFCE7",
        },
        heroBadgeText: {
          fontSize: 11,
          color: theme.isDark ? "#6EE7B7" : "#166534",
          fontWeight: "600",
        },
        focusList: { marginTop: 8 },
        focusItemRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 4,
        },
        focusBullet: {
          width: 6,
          height: 6,
          borderRadius: 999,
          backgroundColor: MODULE_COLOR,
          marginRight: 8,
        },
        focusText: {
          flex: 1,
          fontSize: 12,
          color: theme.colors.textPrimary,
        },
        focusMeta: {
          fontSize: 11,
          color: theme.colors.textSecondary,
        },
        progressWrapper: { marginTop: 10 },
        progressLabelRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        },
        progressBarBase: {
          height: 6,
          borderRadius: 999,
          backgroundColor: theme.isDark ? "#111827" : "#E5E7EB",
          overflow: "hidden",
        },
        progressBarFill: {
          height: 6,
          borderRadius: 999,
          backgroundColor: MODULE_COLOR,
        },
        insightRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 8,
        },
        insightPill: {
          flexDirection: "row",
          alignItems: "center",
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 4,
          marginRight: 6,
          marginTop: 4,
          backgroundColor: theme.isDark ? "#020617" : "#E5E7EB",
          borderWidth: 1,
          borderColor: theme.isDark ? "#1F2937" : "#D1D5DB",
        },
        insightPillText: {
          fontSize: 11,
          color: theme.colors.textSecondary,
        },
        summaryRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 10,
        },
        summaryCard: {
          flex: 1,
          borderRadius: 16,
          paddingVertical: 10,
          paddingHorizontal: 10,
          marginHorizontal: 4,
          borderWidth: 1,
        },
        // neon bottom line reusable (hero + summary)
        neonBottomLine: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          borderBottomLeftRadius: 20,
          borderBottomRightRadius: 20,
        },
        chipTabsWrapper: {
          flexDirection: "row",
          borderRadius: 999,
          backgroundColor: theme.isDark ? "#020617" : "#E5E7EB",
          padding: 4,
          marginBottom: 12,
        },
        tabChip: {
          flex: 1,
          paddingVertical: 6,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        },
        sectionTitle: {
          fontSize: 16,
          fontWeight: "700",
          marginBottom: 2,
          color: theme.colors.textPrimary,
        },
        sectionSubtitle: {
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginBottom: 8,
        },
        // individual task card (inside sections)
        taskCard: {
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.card,
          padding: 12,
          marginBottom: 10,
          position: "relative",
          overflow: "hidden",
        },

        // --- AI panel styles ---
        aiCardOuter: {
          marginTop: 12,
          marginBottom: 12,
          borderRadius: 20,
          padding: 2,
          backgroundColor: theme.isDark ? "#020617" : "#DBEAFE",
          shadowColor: MODULE_COLOR,
          shadowOpacity: theme.isDark ? 0.6 : 0.3,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        },
        aiCardInner: {
          borderRadius: 18,
          padding: 14,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        aiHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        },
        aiHeaderLeft: {
          flexDirection: "row",
          alignItems: "center",
          flex: 1,
        },
        aiHeaderIconWrapper: {
          width: 30,
          height: 30,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 8,
          backgroundColor: theme.isDark ? "#0f172a" : "#DBEAFE",
        },
        aiHeaderTitle: {
          fontSize: 15,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        aiHeaderSubtitle: {
          fontSize: 11,
          color: theme.colors.textSecondary,
        },
        aiHeaderBadge: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: theme.isDark ? "#022c22" : "#DCFCE7",
        },
        aiHeaderBadgeText: {
          fontSize: 11,
          fontWeight: "600",
          color: theme.isDark ? "#6EE7B7" : "#166534",
        },
        aiQuickRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 6,
          marginBottom: 6,
        },
        aiQuickButton: {
          marginRight: 6,
          marginBottom: 6,
        },
        aiMetaRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 4,
          marginBottom: 4,
        },
        aiMetaText: {
          fontSize: 10,
          color: theme.colors.textSecondary,
        },
        aiAnswerContainer: {
          marginTop: 10,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: theme.isDark ? "#374151" : "#D1D5DB",
          padding: 8,
          backgroundColor: theme.isDark ? "#020617" : "#F9FAFB",
        },
        aiAnswerHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 4,
        },
        aiAnswerHeaderText: {
          fontSize: 12,
          fontWeight: "600",
          color: theme.isDark ? "#E5E7EB" : "#111827",
          marginLeft: 4,
        },
        aiAnswerBodyText: {
          fontSize: 13,
          lineHeight: 18,
          color: theme.isDark ? "#E5E7EB" : "#111827",
          marginTop: 4,
        },
        aiEmptyHint: {
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginTop: 4,
        },
      }),
    [theme]
  );

  // ---------- Firestore ----------
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
  }, []);

  const myEmail = auth.currentUser?.email?.toLowerCase() ?? null;

  const activeTasks = useMemo(() => {
    return tasks
      .filter((t) => !t.completed)
      .filter((t) => {
        if (viewMode !== "assignedToMe" || !myEmail) return true;

        const assigned = t.assignedTo;
        if (!assigned) return false;
        if (Array.isArray(assigned)) {
          return assigned.some(
            (e) => typeof e === "string" && e.toLowerCase() === myEmail
          );
        }
        return typeof assigned === "string"
          ? assigned.toLowerCase() === myEmail
          : false;
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

  const totalActive = activeTasks.length;
  const totalTasksAll = tasks.length;
  const completedTasksAll = tasks.filter((t) => t.completed).length;
  const overdueTasksAll = tasks.filter(
    (t) => !t.completed && isOverdue(t.dueDate)
  ).length;
  const completionRate =
    totalTasksAll > 0 ? completedTasksAll / totalTasksAll : 0;

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

  const topFocusTasks = activeTasks.slice(0, 3);

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

  // ---------- AI helpers ----------
  // ---------- AI helpers ----------
  const buildTasksContextForAI = useCallback(() => {
    if (activeTasks.length === 0) return "No active tasks.";

    const today = new Date();
    const utcToday = Date.UTC(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    let daysUntilDue = "null";
    let overdueFlag = "no";

    const slice = activeTasks.slice(0, 30); // at most 30 tasks to AI

    const getBucketLabel = (score: number) => {
      if (score >= 90) return "Do Now";
      if (score >= 60) return "Do Soon";
      if (score >= 30) return "Plan";
      return "Low";
    };

    return slice
      .map((t, index) => {
        const start = t.startDate ? formatDate(t.startDate) : "-";
        const due = t.dueDate ? formatDate(t.dueDate) : "-";
        const score = t.priorityScore ?? 0;
        const bucket = getBucketLabel(score);

        let daysUntilDue: string | number = "null";
        let overdueFlag = "no";

        if (typeof t.dueDate === "number") {
          const due = new Date(t.dueDate);
          const utcDue = Date.UTC(
            due.getFullYear(),
            due.getMonth(),
            due.getDate()
          );

          const diffDays = Math.floor(
            (utcDue - utcToday) / (24 * 60 * 60 * 1000)
          );

          daysUntilDue = diffDays;
          if (diffDays < 0) overdueFlag = "yes";
        }

        return (
          `#${index + 1}\n` +
          `Title: ${t.taskName}\n` +
          (t.details ? `Details: ${t.details}\n` : "") +
          `PriorityScore: ${score} (${bucket})\n` +
          `Start: ${start} | Due: ${due}\n` +
          `DaysUntilDue: ${daysUntilDue}\n` +
          `Overdue: ${overdueFlag}\n` +
          `Completed: ${t.completed ? "Yes" : "No"}`
        );
      })
      .join("\n\n");
  }, [activeTasks]);

  const handleAskPriorityAI = async (customQuestion?: string) => {
    const q = (customQuestion ?? aiQuestion).trim();
    if (!q) return;

    setAiQuestion(q);
    setAiAnswer("");
    setAiLoading(true);

    try {
      const tasksContext = buildTasksContextForAI();

      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const fullPrompt = `
You are an AI task coach inside a university student's mobile task management app.

DATE & FORMAT
- Today is ${new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })}.
- All dates are in DD/MM/YYYY format (example: 01/12/2025 = 1 December 2025, NOT January 12).
- For EACH task, you are given "DaysUntilDue":
  - If DaysUntilDue < 0  → the task is already PAST DUE (overdue).
  - If 0 ≤ DaysUntilDue ≤ 7 → the task is due THIS WEEK.
  - If DaysUntilDue > 7 → the task is due LATER (not this week).

VERY IMPORTANT RULES ABOUT TIME
- NEVER guess based on the written date string.
- ALWAYS rely on the numeric value "DaysUntilDue" for deciding:
  - overdue vs this week vs later.
- If the user asks "Which task is need to be settle for this week":
  - Only consider tasks with 0 ≤ DaysUntilDue ≤ 7.
  - Do NOT describe tasks with DaysUntilDue < 0 as "upcoming" or "this week" — they are already overdue.
  - Do NOT describe tasks with DaysUntilDue > 7 as "this week" — they are later.

GENERAL GOAL
Help the user:
1) Decide which 3–5 tasks to focus on next.
2) Decide which tasks to schedule later in the week.
3) Decide which tasks can be postponed safely.

OTHER RULES
- NEVER invent tasks that are not in the list.
- Ignore tasks that are already "Completed: Yes".
- Prioritise tasks that are:
  - Overdue (DaysUntilDue < 0), or
  - Due this week (0–7), especially with high PriorityScore.
- Use simple, friendly language (like a senior helping a junior).
- Keep your answer under about 180 words.

OUTPUT FORMAT (ALWAYS USE THIS):

Immediate focus (do these first today):
- (#taskNumber) Task title — short reason (due date / urgency / importance)

This week (schedule these within the week):
- (#taskNumber) Task title — which day to do it and why

Can postpone for now:
- (#taskNumber) Task title — why it is safe to delay

If there are fewer tasks available for any section, just list fewer items.

HERE ARE THE TASKS:
${tasksContext}

USER QUESTION:
${q}
`;

      const response = await fetch(RAG_API_HOST + "/search_rag_model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "DeepSeek-R1-Distill-Qwen-7B", // keep the exact name your backend expects
          text: fullPrompt,
          n_results: 3,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.log("RAG error body:", errorBody);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setAiAnswer(data.model_answer || "No response from model.");
    } catch (err: any) {
      setAiAnswer("Error: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ---------- UI helpers ----------
  const renderTaskCard = (task: TaskType) => {
    const score = task.priorityScore ?? 0;
    let neonColor = "#22D3EE";

    if (score >= 90) {
      neonColor = "#F87171";
    } else if (score >= 60) {
      neonColor = "#FBBF24";
    } else if (score >= 30) {
      neonColor = "#60A5FA";
    } else {
      neonColor = "#9CA3AF";
    }

    return (
      <View
        key={task.id}
        style={[
          styles.taskCard,
          {
            shadowColor: neonColor,
            shadowOpacity: theme.isDark ? 0.35 : 0.25,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: 5,
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => handleCompleteTaskToggle(task)}
            style={{ marginRight: 8 }}
          >
            <Ionicons
              name="ellipse-outline"
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "700",
                color: theme.colors.textPrimary,
                marginBottom: 2,
              }}
            >
              {task.taskName}
            </Text>
            {task.details ? (
              <Text
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                }}
                numberOfLines={1}
              >
                {task.details}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 11,
                color: theme.colors.textSecondary,
                marginTop: 4,
              }}
            >
              Start: {formatDate(task.startDate)} • Due:{" "}
              {formatDate(task.dueDate)}
            </Text>
          </View>
        </View>

        {/* neon strip at bottom of each task card */}
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 4,
            backgroundColor: neonColor,
            shadowColor: neonColor,
            shadowOpacity: 0.9,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            borderBottomLeftRadius: 16,
            borderBottomRightRadius: 16,
          }}
        />
      </View>
    );
  };

  const renderSection = (title: string, subtitle: string, list: TaskType[]) => {
    if (list.length === 0) return null;

    return (
      <View style={{ marginTop: 18 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        {list.map(renderTaskCard)}
      </View>
    );
  };

  // ---------- render ----------
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
          <Text style={styles.headerTitle}>AI Task Dashboard</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon={theme.isDark ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        {/* MAIN CONTENT */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {/* AI Prioritized Tasks orb header */}
          <View style={{ alignItems: "center", marginBottom: 20 }}>
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                backgroundColor: `${MODULE_COLOR}10`,
                shadowColor: MODULE_COLOR,
                shadowOpacity: theme.isDark ? 0.7 : 0.3,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                elevation: 12,
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={62}
                color={MODULE_COLOR}
              />
            </View>

            <Text
              style={{
                fontSize: theme.typography.fontSizes.xxl,
                fontWeight: theme.typography.fontWeights.bold,
                color: theme.colors.textPrimary,
                marginBottom: 4,
              }}
            >
              AI Prioritized Tasks
            </Text>

            <Text
              style={{
                fontSize: theme.typography.fontSizes.md,
                color: theme.colors.textSecondary,
              }}
            >
              Smart suggestions based on urgency & priority
            </Text>
          </View>

          {/* Today’s AI Focus card */}
          <Card style={[styles.heroCard]}>
            <View style={styles.heroRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.heroTitle}>Today’s AI Focus</Text>
                <Text style={styles.heroSubtitle}>
                  Based on due dates and priority scores, these are the tasks
                  that matter most right now.
                </Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  {overdueTasksAll > 0
                    ? `${overdueTasksAll} overdue`
                    : "All on track"}
                </Text>
              </View>
            </View>

            <View style={styles.focusList}>
              {topFocusTasks.length === 0 ? (
                <Text style={styles.focusText}>
                  No active tasks. Create a new task from the Task menu to get
                  AI guidance.
                </Text>
              ) : (
                topFocusTasks.map((t, idx) => (
                  <View key={t.id} style={styles.focusItemRow}>
                    <View style={styles.focusBullet} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.focusText} numberOfLines={1}>
                        {idx + 1}. {t.taskName}
                      </Text>
                      <Text style={styles.focusMeta}>
                        Score {t.priorityScore ?? 0} • Due{" "}
                        {formatDate(t.dueDate)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.progressWrapper}>
              <View style={styles.progressLabelRow}>
                <Text style={styles.focusMeta}>
                  Completion rate: {Math.round(completionRate * 100)}%
                </Text>
                <Text style={styles.focusMeta}>
                  {completedTasksAll}/{totalTasksAll} done
                </Text>
              </View>
              <View style={styles.progressBarBase}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(completionRate * 100)}%` },
                  ]}
                />
              </View>
            </View>

            <View style={styles.insightRow}>
              <View style={styles.insightPill}>
                <Ionicons
                  name="flame"
                  size={14}
                  color="#F97316"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.insightPillText}>
                  {buckets.doNow.length} high-priority
                </Text>
              </View>
              <View style={styles.insightPill}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color="#FACC15"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.insightPillText}>
                  {overdueTasksAll} overdue task(s)
                </Text>
              </View>
              <View style={styles.insightPill}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={14}
                  color="#4ADE80"
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.insightPillText}>
                  {completedTasksAll} completed overall
                </Text>
              </View>
            </View>

            {/* Neon bottom line for hero card */}
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

          {/* Summary cards row */}
          <View style={styles.summaryRow}>
            {/* Do Now */}
            <Card
              style={[
                styles.summaryCard,
                theme.isDark
                  ? {
                      marginRight: 4,
                      backgroundColor: "#111827",
                      borderColor: "#FCA5A5",
                      shadowColor: "#FCA5A5",
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    }
                  : {
                      marginRight: 4,
                      backgroundColor: "#FEE2E2",
                      borderColor: "#FB7185",
                      shadowColor: "#FB7185",
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: theme.isDark ? "#FCA5A5" : "#7f1d1d",
                }}
              >
                Do Now
              </Text>
              <Text
                fontWeight="bold"
                style={{
                  fontSize: 18,
                  color: theme.isDark ? "#FEE2E2" : "#7f1d1d",
                }}
              >
                {buckets.doNow.length}
              </Text>

              {/* Neon line */}
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: "#FB7185",
                    shadowColor: "#FB7185",
                    shadowOpacity: 0.9,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                  },
                ]}
              />
            </Card>

            {/* Do Soon */}
            <Card
              style={[
                styles.summaryCard,
                theme.isDark
                  ? {
                      backgroundColor: "#111827",
                      borderColor: "#FCD34D",
                      shadowColor: "#FCD34D",
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    }
                  : {
                      backgroundColor: "#FEF3C7",
                      borderColor: "#FBBF24",
                      shadowColor: "#FBBF24",
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: theme.isDark ? "#FCD34D" : "#92400e",
                }}
              >
                Do Soon
              </Text>
              <Text
                fontWeight="bold"
                style={{
                  fontSize: 18,
                  color: theme.isDark ? "#FEF3C7" : "#92400e",
                }}
              >
                {buckets.doSoon.length}
              </Text>

              {/* Neon line */}
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: "#FBBF24",
                    shadowColor: "#FBBF24",
                    shadowOpacity: 0.9,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                  },
                ]}
              />
            </Card>

            {/* Plan */}
            <Card
              style={[
                styles.summaryCard,
                theme.isDark
                  ? {
                      backgroundColor: "#111827",
                      borderColor: "#60A5FA",
                      shadowColor: "#60A5FA",
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    }
                  : {
                      backgroundColor: "#DBEAFE",
                      borderColor: "#60A5FA",
                      shadowColor: "#60A5FA",
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: theme.isDark ? "#93C5FD" : "#1d4ed8",
                }}
              >
                Plan
              </Text>
              <Text
                fontWeight="bold"
                style={{
                  fontSize: 18,
                  color: theme.isDark ? "#EFF6FF" : "#1d4ed8",
                }}
              >
                {buckets.plan.length}
              </Text>

              {/* Neon line */}
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: "#60A5FA",
                    shadowColor: "#60A5FA",
                    shadowOpacity: 0.9,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                  },
                ]}
              />
            </Card>

            {/* Low */}
            <Card
              style={[
                styles.summaryCard,
                theme.isDark
                  ? {
                      marginLeft: 4,
                      backgroundColor: "#111827",
                      borderColor: "#9CA3AF",
                      shadowColor: "#9CA3AF",
                      shadowOpacity: 0.35,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    }
                  : {
                      marginLeft: 4,
                      backgroundColor: "#E5E7EB",
                      borderColor: "#9CA3AF",
                      shadowColor: "#9CA3AF",
                      shadowOpacity: 0.2,
                      shadowRadius: 12,
                      shadowOffset: { width: 0, height: 6 },
                      elevation: 6,
                    },
              ]}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: theme.isDark ? "#E5E7EB" : "#374151",
                }}
              >
                Low
              </Text>
              <Text
                fontWeight="bold"
                style={{
                  fontSize: 18,
                  color: theme.isDark ? "#F9FAFB" : "#374151",
                }}
              >
                {buckets.low.length}
              </Text>

              {/* Neon line */}
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: "#9CA3AF",
                    shadowColor: "#9CA3AF",
                    shadowOpacity: 0.9,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 0 },
                    borderBottomLeftRadius: 16,
                    borderBottomRightRadius: 16,
                  },
                ]}
              />
            </Card>
          </View>

          <Text
            style={{
              fontSize: 11,
              color: theme.colors.textSecondary,
              marginBottom: 8,
            }}
          >
            {totalActive} active tasks sorted by AI priority score
          </Text>

          {/* Tabs */}
          <View style={styles.chipTabsWrapper}>
            <TouchableOpacity
              onPress={() => setViewMode("all")}
              style={[
                styles.tabChip,
                {
                  backgroundColor:
                    viewMode === "all" ? MODULE_COLOR : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color:
                    viewMode === "all"
                      ? "#0f172a"
                      : theme.isDark
                      ? "#E5E7EB"
                      : "#374151",
                }}
              >
                All Tasks
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode("assignedToMe")}
              style={[
                styles.tabChip,
                {
                  backgroundColor:
                    viewMode === "assignedToMe" ? MODULE_COLOR : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color:
                    viewMode === "assignedToMe"
                      ? "#0f172a"
                      : theme.isDark
                      ? "#E5E7EB"
                      : "#374151",
                }}
              >
                Assigned To Me
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setViewMode("ai")}
              style={[
                styles.tabChip,
                {
                  backgroundColor:
                    viewMode === "ai" ? MODULE_COLOR : "transparent",
                },
              ]}
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color:
                    viewMode === "ai"
                      ? "#0f172a"
                      : theme.isDark
                      ? "#E5E7EB"
                      : "#374151",
                }}
              >
                AI Assistant
              </Text>
            </TouchableOpacity>
          </View>

          {/* AI view or task sections */}
          {viewMode === "ai" ? (
            <View style={styles.aiCardOuter}>
              <View style={styles.aiCardInner}>
                {/* Header */}
                <View style={styles.aiHeaderRow}>
                  <View style={styles.aiHeaderLeft}>
                    <View style={styles.aiHeaderIconWrapper}>
                      <Ionicons
                        name="sparkles-outline"
                        size={18}
                        color={MODULE_COLOR}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.aiHeaderTitle}>
                        AI Priority Assistant
                      </Text>
                      <Text style={styles.aiHeaderSubtitle}>
                        Ask which tasks to tackle first. Uses your current tasks
                        plus rules stored in ChromaDB.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.aiHeaderBadge}>
                    <Text style={styles.aiHeaderBadgeText}>
                      {totalActive} active
                    </Text>
                  </View>
                </View>

                {/* Quick prompts */}
                <View style={styles.aiQuickRow}>
                  <Button
                    text="What should I do today?"
                    size="sm"
                    style={styles.aiQuickButton}
                    onPress={() =>
                      handleAskPriorityAI(
                        "What are the top 3 tasks I should do today?"
                      )
                    }
                  />
                  <Button
                    text="Plan my week"
                    size="sm"
                    style={styles.aiQuickButton}
                    onPress={() =>
                      handleAskPriorityAI(
                        "Help me plan which tasks to schedule over the next 7 days."
                      )
                    }
                  />
                  <Button
                    text="Focus on overdue tasks"
                    size="sm"
                    style={styles.aiQuickButton}
                    onPress={() =>
                      handleAskPriorityAI(
                        "Which overdue tasks should I clear first?"
                      )
                    }
                  />
                </View>

                {/* Input */}
                <TextInput
                  containerStyle={{
                    marginTop: 4,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.card,
                  }}
                  style={{
                    color: theme.colors.textPrimary,
                    minHeight: 40,
                  }}
                  placeholder="Ask something like: Which tasks are most urgent before Friday?"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={aiQuestion}
                  onChangeText={setAiQuestion}
                  multiline
                />

                {/* Meta row */}
                <View style={styles.aiMetaRow}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={12}
                    color={theme.colors.textSecondary}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.aiMetaText}>
                    Runs locally via your RAG backend – no tasks are sent to
                    external cloud.
                  </Text>
                </View>

                {/* Ask button */}
                <Button
                  text={aiLoading ? "Thinking..." : "Ask AI"}
                  onPress={() => handleAskPriorityAI()}
                  disabled={aiLoading}
                  style={{ marginTop: 6 }}
                />

                {/* Answer */}
                <View style={styles.aiAnswerContainer}>
                  <View style={styles.aiAnswerHeaderRow}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={16}
                      color={MODULE_COLOR}
                    />
                    <Text style={styles.aiAnswerHeaderText}>AI response</Text>
                  </View>

                  {aiAnswer ? (
                    <Text style={styles.aiAnswerBodyText}>{aiAnswer}</Text>
                  ) : (
                    <Text style={styles.aiEmptyHint}>
                      Ask a question above to see the AI’s suggested plan here.
                      It will reference your current tasks and their priority
                      scores.
                    </Text>
                  )}
                </View>
              </View>
            </View>
          ) : (
            <>
              {renderSection(
                "Do Now (Highest Priority)",
                "Tasks that are urgent and important. Work on these first.",
                buckets.doNow
              )}
              {renderSection(
                "Do Soon",
                "Tasks that are important but slightly less urgent.",
                buckets.doSoon
              )}
              {renderSection(
                "Plan / Later",
                "Tasks with medium priority. Keep them on your radar.",
                buckets.plan
              )}
              {renderSection(
                "Low Priority",
                "Nice-to-do tasks with lower urgency.",
                buckets.low
              )}

              {totalActive === 0 && (
                <View
                  style={{
                    marginTop: 40,
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    No active tasks to show.
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

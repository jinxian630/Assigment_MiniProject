// src/screens/Task/TaskDashboard.tsx
import React, { useEffect, useState, useMemo } from "react";
import { View, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  TextInput,
  Button,
} from "react-native-rapi-ui";
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

import { RAG_API_HOST } from "./localRag";

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

// ---------- screen ----------
export default function TaskDashboard() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
  const db = getFirestore();
  const auth = getAuth();

  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("all"); // All / Assigned / AI

  // AI chat state
  const [aiQuestion, setAiQuestion] = useState(
    "What are the top 3 tasks I should do today?"
  );
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
      setTasks(list);
    });

    return () => unsub();
  }, []);

  const myEmail = auth.currentUser?.email?.toLowerCase() ?? null;

  // use "assignedToMe" logic only when viewMode === "assignedToMe"
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
        const score =
          typeof t.priorityScore === "number"
            ? t.priorityScore
            : computePriorityScore({
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

  // ---------- toggle complete ----------
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

  // ---------- build context for AI ----------
  const buildTasksContextForAI = () => {
    if (activeTasks.length === 0) return "No active tasks.";

    const slice = activeTasks.slice(0, 20);
    return slice
      .map((t, index) => {
        const start = t.startDate ? formatDate(t.startDate) : "-";
        const due = t.dueDate ? formatDate(t.dueDate) : "-";
        const priority = t.priorityScore ?? "N/A";

        return (
          `${index + 1}. Title: ${t.taskName}\n` +
          (t.details ? `   Details: ${t.details}\n` : "") +
          `   Start: ${start} | Due: ${due}\n` +
          `   Completed: ${t.completed ? "Yes" : "No"}\n` +
          `   PriorityScore: ${priority}`
        );
      })
      .join("\n\n");
  };

  // ---------- call RAG API ----------
  const handleAskPriorityAI = async (customQuestion?: string) => {
    const q = (customQuestion ?? aiQuestion).trim();
    if (!q) return;

    setAiQuestion(q);
    setAiAnswer("");
    setAiLoading(true);

    try {
      const tasksContext = buildTasksContextForAI();

      const fullPrompt = `
You are an AI assistant helping a student manage tasks in a mobile app.

You will receive:
1) A list of their current tasks (with due dates, completion status and priorityScore).
2) A question from the user.

You MUST:
- Recommend which 1–5 tasks they should focus on first.
- Mention tasks that can be postponed or scheduled later.
- Consider due dates (overdue & due soon are more urgent).
- Consider priorityScore (higher = more important).
- Answer directly about their tasks (do NOT talk about US presidents).

Here are the tasks:
${tasksContext}

User question:
${q}
`;

      const response = await fetch(RAG_API_HOST + "/search_rag_model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "deepseek-r1:1.5b",
          text: fullPrompt,
          n_results: 3,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // ❗ Only use model_answer. Ignore retrieved documents to avoid
      // that Barack Obama / Donald Trump demo text.
      const answerText = data.model_answer || "No response from model.";
      setAiAnswer(answerText);
    } catch (err: any) {
      setAiAnswer("Error: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  // ---------- UI helpers ----------
  const renderTaskCard = (task: TaskType) => (
    <View
      key={task.id}
      style={{
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "#1f2933",
        backgroundColor: isDarkmode ? "#020617" : "#0f172a",
        padding: 12,
        marginBottom: 8,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => handleCompleteTaskToggle(task)}
          style={{ marginRight: 8 }}
        >
          <Ionicons
            name="ellipse-outline"
            size={20}
            color={isDarkmode ? "#9CA3AF" : "#E5E7EB"}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text
            fontWeight="bold"
            style={{ fontSize: 15, color: "#E5E7EB", marginBottom: 2 }}
          >
            {task.taskName}
          </Text>
          {task.details ? (
            <Text
              style={{
                fontSize: 12,
                color: "#9CA3AF",
              }}
              numberOfLines={1}
            >
              {task.details}
            </Text>
          ) : null}
          <Text
            style={{
              fontSize: 11,
              color: "#9CA3AF",
              marginTop: 4,
            }}
          >
            Start: {formatDate(task.startDate)} Due: {formatDate(task.dueDate)}
          </Text>
        </View>

        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: "#38BDF8",
            marginLeft: 8,
          }}
        >
          <Text
            style={{
              color: "#0f172a",
              fontSize: 11,
              fontWeight: "bold",
            }}
          >
            Score {task.priorityScore ?? 0}
          </Text>
        </View>
      </View>
    </View>
  );

  const renderSection = (title: string, subtitle: string, list: TaskType[]) => {
    if (list.length === 0) return null;

    return (
      <View style={{ marginTop: 18 }}>
        <Text
          fontWeight="bold"
          style={{ fontSize: 16, marginBottom: 2, color: "#E5E7EB" }}
        >
          {title}
        </Text>
        <Text style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 8 }}>
          {subtitle}
        </Text>
        {list.map(renderTaskCard)}
      </View>
    );
  };

  // ---------- render ----------
  return (
    <Layout>
      <TopNav
        middleContent="AI Task Dashboard"
        leftContent={
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
        rightContent={
          <TouchableOpacity
            onPress={() => setTheme(isDarkmode ? "light" : "dark")}
          >
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        {/* Summary cards */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <View
            style={{
              flex: 1,
              marginRight: 6,
              borderRadius: 12,
              padding: 10,
              backgroundColor: "#fecaca",
            }}
          >
            <Text style={{ fontSize: 11, color: "#7f1d1d" }}>Do Now</Text>
            <Text fontWeight="bold" style={{ fontSize: 18, color: "#7f1d1d" }}>
              {buckets.doNow.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              marginHorizontal: 3,
              borderRadius: 12,
              padding: 10,
              backgroundColor: "#fef3c7",
            }}
          >
            <Text style={{ fontSize: 11, color: "#92400e" }}>Do Soon</Text>
            <Text fontWeight="bold" style={{ fontSize: 18, color: "#92400e" }}>
              {buckets.doSoon.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              marginHorizontal: 3,
              borderRadius: 12,
              padding: 10,
              backgroundColor: "#bfdbfe",
            }}
          >
            <Text style={{ fontSize: 11, color: "#1d4ed8" }}>Plan</Text>
            <Text fontWeight="bold" style={{ fontSize: 18, color: "#1d4ed8" }}>
              {buckets.plan.length}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              marginLeft: 6,
              borderRadius: 12,
              padding: 10,
              backgroundColor: "#e5e7eb",
            }}
          >
            <Text style={{ fontSize: 11, color: "#374151" }}>Low</Text>
            <Text fontWeight="bold" style={{ fontSize: 18, color: "#374151" }}>
              {buckets.low.length}
            </Text>
          </View>
        </View>

        <Text
          style={{
            fontSize: 11,
            color: "#9CA3AF",
            marginBottom: 8,
          }}
        >
          {totalActive} active tasks sorted by AI priority score
        </Text>

        {/* Tabs: All / Assigned / AI */}
        <View
          style={{
            flexDirection: "row",
            borderRadius: 999,
            backgroundColor: isDarkmode ? "#020617" : "#e5e7eb",
            padding: 4,
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => setViewMode("all")}
            style={{
              flex: 1,
              paddingVertical: 6,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: viewMode === "all" ? "#38BDF8" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  viewMode === "all"
                    ? "#0f172a"
                    : isDarkmode
                    ? "#e5e7eb"
                    : "#374151",
              }}
            >
              All Tasks
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode("assignedToMe")}
            style={{
              flex: 1,
              paddingVertical: 6,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor:
                viewMode === "assignedToMe" ? "#38BDF8" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  viewMode === "assignedToMe"
                    ? "#0f172a"
                    : isDarkmode
                    ? "#e5e7eb"
                    : "#374151",
              }}
            >
              Assigned To Me
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode("ai")}
            style={{
              flex: 1,
              paddingVertical: 6,
              borderRadius: 999,
              alignItems: "center",
              backgroundColor: viewMode === "ai" ? "#38BDF8" : "transparent",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color:
                  viewMode === "ai"
                    ? "#0f172a"
                    : isDarkmode
                    ? "#e5e7eb"
                    : "#374151",
              }}
            >
              AI Priority Assistant
            </Text>
          </TouchableOpacity>
        </View>

        {/* When AI tab selected, show chat box; else show task sections */}
        {viewMode === "ai" ? (
          <View
            style={{
              marginTop: 12,
              marginBottom: 12,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#4b5563",
              backgroundColor: isDarkmode ? "#020617" : "#e0f2fe",
            }}
          >
            <Text fontWeight="bold" style={{ marginBottom: 4 }}>
              AI Priority Assistant
            </Text>
            <Text style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
              Ask the AI which tasks to focus on. It uses your current tasks
              plus extra rules stored in ChromaDB.
            </Text>

            <View style={{ flexDirection: "row", marginBottom: 8 }}>
              <Button
                text="What should I do today?"
                size="sm"
                style={{ marginRight: 6 }}
                onPress={() =>
                  handleAskPriorityAI(
                    "What are the top 3 tasks I should do today?"
                  )
                }
              />
              <Button
                text="Plan my week"
                size="sm"
                style={{ marginRight: 6 }}
                onPress={() =>
                  handleAskPriorityAI(
                    "Help me plan which tasks to schedule over the next 7 days."
                  )
                }
              />
            </View>

            <TextInput
              containerStyle={{ marginTop: 4 }}
              placeholder="Ask something like: Which tasks are most urgent for today?"
              value={aiQuestion}
              onChangeText={setAiQuestion}
              multiline
            />

            <Button
              text={aiLoading ? "Thinking..." : "Ask AI"}
              onPress={() => handleAskPriorityAI()}
              disabled={aiLoading}
              style={{ marginTop: 8 }}
            />

            <View
              style={{
                marginTop: 8,
                maxHeight: 220,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "#9ca3af",
                padding: 8,
              }}
            >
              <ScrollView>
                <Text style={{ fontSize: 13, lineHeight: 18 }}>{aiAnswer}</Text>
              </ScrollView>
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
                    color: "#9CA3AF",
                  }}
                >
                  No active tasks to show.
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </Layout>
  );
}

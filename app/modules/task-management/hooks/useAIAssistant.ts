import { useState, useCallback, useRef } from "react";
import { getAuth } from "firebase/auth";
import { RAG_API_HOST } from "../config/api";
import { TaskType, ChatMsg } from "../utils/types";
import { formatDate, calculateDaysUntilDue } from "../utils/taskUtils";

export const useAIAssistant = (activeTasks: TaskType[]) => {
  const auth = getAuth();
  const [aiQuestion, setAiQuestion] = useState(
    "What are the top 3 tasks I should do today?"
  );
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const aiScrollRef = useRef<any>(null);

  const buildTasksContextForAI = useCallback(() => {
    if (activeTasks.length === 0) return "No active tasks.";

    const slice = activeTasks.slice(0, 30);

    return slice
      .map((t) => {
        const start = t.startDate ? formatDate(t.startDate) : "-";
        const due = t.dueDate ? formatDate(t.dueDate) : "-";
        const score = t.priorityScore ?? 0;
        const daysUntilDue = calculateDaysUntilDue(t.dueDate) ?? "null";

        return (
          `TASK\n` +
          `Title: ${t.taskName}\n` +
          `Details: ${t.details ?? "-"}\n` +
          `DaysUntilDue: ${daysUntilDue}\n` +
          `PriorityScore: ${score}\n` +
          `Start: ${start}\n` +
          `Due: ${due}\n`
        );
      })
      .join("\n");
  }, [activeTasks]);

  const handleAskPriorityAI = async (customQuestion?: string) => {
    const q = (customQuestion ?? aiQuestion).trim();
    if (!q) return;

    setAiQuestion(q);
    setAiAnswer("");
    setAiLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const tasksContext = buildTasksContextForAI();

      const today = new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });

      const fullPrompt = `
You are an intelligent task planning assistant using BOTH:
1) Rule-based logic (DaysUntilDue, PriorityScore)
2) Reasoned judgement (importance vs urgency)

You MUST follow numeric rules strictly and NEVER contradict DaysUntilDue.
If there is a conflict, numeric rules override intuition.

DATE & FORMAT
- Today is ${today}.
- All dates are in DD/MM/YYYY format (example: 01/12/2025 = 1 December 2025, NOT January 12).
- For EACH task, you are given "DaysUntilDue":
  - If DaysUntilDue < 0  → overdue.
  - If 0 ≤ DaysUntilDue ≤ 7 → due THIS WEEK.
  - If DaysUntilDue > 7 → due LATER.
CRITICAL OUTPUT RULE:
- When listing a task, ALWAYS include the task TITLE.
- NEVER say only "Task #3".
- Format MUST be:
  (#taskNumber) Task title — reason
OUTPUT FORMAT:
Immediate focus / This week / Can postpone.
HERE ARE THE TASKS:
${tasksContext}

USER QUESTION:
${q}
`;

      const uid = auth.currentUser?.uid;
      if (!uid) {
        setAiAnswer(
          "Error: Not logged in (userId missing). Please login first."
        );
        setAiLoading(false);
        clearTimeout(timeout);
        return;
      }

      const updatedHistory: ChatMsg[] = [
        ...chatHistory,
        { role: "user", content: q },
      ];

      const response = await fetch(RAG_API_HOST + "/chat_rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          model: "deepseek-r1:7b",
          text: q,
          userId: uid,
          history: updatedHistory,
          tasksContext,
          n_results: 4,
          temperature: 0.2,
          num_ctx: 4096,
          num_predict: 360,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.log("RAG error body:", errorBody);
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const cleaned = data.model_answer?.trim() || "";

      setAiAnswer(cleaned);

      setChatHistory((prev) => {
        const next: ChatMsg[] = [...prev, { role: "user", content: q }];
        return [...next, { role: "assistant", content: cleaned }];
      });

      setTimeout(() => {
        aiScrollRef.current?.scrollToEnd?.({ animated: true });
      }, 60);
    } catch (err: any) {
      const msg =
        err?.name === "AbortError"
          ? "AI request timed out. Check your host / backend / same Wi-Fi.\nTip: Make sure your host is correct and backend runs with --host 0.0.0.0."
          : "Error: " + (err?.message || String(err));
      setAiAnswer(msg);
    } finally {
      clearTimeout(timeout);
      setAiLoading(false);
    }
  };

  const clearChat = useCallback(() => {
    setChatHistory([]);
    setAiAnswer("");
  }, []);

  return {
    aiQuestion,
    setAiQuestion,
    aiAnswer,
    aiLoading,
    chatHistory,
    aiScrollRef,
    handleAskPriorityAI,
    clearChat,
  };
};

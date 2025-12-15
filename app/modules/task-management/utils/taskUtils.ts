import type { TaskType } from "./types";

/**
 * Computes a priority score for a task based on due date, start date, completion status, and assignee count.
 * Higher scores indicate higher priority.
 */
export const computePriorityScore = (params: {
  dueDate?: number | null;
  startDate?: number | null;
  completed?: boolean;
  assigneeCount?: number;
}): number => {
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

/**
 * Formats a timestamp to DD/MM/YYYY format
 */
export const formatDate = (timestamp?: number): string => {
  if (!timestamp) return "-";
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

/**
 * Checks if a task's due date is overdue
 */
export const isOverdue = (due?: number): boolean => {
  if (typeof due !== "number") return false;
  const d = new Date(due);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() < today.getTime();
};

/**
 * Checks if a user can see a task based on ownership, assignment, or guest access
 */
export const canUserSeeTask = (task: TaskType, user: any | null): boolean => {
  if (!user) return false;
  const uid = user.uid;
  const email = (user.email || "").toLowerCase();

  if (task.CreatedUser?.id === uid) return true;

  const assigned = task.assignedTo;
  if (Array.isArray(assigned)) {
    if (
      assigned.some((e) => typeof e === "string" && e.toLowerCase() === email)
    )
      return true;
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

/**
 * Calculates days until due date
 */
export const calculateDaysUntilDue = (dueDate?: number): number | null => {
  if (typeof dueDate !== "number") return null;

  const today = new Date();
  const utcToday = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const dueDt = new Date(dueDate);
  const utcDue = Date.UTC(
    dueDt.getFullYear(),
    dueDt.getMonth(),
    dueDt.getDate()
  );
  return Math.floor((utcDue - utcToday) / (24 * 60 * 60 * 1000));
};

/**
 * Checks if a task is assigned to a user by email
 */
export const isTaskAssignedToUser = (
  task: TaskType,
  userEmail: string | null
): boolean => {
  if (!userEmail) return false;

  const assigned = task.assignedTo;
  if (!assigned) return false;

  const emailLower = userEmail.toLowerCase();

  if (Array.isArray(assigned)) {
    return assigned.some(
      (e) => typeof e === "string" && e.toLowerCase() === emailLower
    );
  }

  return typeof assigned === "string" && assigned.toLowerCase() === emailLower;
};

/**
 * Extracts @mentions from text (Gmail format)
 */
export const extractMentions = (text: string): string[] => {
  const matches = text.match(/@([a-zA-Z0-9._%+-]+@gmail\.com)/g) || [];
  const emails = matches.map((m) => m.slice(1).toLowerCase());
  return Array.from(new Set(emails));
};

/**
 * Escapes HTML characters for safe display
 */
export const escapeHtml = (s: string) =>
  (s || "").replace(/</g, "&lt;").replace(/>/g, "&gt;");

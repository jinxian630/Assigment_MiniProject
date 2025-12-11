// src/utils/taskGamification.ts
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

/* ------------------------------------------------------------------ */
/*  CONFIG                                                            */
/* ------------------------------------------------------------------ */

const XP_PER_LEVEL = 100;
const MAIN_TASK_XP = 10;
const SUBTASK_XP = 5;

/* ------------------------------------------------------------------ */
/*  TYPES                                                             */
/* ------------------------------------------------------------------ */

export type UserStats = {
  xp: number; // XP inside current level (0–XP_PER_LEVEL-1)
  level: number;
  streak: number;
  completedTasks: number;
  lastStreakDate?: string; // "YYYY-MM-DD"
};

const DEFAULT_STATS: UserStats = {
  xp: 0,
  level: 1,
  streak: 0,
  completedTasks: 0,
};

/** Helper: get today's date in YYYY-MM-DD */
const getTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export type GamificationStats = {
  totalPoints: number;
  level: number;
  streak: number;
  lastTaskDate?: number;
  lastStreakIncrementDate?: number;
  completedTasks: number;

  // For progress bar / ring
  xpInLevel: number;
  xpNeededForLevel: number;
  progressToNextLevel: number; // 0–1

  // For showing badge text
  rankTitle: string;
};

/** Optional helper if you need to convert points to level elsewhere */
export function computeLevelFromPoints(points: number): number {
  return Math.floor(points / XP_PER_LEVEL) + 1;
}

/* ------------------------------------------------------------------ */
/*  LOW-LEVEL HELPERS                                                 */
/* ------------------------------------------------------------------ */

export async function getUserStats(userId: string): Promise<UserStats> {
  const db = getFirestore();
  const ref = doc(db, "UserStats", userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, DEFAULT_STATS);
    return { ...DEFAULT_STATS };
  }

  const data = snap.data() as any;
  return {
    xp: data.xp ?? 0,
    level: data.level ?? 1,
    streak: data.streak ?? 0,
    completedTasks: data.completedTasks ?? 0,
    lastStreakDate: data.lastStreakDate,
  };
}

/** Derive rank title from level – for your UI badge */
function getRankTitle(level: number): string {
  if (level >= 20) return "Legendary Planner";
  if (level >= 15) return "Elite Strategist";
  if (level >= 10) return "Productivity Pro";
  if (level >= 5) return "Focused Achiever";
  return "Rookie Planner";
}

/** Internal: convert stats into progress values */
function getLevelProgress(stats: UserStats) {
  const xpInLevel = stats.xp || 0;
  const xpNeededForLevel = XP_PER_LEVEL;
  const progressToNextLevel = Math.max(
    0,
    Math.min(1, xpInLevel / xpNeededForLevel)
  );

  const totalPoints = (stats.level - 1) * XP_PER_LEVEL + xpInLevel;

  return {
    xpInLevel,
    xpNeededForLevel,
    progressToNextLevel,
    totalPoints,
  };
}

/** Convert UserStats → GamificationStats for the UI */
export async function getGamificationStats(
  uid: string
): Promise<GamificationStats> {
  const stats = await getUserStats(uid);

  const { totalPoints, xpInLevel, xpNeededForLevel, progressToNextLevel } =
    getLevelProgress(stats);

  const lastDateTs = stats.lastStreakDate
    ? new Date(stats.lastStreakDate + "T00:00:00").getTime()
    : undefined;

  return {
    totalPoints,
    level: stats.level,
    streak: stats.streak,
    lastTaskDate: lastDateTs,
    lastStreakIncrementDate: lastDateTs,
    completedTasks: stats.completedTasks,
    xpInLevel,
    xpNeededForLevel,
    progressToNextLevel,
    rankTitle: getRankTitle(stats.level),
  };
}

/* ------------------------------------------------------------------ */
/*  OVERDUE CHECK                                                     */
/* ------------------------------------------------------------------ */

/** Check if user has ANY overdue tasks (not completed and due date < today) */
export async function checkUserHasOverdueTasks(
  userId: string
): Promise<boolean> {
  const db = getFirestore();
  const q = query(
    collection(db, "Tasks"),
    where("CreatedUser.id", "==", userId),
    where("completed", "==", false)
  );

  const snapshot = await getDocs(q);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  return snapshot.docs.some((docSnap) => {
    const data = docSnap.data() as any;
    return typeof data.dueDate === "number" && data.dueDate < todayMs;
  });
}

/* ------------------------------------------------------------------ */
/*  MAIN XP / STREAK LOGIC                                            */
/* ------------------------------------------------------------------ */

/**
 * Core: award XP + update streak when a task is completed.
 * Streak rule:
 *  - At most +1 streak per day.
 *  - Streak ONLY resets if user has at least one overdue task.
 */
export async function awardTaskCompletion(userId: string) {
  const db = getFirestore();
  const ref = doc(db, "UserStats", userId);
  const stats = await getUserStats(userId);

  const todayStr = getTodayString();

  // 1️⃣ Check for overdue tasks
  const hasOverdue = await checkUserHasOverdueTasks(userId);

  let newStreak = stats.streak || 0;

  if (stats.lastStreakDate === todayStr) {
    // already counted today → do not change streak
  } else {
    if (hasOverdue) {
      newStreak = 0; // reset only if overdue exists
    } else {
      newStreak = newStreak + 1;
    }
  }

  // 2️⃣ XP: +MAIN_TASK_XP per completed task
  const gainedXp = MAIN_TASK_XP;
  let newXp = (stats.xp || 0) + gainedXp;
  let newLevel = stats.level || 1;

  // Leveling: every XP_PER_LEVEL XP = +1 level
  while (newXp >= XP_PER_LEVEL) {
    newXp -= XP_PER_LEVEL;
    newLevel += 1;
  }

  // 3️⃣ Completed task count
  const newCompletedTasks = (stats.completedTasks || 0) + 1;

  await updateDoc(ref, {
    xp: newXp,
    level: newLevel,
    streak: newStreak,
    completedTasks: newCompletedTasks,
    lastStreakDate: todayStr,
  });
}

/** XP for subtasks */
export async function awardSubtaskCompletion(userId: string) {
  const db = getFirestore();
  const ref = doc(db, "UserStats", userId);
  const stats = await getUserStats(userId);

  const gainedXp = SUBTASK_XP;
  let newXp = (stats.xp || 0) + gainedXp;
  let newLevel = stats.level || 1;

  while (newXp >= XP_PER_LEVEL) {
    newXp -= XP_PER_LEVEL;
    newLevel += 1;
  }

  await updateDoc(ref, {
    xp: newXp,
    level: newLevel,
  });
}

/** Remove XP when a subtask is un-completed. */
export async function removeSubtaskCompletion(userId: string) {
  const db = getFirestore();
  const ref = doc(db, "UserStats", userId);
  const stats = await getUserStats(userId);

  let newXp = (stats.xp || 0) - SUBTASK_XP;
  let newLevel = stats.level || 1;

  if (newXp < 0) {
    if (newLevel > 1) {
      newLevel -= 1;
      newXp = XP_PER_LEVEL + newXp; // borrow from previous level
    } else {
      newXp = 0;
    }
  }

  await updateDoc(ref, {
    xp: newXp,
    level: newLevel,
  });
}

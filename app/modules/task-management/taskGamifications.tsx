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

/**
 * Structure we store for each user in `UserStats/{uid}`
 */
export type UserStats = {
  xp: number; // XP inside current level (0–99)
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

/** What the Productivity screen will use */
export type GamificationStats = {
  totalPoints: number; // level-based points, e.g. level*100 + xp
  level: number;
  streak: number;
  lastTaskDate?: number;
  lastStreakIncrementDate?: number;
  completedTasks: number;
};

/** Simple helper if you ever want to derive level purely from points */
export function computeLevelFromPoints(points: number): number {
  return Math.floor(points / 100) + 1;
}

/** Fetch or create user stats doc */
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

/** Convert UserStats → GamificationStats for the UI */
export async function getGamificationStats(
  uid: string
): Promise<GamificationStats> {
  const stats = await getUserStats(uid);

  // each level = 100 pts, so totalPoints = finished levels + current XP
  const totalPoints = (stats.level - 1) * 100 + (stats.xp || 0);

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
  };
}

/**
 * Check if user has ANY overdue tasks (not completed and due date < today)
 */
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
      // Break streak ONLY when there is overdue
      newStreak = 0;
    } else {
      // No overdue → daily streak +1
      newStreak = newStreak + 1;
    }
  }

  // 2️⃣ Simple XP: +10 per completed task (you can tweak later)
  const gainedXp = 10;
  let newXp = (stats.xp || 0) + gainedXp;
  let newLevel = stats.level || 1;

  // Example leveling: every 100 XP = +1 level
  while (newXp >= 100) {
    newXp -= 100;
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

/**
 * Optional: XP for subtasks (smaller than main task).
 * Your TaskMenu already calls these, so we define them here.
 */
export async function awardSubtaskCompletion(userId: string) {
  const db = getFirestore();
  const ref = doc(db, "UserStats", userId);
  const stats = await getUserStats(userId);

  const gainedXp = 5;
  let newXp = (stats.xp || 0) + gainedXp;
  let newLevel = stats.level || 1;

  while (newXp >= 100) {
    newXp -= 100;
    newLevel += 1;
  }

  await updateDoc(ref, {
    xp: newXp,
    level: newLevel,
  });
}

export async function removeSubtaskCompletion(userId: string) {
  const db = getFirestore();
  const ref = doc(db, "UserStats", userId);
  const stats = await getUserStats(userId);

  let newXp = (stats.xp || 0) - 5;
  let newLevel = stats.level || 1;

  if (newXp < 0) {
    if (newLevel > 1) {
      newLevel -= 1;
      newXp = 100 + newXp; // borrow from previous level
    } else {
      newXp = 0;
    }
  }

  await updateDoc(ref, {
    xp: newXp,
    level: newLevel,
  });
}

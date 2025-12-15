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
  onSnapshot,
  runTransaction,
} from "firebase/firestore";

// Configuration

const XP_PER_LEVEL = 100;
const MAIN_TASK_XP = 10;
const SUBTASK_XP = 5;

// Type definitions

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

/** Helper: start of today (ms) */
const getTodayMs = () => {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t.getTime();
};

export type GamificationStats = {
  totalPoints: number;
  level: number;
  streak: number;
  lastTaskDate?: number;
  lastStreakIncrementDate?: number;
  completedTasks: number;

  xpInLevel: number;
  xpNeededForLevel: number;
  progressToNextLevel: number; // 0–1

  rankTitle: string;
};

export function computeLevelFromPoints(points: number): number {
  return Math.floor(points / XP_PER_LEVEL) + 1;
}

// Firestore data paths
/**
 * ✅ We store stats inside:
 *   users/{uid}.stats
 */
function userDocRef(db: any, uid: string) {
  return doc(db, "users", uid);
}

function normalizeStats(data: any): UserStats {
  const s = (data?.stats || {}) as any;
  return {
    xp: s.xp ?? 0,
    level: s.level ?? 1,
    streak: s.streak ?? 0,
    completedTasks: s.completedTasks ?? 0,
    lastStreakDate: s.lastStreakDate,
  };
}

// Helper functions

export async function getUserStats(userId: string): Promise<UserStats> {
  const db = getFirestore();
  const ref = userDocRef(db, userId);
  const snap = await getDoc(ref);

  // If user doc doesn't exist yet, create it with stats (minimal)
  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        stats: { ...DEFAULT_STATS },
      },
      { merge: true } as any
    );
    return { ...DEFAULT_STATS };
  }

  const data = snap.data() as any;

  // If stats missing, initialize only stats
  if (!data?.stats) {
    await setDoc(
      ref,
      {
        stats: { ...DEFAULT_STATS },
      },
      { merge: true } as any
    );
    return { ...DEFAULT_STATS };
  }

  return normalizeStats(data);
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

  return { xpInLevel, xpNeededForLevel, progressToNextLevel, totalPoints };
}

/** Convert UserStats → GamificationStats (pure function) */
export function mapUserStatsToGamificationStats(
  stats: UserStats
): GamificationStats {
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

export async function getGamificationStats(
  uid: string
): Promise<GamificationStats> {
  const stats = await getUserStats(uid);
  return mapUserStatsToGamificationStats(stats);
}

// Realtime subscriptions

export function subscribeGamificationStats(
  uid: string,
  onData: (stats: GamificationStats) => void,
  onError?: (err: any) => void
) {
  const db = getFirestore();
  const ref = userDocRef(db, uid);

  // Ensure stats exists once
  (async () => {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, { stats: { ...DEFAULT_STATS } }, {
        merge: true,
      } as any);
      return;
    }
    const data = snap.data() as any;
    if (!data?.stats) {
      await setDoc(ref, { stats: { ...DEFAULT_STATS } }, {
        merge: true,
      } as any);
    }
  })().catch(() => {});

  return onSnapshot(
    ref,
    (snap) => {
      const data = (snap.data() || {}) as any;
      const raw = normalizeStats(data);
      onData(mapUserStatsToGamificationStats(raw));
    },
    (err) => onError?.(err)
  );
}

// Overdue task checking

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
  const todayMs = getTodayMs();

  return snapshot.docs.some((docSnap) => {
    const data = docSnap.data() as any;
    return typeof data.dueDate === "number" && data.dueDate < todayMs;
  });
}

// XP and streak management

/**
 * ✅ Award XP only ONCE per TASK:
 *  - Uses Tasks/{taskId}.xpAwarded === true to prevent duplicates
 * ✅ Overdue task completion gives NO XP (and NO streak increment)
 *  - "Overdue" means task.dueDate < start-of-today
 */
export async function awardTaskCompletionOnce(userId: string, taskId: string) {
  const db = getFirestore();
  const userRef = userDocRef(db, userId);
  const taskRef = doc(db, "Tasks", taskId);

  const todayStr = getTodayString();
  const todayMs = getTodayMs();

  // ✅ Important: compute OUTSIDE transaction
  const hasOverdueAny = await checkUserHasOverdueTasks(userId);

  await runTransaction(db, async (tx) => {
    const [userSnap, taskSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(taskRef),
    ]);

    // Ensure we have a user doc to write into
    const userData = userSnap.exists() ? (userSnap.data() as any) : {};
    const stats = normalizeStats(userData);

    if (!taskSnap.exists()) return;
    const task = taskSnap.data() as any;

    // 1) Prevent double-award
    if (task.xpAwarded === true) return;

    // 2) Safety: only award when task is completed
    if (task.completed !== true) return;

    // 3) Check overdue of THIS task
    const isOverdueTask =
      typeof task.dueDate === "number" && task.dueDate < todayMs;

    // ✅ lock this task forever as "already processed"
    tx.update(taskRef, { xpAwarded: true });

    // ✅ only once per task
    const newCompletedTasks = (stats.completedTasks || 0) + 1;

    // If user doc doesn't exist, create minimal shape (profile fields stay untouched)
    if (!userSnap.exists()) {
      tx.set(userRef, { stats: { ...DEFAULT_STATS } }, { merge: true });
    }

    // Overdue task → no XP, no streak increment
    if (isOverdueTask) {
      tx.set(
        userRef,
        {
          stats: {
            completedTasks: newCompletedTasks,
          },
        },
        { merge: true }
      );
      return;
    }

    // 4) Streak (at most +1 per day)
    let newStreak = stats.streak || 0;

    if (stats.lastStreakDate === todayStr) {
      // already counted today
    } else {
      newStreak = hasOverdueAny ? 0 : newStreak + 1;
    }

    // 5) XP + leveling
    let newXp = (stats.xp || 0) + MAIN_TASK_XP;
    let newLevel = stats.level || 1;

    while (newXp >= XP_PER_LEVEL) {
      newXp -= XP_PER_LEVEL;
      newLevel += 1;
    }

    tx.set(
      userRef,
      {
        stats: {
          xp: newXp,
          level: newLevel,
          streak: newStreak,
          completedTasks: newCompletedTasks,
          lastStreakDate: todayStr,
        },
      },
      { merge: true }
    );
  });
}

/** XP for subtasks */
export async function awardSubtaskCompletion(userId: string) {
  const db = getFirestore();
  const ref = userDocRef(db, userId);
  const stats = await getUserStats(userId);

  const gainedXp = SUBTASK_XP;
  let newXp = (stats.xp || 0) + gainedXp;
  let newLevel = stats.level || 1;

  while (newXp >= XP_PER_LEVEL) {
    newXp -= XP_PER_LEVEL;
    newLevel += 1;
  }

  await updateDoc(ref, {
    "stats.xp": newXp,
    "stats.level": newLevel,
  });
}

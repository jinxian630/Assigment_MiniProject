import { isSameDay, subDays, parseISO } from 'date-fns';

interface StreakResult {
  newStreak: number;
  streakStatus: 'incremented' | 'maintained' | 'reset';
}

export const calculateStreak = (
  lastWorkoutIso: string | null | undefined, 
  currentDate: Date = new Date()
): StreakResult => {
  // Scenario 1: First workout ever
  if (!lastWorkoutIso) {
    return { newStreak: 1, streakStatus: 'reset' };
  }

  const lastDate = parseISO(lastWorkoutIso);
  
  // Scenario 2: Workout already done today (No double counting)
  if (isSameDay(lastDate, currentDate)) {
    return { newStreak: -1, streakStatus: 'maintained' }; // -1 indicates no change needed
  }

  // Scenario 3: Last workout was yesterday (Increment)
  const yesterday = subDays(currentDate, 1);
  if (isSameDay(lastDate, yesterday)) {
    return { newStreak: 1, streakStatus: 'incremented' }; 
  }

  // Scenario 4: Broken Streak (Reset)
  return { newStreak: 1, streakStatus: 'reset' };
};

import { useContext, useCallback } from 'react';
import { AuthContext } from '@/contexts/AuthContext';
import { firestoreService } from '@/services/firestore.service';
import { calculateStreak } from '@/utils/gamificationUtils';
import { calculateSessionPoints, getLevelFromPoints } from '@/utils/scoring';
import { generateWeeklyMentorMessage } from '@/services/aiMentorService';
import { User } from '@/types/user';

export const useGamification = () => {
  const context = useContext(AuthContext);
  const user = context?.user;

  const processWorkoutSession = useCallback(async (durationMinutes: number) => {
    if (!user || !user.id) return;

    const today = new Date();
    const lastWorkout = user.lastWorkoutDate;
    
    // 1. Calculate Streak
    const { newStreak, streakStatus } = calculateStreak(lastWorkout, today);
    let finalStreak = streakStatus === 'maintained' ? (user.currentStreak || 0) : newStreak;
    if (finalStreak < 0) finalStreak = user.currentStreak || 0; // Guard against negative if maintained

    // 2. Calculate Points
    // Adherence score is simplified to 10 for now (can be dynamic later)
    const pointsEarned = calculateSessionPoints(durationMinutes, 10);
    const newTotalPoints = (user.totalPoints || 0) + pointsEarned;
    
    // 3. Calculate Level
    const newLevel = getLevelFromPoints(newTotalPoints);

    // 4. Update Weekly Volume
    // Reset logic should ideally be server-side, but simplistic check:
    // If today is Monday and last workout wasn't today, could reset? 
    // OR just add to existing for now.
    const newWeeklyVolume = (user.weeklyVolumeMinutes || 0) + durationMinutes;

    // 5. Update User Profile
    const updates = {
      currentStreak: finalStreak,
      totalPoints: newTotalPoints,
      currentLevel: newLevel,
      lastWorkoutDate: today.toISOString(),
      weeklyVolumeMinutes: newWeeklyVolume
    };

    try {
      await firestoreService.updateUserDocument(user.id, updates);
      console.log("Gamification stats updated:", updates);
    } catch (error) {
      console.error("Failed to update gamification stats:", error);
    }
  }, [user]);

  const refreshMentorMessage = useCallback(async () => {
    if (!user || !user.id) return;

    try {
      const message = await generateWeeklyMentorMessage({
        streak: user.currentStreak || 0,
        weeklyWorkouts: 1, // Placeholder: need real workout count
        weeklyMinutes: user.weeklyVolumeMinutes || 0
      });

      const updates = {
        mentorRecommendation: {
          text: message,
          generatedAt: new Date().toISOString()
        }
      };

      await firestoreService.updateUserDocument(user.id, updates);
      console.log("Mentor message updated");
    } catch (error) {
      console.error("Failed to refresh mentor message:", error);
    }
  }, [user]);

  return {
    processWorkoutSession,
    refreshMentorMessage,
    stats: {
      points: user?.totalPoints || 0,
      level: user?.currentLevel || 1,
      streak: user?.currentStreak || 0,
      mentorMessage: user?.mentorRecommendation?.text
    }
  };
};

import { Timestamp } from 'firebase/firestore';
import { SleepQuality, FatigueState } from './readiness';

export interface WorkoutAdjustment {
  wasAdjusted: boolean;
  adjustmentReason: string;
  originalPlan: {
    suggestedSets: number;
    suggestedReps: number;
  };
  adjustedPlan: {
    adjustedSets: number;
    adjustedReps: number;
    intensityModifier: number; // 0.6-1.0
  };
  appliedAt: Timestamp;
}

export interface PersonalizationContext {
  userId: string;
  userProfile: {
    fitnessLevel: 'beginner' | 'intermediate' | 'advanced';
    injuryHistory: Array<{
      bodyPart: string;
      severity: 'minor' | 'moderate' | 'severe';
      reportedDate: string;
      recoveryStatus: 'active' | 'recovering' | 'recovered';
    }>;
  };
  readiness: {
    sleepQuality: SleepQuality;
    sorenessLevel: number;
    fatigueState: FatigueState;
    readinessScore: number;
  };
  exercise: {
    name: string;
    category: string;
    difficultyLevel: string;
  };
  recentHistory: {
    weeklyVolumeLoad: number;
    lastWorkoutDate: string;
    currentFatigueIndex: number;
  };
}

export interface AIWorkoutRecommendation {
  adjustedSets: number;
  adjustedReps: number;
  intensityModifier: number; // 0.6-1.0
  safetyCues: string[]; // 2-3 safety reminders
  expectations: string; // What to expect from this workout
  reasoning: string; // Why these adjustments were made
}

export interface UserStats {
  currentFatigueIndex: number; // 0-100
  lastWorkoutDate: string; // ISO date
  weeklyVolumeLoad: number; // Sum of sets × reps × weight
  injuryStatus: Array<{
    bodyPart: string;
    severity: 'minor' | 'moderate' | 'severe';
    reportedDate: string;
    recoveryStatus: 'active' | 'recovering' | 'recovered';
  }>;
}

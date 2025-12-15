import { Timestamp } from 'firebase/firestore';

export interface StudentMetrics {
  studentId: string;
  studentName: string;
  fitnessLevel: string;
  adherenceRate: number; // 0-100%
  lastWorkoutDate: string | null;
  currentFatigueIndex: number; // 0-100
  totalWorkoutSessions: number;
  averageReadinessScore: number; // 0-100
  aiInterventionCount: number;
}

export interface FatigueTrendDataPoint {
  date: string; // ISO date
  readinessScore: number; // 0-100
  fatigueState: 'HIGH' | 'NORMAL';
}

export interface AIIntervention {
  id: string;
  date: string; // ISO date
  exerciseName: string;
  adjustmentType: string;
  reasoning: string;
  originalPlan: {
    sets: number;
    reps: number;
  };
  adjustedPlan: {
    sets: number;
    reps: number;
    intensityModifier: number;
  };
  studentResponse?: 'completed' | 'modified' | 'skipped';
  createdAt: Timestamp;
}

export interface CoachStudentSummary {
  totalStudents: number;
  averageAdherenceRate: number;
  studentsWithHighFatigue: number;
  totalAIInterventions: number;
}

import { Timestamp } from 'firebase/firestore';

export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'balance';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type CuePriority = 'low' | 'normal' | 'high' | 'critical';
export type CueCondition = 'fatigue_high' | 'fatigue_low' | 'form_check' | 'always';
export type FatigueLevel = 1 | 2 | 3 | 4 | 5;
export type SessionStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export interface SafetyCue {
  timeWindow: string; // "0-10s", "45-60s"
  cueText: string;
  priority: CuePriority;
  condition?: CueCondition;
  reference?: string; // "ACSM_Guideline_7"
}

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  youtubeLink?: string;
  category: ExerciseCategory;
  muscleGroups: string[];
  equipment: string[];
  biomechStandards: string; // "NSCA_4th_Ed"
  safetyCuesJSON?: SafetyCue[];
  difficultyLevel: DifficultyLevel;
  createdBy?: string; // Coach user ID (undefined for admin/system exercises)
  createdByName?: string; // Coach display name
  verified?: boolean; // Matches coach's verified status
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface WorkoutSet {
  setNumber: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restAfter?: number;
  completedAt?: number;
  fatigueLevel?: FatigueLevel;
}

export interface SafetyLogEntry {
  timestamp: number;
  cueText: string;
  priority: CuePriority;
  setNumber?: number;
  condition?: string;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  exerciseId: string;
  exerciseName: string;
  sets: WorkoutSet[];
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  status: SessionStatus;
  safetyLog: SafetyLogEntry[];
  aiSummary?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateWorkoutSession {
  userId: string;
  exerciseId: string;
  exerciseName: string;
  startTime: number;
  status: SessionStatus;
  readinessId?: string;
  aiAdjustments?: any;
}

import { Timestamp } from 'firebase/firestore';

export type SleepQuality = 'poor' | 'average' | 'great';
export type FatigueState = 'HIGH' | 'NORMAL';

export interface ReadinessCheckInput {
  sleepQuality: SleepQuality;
  sorenessLevel: number; // 1-10
}

export interface DailyReadiness {
  id: string;
  userId: string;
  date: string; // ISO date (YYYY-MM-DD)
  sleepQuality: SleepQuality;
  sorenessLevel: number; // 1-10
  calculatedReadinessScore: number; // 0-100
  fatigueState: FatigueState;
  aiRecommendationSummary: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReadinessScore {
  readinessScore: number; // 0-100
  fatigueState: FatigueState;
  recommendation: string;
}

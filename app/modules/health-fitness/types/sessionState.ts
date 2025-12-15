import { FatigueLevel } from '@/types/workout';

export enum SessionState {
  Idle = 'idle',
  ActiveSet = 'active_set',
  RestPeriod = 'rest_period',
  Paused = 'paused',
  Completed = 'completed',
}

export interface SessionContext {
  state: SessionState;
  currentSetNumber: number;
  elapsedTimeInSet: number;
  currentFatigueLevel?: FatigueLevel;
  isFirstSet: boolean;
  totalSetsCompleted: number;
}

export interface SessionMetrics {
  totalDuration: number;
  totalSets: number;
  totalReps: number;
  totalWeight: number;
  averageFatigue?: number;
}

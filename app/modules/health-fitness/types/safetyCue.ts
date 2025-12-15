import { CuePriority, SafetyCue } from '@/types/workout';

export interface AudioCue {
  id: string;
  text: string;
  priority: CuePriority;
  timestamp: number;
}

export interface AudioQueueItem {
  id: string;
  text: string;
  priority: CuePriority;
  timestamp: number;
}

export interface ParsedTimeWindow {
  startSeconds: number;
  endSeconds: number;
}

export interface EvaluatedCue extends SafetyCue {
  triggered: boolean;
  triggeredAt?: number;
}

export interface AISummaryRequest {
  exerciseName: string;
  duration: number;
  sets: {
    setNumber: number;
    reps?: number;
    weight?: number;
    fatigueLevel?: number;
  }[];
  safetyLog: {
    cueText: string;
    priority: string;
  }[];
}

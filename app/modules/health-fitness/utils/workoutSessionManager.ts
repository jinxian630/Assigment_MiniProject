import { SessionState, SessionContext } from '../types/sessionState';
import {
  WorkoutSet,
  WorkoutSession,
  SafetyLogEntry,
  FatigueLevel,
  Exercise,
} from '@/types/workout';

export class WorkoutSessionManager {
  private state: SessionState = SessionState.Idle;
  private currentSetNumber: number = 0;
  private elapsedTimeInSet: number = 0;
  private startTimeInSet: number = 0;
  private pausedTimeInSet: number = 0;
  private sessionStartTime: number = 0;
  private sessionId: string = '';
  private userId: string = '';
  private exercise: Exercise;
  private sets: WorkoutSet[] = [];
  private safetyLog: SafetyLogEntry[] = [];
  private currentFatigueLevel?: FatigueLevel;

  constructor(exercise: Exercise, userId: string, sessionId: string) {
    this.exercise = exercise;
    this.userId = userId;
    this.sessionId = sessionId;
    this.sessionStartTime = Date.now();
  }

  /**
   * Start a new set
   */
  startSet(): void {
    if (this.state === SessionState.Idle || this.state === SessionState.RestPeriod) {
      this.state = SessionState.ActiveSet;
      this.currentSetNumber++;
      this.elapsedTimeInSet = 0;
      this.startTimeInSet = Date.now();
      this.pausedTimeInSet = 0;
      console.log(`✅ Set ${this.currentSetNumber} started`);
    } else {
      console.warn('⚠️ Cannot start set from current state:', this.state);
    }
  }

  /**
   * Complete the current set and transition to rest period
   */
  completeSet(setData: WorkoutSet): void {
    if (this.state === SessionState.ActiveSet) {
      const completedSet: WorkoutSet = {
        ...setData,
        setNumber: this.currentSetNumber,
        completedAt: Date.now(),
      };
      this.sets.push(completedSet);

      // Update fatigue level if provided
      if (setData.fatigueLevel) {
        this.currentFatigueLevel = setData.fatigueLevel;
      }

      // Transition to rest period or idle
      if (setData.restAfter && setData.restAfter > 0) {
        this.state = SessionState.RestPeriod;
        console.log(`✅ Set ${this.currentSetNumber} completed, entering rest period`);
      } else {
        this.state = SessionState.Idle;
        console.log(`✅ Set ${this.currentSetNumber} completed, no rest period`);
      }

      this.elapsedTimeInSet = 0;
      this.startTimeInSet = 0;
    } else {
      console.warn('⚠️ Cannot complete set from current state:', this.state);
    }
  }

  /**
   * End the rest period and return to idle state
   */
  endRestPeriod(): void {
    if (this.state === SessionState.RestPeriod) {
      this.state = SessionState.Idle;
      console.log('✅ Rest period ended');
    }
  }

  /**
   * Pause the current set
   */
  pause(): void {
    if (this.state === SessionState.ActiveSet || this.state === SessionState.RestPeriod) {
      this.pausedTimeInSet = Date.now();
      this.state = SessionState.Paused;
      console.log('⏸️ Session paused');
    } else {
      console.warn('⚠️ Cannot pause from current state:', this.state);
    }
  }

  /**
   * Resume the paused session
   */
  resume(): void {
    if (this.state === SessionState.Paused) {
      // Adjust start time to account for pause duration
      if (this.pausedTimeInSet > 0 && this.startTimeInSet > 0) {
        const pauseDuration = Date.now() - this.pausedTimeInSet;
        this.startTimeInSet += pauseDuration;
        this.pausedTimeInSet = 0;
      }

      // Return to the state before pause (assume it was ActiveSet)
      this.state = SessionState.ActiveSet;
      console.log('▶️ Session resumed');
    } else {
      console.warn('⚠️ Cannot resume from current state:', this.state);
    }
  }

  /**
   * End the entire workout session
   */
  endSession(): WorkoutSession {
    this.state = SessionState.Completed;
    const endTime = Date.now();
    const totalDuration = Math.floor((endTime - this.sessionStartTime) / 1000); // in seconds

    const session: WorkoutSession = {
      id: this.sessionId,
      userId: this.userId,
      exerciseId: this.exercise.id,
      exerciseName: this.exercise.name,
      sets: this.sets,
      startTime: this.sessionStartTime,
      endTime,
      totalDuration,
      status: 'completed',
      safetyLog: this.safetyLog,
      createdAt: null as any, // Will be set by Firestore
      updatedAt: null as any, // Will be set by Firestore
    };

    console.log('🏁 Session ended:', session);
    return session;
  }

  /**
   * Update the current fatigue level
   */
  updateFatigueLevel(level: FatigueLevel): void {
    this.currentFatigueLevel = level;
    console.log('💪 Fatigue level updated:', level);
  }

  /**
   * Log a safety cue
   */
  logSafetyCue(cue: SafetyLogEntry): void {
    this.safetyLog.push(cue);
    console.log('🔔 Safety cue logged:', cue.cueText);
  }

  /**
   * Update elapsed time in current set (call this every second)
   */
  updateElapsedTime(): void {
    if (this.state === SessionState.ActiveSet && this.startTimeInSet > 0) {
      this.elapsedTimeInSet = Math.floor((Date.now() - this.startTimeInSet) / 1000);
    }
  }

  /**
   * Get the current session context for cue evaluation
   */
  getContext(): SessionContext {
    return {
      state: this.state,
      currentSetNumber: this.currentSetNumber,
      elapsedTimeInSet: this.elapsedTimeInSet,
      currentFatigueLevel: this.currentFatigueLevel,
      isFirstSet: this.currentSetNumber === 1,
      totalSetsCompleted: this.sets.length,
    };
  }

  /**
   * Get all completed sets
   */
  getSets(): WorkoutSet[] {
    return this.sets;
  }

  /**
   * Get all safety log entries
   */
  getSafetyLog(): SafetyLogEntry[] {
    return this.safetyLog;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Get current state
   */
  getState(): SessionState {
    return this.state;
  }

  /**
   * Get elapsed time in current set (in seconds)
   */
  getElapsedTimeInSet(): number {
    return this.elapsedTimeInSet;
  }

  /**
   * Get current set number
   */
  getCurrentSetNumber(): number {
    return this.currentSetNumber;
  }
  /**
   * Load an existing session into the manager
   */
  loadExistingSession(session: WorkoutSession): void {
    if (session.sets && session.sets.length > 0) {
      this.sets = session.sets;
      this.currentSetNumber = session.sets.length;
      console.log(`✅ Loaded ${this.sets.length} sets from existing session`);
    }

    if (session.safetyLog && session.safetyLog.length > 0) {
      this.safetyLog = session.safetyLog;
      console.log(`✅ Loaded ${this.safetyLog.length} safety log entries`);
    }

    // Set start time to original start time
    this.sessionStartTime = session.startTime;
  }
}

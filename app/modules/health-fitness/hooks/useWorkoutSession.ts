import { useState, useEffect, useRef, useContext } from 'react';
import { Exercise, WorkoutSet, WorkoutSession } from '@/types/workout';
import { SessionState } from '../types/sessionState';
import { AudioQueueItem, AudioCue } from '../types/safetyCue';
import { WorkoutSessionManager } from '../utils/workoutSessionManager';
import { SafetyCueEngine } from '../utils/safetyCueEngine';
import { AudioService } from '../utils/audioHelpers';
import { workoutService } from '@/services/workout.service';
import { AuthContext } from '@/contexts/AuthContext';
import { AIWorkoutRecommendation } from '@/types/aiPersonalization';
import { serverTimestamp } from 'firebase/firestore';

interface UseWorkoutSessionProps {
  exercise: Exercise | null;
  aiAdjustment?: AIWorkoutRecommendation | null;
  readinessId?: string;
}

interface UseWorkoutSessionReturn {
  currentState: SessionState;
  currentSetNumber: number;
  elapsedTime: number;
  sessionId: string | null;
  currentActiveCues: AudioCue[];
  startSet: () => Promise<void>;
  completeSet: (setData: WorkoutSet) => Promise<void>;
  pause: () => void;
  resume: () => void;
  endSession: () => Promise<WorkoutSession>;
  isInitialized: boolean;
  sets: WorkoutSet[];
}

export const useWorkoutSession = ({
  exercise,
  aiAdjustment,
  readinessId,
}: UseWorkoutSessionProps): UseWorkoutSessionReturn => {
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id || '';

  const [currentState, setCurrentState] = useState<SessionState>(SessionState.Idle);
  const [currentSetNumber, setCurrentSetNumber] = useState<number>(0);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [currentSets, setCurrentSets] = useState<WorkoutSet[]>([]);
  const [currentActiveCues, setCurrentActiveCues] = useState<AudioCue[]>([]);

  // Refs to maintain stable references across renders
  const sessionManagerRef = useRef<WorkoutSessionManager | null>(null);
  const cueEngineRef = useRef<SafetyCueEngine | null>(null);
  const audioServiceRef = useRef<AudioService | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize session manager, cue engine, and audio service
  useEffect(() => {
    const initializeSession = async () => {
      // GUARD: Don't initialize if exercise is null
      if (!exercise) {
        console.log('⏸️ Waiting for exercise to load...');
        return;
      }

      try {
        // Check for existing active session first
        let currentSessionId: string | null = null;
        let existingSession: WorkoutSession | null = null;

        try {
          existingSession = await workoutService.getActiveSession(userId, exercise.id);
          if (existingSession) {
            currentSessionId = existingSession.id;
            console.log('🔄 Resuming existing active session:', currentSessionId);
          }
        } catch (err) {
          console.warn('⚠️ Failed to check for active session, creating new one', err);
        }

        if (!currentSessionId) {
          // Prepare AI adjustments if available
          const aiAdjustmentsData = aiAdjustment
            ? {
                wasAdjusted: true,
                adjustmentReason: aiAdjustment.reasoning,
                originalPlan: {
                  suggestedSets: 3,
                  suggestedReps: 10,
                },
                adjustedPlan: {
                  adjustedSets: aiAdjustment.adjustedSets,
                  adjustedReps: aiAdjustment.adjustedReps,
                  intensityModifier: aiAdjustment.intensityModifier,
                },
                appliedAt: serverTimestamp(),
              }
            : undefined;

          // Create Firestore session
          currentSessionId = await workoutService.createSession({
            userId,
            exerciseId: exercise.id,
            exerciseName: exercise.name,
            startTime: Date.now(),
            status: 'active',
            readinessId,
            aiAdjustments: aiAdjustmentsData,
          });
          console.log('✅ New workout session initialized:', currentSessionId);
        }

        setSessionId(currentSessionId);

        // Initialize managers
        sessionManagerRef.current = new WorkoutSessionManager(
          exercise,
          userId,
          currentSessionId
        );

        // If resuming, load existing data
        if (existingSession) {
          sessionManagerRef.current.loadExistingSession(existingSession);
          // Restore set number based on loaded sets
          setCurrentSetNumber(sessionManagerRef.current.getCurrentSetNumber());
          // Initialize currentSets state
          setCurrentSets(sessionManagerRef.current.getSets());
        }

        cueEngineRef.current = new SafetyCueEngine();
        audioServiceRef.current = new AudioService();

        await audioServiceRef.current.initialize();

        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Error initializing workout session:', error);
      }
    };

    if (userId && exercise && !isInitialized) {
      initializeSession();
    }

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      audioServiceRef.current?.cleanup();
    };
  }, [exercise, userId, isInitialized]);

  // Timer to update elapsed time and evaluate cues every second
  useEffect(() => {
    if (!isInitialized || !sessionManagerRef.current || !cueEngineRef.current) {
      return;
    }

    if (currentState === SessionState.ActiveSet) {
      // Start timer
      timerRef.current = setInterval(() => {
        const manager = sessionManagerRef.current;
        const cueEngine = cueEngineRef.current;
        const audioService = audioServiceRef.current;

        if (!manager || !cueEngine || !audioService) return;

        // Update elapsed time
        manager.updateElapsedTime();
        const elapsed = manager.getElapsedTimeInSet();
        setElapsedTime(elapsed);

        // Evaluate cues
        const context = manager.getContext();
        const triggeredCues = cueEngine.evaluateCues(
          exercise?.safetyCuesJSON || [],
          context
        );

        // Enqueue triggered cues for audio playback
        triggeredCues.forEach((cue) => {
          const audioQueueItem: AudioQueueItem = {
            id: cue.id,
            text: cue.text,
            priority: cue.priority,
            timestamp: cue.timestamp,
          };
          audioService.enqueueCue(audioQueueItem);

          // Log to session
          manager.logSafetyCue({
            timestamp: cue.timestamp,
            cueText: cue.text,
            priority: cue.priority,
            setNumber: context.currentSetNumber,
          });
        });

        // Update state with currently active cues for UI display
        if (triggeredCues.length > 0) {
          setCurrentActiveCues(triggeredCues);
        }
      }, 1000); // Every second
    } else {
      // Clear timer if not in active set
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [currentState, isInitialized, exercise]);

  // Start a new set
  const startSet = async (): Promise<void> => {
    if (!sessionManagerRef.current || !cueEngineRef.current) {
      console.warn('⚠️ Session not initialized');
      return;
    }

    sessionManagerRef.current.startSet();
    cueEngineRef.current.resetForNewSet();

    setCurrentState(SessionState.ActiveSet);
    setCurrentSetNumber(sessionManagerRef.current.getCurrentSetNumber());
    setElapsedTime(0);
    setCurrentActiveCues([]); // Clear previous cues when starting new set

    console.log('▶️ Set started:', sessionManagerRef.current.getCurrentSetNumber());
  };

  // Complete the current set
  const completeSet = async (setData: WorkoutSet): Promise<void> => {
    if (!sessionManagerRef.current || !sessionId) {
      console.warn('⚠️ Session not initialized');
      return;
    }

    sessionManagerRef.current.completeSet(setData);

    // Update Firestore
    try {
      await workoutService.addSetToSession(sessionId, {
        ...setData,
        setNumber: currentSetNumber,
        completedAt: Date.now(),
      });

      console.log('✅ Set completed and synced to Firestore');
    } catch (error) {
      console.error('❌ Error syncing set to Firestore:', error);
    }

    // Update state
    const newState = sessionManagerRef.current.getState();
    setCurrentState(newState);
    setElapsedTime(0);
    // Update sets state
    setCurrentSets([...sessionManagerRef.current.getSets()]);
  };

  // Pause the session
  const pause = (): void => {
    if (!sessionManagerRef.current || !audioServiceRef.current) {
      console.warn('⚠️ Session not initialized');
      return;
    }

    sessionManagerRef.current.pause();
    audioServiceRef.current.pause();

    setCurrentState(SessionState.Paused);
    console.log('⏸️ Session paused');
  };

  // Resume the session
  const resume = (): void => {
    if (!sessionManagerRef.current || !audioServiceRef.current) {
      console.warn('⚠️ Session not initialized');
      return;
    }

    sessionManagerRef.current.resume();
    audioServiceRef.current.resume();

    setCurrentState(SessionState.ActiveSet);
    console.log('▶️ Session resumed');
  };

  // End the entire session
  const endSession = async (): Promise<WorkoutSession> => {
    if (!sessionManagerRef.current || !sessionId || !audioServiceRef.current) {
      throw new Error('Session not initialized');
    }

    // End session in manager
    const completedSession = sessionManagerRef.current.endSession();

    // Cleanup audio
    await audioServiceRef.current.cleanup();

    // Update Firestore
    try {
      await workoutService.updateSession(sessionId, {
        status: 'completed',
        endTime: completedSession.endTime,
        totalDuration: completedSession.totalDuration,
        sets: completedSession.sets,
        safetyLog: completedSession.safetyLog,
      });

      console.log('✅ Session ended and synced to Firestore');
    } catch (error) {
      console.error('❌ Error syncing session end to Firestore:', error);
    }

    setCurrentState(SessionState.Completed);

    return completedSession;
  };

  return {
    currentState,
    currentSetNumber,
    elapsedTime,
    sessionId,
    currentActiveCues,
    startSet,
    completeSet,
    pause,
    resume,
    endSession,
    isInitialized,
    sets: currentSets,
  };
};

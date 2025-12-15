import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  arrayUnion,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  Exercise,
  WorkoutSession,
  CreateWorkoutSession,
  WorkoutSet,
  SafetyLogEntry,
} from '@/types/workout';
import { removeUndefinedFields } from '@/utils/firestoreHelpers';

class WorkoutService {
  private readonly EXERCISES_COLLECTION = 'ExerciseMaster';
  private readonly SESSIONS_COLLECTION = 'WorkoutSessions';

  /**
   * Get all exercises from ExerciseMaster collection
   * SIMPLIFIED: No role check - all authenticated users can see all exercises
   */
  async getAllExercises(): Promise<Exercise[]> {
    try {
      console.log('🔍 getAllExercises called');
      const exercisesRef = collection(db, this.EXERCISES_COLLECTION);
      const snapshot = await getDocs(exercisesRef);

      console.log('📊 Total documents returned from Firestore:', snapshot.size);

      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        exercises.push({
          id: doc.id,
          ...data,
          safetyCuesJSON: data.safetyCuesJSON || [],
        } as Exercise);
      });

      console.log('✅ Fetched exercises:', exercises.length);
      return exercises;
    } catch (error) {
      console.error('❌ Error fetching exercises:', error);
      throw error;
    }
  }

  /**
   * Get exercises by category
   * SIMPLIFIED: No role check - all authenticated users can see all exercises
   */
  async getExercisesByCategory(
    category: 'strength' | 'cardio' | 'flexibility' | 'balance'
  ): Promise<Exercise[]> {
    try {
      console.log(`🔍 getExercisesByCategory called with category: ${category}`);
      const exercisesRef = collection(db, this.EXERCISES_COLLECTION);
      const q = query(exercisesRef, where('category', '==', category));
      const snapshot = await getDocs(q);

      console.log(`📊 Total ${category} documents:`, snapshot.size);

      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        exercises.push({
          id: doc.id,
          ...data,
          safetyCuesJSON: data.safetyCuesJSON || [],
        } as Exercise);
      });

      console.log(`✅ Fetched ${category} exercises:`, exercises.length);
      return exercises;
    } catch (error) {
      console.error('❌ Error fetching exercises by category:', error);
      throw error;
    }
  }

  /**
   * Get exercises by difficulty level
   * SIMPLIFIED: No role check - all authenticated users can see all exercises
   */
  async getExercisesByDifficulty(
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced'
  ): Promise<Exercise[]> {
    try {
      console.log(`🔍 getExercisesByDifficulty called with difficulty: ${difficultyLevel}`);
      const exercisesRef = collection(db, this.EXERCISES_COLLECTION);
      const q = query(exercisesRef, where('difficultyLevel', '==', difficultyLevel));
      const snapshot = await getDocs(q);

      console.log(`📊 Total ${difficultyLevel} documents:`, snapshot.size);

      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        exercises.push({
          id: doc.id,
          ...data,
          safetyCuesJSON: data.safetyCuesJSON || [],
        } as Exercise);
      });

      console.log(`✅ Fetched ${difficultyLevel} exercises:`, exercises.length);
      return exercises;
    } catch (error) {
      console.error('❌ Error fetching exercises by difficulty:', error);
      throw error;
    }
  }

  /**
   * Get a specific exercise by ID
   */
  async getExerciseById(exerciseId: string): Promise<Exercise | null> {
    try {
      const exerciseRef = doc(db, this.EXERCISES_COLLECTION, exerciseId);
      const exerciseSnap = await getDoc(exerciseRef);

      if (exerciseSnap.exists()) {
        const data = exerciseSnap.data();
        // Ensure safetyCuesJSON exists with safe default
        const exercise: Exercise = {
          id: exerciseSnap.id,
          ...data,
          safetyCuesJSON: data.safetyCuesJSON || [],
        } as Exercise;
        console.log('✅ Fetched exercise:', exercise.name);
        console.log('   Safety cues count:', exercise.safetyCuesJSON?.length || 0);
        return exercise;
      }

      console.warn('⚠️ Exercise not found:', exerciseId);
      return null;
    } catch (error) {
      console.error('❌ Error fetching exercise:', error);
      throw error;
    }
  }

  /**
   * Create a new exercise
   * SIMPLIFIED: Anyone can create exercises, verified status defaults to false
   */
  async createExercise(
    exerciseData: Omit<Exercise, 'id'>,
    userId: string,
    userName: string
  ): Promise<string> {
    try {
      const exerciseRef = doc(collection(db, this.EXERCISES_COLLECTION));
      const exerciseId = exerciseRef.id;

      const cleanedData = removeUndefinedFields(exerciseData);
      await setDoc(exerciseRef, {
        ...cleanedData,
        createdBy: userId,
        createdByName: userName,
        verified: false, // Default to false, can be updated by admins later
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Exercise created:', exerciseId);
      return exerciseId;
    } catch (error) {
      console.error('❌ Error creating exercise:', error);
      throw error;
    }
  }

  /**
   * Update an existing exercise (coach can only update their own)
   */
  async updateExercise(
    exerciseId: string,
    updates: Partial<Omit<Exercise, 'id' | 'createdBy' | 'createdAt'>>
  ): Promise<void> {
    try {
      const exerciseRef = doc(db, this.EXERCISES_COLLECTION, exerciseId);
      const cleanedUpdates = removeUndefinedFields(updates);
      await updateDoc(exerciseRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Exercise updated:', exerciseId);
    } catch (error) {
      console.error('❌ Error updating exercise:', error);
      throw error;
    }
  }

  /**
   * Delete an exercise (coach can only delete their own)
   */
  async deleteExercise(exerciseId: string): Promise<void> {
    try {
      const exerciseRef = doc(db, this.EXERCISES_COLLECTION, exerciseId);
      await deleteDoc(exerciseRef);

      console.log('✅ Exercise deleted:', exerciseId);
    } catch (error) {
      console.error('❌ Error deleting exercise:', error);
      throw error;
    }
  }

  /**
   * Get exercises created by a specific coach
   */
  async getCoachExercises(coachId: string): Promise<Exercise[]> {
    try {
      console.log('🔍 getCoachExercises called with coachId:', coachId);
      const exercisesRef = collection(db, this.EXERCISES_COLLECTION);
      const q = query(exercisesRef, where('createdBy', '==', coachId));
      const snapshot = await getDocs(q);
      console.log('📊 Total exercises created by this coach:', snapshot.size);

      const exercises: Exercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(`📝 Coach exercise "${data.name}":`, {
          id: doc.id,
          createdBy: data.createdBy,
          verified: data.verified,
          category: data.category,
        });
        exercises.push({
          id: doc.id,
          ...data,
          safetyCuesJSON: data.safetyCuesJSON || [],
        } as Exercise);
      });

      console.log(`✅ Fetched coach exercises:`, exercises.length);
      return exercises;
    } catch (error) {
      console.error('❌ Error fetching coach exercises:', error);
      throw error;
    }
  }

  /**
   * Create a new workout session
   */
  async createSession(sessionData: CreateWorkoutSession): Promise<string> {
    try {
      const sessionRef = doc(collection(db, this.SESSIONS_COLLECTION));
      const sessionId = sessionRef.id;

      // Clean undefined fields for Firestore compatibility
      const cleanedData = removeUndefinedFields({
        ...sessionData,
        sets: [],
        safetyLog: [],
      });

      await setDoc(sessionRef, {
        ...cleanedData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Workout session created:', sessionId);
      return sessionId;
    } catch (error) {
      console.error('❌ Error creating workout session:', error);
      throw error;
    }
  }

  /**
   * Update an existing workout session
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Omit<WorkoutSession, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    try {
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      const cleanedUpdates = removeUndefinedFields(updates);
      await updateDoc(sessionRef, {
        ...cleanedUpdates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Workout session updated:', sessionId);
    } catch (error) {
      console.error('❌ Error updating workout session:', error);
      throw error;
    }
  }

  /**
   * Add a set to a workout session
   */
  async addSetToSession(sessionId: string, setData: WorkoutSet): Promise<void> {
    try {
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      
      // Clean the set data to remove any undefined fields before saving to Firestore
      const cleanedSetData = removeUndefinedFields(setData) as WorkoutSet;

      await updateDoc(sessionRef, {
        sets: arrayUnion(cleanedSetData),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Set added to session:', sessionId);
    } catch (error) {
      console.error('❌ Error adding set to session:', error);
      throw error;
    }
  }

  /**
   * Add a safety log entry to a workout session
   */
  async addSafetyLogEntry(
    sessionId: string,
    logEntry: SafetyLogEntry
  ): Promise<void> {
    try {
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      
      await updateDoc(sessionRef, {
        safetyLog: arrayUnion(logEntry),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Safety log entry added to session:', sessionId);
    } catch (error) {
      console.error('❌ Error adding safety log entry:', error);
      throw error;
    }
  }

  /**
   * Get all workout sessions for a specific user
   */
  async getUserSessions(
    userId: string,
    limitCount: number = 20
  ): Promise<WorkoutSession[]> {
    try {
      const sessionsRef = collection(db, this.SESSIONS_COLLECTION);
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        orderBy('startTime', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(q);

      const sessions: WorkoutSession[] = [];
      snapshot.forEach((doc) => {
        sessions.push({ id: doc.id, ...doc.data() } as WorkoutSession);
      });

      console.log('✅ Fetched user sessions:', sessions.length);
      return sessions;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Provide more descriptive error logging
      if (errorMsg.includes('index')) {
        console.error('❌ Firebase Index Error:', errorMsg);
        console.error('📝 This query requires a composite index. Deploy indexes with: firebase deploy --only firestore:indexes');
      } else {
        console.error('❌ Error fetching user sessions:', errorMsg);
      }

      throw error;
    }
  }

  /**
   * Get a specific workout session by ID
   */
  async getSessionById(sessionId: string): Promise<WorkoutSession | null> {
    try {
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        const session = { id: sessionSnap.id, ...sessionSnap.data() } as WorkoutSession;
        console.log('✅ Fetched session:', sessionId);
        return session;
      }

      console.warn('⚠️ Session not found:', sessionId);
      return null;
    } catch (error) {
      console.error('❌ Error fetching session:', error);
      throw error;
    }
  }

  /**
   * Complete a workout session and add AI summary
   */
  async completeSession(sessionId: string, aiSummary?: string): Promise<void> {
    try {
      const sessionRef = doc(db, this.SESSIONS_COLLECTION, sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const sessionData = sessionSnap.data() as WorkoutSession;
      const endTime = Date.now();
      const totalDuration = Math.floor((endTime - sessionData.startTime) / 1000); // in seconds

      await updateDoc(sessionRef, {
        status: 'completed',
        endTime,
        totalDuration,
        aiSummary: aiSummary || '',
        updatedAt: serverTimestamp(),
      });

      console.log('✅ Session completed:', sessionId);
    } catch (error) {
      console.error('❌ Error completing session:', error);
      throw error;
    }
  }

  /**
   * Get an active session for the user and exercise if one exists
   */
  async getActiveSession(userId: string, exerciseId: string): Promise<WorkoutSession | null> {
    try {
      const sessionsRef = collection(db, this.SESSIONS_COLLECTION);
      const q = query(
        sessionsRef,
        where('userId', '==', userId),
        where('exerciseId', '==', exerciseId),
        where('status', '==', 'active'),
        orderBy('startTime', 'desc'),
        limit(1)
      );

      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const session = { id: doc.id, ...doc.data() } as WorkoutSession;
        console.log('✅ Found active session:', session.id);
        return session;
      }

      return null;
    } catch (error) {
       const errorMsg = error instanceof Error ? error.message : 'Unknown error';
       // Handle index requirement error gracefully
       if (errorMsg.includes('index')) {
         console.warn('⚠️ Need index for getActiveSession, creating new session instead');
         console.warn(errorMsg);
       } else {
         console.error('❌ Error checking for active session:', error);
       }
       return null;
    }
  }
}

// Export singleton instance
export const workoutService = new WorkoutService();

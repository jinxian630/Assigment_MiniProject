import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  StudentMetrics,
  FatigueTrendDataPoint,
  AIIntervention,
} from '../types/coach';
import { readinessService } from './readiness.service';

class CoachAnalyticsService {
  /**
   * Get all students who have used this coach's exercises
   * @param coachId Coach user ID
   * @returns Array of student metrics
   */
  async getStudentList(coachId: string): Promise<StudentMetrics[]> {
    try {
      // Get all courses created by this coach
      const coursesQuery = query(
        collection(db, 'Courses'),
        where('coachId', '==', coachId)
      );

      const coursesSnapshot = await getDocs(coursesQuery);
      const courseIds = coursesSnapshot.docs.map((doc) => doc.id);

      if (courseIds.length === 0) {
        console.log('No courses found for coach:', coachId);
        return [];
      }

      // Get all workout sessions for these courses
      // Note: This is a simplified approach. In production, you might want to
      // track student enrollments in a separate collection for better performance
      const sessionsQuery = query(
        collection(db, 'WorkoutSessions'),
        orderBy('startTime', 'desc'),
        limit(1000) // Reasonable limit for demo
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);

      // Group sessions by user to identify unique students
      const studentSessionsMap = new Map<string, any[]>();

      sessionsSnapshot.docs.forEach((doc) => {
        const session = doc.data();
        const userId = session.userId;

        if (!studentSessionsMap.has(userId)) {
          studentSessionsMap.set(userId, []);
        }
        studentSessionsMap.get(userId)!.push({
          id: doc.id,
          ...session,
        });
      });

      // Build student metrics for each unique student
      const studentMetricsPromises = Array.from(
        studentSessionsMap.entries()
      ).map(async ([studentId, sessions]) => {
        return await this.buildStudentMetrics(studentId, sessions);
      });

      const studentMetrics = await Promise.all(studentMetricsPromises);

      // Filter out null results and sort by last workout date
      return studentMetrics
        .filter((m): m is StudentMetrics => m !== null)
        .sort((a, b) => {
          if (!a.lastWorkoutDate) return 1;
          if (!b.lastWorkoutDate) return -1;
          return (
            new Date(b.lastWorkoutDate).getTime() -
            new Date(a.lastWorkoutDate).getTime()
          );
        });
    } catch (error) {
      console.error('Error getting student list:', error);
      return [];
    }
  }

  /**
   * Get detailed metrics for one student
   * @param studentId Student user ID
   * @returns Student metrics object
   */
  async getStudentDetail(studentId: string): Promise<StudentMetrics | null> {
    try {
      // Get all workout sessions for this student
      const sessionsQuery = query(
        collection(db, 'WorkoutSessions'),
        where('userId', '==', studentId),
        orderBy('startTime', 'desc'),
        limit(100)
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const sessions = sessionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return await this.buildStudentMetrics(studentId, sessions);
    } catch (error) {
      console.error('Error getting student detail:', error);
      return null;
    }
  }

  /**
   * Build student metrics object from session data
   * @param studentId Student user ID
   * @param sessions Array of workout sessions
   * @returns StudentMetrics object or null if user not found
   */
  private async buildStudentMetrics(
    studentId: string,
    sessions: any[]
  ): Promise<StudentMetrics | null> {
    try {
      // Get user profile
      const userDoc = await getDoc(doc(db, 'users', studentId));
      if (!userDoc.exists()) {
        return null;
      }

      const userData = userDoc.data();

      // Calculate metrics
      const totalWorkoutSessions = sessions.length;
      const lastWorkoutDate =
        sessions.length > 0
          ? sessions[0].startTime?.toDate().toISOString().split('T')[0]
          : null;

      // Calculate adherence rate (past 30 days)
      const adherenceRate = await this.calculateAdherenceRate(studentId, 30);

      // Get average readiness score
      const averageReadinessScore =
        await readinessService.getAverageReadinessScore(studentId, 7);

      // Count AI interventions
      const aiInterventionCount = sessions.filter(
        (s) => s.aiAdjustments?.wasAdjusted
      ).length;

      // Calculate current fatigue index (simple average of recent readiness scores)
      const currentFatigueIndex = averageReadinessScore;

      return {
        studentId,
        studentName: userData.displayName || userData.email || 'Unknown',
        fitnessLevel:
          userData.stats?.fitnessLevel || userData.fitnessLevel || 'intermediate',
        adherenceRate,
        lastWorkoutDate,
        currentFatigueIndex,
        totalWorkoutSessions,
        averageReadinessScore,
        aiInterventionCount,
      };
    } catch (error) {
      console.error('Error building student metrics:', error);
      return null;
    }
  }

  /**
   * Calculate workout adherence % (past N days)
   * @param userId User ID
   * @param days Number of days to analyze (default: 30)
   * @returns Adherence percentage (0-100)
   */
  async calculateAdherenceRate(
    userId: string,
    days: number = 30
  ): Promise<number> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get all workout sessions in the period
      const sessionsQuery = query(
        collection(db, 'WorkoutSessions'),
        where('userId', '==', userId),
        where('startTime', '>=', startDate),
        orderBy('startTime', 'desc')
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);
      const completedSessions = sessionsSnapshot.docs.filter((doc) => {
        const session = doc.data();
        return session.status === 'completed';
      });

      // Expected workouts: 3-4 times per week for 30 days = ~12-16 workouts
      // We'll use 3 times per week as baseline
      const expectedWorkouts = Math.ceil((days / 7) * 3);
      const actualWorkouts = completedSessions.length;

      const adherenceRate = Math.min(
        100,
        Math.round((actualWorkouts / expectedWorkouts) * 100)
      );

      return adherenceRate;
    } catch (error) {
      console.error('Error calculating adherence rate:', error);
      return 0;
    }
  }

  /**
   * Get 30-day fatigue trend
   * @param userId User ID
   * @param days Number of days to retrieve (default: 30)
   * @returns Array of fatigue trend data points
   */
  async getFatigueTrend(
    userId: string,
    days: number = 30
  ): Promise<FatigueTrendDataPoint[]> {
    try {
      const readinessHistory = await readinessService.getReadinessHistory(
        userId,
        days
      );

      return readinessHistory.map((r) => ({
        date: r.date,
        readinessScore: r.calculatedReadinessScore,
        fatigueState: r.fatigueState,
      }));
    } catch (error) {
      console.error('Error getting fatigue trend:', error);
      return [];
    }
  }

  /**
   * Get AI intervention history
   * @param userId User ID
   * @param limit Maximum number of interventions to retrieve
   * @returns Array of AI interventions
   */
  async getAIInterventionLog(
    userId: string,
    limit: number = 20
  ): Promise<AIIntervention[]> {
    try {
      const sessionsQuery = query(
        collection(db, 'WorkoutSessions'),
        where('userId', '==', userId),
        where('aiAdjustments.wasAdjusted', '==', true),
        orderBy('startTime', 'desc'),
        limit(limit)
      );

      const sessionsSnapshot = await getDocs(sessionsQuery);

      const interventions: AIIntervention[] = [];

      for (const docSnapshot of sessionsSnapshot.docs) {
        const session = docSnapshot.data();
        const aiAdj = session.aiAdjustments;

        if (!aiAdj || !aiAdj.wasAdjusted) continue;

        interventions.push({
          id: docSnapshot.id,
          date: session.startTime?.toDate().toISOString().split('T')[0] || '',
          exerciseName: session.exerciseName || 'Unknown Exercise',
          adjustmentType: this.determineAdjustmentType(aiAdj),
          reasoning: aiAdj.adjustmentReason || 'No reason provided',
          originalPlan: {
            sets: aiAdj.originalPlan?.suggestedSets || 0,
            reps: aiAdj.originalPlan?.suggestedReps || 0,
          },
          adjustedPlan: {
            sets: aiAdj.adjustedPlan?.adjustedSets || 0,
            reps: aiAdj.adjustedPlan?.adjustedReps || 0,
            intensityModifier: aiAdj.adjustedPlan?.intensityModifier || 1.0,
          },
          studentResponse: session.status as 'completed' | 'modified' | 'skipped',
          createdAt: session.startTime || session.createdAt,
        });
      }

      return interventions;
    } catch (error) {
      console.error('Error getting AI intervention log:', error);
      return [];
    }
  }

  /**
   * Determine the type of adjustment made
   * @param aiAdjustment AI adjustment data
   * @returns Adjustment type description
   */
  private determineAdjustmentType(aiAdjustment: any): string {
    const intensityMod = aiAdjustment.adjustedPlan?.intensityModifier || 1.0;

    if (intensityMod < 0.75) {
      return 'Recovery Workout';
    } else if (intensityMod < 0.9) {
      return 'Moderate Reduction';
    } else if (intensityMod === 1.0) {
      return 'Standard Workout';
    } else {
      return 'Progressive Overload';
    }
  }

  /**
   * Get high-level summary statistics for coach dashboard
   * @param coachId Coach user ID
   * @returns Summary statistics object
   */
  async getCoachSummary(coachId: string): Promise<{
    totalStudents: number;
    averageAdherenceRate: number;
    studentsWithHighFatigue: number;
    totalAIInterventions: number;
  }> {
    try {
      const students = await this.getStudentList(coachId);

      const totalStudents = students.length;
      const averageAdherenceRate =
        students.length > 0
          ? Math.round(
              students.reduce((sum, s) => sum + s.adherenceRate, 0) /
                students.length
            )
          : 0;

      const studentsWithHighFatigue = students.filter(
        (s) => s.currentFatigueIndex < 40
      ).length;

      const totalAIInterventions = students.reduce(
        (sum, s) => sum + s.aiInterventionCount,
        0
      );

      return {
        totalStudents,
        averageAdherenceRate,
        studentsWithHighFatigue,
        totalAIInterventions,
      };
    } catch (error) {
      console.error('Error getting coach summary:', error);
      return {
        totalStudents: 0,
        averageAdherenceRate: 0,
        studentsWithHighFatigue: 0,
        totalAIInterventions: 0,
      };
    }
  }
}

export const coachAnalyticsService = new CoachAnalyticsService();

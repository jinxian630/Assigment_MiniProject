import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  DailyReadiness,
  ReadinessCheckInput,
  ReadinessScore,
  SleepQuality,
  FatigueState,
} from '../types/readiness';

class ReadinessService {
  private collectionName = 'DailyReadiness';

  /**
   * Check if user has logged readiness today
   * @param userId User ID
   * @returns DailyReadiness object if found, null otherwise
   */
  async checkTodayReadiness(userId: string): Promise<DailyReadiness | null> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('date', '==', today),
        limit(1)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      } as DailyReadiness;
    } catch (error) {
      console.error('Error checking today readiness:', error);
      throw error;
    }
  }

  /**
   * Create new readiness entry
   * @param userId User ID
   * @param input Readiness check input (sleep quality, soreness level)
   * @returns Created DailyReadiness object
   */
  async createReadinessCheck(
    userId: string,
    input: ReadinessCheckInput
  ): Promise<DailyReadiness> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      // Calculate readiness score and fatigue state
      const { readinessScore, fatigueState, recommendation } =
        this.calculateReadinessScore(input);

      const readinessData = {
        userId,
        date: today,
        sleepQuality: input.sleepQuality,
        sorenessLevel: input.sorenessLevel,
        calculatedReadinessScore: readinessScore,
        fatigueState,
        aiRecommendationSummary: recommendation,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(
        collection(db, this.collectionName),
        readinessData
      );

      return {
        id: docRef.id,
        ...readinessData,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      } as DailyReadiness;
    } catch (error) {
      console.error('Error creating readiness check:', error);
      throw error;
    }
  }

  /**
   * Calculate readiness score (0-100) and fatigue state
   * Algorithm:
   * - Sleep score: poor=0, average=50, great=100
   * - Soreness score: Inverted 1-10 scale (10 soreness = 0 score)
   * - Readiness score = (sleep × 60%) + (soreness × 40%)
   * - Fatigue state = HIGH if (soreness > 7 OR sleep === 'poor'), else NORMAL
   *
   * @param input Readiness check input
   * @returns Readiness score, fatigue state, and recommendation
   */
  calculateReadinessScore(input: ReadinessCheckInput): ReadinessScore {
    // Calculate sleep score (0-100)
    let sleepScore = 0;
    switch (input.sleepQuality) {
      case 'poor':
        sleepScore = 0;
        break;
      case 'average':
        sleepScore = 50;
        break;
      case 'great':
        sleepScore = 100;
        break;
    }

    // Calculate soreness score (inverted 1-10 scale)
    // Soreness level 1 = 100 score, Soreness level 10 = 0 score
    const sorenessScore = ((10 - input.sorenessLevel) / 9) * 100;

    // Calculate overall readiness score (weighted average)
    const readinessScore = Math.round(sleepScore * 0.6 + sorenessScore * 0.4);

    // Determine fatigue state
    const fatigueState: FatigueState =
      input.sorenessLevel > 7 || input.sleepQuality === 'poor'
        ? 'HIGH'
        : 'NORMAL';

    // Generate recommendation
    let recommendation = '';
    if (fatigueState === 'HIGH') {
      recommendation =
        'Your body needs extra recovery. We recommend reducing workout intensity and focusing on form.';
    } else if (readinessScore >= 70) {
      recommendation =
        'You are well-rested and ready for a challenging workout. Push yourself today!';
    } else {
      recommendation =
        'Moderate readiness detected. Stick to your planned workout with careful attention to form.';
    }

    return {
      readinessScore,
      fatigueState,
      recommendation,
    };
  }

  /**
   * Get past N days of readiness history
   * @param userId User ID
   * @param days Number of days to retrieve (default: 30)
   * @returns Array of DailyReadiness objects
   */
  async getReadinessHistory(
    userId: string,
    days: number = 30
  ): Promise<DailyReadiness[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        orderBy('date', 'desc'),
        limit(days)
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as DailyReadiness[];
    } catch (error) {
      console.error('Error getting readiness history:', error);
      throw error;
    }
  }

  /**
   * Calculate average readiness score for a user over past N days
   * @param userId User ID
   * @param days Number of days to average (default: 7)
   * @returns Average readiness score (0-100)
   */
  async getAverageReadinessScore(
    userId: string,
    days: number = 7
  ): Promise<number> {
    try {
      const history = await this.getReadinessHistory(userId, days);

      if (history.length === 0) {
        return 0;
      }

      const total = history.reduce(
        (sum, r) => sum + r.calculatedReadinessScore,
        0
      );
      return Math.round(total / history.length);
    } catch (error) {
      console.error('Error calculating average readiness score:', error);
      return 0;
    }
  }
}

export const readinessService = new ReadinessService();

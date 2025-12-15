import { useState, useEffect, useContext } from 'react';
import { WorkoutSession } from '@/types/workout';
import { workoutService } from '@/services/workout.service';
import { AuthContext } from '@/contexts/AuthContext';

interface UseSessionHistoryProps {
  limit?: number;
}

interface UseSessionHistoryReturn {
  sessions: WorkoutSession[];
  loading: boolean;
  error: Error | null;
  refetch: (silent?: boolean) => Promise<void>;
}

export const useSessionHistory = (
  limitCount: number = 20
): UseSessionHistoryReturn => {
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id || '';

  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = async (silent: boolean = false) => {
    if (!userId) {
      setLoading(false);
      setSessions([]);
      return;
    }

    try {
      if (!silent) {
        setLoading(true);
      }
      setError(null);

      const fetchedSessions = await workoutService.getUserSessions(userId, limitCount);
      setSessions(fetchedSessions);
      console.log('✅ Session history loaded:', fetchedSessions.length);
    } catch (err) {
      console.error('❌ Error fetching session history:', err);
      setError(err as Error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [userId, limitCount]);

  const refetch = async (silent: boolean = false): Promise<void> => {
    await fetchSessions(silent);
  };

  return {
    sessions,
    loading,
    error,
    refetch,
  };
};

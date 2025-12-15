import { useState, useEffect, useContext } from 'react';
import { HealthFitnessRole } from '@/types/modulePreferences';
import { firestoreService } from '@/services/firestore.service';
import { AuthContext } from '@/contexts/AuthContext';

interface UseHealthFitnessRoleReturn {
  role: HealthFitnessRole | null;
  setRole: (newRole: HealthFitnessRole) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

export const useHealthFitnessRole = (): UseHealthFitnessRoleReturn => {
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id || '';

  const [role, setRoleState] = useState<HealthFitnessRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetchRole();
  }, [userId]);

  const fetchRole = async () => {
    if (!userId) {
      setLoading(false);
      setRoleState(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const fetchedRole = await firestoreService.getHealthFitnessRole(userId);
      setRoleState(fetchedRole);
      console.log('✅ Health-fitness role loaded:', fetchedRole);
    } catch (err) {
      console.error('❌ Error fetching health-fitness role:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const setRole = async (newRole: HealthFitnessRole): Promise<void> => {
    if (!userId) {
      console.error('❌ Cannot set role: No user ID');
      return;
    }

    try {
      // Optimistic update
      setRoleState(newRole);
      setError(null);

      // Persist to Firestore
      await firestoreService.updateHealthFitnessRole(userId, newRole);
      console.log('✅ Health-fitness role updated successfully:', newRole);
    } catch (err) {
      console.error('❌ Error updating health-fitness role:', err);
      setError(err as Error);

      // Revert optimistic update on error
      await fetchRole();
    }
  };

  return {
    role,
    setRole,
    loading,
    error,
  };
};

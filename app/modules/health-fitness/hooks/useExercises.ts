import { useState, useEffect } from 'react';
import { Exercise, ExerciseCategory, DifficultyLevel } from '@/types/workout';
import { workoutService } from '@/services/workout.service';

interface UseExercisesProps {
  category?: ExerciseCategory;
  difficultyLevel?: DifficultyLevel;
}

interface UseExercisesReturn {
  exercises: Exercise[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const useExercises = ({
  category,
  difficultyLevel,
}: UseExercisesProps = {}): UseExercisesReturn => {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchExercises = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 useExercises: Fetching exercises');
      console.log('🔍 useExercises: Filters - Category:', category, 'Difficulty:', difficultyLevel);

      let fetchedExercises: Exercise[] = [];

      if (category && difficultyLevel) {
        // If both filters are provided, fetch by category and filter by difficulty
        const categoryExercises = await workoutService.getExercisesByCategory(category);
        fetchedExercises = categoryExercises.filter(
          (ex) => ex.difficultyLevel === difficultyLevel
        );
      } else if (category) {
        // Fetch by category only
        fetchedExercises = await workoutService.getExercisesByCategory(category);
      } else if (difficultyLevel) {
        // Fetch by difficulty only
        fetchedExercises = await workoutService.getExercisesByDifficulty(difficultyLevel);
      } else {
        // Fetch all exercises
        fetchedExercises = await workoutService.getAllExercises();
      }

      setExercises(fetchedExercises);
      console.log('✅ useExercises: Exercises loaded:', fetchedExercises.length);
      if (fetchedExercises.length === 0) {
        console.warn('⚠️ useExercises: No exercises returned! Check query filters.');
      }
    } catch (err) {
      console.error('❌ Error fetching exercises:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExercises();
  }, [category, difficultyLevel]);

  const refetch = async (): Promise<void> => {
    await fetchExercises();
  };

  return {
    exercises,
    loading,
    error,
    refetch,
  };
};

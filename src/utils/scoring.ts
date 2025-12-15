export const calculateSessionPoints = (durationMinutes: number, adherenceScore: number): number => {
  const DURATION_MULTIPLIER = 10;
  const ADHERENCE_MULTIPLIER = 5;

  return Math.floor(
    (durationMinutes * DURATION_MULTIPLIER) + (adherenceScore * ADHERENCE_MULTIPLIER)
  );
};

export const getLevelFromPoints = (totalPoints: number): number => {
  // Quadratic Curve: Level 2 requires 400 pts, Level 3 requires 900 pts
  // Points = 100 * Level^2  => Level = Sqrt(Points / 100)
  // Ensure level is at least 1
  if (totalPoints < 100) return 1;
  return Math.floor(Math.sqrt(totalPoints / 100));
};

export const getPointsForNextLevel = (currentLevel: number): number => {
  const nextLevel = currentLevel + 1;
  return 100 * (nextLevel * nextLevel);
};

export type Memory = {
  id: string;
  title: string;
  description: string;
  imageURL?: string;
  startDate: number;
  emotionSpectrum?: {
    energy: number;
    stress: number;
    clarity: number;
    warmth: number;
  };
  emotionColor?: string;
  likes?: number;
  comments?: number;
  saves?: number;
  userId?: string;
  userName?: string;
};

export function groupMemoriesByYear(memories: Memory[]): Record<string, Memory[]> {
  const groups: Record<string, Memory[]> = {};
  memories.forEach((memory) => {
    const year = new Date(memory.startDate).getFullYear().toString();
    if (!groups[year]) groups[year] = [];
    groups[year].push(memory);
  });
  return groups;
}

export function sortMemoriesByDateDesc(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => b.startDate - a.startDate);
}

export function sortMemoriesByDateAsc(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => a.startDate - b.startDate);
}

export function calculateMoodScore(emotionSpectrum?: Memory['emotionSpectrum']): number {
  if (!emotionSpectrum) return 50;
  const { energy, stress, clarity, warmth } = emotionSpectrum;
  // Higher energy, clarity, warmth = better; Lower stress = better
  return Math.round((energy + clarity + warmth + (100 - stress)) / 4);
}

export function getMoodLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "Very Poor";
}

export function getMoodColor(score: number): string {
  if (score >= 80) return "#4ade80"; // green
  if (score >= 60) return "#facc15"; // yellow
  if (score >= 40) return "#fb923c"; // orange
  if (score >= 20) return "#f87171"; // red
  return "#991b1b"; // dark red
}

export function filterMemoriesByDateRange(
  memories: Memory[],
  startDate: number,
  endDate: number
): Memory[] {
  return memories.filter(
    (m) => m.startDate >= startDate && m.startDate <= endDate
  );
}

export function filterMemoriesByToday(memories: Memory[]): Memory[] {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
  return filterMemoriesByDateRange(memories, startOfDay, endOfDay);
}

export function searchMemories(memories: Memory[], searchText: string): Memory[] {
  const lower = searchText.toLowerCase();
  return memories.filter(
    (m) =>
      m.title.toLowerCase().includes(lower) ||
      m.description.toLowerCase().includes(lower)
  );
}

export function getMemoryStats(memories: Memory[]): {
  total: number;
  totalLikes: number;
  totalComments: number;
  totalSaves: number;
  avgMoodScore: number;
} {
  const total = memories.length;
  const totalLikes = memories.reduce((sum, m) => sum + (m.likes || 0), 0);
  const totalComments = memories.reduce((sum, m) => sum + (m.comments || 0), 0);
  const totalSaves = memories.reduce((sum, m) => sum + (m.saves || 0), 0);

  const moodScores = memories
    .filter((m) => m.emotionSpectrum)
    .map((m) => calculateMoodScore(m.emotionSpectrum));

  const avgMoodScore = moodScores.length > 0
    ? Math.round(moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length)
    : 0;

  return {
    total,
    totalLikes,
    totalComments,
    totalSaves,
    avgMoodScore,
  };
}

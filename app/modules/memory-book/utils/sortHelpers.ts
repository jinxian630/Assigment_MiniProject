import type { Memory } from "./memoryHelpers";
import type { SortOption } from "../components/SortModal";
import { calculateMoodScore } from "./memoryHelpers";

export function sortMemories(
  memories: Memory[],
  sortOption: SortOption
): Memory[] {
  const sorted = [...memories];

  switch (sortOption) {
    case "newest":
      return sorted.sort((a, b) => b.startDate - a.startDate);
    case "oldest":
      return sorted.sort((a, b) => a.startDate - b.startDate);
    case "mostLiked":
      return sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    case "mostCommented":
      return sorted.sort((a, b) => (b.comments || 0) - (a.comments || 0));
    case "highestMood":
      return sorted.sort(
        (a, b) =>
          calculateMoodScore(b.emotionSpectrum) -
          calculateMoodScore(a.emotionSpectrum)
      );
    case "lowestMood":
      return sorted.sort(
        (a, b) =>
          calculateMoodScore(a.emotionSpectrum) -
          calculateMoodScore(b.emotionSpectrum)
      );
    default:
      return sorted;
  }
}


import type { Memory } from "./memoryHelpers";
import type { FilterOptions } from "../components/FilterModal";

export function applyFilters(
  memories: Memory[],
  filters: FilterOptions
): Memory[] {
  let filtered = [...memories];

  // Keyword filter
  if (filters.keyword) {
    const keyword = filters.keyword.toLowerCase();
    filtered = filtered.filter((memory) => {
      const title = (memory.title || "").toLowerCase();
      const description = (memory.description || "").toLowerCase();
      return title.includes(keyword) || description.includes(keyword);
    });
  }

  // Emotion color filter
  if (filters.emotionColor) {
    filtered = filtered.filter(
      (memory) => memory.emotionColor === filters.emotionColor
    );
  }

  // Feeling rank filter
  if (filters.feelingType && filters.feelingRank) {
    const type = filters.feelingType;
    const rank = filters.feelingRank;

    // Sort by the selected feeling type
    filtered.sort((a, b) => {
      const aValue = a.emotionSpectrum?.[type] ?? 0;
      const bValue = b.emotionSpectrum?.[type] ?? 0;
      return rank === "most" ? bValue - aValue : aValue - bValue;
    });

    // Get the top/bottom value
    if (filtered.length > 0) {
      const targetValue = filtered[0].emotionSpectrum?.[type] ?? 0;
      filtered = filtered.filter(
        (memory) => (memory.emotionSpectrum?.[type] ?? 0) === targetValue
      );
    }
  }

  return filtered;
}

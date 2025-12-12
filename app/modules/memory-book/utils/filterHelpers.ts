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

    // For "most", show top 25% of memories with highest values
    // For "least", show bottom 25% of memories with lowest values
    if (filtered.length > 0) {
      const topCount = Math.max(1, Math.ceil(filtered.length * 0.25));
      if (rank === "most") {
        // Get top values (may have multiple memories with same top value)
        const topValue = filtered[0].emotionSpectrum?.[type] ?? 0;
        filtered = filtered.filter(
          (memory) => (memory.emotionSpectrum?.[type] ?? 0) >= topValue
        ).slice(0, topCount * 2); // Allow some flexibility
      } else {
        // Get bottom values
        const bottomValue = filtered[filtered.length - 1].emotionSpectrum?.[type] ?? 0;
        filtered = filtered.filter(
          (memory) => (memory.emotionSpectrum?.[type] ?? 0) <= bottomValue
        ).slice(-topCount * 2); // Allow some flexibility
      }
    }
  }

  return filtered;
}

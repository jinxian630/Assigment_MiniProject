/**
 * Comprehensive AI Insights Helper
 * Extends ollamaHelper with more detailed analysis
 */

import { checkOllamaConnection } from "./ollamaHelper";
import type { Memory } from "./memoryHelpers";

const OLLAMA_BASE_URL = "http://localhost:11434/api/generate";
const MODEL_NAME = "deepseek";

export interface PeriodComparison {
  changes: Array<{
    message: string;
    trend: "up" | "down" | "neutral";
  }>;
  moodShift: number;
}

export interface ComprehensiveInsights {
  overallMood: string;
  moodScore: number;
  emotionDistribution: Array<{
    label: string;
    percentage: number;
    color: string;
  }>;
  suggestions: string[];
}

export interface Theme {
  name: string;
  count: number;
  sentiment: "positive" | "negative" | "neutral";
}

export interface Highlight {
  memory: Memory;
  reason: string;
  score: number;
}

/**
 * Compare two periods and return changes
 */
export function comparePeriods(
  current: Memory[],
  previous: Memory[]
): PeriodComparison {
  const getAvgMood = (memories: Memory[]) => {
    if (memories.length === 0) return 50;
    const total = memories.reduce((sum, m) => {
      if (m.emotionSpectrum) {
        return (
          sum +
          (m.emotionSpectrum.energy +
            m.emotionSpectrum.clarity +
            m.emotionSpectrum.warmth -
            m.emotionSpectrum.stress) /
            4
        );
      }
      return sum;
    }, 0);
    return total / memories.length;
  };

  const currentAvg = getAvgMood(current);
  const previousAvg = getAvgMood(previous);
  const moodShift = currentAvg - previousAvg;

  const changes: PeriodComparison["changes"] = [];

  if (Math.abs(moodShift) > 5) {
    changes.push({
      message: `Mood ${moodShift > 0 ? "improved" : "declined"} by ${Math.abs(moodShift).toFixed(1)}%`,
      trend: moodShift > 0 ? "up" : "down",
    });
  }

  const currentCount = current.length;
  const previousCount = previous.length;
  if (Math.abs(currentCount - previousCount) > 0) {
    const change = currentCount - previousCount;
    changes.push({
      message: `${change > 0 ? "+" : ""}${change} memory${Math.abs(change) === 1 ? "" : "ies"} vs previous period`,
      trend: change > 0 ? "up" : "down",
    });
  }

  // Compare emotion averages
  const getAvgEmotion = (memories: Memory[], emotion: keyof typeof memories[0]["emotionSpectrum"]) => {
    if (memories.length === 0) return 50;
    const total = memories.reduce((sum, m) => {
      return sum + (m.emotionSpectrum?.[emotion] || 50);
    }, 0);
    return total / memories.length;
  };

  ["energy", "stress", "clarity", "warmth"].forEach((emotion) => {
    const currentVal = getAvgEmotion(current, emotion as any);
    const previousVal = getAvgEmotion(previous, emotion as any);
    const diff = currentVal - previousVal;
    if (Math.abs(diff) > 10) {
      changes.push({
        message: `${emotion.charAt(0).toUpperCase() + emotion.slice(1)} ${diff > 0 ? "increased" : "decreased"} by ${Math.abs(diff).toFixed(0)}%`,
        trend: diff > 0 ? (emotion === "stress" ? "down" : "up") : emotion === "stress" ? "up" : "down",
      });
    }
  });

  return { changes, moodShift };
}

/**
 * Generate comprehensive insights
 */
export async function generateComprehensiveInsights(
  memories: Memory[],
  useAI: boolean
): Promise<ComprehensiveInsights> {
  if (memories.length === 0) {
    return {
      overallMood: "Neutral",
      moodScore: 50,
      emotionDistribution: [],
      suggestions: [],
    };
  }

  // Calculate averages
  const totals = memories.reduce(
    (acc, m) => {
      if (m.emotionSpectrum) {
        acc.energy += m.emotionSpectrum.energy;
        acc.stress += m.emotionSpectrum.stress;
        acc.clarity += m.emotionSpectrum.clarity;
        acc.warmth += m.emotionSpectrum.warmth;
        acc.count++;
      }
      return acc;
    },
    { energy: 0, stress: 0, clarity: 0, warmth: 0, count: 0 }
  );

  const avgEnergy = totals.energy / totals.count;
  const avgStress = totals.stress / totals.count;
  const avgClarity = totals.clarity / totals.count;
  const avgWarmth = totals.warmth / totals.count;

  // Calculate mood score (0-100)
  const moodScore = Math.round(
    (avgEnergy + avgClarity + avgWarmth - avgStress + 100) / 4
  );

  // Determine overall mood
  let overallMood = "Balanced";
  if (moodScore > 70) {
    overallMood = "Positive & Energetic";
  } else if (moodScore > 55) {
    overallMood = "Calm & Positive";
  } else if (moodScore < 40) {
    overallMood = "Stressed & Low";
  } else {
    overallMood = "Mixed Feelings";
  }

  // Emotion distribution
  const emotionDistribution = [
    {
      label: "Energy",
      percentage: Math.round(avgEnergy),
      color: "#fbbf24",
    },
    {
      label: "Clarity",
      percentage: Math.round(avgClarity),
      color: "#3b82f6",
    },
    {
      label: "Warmth",
      percentage: Math.round(avgWarmth),
      color: "#ef4444",
    },
    {
      label: "Stress",
      percentage: Math.round(avgStress),
      color: "#8b5cf6",
    },
  ];

  // Generate suggestions
  let suggestions: string[] = [];

  if (useAI) {
    try {
      const prompt = `Based on these mood patterns:
- Average Energy: ${avgEnergy.toFixed(1)}%
- Average Stress: ${avgStress.toFixed(1)}%
- Average Clarity: ${avgClarity.toFixed(1)}%
- Average Warmth: ${avgWarmth.toFixed(1)}%
- Total Memories: ${memories.length}

Generate 2-3 brief, gentle, and useful suggestions (one sentence each) to help improve mood and well-being. Be supportive, not preachy. Format as a simple list, one per line.`;

      const response = await fetch(OLLAMA_BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: prompt,
          stream: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.response || "";
        // Extract suggestions (lines starting with - or numbers)
        const lines = aiResponse
          .split("\n")
          .map((line: string) => line.replace(/^[-•\d.\s]+/, "").trim())
          .filter((line: string) => line.length > 10);
        suggestions = lines.slice(0, 3);
      }
    } catch (error) {
      console.error("Error getting AI suggestions:", error);
    }
  }

  // Fallback suggestions
  if (suggestions.length === 0) {
    if (avgStress > 60) {
      suggestions.push("Consider activities that help reduce stress, like meditation or exercise.");
    }
    if (avgEnergy < 40) {
      suggestions.push("Try to get more rest and engage in activities that energize you.");
    }
    if (avgWarmth > 70) {
      suggestions.push("You've been feeling warm and connected. Keep nurturing those relationships!");
    }
    if (suggestions.length === 0) {
      suggestions.push("Your emotional patterns look balanced. Keep tracking your feelings!");
    }
  }

  return {
    overallMood,
    moodScore,
    emotionDistribution,
    suggestions,
  };
}

/**
 * Extract themes from memories
 */
export function extractThemes(memories: Memory[]): Theme[] {
  const themeMap: Record<string, number> = {};
  const commonWords = [
    "study",
    "work",
    "friend",
    "family",
    "gym",
    "exercise",
    "food",
    "travel",
    "music",
    "art",
    "sleep",
    "money",
    "school",
    "home",
    "party",
    "celebration",
    "sad",
    "happy",
    "excited",
    "tired",
  ];

  memories.forEach((memory) => {
    const text = `${memory.title} ${memory.description || ""}`.toLowerCase();
    commonWords.forEach((word) => {
      if (text.includes(word)) {
        themeMap[word] = (themeMap[word] || 0) + 1;
      }
    });
  });

  return Object.entries(themeMap)
    .map(([name, count]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      count,
      sentiment: "neutral" as const,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

/**
 * Get highlights (best moments)
 */
export function getHighlights(memories: Memory[]): Highlight[] {
  // Score memories based on multiple factors
  const scored = memories.map((memory) => {
    let score = 0;

    // High emotion scores
    if (memory.emotionSpectrum) {
      const mood =
        (memory.emotionSpectrum.energy +
          memory.emotionSpectrum.clarity +
          memory.emotionSpectrum.warmth -
          memory.emotionSpectrum.stress) /
        4;
      score += mood;
    }

    // Has image
    if (memory.imageURL) score += 10;

    // Long description
    if (memory.description && memory.description.length > 100) score += 5;

    // High engagement (likes, comments)
    score += (memory.likes || 0) * 2;
    score += (memory.comments || 0) * 3;

    return { memory, score };
  });

  // Sort by score and take top 3
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((item, idx) => {
      let reason = "";
      if (item.memory.emotionSpectrum) {
        const mood =
          (item.memory.emotionSpectrum.energy +
            item.memory.emotionSpectrum.clarity +
            item.memory.emotionSpectrum.warmth -
            item.memory.emotionSpectrum.stress) /
          4;
        if (mood > 70) {
          reason = "High positive energy and emotional clarity";
        } else if (item.memory.likes && item.memory.likes > 5) {
          reason = "Highly liked and engaging memory";
        } else if (item.memory.description && item.memory.description.length > 100) {
          reason = "Detailed and meaningful reflection";
        } else {
          reason = "Notable moment in your timeline";
        }
      } else {
        reason = "Significant memory";
      }

      return {
        memory: item.memory,
        reason,
        score: item.score,
      };
    });

  return top;
}


/**
 * Comprehensive AI Insights Helper
 * Extends ollamaHelper with more detailed analysis
 * Supports: Ollama (local), OpenAI (optional), or smart data-driven analysis
 */

import { checkOllamaConnection } from "./ollamaHelper";
import type { Memory } from "./memoryHelpers";

const OLLAMA_BASE_URL = "http://localhost:11434/api/generate";
const MODEL_NAME = "deepseek-r1:1.5b"; // Using the installed DeepSeek model

// Optional: OpenAI API (set via environment variable if you want to use it)
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

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
      message: `${change > 0 ? "+" : ""}${change} ${Math.abs(change) === 1 ? "memory" : "memories"} vs previous period`,
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

  // Handle division by zero
  if (totals.count === 0) {
    return {
      overallMood: "Neutral",
      moodScore: 50,
      emotionDistribution: [],
      suggestions: ["Create more memories to get personalized insights!"],
    };
  }

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

  // Generate intelligent suggestions (with or without AI)
  let suggestions: string[] = [];

  // Smart data-driven suggestions (always generated)
  const smartSuggestions: string[] = [];
  
  // Stress analysis
  if (avgStress > 70) {
    smartSuggestions.push("Your stress levels are quite high. Consider trying meditation, deep breathing, or taking short breaks throughout the day.");
  } else if (avgStress > 60) {
    smartSuggestions.push("You've been experiencing elevated stress. Activities like walking, listening to music, or talking with friends can help.");
  } else if (avgStress < 30) {
    smartSuggestions.push("Great job managing stress! You're maintaining a calm and balanced state.");
  }

  // Energy analysis
  if (avgEnergy < 30) {
    smartSuggestions.push("Your energy levels are low. Make sure you're getting enough sleep, staying hydrated, and eating nutritious meals.");
  } else if (avgEnergy < 40) {
    smartSuggestions.push("Consider activities that boost energy naturally, like morning exercise, sunlight exposure, or engaging hobbies.");
  } else if (avgEnergy > 75) {
    smartSuggestions.push("You're maintaining high energy! Channel this into productive activities and creative projects.");
  }

  // Clarity analysis
  if (avgClarity < 35) {
    smartSuggestions.push("Your mental clarity could use a boost. Try journaling, organizing your thoughts, or reducing distractions.");
  } else if (avgClarity > 70) {
    smartSuggestions.push("You're experiencing great mental clarity! This is a good time for important decisions and focused work.");
  }

  // Warmth/Connection analysis
  if (avgWarmth > 75) {
    smartSuggestions.push("You're feeling very connected and warm. These positive relationships are valuable - keep nurturing them!");
  } else if (avgWarmth < 40) {
    smartSuggestions.push("Consider reaching out to friends or family. Social connections can significantly improve your mood and well-being.");
  }

  // Mood score analysis
  if (moodScore > 75) {
    smartSuggestions.push("Your overall mood has been excellent! Keep doing what makes you happy and fulfilled.");
  } else if (moodScore < 45) {
    smartSuggestions.push("Your mood has been lower recently. Remember that it's okay to have difficult days, and consider speaking with someone you trust.");
  }

  // Balance check
  const isBalanced = avgStress < 50 && avgEnergy > 40 && avgEnergy < 70 && avgClarity > 40;
  if (isBalanced && smartSuggestions.length === 0) {
    smartSuggestions.push("Your emotional patterns are well-balanced. Keep tracking your feelings and maintaining this equilibrium!");
  }

  // Try AI enhancement if available (Ollama first, then OpenAI if configured)
  if (useAI && smartSuggestions.length > 0) {
    const prompt = `Based on these mood patterns:
- Average Energy: ${avgEnergy.toFixed(1)}%
- Average Stress: ${avgStress.toFixed(1)}%
- Average Clarity: ${avgClarity.toFixed(1)}%
- Average Warmth: ${avgWarmth.toFixed(1)}%
- Mood Score: ${moodScore}%
- Total Memories: ${memories.length}

Generate 1-2 brief, personalized, and supportive suggestions to help improve well-being. Be warm and encouraging. Just return the suggestions, one per line, no numbering.`;

    let aiSuccess = false;

    // Try Ollama first (local, free)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 5000); // 5 second timeout

      try {
        const response = await fetch(OLLAMA_BASE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: MODEL_NAME,
            prompt: prompt,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.response || "";
          console.log("✅ AI Suggestions from Ollama/DeepSeek:", aiResponse);
          const lines = aiResponse
            .split("\n")
            .map((line: string) => line.replace(/^[-•\d.\s]+/, "").trim())
            .filter((line: string) => line.length > 15 && line.length < 200);
          
          if (lines.length > 0) {
            suggestions = [...lines.slice(0, 2), ...smartSuggestions.slice(0, 1)].slice(0, 3);
            aiSuccess = true;
          }
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name !== 'AbortError') {
          console.log("⚠️ Ollama request failed, trying fallback:", fetchError.message);
        }
      }
    } catch (error: any) {
      console.log("⚠️ Ollama error:", error.message);
    }

    // Fallback to OpenAI if Ollama failed and API key is available
    if (!aiSuccess && OPENAI_API_KEY) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
        }, 5000);

        try {
          const response = await fetch(OPENAI_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: "gpt-3.5-turbo",
              messages: [
                {
                  role: "system",
                  content: "You are a thoughtful AI assistant helping users understand their mood patterns. Be warm, supportive, and encouraging.",
                },
                {
                  role: "user",
                  content: prompt,
                },
              ],
              max_tokens: 150,
              temperature: 0.7,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            const aiResponse = data.choices?.[0]?.message?.content || "";
            console.log("✅ AI Suggestions from OpenAI:", aiResponse);
            const lines = aiResponse
              .split("\n")
              .map((line: string) => line.replace(/^[-•\d.\s]+/, "").trim())
              .filter((line: string) => line.length > 15 && line.length < 200);
            
            if (lines.length > 0) {
              suggestions = [...lines.slice(0, 2), ...smartSuggestions.slice(0, 1)].slice(0, 3);
              aiSuccess = true;
            }
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name !== 'AbortError') {
            console.log("⚠️ OpenAI request failed:", fetchError.message);
          }
        }
      } catch (error: any) {
        console.log("⚠️ OpenAI error:", error.message);
      }
    }

    // If AI failed, use smart suggestions
    if (!aiSuccess) {
      suggestions = smartSuggestions.slice(0, 3);
    }
  } else {
    // Use smart suggestions without AI
    suggestions = smartSuggestions.slice(0, 3);
  }

  // Final fallback
  if (suggestions.length === 0) {
    suggestions.push("Keep tracking your emotions! Regular reflection helps you understand your patterns better.");
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


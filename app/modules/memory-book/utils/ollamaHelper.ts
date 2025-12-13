/**
 * Ollama AI Integration Helper
 * Connects to local Ollama instance with DeepSeek model
 */

const OLLAMA_BASE_URL = "http://localhost:11434/api/generate";
const MODEL_NAME = "deepseek-r1:1.5b"; // Using the installed DeepSeek model

export interface MoodInsight {
  message: string;
  trend: "positive" | "negative" | "neutral";
  period: string;
}

export interface EmotionAnalysis {
  averageEnergy: number;
  averageStress: number;
  averageClarity: number;
  averageWarmth: number;
  dominantEmotion: string;
  insights: string[];
}

/**
 * Generate AI reflection prompt based on memory data
 */
export async function generateReflectionPrompt(
  memoryData: {
    title: string;
    description: string;
    emotionSpectrum?: {
      energy: number;
      stress: number;
      clarity: number;
      warmth: number;
    };
    date: number;
  }
): Promise<string> {
  try {
    const prompt = `You are a thoughtful AI assistant helping users reflect on their memories. Based on this memory:

Title: ${memoryData.title}
Description: ${memoryData.description}
Emotions: Energy ${memoryData.emotionSpectrum?.energy || 50}%, Stress ${memoryData.emotionSpectrum?.stress || 50}%, Clarity ${memoryData.emotionSpectrum?.clarity || 50}%, Warmth ${memoryData.emotionSpectrum?.warmth || 50}%
Date: ${new Date(memoryData.date).toLocaleDateString()}

Generate a brief, encouraging reflection prompt (1-2 sentences) that helps the user think about this memory. Be warm and supportive.`;

      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(OLLAMA_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          prompt: prompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || "Take a moment to reflect on this memory.";
    } catch (error: any) {
      // Silently handle network errors (Ollama may not be available on mobile)
      if (error.name === 'AbortError') {
        console.log("Ollama reflection prompt timeout");
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        console.log("Ollama not available for reflection (network error)");
      } else {
        console.log("Error generating reflection prompt:", error.message || error);
      }
    // Fallback prompts
    const fallbacks = [
      "It's been a while since this memory. How do you feel about it now?",
      "Looking back, what stands out most about this moment?",
      "This memory captured a special moment. What made it meaningful?",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }
}

/**
 * Analyze mood trends and generate insights
 */
export async function analyzeMoodTrends(
  memories: Array<{
    emotionSpectrum?: {
      energy: number;
      stress: number;
      clarity: number;
      warmth: number;
    };
    startDate: number;
  }>
): Promise<MoodInsight[]> {
  try {
    if (memories.length === 0) {
      return [];
    }

    // Calculate averages
    const totals = memories.reduce(
      (acc, mem) => {
        if (mem.emotionSpectrum) {
          acc.energy += mem.emotionSpectrum.energy;
          acc.stress += mem.emotionSpectrum.stress;
          acc.clarity += mem.emotionSpectrum.clarity;
          acc.warmth += mem.emotionSpectrum.warmth;
          acc.count++;
        }
        return acc;
      },
      { energy: 0, stress: 0, clarity: 0, warmth: 0, count: 0 }
    );

    if (totals.count === 0) {
      return [];
    }

    const avgEnergy = totals.energy / totals.count;
    const avgStress = totals.stress / totals.count;
    const avgClarity = totals.clarity / totals.count;
    const avgWarmth = totals.warmth / totals.count;

    // Group by month for trend analysis
    const monthlyData: Record<string, number[]> = {};
    memories.forEach((mem) => {
      if (mem.emotionSpectrum) {
        const date = new Date(mem.startDate);
        const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = [];
        }
        monthlyData[monthKey].push(
          (mem.emotionSpectrum.energy +
            mem.emotionSpectrum.clarity +
            mem.emotionSpectrum.warmth -
            mem.emotionSpectrum.stress) /
            4
        );
      }
    });

    const insights: MoodInsight[] = [];

    // Generate AI insights
    const prompt = `Analyze these mood trends:
Average Energy: ${avgEnergy.toFixed(1)}%
Average Stress: ${avgStress.toFixed(1)}%
Average Clarity: ${avgClarity.toFixed(1)}%
Average Warmth: ${avgWarmth.toFixed(1)}%

Generate 2-3 brief, supportive insights about the user's emotional patterns. Be encouraging and specific. Format as JSON array with {message, trend, period} objects.`;

    try {
      // Use AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(OLLAMA_BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
        const aiResponse = data.response;
        // Try to parse JSON from response
        const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return parsed;
        }
      }
    } catch (error: any) {
      // Silently handle network errors (Ollama may not be available on mobile)
      if (error.name === 'AbortError') {
        console.log("Ollama request timeout");
      } else if (error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
        console.log("Ollama not available (network error)");
      } else {
        console.log("Error getting AI insights:", error.message || error);
      }
    }

    // Fallback insights based on data
    if (avgStress > 60) {
      insights.push({
        message: "You've been experiencing higher stress levels recently. Take time for self-care.",
        trend: "negative",
        period: "recent",
      });
    }

    if (avgEnergy > 70 && avgWarmth > 70) {
      insights.push({
        message: "You've been feeling energetic and warm! Keep up the positive energy.",
        trend: "positive",
        period: "recent",
      });
    }

    if (avgClarity < 40) {
      insights.push({
        message: "Your clarity levels have been lower. Consider activities that help you focus.",
        trend: "negative",
        period: "recent",
      });
    }

    return insights.length > 0
      ? insights
      : [
          {
            message: "Your emotional patterns are balanced. Keep tracking your feelings!",
            trend: "neutral" as const,
            period: "recent",
          },
        ];
  } catch (error) {
    console.error("Error analyzing mood trends:", error);
    return [];
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaConnection(): Promise<boolean> {
  try {
    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch("http://localhost:11434/api/tags", {
      method: "GET",
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      // Check if deepseek-r1:1.5b model is available
      const models = data.models || [];
      const hasDeepSeek = models.some((m: any) => 
        m.name?.toLowerCase().includes("deepseek")
      );
      console.log("Ollama connected. Available models:", models.map((m: any) => m.name));
      console.log("DeepSeek model available:", hasDeepSeek);
      return hasDeepSeek;
    }
    return false;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log("Ollama connection timeout");
    } else {
      console.log("Ollama not available:", error.message);
    }
    return false;
  }
}


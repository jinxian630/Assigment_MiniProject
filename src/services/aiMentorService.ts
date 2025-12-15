interface UserStatsContext {
  streak: number;
  weeklyWorkouts: number;
  weeklyMinutes: number;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

const API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY as string;

export const generateWeeklyMentorMessage = async (
  stats: UserStatsContext
): Promise<string> => {
  
  const prompt = `
    Role: Fitness Mentor.
    Context: User has a streak of ${stats.streak} days, ${stats.weeklyWorkouts} workouts, and ${stats.weeklyMinutes} mins total volume this week.
    Task: Write a 1-sentence motivation specifically referencing their stats. If streak is broken (0), encourage them to restart. Be short and punchy.
  `;

  try {
    if (!API_KEY) {
      console.warn("OpenRouter API Key missing. Using fallback message.");
      return "Consistency is key. Keep showing up!";
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://myapp.com",
        "X-Title": "FitnessApp"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3-8b-instruct:free",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
       console.error("AI API Error status:", response.status);
       throw new Error('AI API Failed');
    }

    const data: OpenRouterResponse = await response.json();
    return data.choices[0]?.message?.content || "Keep going! You're doing great.";
    
  } catch (error) {
    console.error("Mentor Service Error:", error);
    return "Consistency is key. Keep moving forward!"; // Fallback
  }
};

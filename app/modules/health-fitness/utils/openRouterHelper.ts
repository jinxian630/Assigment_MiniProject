import { AISummaryRequest } from '../types/safetyCue';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const MODEL = 'anthropic/claude-3.5-sonnet';

/**
 * Generate a post-workout AI summary using Claude 3.5 Sonnet via OpenRouter
 */
export async function generatePostSessionSummary(
  sessionData: AISummaryRequest
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error(
      'OpenRouter API key not configured. Please add EXPO_PUBLIC_OPENROUTER_API_KEY to your .env file.'
    );
  }

  try {
    // Build the prompt
    const prompt = buildSummaryPrompt(sessionData);

    // Call OpenRouter API
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://yourapp.com', // Optional: Your app URL
        'X-Title': 'Health & Fitness Tracker', // Optional: Your app name
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenRouter API error:', response.status, errorData);
      throw new Error(
        `OpenRouter API request failed: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    // Extract the AI-generated summary
    const summary = data.choices?.[0]?.message?.content;

    if (!summary) {
      throw new Error('No summary generated from OpenRouter API');
    }

    console.log('✅ AI summary generated successfully');
    return summary.trim();
  } catch (error) {
    console.error('❌ Error generating AI summary:', error);
    throw error;
  }
}

/**
 * Build the prompt for the AI summary
 */
function buildSummaryPrompt(sessionData: AISummaryRequest): string {
  const { exerciseName, duration, sets, safetyLog } = sessionData;

  // Format duration
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;
  const durationStr = `${minutes}m ${seconds}s`;

  // Format sets
  const setsStr = sets
    .map((set) => {
      const parts = [`Set ${set.setNumber}`];
      if (set.reps) parts.push(`${set.reps} reps`);
      if (set.weight) parts.push(`@ ${set.weight}lbs`);
      if (set.fatigueLevel) parts.push(`Fatigue: ${set.fatigueLevel}/5`);
      return `- ${parts.join(', ')}`;
    })
    .join('\n');

  // Format safety log
  const safetyLogStr =
    safetyLog.length > 0
      ? safetyLog
          .map((log) => `- [${log.priority}] ${log.cueText}`)
          .join('\n')
      : '- No safety cues were triggered';

  const prompt = `Analyze this workout session and provide a brief, personalized safety summary (3-4 sentences):

Exercise: ${exerciseName}
Duration: ${durationStr}
Sets:
${setsStr}

Safety Cues Triggered:
${safetyLogStr}

Focus on:
1. Overall performance and form quality
2. Fatigue progression across sets
3. Specific safety concerns that arose
4. Actionable recommendations for next session

Provide a concise, encouraging summary that highlights both strengths and areas for improvement.`;

  return prompt;
}

/**
 * Test the OpenRouter API connection
 */
export async function testOpenRouterConnection(): Promise<boolean> {
  try {
    const testRequest: AISummaryRequest = {
      exerciseName: 'Test Exercise',
      duration: 120,
      sets: [
        {
          setNumber: 1,
          reps: 10,
          weight: 100,
          fatigueLevel: 3,
        },
      ],
      safetyLog: [],
    };

    await generatePostSessionSummary(testRequest);
    return true;
  } catch (error) {
    console.error('OpenRouter connection test failed:', error);
    return false;
  }
}

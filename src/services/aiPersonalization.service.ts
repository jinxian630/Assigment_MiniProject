import {
  PersonalizationContext,
  AIWorkoutRecommendation,
} from '../types/aiPersonalization';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const MODEL = 'anthropic/claude-3.5-sonnet';

class AIPersonalizationService {
  /**
   * Generate workout adjustments based on user context
   * @param context Personalization context (user profile, readiness, exercise info)
   * @returns AI workout recommendation with adjusted parameters
   */
  async generateWorkoutAdjustment(
    context: PersonalizationContext
  ): Promise<AIWorkoutRecommendation> {
    if (!OPENROUTER_API_KEY) {
      console.warn(
        'OpenRouter API key not configured. Using fallback recommendations.'
      );
      return this.getFallbackRecommendation(context);
    }

    try {
      // Build the personalization prompt
      const prompt = this.buildPersonalizationPrompt(context);

      // Call OpenRouter API
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yourapp.com',
          'X-Title': 'Health & Fitness Tracker - AI Personalization',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 600,
          temperature: 0.3, // Lower temperature for consistent recommendations
          response_format: { type: 'json_object' },
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

      // Extract the AI-generated recommendation
      const recommendationText = data.choices?.[0]?.message?.content;

      if (!recommendationText) {
        throw new Error('No recommendation generated from OpenRouter API');
      }

      // Parse JSON response
      const recommendation = JSON.parse(recommendationText) as AIWorkoutRecommendation;

      // Validate the recommendation
      if (!this.isValidRecommendation(recommendation)) {
        console.warn('Invalid AI recommendation structure, using fallback');
        return this.getFallbackRecommendation(context);
      }

      console.log('✅ AI workout adjustment generated successfully');
      return recommendation;
    } catch (error) {
      console.error('❌ Error generating AI workout adjustment:', error);
      // Return fallback recommendation instead of throwing
      return this.getFallbackRecommendation(context);
    }
  }

  /**
   * Build the system prompt for OpenRouter API
   * @param context Personalization context
   * @returns Formatted prompt string
   */
  private buildPersonalizationPrompt(context: PersonalizationContext): string {
    const { readiness, exercise, userProfile, recentHistory } = context;

    const prompt = `You are a certified fitness coach AI. Adjust workout parameters based on the following data:

**User Profile:**
- Fitness Level: ${userProfile.fitnessLevel}
- Injury History: ${userProfile.injuryHistory.length > 0 ? userProfile.injuryHistory.map(i => `${i.bodyPart} (${i.severity}, ${i.recoveryStatus})`).join(', ') : 'None'}

**Today's Readiness:**
- Readiness Score: ${readiness.readinessScore}/100
- Fatigue State: ${readiness.fatigueState}
- Sleep Quality: ${readiness.sleepQuality}
- Soreness Level: ${readiness.sorenessLevel}/10

**Exercise Information:**
- Exercise: ${exercise.name}
- Category: ${exercise.category}
- Difficulty: ${exercise.difficultyLevel}

**Recent Training History:**
- Weekly Volume Load: ${recentHistory.weeklyVolumeLoad}
- Last Workout: ${recentHistory.lastWorkoutDate || 'N/A'}
- Current Fatigue Index: ${recentHistory.currentFatigueIndex}

**Instructions:**
Return ONLY a valid JSON object with this exact structure (no additional text):
{
  "adjustedSets": <number between 2-5>,
  "adjustedReps": <number between 6-15>,
  "intensityModifier": <number between 0.6-1.0>,
  "safetyCues": [<2-3 brief safety reminders as strings>],
  "expectations": "<1 sentence about what to expect from this workout>",
  "reasoning": "<2-3 sentences explaining why these adjustments were made>"
}

**Guidelines:**
- HIGH fatigue (readiness < 40 or fatigue state = HIGH): Reduce volume by 20-40%, lower intensity (0.6-0.75), prioritize form and recovery
- MODERATE fatigue (readiness 40-70): Slight reduction (10-20%), standard intensity (0.8-0.9)
- LOW fatigue (readiness > 70): Standard or progressive load, full intensity (0.9-1.0)
- Consider injury history: Avoid exercises that stress injured areas, recommend alternatives
- Adjust for fitness level: Beginners need more recovery, advanced can handle higher volume
- Safety first: Always include form cues and injury prevention advice

Return the JSON object now:`;

    return prompt;
  }

  /**
   * Validate the AI recommendation structure
   * @param recommendation AI recommendation object
   * @returns true if valid, false otherwise
   */
  private isValidRecommendation(
    recommendation: any
  ): recommendation is AIWorkoutRecommendation {
    return (
      typeof recommendation === 'object' &&
      typeof recommendation.adjustedSets === 'number' &&
      recommendation.adjustedSets >= 1 &&
      recommendation.adjustedSets <= 10 &&
      typeof recommendation.adjustedReps === 'number' &&
      recommendation.adjustedReps >= 1 &&
      recommendation.adjustedReps <= 50 &&
      typeof recommendation.intensityModifier === 'number' &&
      recommendation.intensityModifier >= 0.5 &&
      recommendation.intensityModifier <= 1.0 &&
      Array.isArray(recommendation.safetyCues) &&
      recommendation.safetyCues.length > 0 &&
      typeof recommendation.expectations === 'string' &&
      typeof recommendation.reasoning === 'string'
    );
  }

  /**
   * Get fallback recommendation when AI service fails or returns invalid data
   * Uses conservative, safe defaults based on fatigue state
   * @param context Personalization context
   * @returns Safe fallback recommendation
   */
  private getFallbackRecommendation(
    context: PersonalizationContext
  ): AIWorkoutRecommendation {
    const { readiness, exercise } = context;

    // Conservative defaults based on fatigue state
    if (readiness.fatigueState === 'HIGH' || readiness.readinessScore < 40) {
      return {
        adjustedSets: 2,
        adjustedReps: 8,
        intensityModifier: 0.7,
        safetyCues: [
          'Focus on proper form over speed',
          'Take longer rest periods between sets',
          'Stop immediately if you feel pain or excessive fatigue',
        ],
        expectations:
          'This is a recovery-focused workout. Listen to your body and prioritize quality over quantity.',
        reasoning:
          'Your readiness score indicates high fatigue. We recommend reduced volume and intensity to allow proper recovery and prevent injury.',
      };
    } else if (readiness.readinessScore < 70) {
      return {
        adjustedSets: 3,
        adjustedReps: 10,
        intensityModifier: 0.85,
        safetyCues: [
          'Maintain proper form throughout each rep',
          'Control the eccentric (lowering) phase',
          'Breathe steadily during each set',
        ],
        expectations:
          'A moderate workout to maintain progress while respecting your current recovery state.',
        reasoning:
          'Your readiness is moderate. We suggest a balanced approach with slightly reduced intensity to support continued progress.',
      };
    } else {
      return {
        adjustedSets: 3,
        adjustedReps: 12,
        intensityModifier: 1.0,
        safetyCues: [
          'Push yourself while maintaining perfect form',
          'Focus on mind-muscle connection',
          'Challenge yourself on the last few reps',
        ],
        expectations:
          'You are well-recovered and ready for a productive workout. Give it your best effort!',
        reasoning:
          'Your readiness score is excellent. You can handle your standard workout volume with full intensity.',
      };
    }
  }
}

export const aiPersonalizationService = new AIPersonalizationService();

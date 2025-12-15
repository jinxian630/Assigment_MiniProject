import {
  ChatbotRequest,
  ChatbotResponse,
  ChatbotContext,
  MessageToolPayload,
  ReadinessWidgetData,
  BodyMapperSelection,
  PlanAdjustmentData,
  QuickActionType,
} from '../types/chatbot';
import { aiPersonalizationService } from '@/services/aiPersonalization.service';
import { PersonalizationContext } from '@/types/aiPersonalization';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_API_KEY = process.env.EXPO_PUBLIC_OPENROUTER_API_KEY || '';
const MODEL = 'anthropic/claude-3.5-sonnet';

class ChatbotService {
  /**
   * Send a message to the chatbot and get a response
   */
  async sendMessage(request: ChatbotRequest): Promise<ChatbotResponse> {
    const { message, context, expectToolResponse } = request;

    // If expecting a tool response, use specialized handlers
    if (expectToolResponse) {
      return this.generateToolResponse(message, context);
    }

    // Otherwise, generate a conversational response
    return this.generateConversationalResponse(message, context);
  }

  /**
   * Generate a tool response based on user input
   */
  private async generateToolResponse(
    message: string,
    context: ChatbotContext
  ): Promise<ChatbotResponse> {
    const lowerMessage = message.toLowerCase();

    // Detect intent from message
    if (lowerMessage.includes('tired') || lowerMessage.includes('fatigue') || lowerMessage.includes('energy')) {
      return {
        message: "I'd like to check your readiness level. How are you feeling today?",
        toolPayload: { toolType: 'readiness_check' },
      };
    }

    if (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('sore')) {
      return {
        message: "I'm sorry to hear that. Let me know which area is bothering you.",
        toolPayload: { toolType: 'body_mapper' },
      };
    }

    // Default conversational response
    return this.generateConversationalResponse(message, context);
  }

  /**
   * Generate a conversational response using OpenRouter API
   */
  private async generateConversationalResponse(
    message: string,
    context: ChatbotContext
  ): Promise<ChatbotResponse> {
    if (!OPENROUTER_API_KEY) {
      return {
        message: this.getFallbackResponse(message, context),
      };
    }

    try {
      const prompt = this.buildConversationalPrompt(message, context);

      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://yourapp.com',
          'X-Title': 'Health & Fitness Chatbot',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a supportive fitness coach AI assistant. Be encouraging, concise, and helpful. Keep responses under 100 words.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const responseText = data.choices?.[0]?.message?.content || this.getFallbackResponse(message, context);

      return { message: responseText };
    } catch (error) {
      console.error('Error generating conversational response:', error);
      return { message: this.getFallbackResponse(message, context) };
    }
  }

  /**
   * Handle readiness widget submission
   */
  async handleReadinessSubmission(
    data: ReadinessWidgetData,
    context: ChatbotContext
  ): Promise<ChatbotResponse> {
    const { fatigueScore } = data;

    // Determine fatigue level
    let fatigueLevel: 'HIGH' | 'NORMAL' = 'NORMAL';
    let message = '';

    if (fatigueScore <= 4) {
      fatigueLevel = 'HIGH';
      message = "I've detected high fatigue. I'm lightening your load today to help you recover properly.";
    } else if (fatigueScore <= 6) {
      message = "You're feeling moderate today. I'll adjust your workout to match your current state.";
    } else {
      message = "Great energy! You're ready for a productive workout. Let's make it count!";
    }

    // Generate AI adjustment if fatigue is high or moderate
    if (fatigueScore <= 6 && context.exerciseName) {
      const shouldTriggerAdjustment = true;
      const adjustmentData = await this.generatePlanAdjustment(fatigueScore, context);

      return {
        message,
        toolPayload: adjustmentData ? { toolType: 'plan_adjustment', data: adjustmentData } : undefined,
        shouldTriggerAdjustment,
      };
    }

    return { message };
  }

  /**
   * Handle body mapper submission
   */
  async handleBodyMapperSubmission(
    selection: BodyMapperSelection,
    context: ChatbotContext
  ): Promise<ChatbotResponse> {
    const { bodyPart, severity } = selection;
    const bodyPartLabel = bodyPart.replace('_', ' ');

    let message = `I've noted ${severity} discomfort in your ${bodyPartLabel}. `;

    if (severity === 'severe') {
      message += "I strongly recommend consulting a healthcare professional before continuing. Your safety is the priority.";
    } else if (severity === 'moderate') {
      message += "Let's modify your workout to avoid stressing this area. I'll suggest alternative exercises.";
    } else {
      message += "I'll keep this in mind and provide extra form cues for this area.";
    }

    return { message };
  }

  /**
   * Handle quick action
   */
  async handleQuickAction(action: QuickActionType, context: ChatbotContext): Promise<ChatbotResponse> {
    switch (action) {
      case 'report_pain':
        return {
          message: "Let me know which area is bothering you.",
          toolPayload: { toolType: 'body_mapper' },
        };
      case 'log_sleep':
        return {
          message: "How did you sleep last night? (Poor, Average, or Great)",
        };
      case 'change_time':
        return {
          message: "What would you like to adjust about your workout timing?",
        };
      case 'view_stats':
        return {
          message: "You can view your detailed stats in the dashboard. Would you like me to summarize your recent progress?",
        };
      default:
        return { message: "I'm here to help! What would you like to do?" };
    }
  }

  /**
   * Generate plan adjustment data
   */
  private async generatePlanAdjustment(
    fatigueScore: number,
    context: ChatbotContext
  ): Promise<PlanAdjustmentData | null> {
    if (!context.exerciseName || !context.userId) return null;

    try {
      // Build personalization context
      const personalizationContext: PersonalizationContext = {
        userId: context.userId,
        userProfile: {
          fitnessLevel: 'intermediate',
          injuryHistory: context.bodyPartSelections.map(sel => ({
            bodyPart: sel.bodyPart.replace('_', ' '),
            severity: sel.severity === 'mild' ? 'minor' : sel.severity === 'moderate' ? 'moderate' : 'severe',
            reportedDate: new Date(sel.timestamp).toISOString(),
            recoveryStatus: 'active' as const,
          })),
        },
        readiness: {
          sleepQuality: fatigueScore <= 4 ? 'poor' : fatigueScore <= 6 ? 'average' : 'great',
          sorenessLevel: 10 - fatigueScore,
          fatigueState: fatigueScore <= 4 ? 'HIGH' : 'NORMAL',
          readinessScore: fatigueScore * 10,
        },
        exercise: {
          name: context.exerciseName,
          category: 'Strength',
          difficultyLevel: 'Intermediate',
        },
        recentHistory: {
          weeklyVolumeLoad: 0,
          lastWorkoutDate: '',
          currentFatigueIndex: 10 - fatigueScore,
        },
      };

      const recommendation = await aiPersonalizationService.generateWorkoutAdjustment(personalizationContext);

      return {
        original: {
          sets: 3,
          reps: 12,
          intensity: 1.0,
        },
        adjusted: {
          sets: recommendation.adjustedSets,
          reps: recommendation.adjustedReps,
          intensity: recommendation.intensityModifier,
        },
        reason: fatigueScore <= 4 ? 'High Fatigue' : 'Moderate Energy',
        recommendation,
      };
    } catch (error) {
      console.error('Error generating plan adjustment:', error);
      return null;
    }
  }

  /**
   * Build conversational prompt
   */
  private buildConversationalPrompt(message: string, context: ChatbotContext): string {
    let prompt = `User message: "${message}"\n\n`;

    if (context.exerciseName) {
      prompt += `Current exercise: ${context.exerciseName}\n`;
    }

    if (context.currentReadiness) {
      prompt += `Readiness score: ${context.currentReadiness.calculatedReadinessScore}/100\n`;
    }

    if (context.bodyPartSelections.length > 0) {
      const parts = context.bodyPartSelections.map(s => s.bodyPart).join(', ');
      prompt += `Reported discomfort: ${parts}\n`;
    }

    prompt += '\nRespond as a supportive fitness coach. Be encouraging and concise.';

    return prompt;
  }

  /**
   * Fallback response when API is unavailable
   */
  private getFallbackResponse(message: string, context: ChatbotContext): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! I'm here to help you with your workout. How can I assist you today?";
    }

    if (lowerMessage.includes('help')) {
      return "I can help you track your readiness, report pain or discomfort, and adjust your workout based on how you're feeling. Just let me know what you need!";
    }

    return "I'm here to support your fitness journey! Feel free to ask me anything about your workout.";
  }
}

export const chatbotService = new ChatbotService();

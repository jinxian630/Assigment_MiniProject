import { DailyReadiness } from '@/types/readiness';
import { AIWorkoutRecommendation } from '@/types/aiPersonalization';

/**
 * Tool types that can be embedded in chat messages
 */
export type ToolType = 'readiness_check' | 'plan_adjustment' | 'body_mapper' | 'quick_actions';

/**
 * Body parts that can be selected in the body mapper
 */
export type BodyPart = 
  | 'shoulders' 
  | 'chest' 
  | 'arms' 
  | 'upper_back'
  | 'abs'
  | 'lower_back'
  | 'hips'
  | 'quads'
  | 'hamstrings'
  | 'knees'
  | 'calves';

/**
 * Severity level for body part pain/discomfort
 */
export type PainSeverity = 'mild' | 'moderate' | 'severe';

/**
 * Body mapper selection data
 */
export interface BodyMapperSelection {
  bodyPart: BodyPart;
  severity: PainSeverity;
  timestamp: number;
}

/**
 * Readiness widget data
 */
export interface ReadinessWidgetData {
  fatigueScore: number; // 1-10 scale
  timestamp: number;
}

/**
 * Plan adjustment data for comparison card
 */
export interface PlanAdjustmentData {
  original: {
    sets: number;
    reps: number;
    intensity: number;
  };
  adjusted: {
    sets: number;
    reps: number;
    intensity: number;
  };
  reason: string;
  recommendation: AIWorkoutRecommendation;
}

/**
 * Quick action types
 */
export type QuickActionType = 'report_pain' | 'log_sleep' | 'change_time' | 'view_stats';

/**
 * Payload for different tool types
 */
export type MessageToolPayload = 
  | { toolType: 'readiness_check'; data?: ReadinessWidgetData }
  | { toolType: 'plan_adjustment'; data: PlanAdjustmentData }
  | { toolType: 'body_mapper'; data?: BodyMapperSelection }
  | { toolType: 'quick_actions'; data?: QuickActionType };

/**
 * Message user information
 */
export interface MessageUser {
  _id: number;
  name: string;
  avatar?: string;
}

/**
 * Custom message type for chatbot
 * Supports embedded interactive tools
 */
export interface CustomMessage {
  _id: string | number;
  text: string;
  createdAt: Date;
  user: MessageUser;
  
  // Optional tool payload for rendering custom components
  toolPayload?: MessageToolPayload;
  
  // Optional metadata for context
  metadata?: {
    readinessId?: string;
    sessionId?: string;
    exerciseId?: string;
  };
}

/**
 * Chatbot state management
 */
export interface ChatbotState {
  messages: CustomMessage[];
  isTyping: boolean;
  currentContext: ChatbotContext;
}

/**
 * Context passed to chatbot for personalization
 */
export interface ChatbotContext {
  userId: string;
  exerciseName?: string;
  exerciseId?: string;
  sessionId?: string;
  currentReadiness?: DailyReadiness;
  bodyPartSelections: BodyMapperSelection[];
  recentFatigueScores: ReadinessWidgetData[];
}

/**
 * Chatbot service request
 */
export interface ChatbotRequest {
  message: string;
  context: ChatbotContext;
  expectToolResponse?: boolean;
}

/**
 * Chatbot service response
 */
export interface ChatbotResponse {
  message: string;
  toolPayload?: MessageToolPayload;
  shouldTriggerAdjustment?: boolean;
}

/**
 * Empty state configuration
 */
export interface EmptyStateConfig {
  title: string;
  subtitle: string;
  suggestedActions: Array<{
    label: string;
    action: QuickActionType;
    icon: string;
  }>;
}

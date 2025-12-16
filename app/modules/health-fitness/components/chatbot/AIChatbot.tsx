import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatbotStyles, getColors } from './chatbot.styles';
import CustomChatContainer from './CustomChatContainer';
import { generateMessageId } from './utils/messageHelpers';
import {
  CustomMessage,
  ChatbotContext,
  ReadinessWidgetData,
  BodyMapperSelection,
  QuickActionType,
} from '../../types/chatbot';
import { chatbotService } from '../../services/chatbot.service';
import ReadinessWidget from './ReadinessWidget';
import BodyStatusMapper from './BodyStatusMapper';
import PlanAdjustmentCard from './PlanAdjustmentCard';
import QuickActionChips from './QuickActionChips';
import ReadinessStatusBar from './ReadinessStatusBar';

const MODULE_COLOR = '#4ECDC4';

interface AIChatbotProps {
  visible: boolean;
  onClose: () => void;
  context: ChatbotContext;
  onWorkoutAdjustment?: (adjustmentData: any) => void;
  isDarkMode?: boolean;
}

export default function AIChatbot({
  visible,
  onClose,
  context,
  onWorkoutAdjustment,
  isDarkMode = false,
}: AIChatbotProps) {
  const [messages, setMessages] = useState<CustomMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeToolType, setActiveToolType] = useState<string | null>(null);
  const colors = getColors(isDarkMode);

  // Initialize with welcome message
  useEffect(() => {
    if (visible && messages.length === 0) {
      const welcomeMessage: CustomMessage = {
        _id: generateMessageId(),
        text: getWelcomeMessage(),
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
      };
      setMessages([welcomeMessage]);
    }
  }, [visible]);

  const getWelcomeMessage = () => {
    if (context.exerciseName) {
      return `Hi! I'm your AI fitness companion. I see you're working on ${context.exerciseName}. How can I help you today?`;
    }
    return "Hi! I'm your AI fitness companion. I'm here to help you optimize your workout based on how you're feeling. Let's get started!";
  };

  const handleSend = useCallback(async (text: string) => {
    const userMessage: CustomMessage = {
      _id: generateMessageId(),
      text,
      createdAt: new Date(),
      user: { _id: 1, name: 'You' },
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await chatbotService.sendMessage({
        message: text,
        context,
        expectToolResponse: true,
      });

      const aiMessage: CustomMessage = {
        _id: generateMessageId(),
        text: response.message,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
        toolPayload: response.toolPayload,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.shouldTriggerAdjustment && response.toolPayload?.toolType === 'plan_adjustment') {
        onWorkoutAdjustment?.(response.toolPayload.data);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: CustomMessage = {
        _id: generateMessageId(),
        text: "I'm having trouble responding right now. Please try again.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [context, onWorkoutAdjustment]);

  // Handle tool skip
  const handleToolSkip = () => {
    const skipMessage: CustomMessage = {
      _id: generateMessageId(),
      text: "I'll just tell you",
      createdAt: new Date(),
      user: {
        _id: 1,
        name: 'You',
      },
    };
    setMessages(prev => [...prev, skipMessage]);
    setActiveToolType(null);

    // AI acknowledges skip
    setTimeout(() => {
      const aiMessage: CustomMessage = {
        _id: generateMessageId(),
        text: "No problem! Feel free to tell me anything in your own words.",
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 500);
  };

  // Handle readiness widget submission
  const handleReadinessSubmit = async (data: ReadinessWidgetData) => {
    // Add user confirmation message
    const userMessage: CustomMessage = {
      _id: generateMessageId(),
      text: `My energy level is ${data.fatigueScore}/10`,
      createdAt: new Date(),
      user: {
        _id: 1,
        name: 'You',
      },
    };
    setMessages(prev => [...prev, userMessage]);

    setIsTyping(true);

    try {
      const response = await chatbotService.handleReadinessSubmission(data, context);

      const aiMessage: CustomMessage = {
        _id: generateMessageId(),
        text: response.message,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
        toolPayload: response.toolPayload,
      };

      setMessages(prev => [...prev, aiMessage]);

      if (response.shouldTriggerAdjustment && response.toolPayload?.toolType === 'plan_adjustment') {
        onWorkoutAdjustment?.(response.toolPayload.data);
      }
    } catch (error) {
      console.error('Error handling readiness submission:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle body mapper submission
  const handleBodyMapperSubmit = async (selection: BodyMapperSelection) => {
    const bodyPartLabel = selection.bodyPart.replace('_', ' ');
    const userMessage: CustomMessage = {
      _id: generateMessageId(),
      text: `I have ${selection.severity} discomfort in my ${bodyPartLabel}`,
      createdAt: new Date(),
      user: {
        _id: 1,
        name: 'You',
      },
    };
    setMessages(prev => [...prev, userMessage]);

    setIsTyping(true);

    try {
      const response = await chatbotService.handleBodyMapperSubmission(selection, context);

      const aiMessage: CustomMessage = {
        _id: generateMessageId(),
        text: response.message,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error handling body mapper submission:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle quick action
  const handleQuickAction = async (action: QuickActionType) => {
    setIsTyping(true);

    try {
      const response = await chatbotService.handleQuickAction(action, context);

      const aiMessage: CustomMessage = {
        _id: generateMessageId(),
        text: response.message,
        createdAt: new Date(),
        user: {
          _id: 2,
          name: 'AI Coach',
          avatar: '🤖',
        },
        toolPayload: response.toolPayload,
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error handling quick action:', error);
    } finally {
      setIsTyping(false);
    }
  };

  // Custom view renderer for tools
  const renderCustomView = (message: CustomMessage) => {
    if (!message.toolPayload) return null;

    const { toolType, data } = message.toolPayload;

    // Track active tool type for input placeholder
    if (toolType !== activeToolType) {
      setActiveToolType(toolType);
    }

    switch (toolType) {
      case 'readiness_check':
        return <ReadinessWidget onSubmit={handleReadinessSubmit} onSkip={handleToolSkip} isDarkMode={isDarkMode} />;
      case 'plan_adjustment':
        return <PlanAdjustmentCard data={data} isDarkMode={isDarkMode} />;
      case 'body_mapper':
        return <BodyStatusMapper onSubmit={handleBodyMapperSubmit} onSkip={handleToolSkip} isDarkMode={isDarkMode} />;
      default:
        return null;
    }
  };

  // Get contextual placeholder
  const getPlaceholder = () => {
    if (isTyping) return 'AI Coach is typing...';
    if (activeToolType === 'readiness_check') return 'Or describe how you feel here...';
    if (activeToolType === 'body_mapper') return 'Or describe your pain here...';
    return 'Type a message...';
  };

  // Get helper text
  const getHelperText = () => {
    if (activeToolType) return '💡 Tip: You can type instead of clicking';
    return undefined;
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[chatbotStyles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={[chatbotStyles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ fontSize: 24 }}>🤖</Text>
            <View>
              <Text style={[chatbotStyles.headerTitle, { color: colors.text.primary }]}>AI Coach</Text>
              <Text style={{ fontSize: 12, color: colors.text.secondary }}>Your fitness companion</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={chatbotStyles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Readiness Status Bar */}
        {context.currentReadiness && (
          <ReadinessStatusBar
            readinessScore={context.currentReadiness.calculatedReadinessScore}
            fatigueState={context.currentReadiness.fatigueState}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Chat Interface */}
        <CustomChatContainer
          messages={messages}
          onSend={handleSend}
          user={{ _id: 1, name: 'You' }}
          isTyping={isTyping}
          renderCustomView={renderCustomView}
          placeholder={getPlaceholder()}
          helperText={getHelperText()}
          isDarkMode={isDarkMode}
          colors={colors}
        />

        {/* Quick Action Chips */}
        <QuickActionChips onActionPress={handleQuickAction} isDarkMode={isDarkMode} />
      </SafeAreaView>
    </Modal>
  );
}

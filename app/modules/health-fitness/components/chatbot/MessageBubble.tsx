import React from 'react';
import { View, Text } from 'react-native';
import { CustomMessage } from '../../types/chatbot';
import { messageBubbleStyles } from './chatbot.styles';

interface MessageBubbleProps {
  message: CustomMessage;
  isOwnMessage: boolean;
  isDarkMode: boolean;
  colors: {
    background: string;
    surface: string;
    primary: string;
    text: {
      primary: string;
      secondary: string;
    };
    border: string;
  };
  renderCustomView?: (message: CustomMessage) => React.ReactNode;
}

/**
 * MessageBubble Component
 * Renders individual message with left/right alignment
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwnMessage,
  isDarkMode,
  colors,
  renderCustomView,
}) => {
  return (
    <View
      style={[
        messageBubbleStyles.container,
        { flexDirection: isOwnMessage ? 'row-reverse' : 'row' },
      ]}
    >
      {/* Avatar for AI messages */}
      {!isOwnMessage && (
        <View style={messageBubbleStyles.avatarContainer}>
          <Text style={messageBubbleStyles.avatar}>{message.user.avatar || '🤖'}</Text>
        </View>
      )}

      {/* Message bubble */}
      <View
        style={[
          messageBubbleStyles.bubble,
          isOwnMessage ? messageBubbleStyles.bubbleRight : messageBubbleStyles.bubbleLeft,
          {
            backgroundColor: isOwnMessage ? '#4ECDC4' : colors.surface,
          },
        ]}
      >
        {/* Message text */}
        <Text
          style={[
            messageBubbleStyles.text,
            { color: isOwnMessage ? '#fff' : colors.text.primary },
          ]}
        >
          {message.text}
        </Text>

        {/* Custom view for tool payloads */}
        {message.toolPayload && renderCustomView && renderCustomView(message)}
      </View>
    </View>
  );
};

export default MessageBubble;

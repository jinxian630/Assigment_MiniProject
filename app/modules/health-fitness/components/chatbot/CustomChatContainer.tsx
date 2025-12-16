import React from 'react';
import { View, StyleSheet } from 'react-native';
import { CustomMessage, MessageUser } from '../../types/chatbot';
import MessageList from './MessageList';
import TypingIndicator from './TypingIndicator';
import ChatInput from './ChatInput';

interface CustomChatContainerProps {
  messages: CustomMessage[];
  onSend: (text: string) => void;
  user: MessageUser;
  isTyping: boolean;
  renderCustomView: (message: CustomMessage) => React.ReactNode;
  placeholder: string;
  helperText?: string;
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
}

/**
 * CustomChatContainer Component
 * Main container orchestrating all chat UI components
 * Replaces react-native-gifted-chat
 */
export const CustomChatContainer: React.FC<CustomChatContainerProps> = ({
  messages,
  onSend,
  user,
  isTyping,
  renderCustomView,
  placeholder,
  helperText,
  isDarkMode,
  colors,
}) => {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Message list */}
      <MessageList
        messages={messages}
        currentUserId={user._id}
        onRenderCustomView={renderCustomView}
        isDarkMode={isDarkMode}
        colors={colors}
      />

      {/* Typing indicator */}
      <TypingIndicator isTyping={isTyping} isDarkMode={isDarkMode} colors={colors} />

      {/* Chat input */}
      <ChatInput
        onSend={onSend}
        placeholder={placeholder}
        helperText={helperText}
        disabled={isTyping}
        isDarkMode={isDarkMode}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default CustomChatContainer;

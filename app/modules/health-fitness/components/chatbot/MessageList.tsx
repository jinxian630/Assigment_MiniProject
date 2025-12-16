import React, { useEffect, useRef } from 'react';
import { FlatList, Platform, View } from 'react-native';
import { CustomMessage } from '../../types/chatbot';
import MessageBubble from './MessageBubble';
import { messageListStyles } from './chatbot.styles';

interface MessageListProps {
  messages: CustomMessage[];
  currentUserId: number;
  onRenderCustomView: (message: CustomMessage) => React.ReactNode;
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
 * MessageList Component
 * Displays messages with auto-scroll to bottom
 */
export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  onRenderCustomView,
  isDarkMode,
  colors,
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  return (
    <FlatList
      ref={flatListRef}
      data={messages}
      keyExtractor={(item) => String(item._id)}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwnMessage={item.user._id === currentUserId}
          isDarkMode={isDarkMode}
          colors={colors}
          renderCustomView={onRenderCustomView}
        />
      )}
      contentContainerStyle={messageListStyles.contentContainer}
      style={messageListStyles.container}
      removeClippedSubviews={Platform.OS !== 'web'}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default MessageList;

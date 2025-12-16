import React, { useState, useRef } from 'react';
import { View, TextInput, TouchableOpacity, Text, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { chatInputStyles } from './chatbot.styles';

interface ChatInputProps {
  onSend: (text: string) => void;
  placeholder: string;
  helperText?: string;
  disabled: boolean;
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
 * ChatInput Component
 * Handles text input with web-optimized focus management
 * Fixes: input focus loss, send button issues, typing lag
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  placeholder,
  helperText,
  disabled,
  isDarkMode,
  colors,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  // Fix 1: Maintain focus after send
  const handleSend = () => {
    if (inputText.trim().length === 0) return;
    
    onSend(inputText.trim());
    setInputText('');

    // Re-focus input after send (web fix)
    if (Platform.OS === 'web') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Fix 2: Enter key handler with form prevention
  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = inputText.trim().length > 0 && !disabled;

  return (
    <View style={[chatInputStyles.container, { borderTopColor: colors.border }]}>
      {/* Helper text */}
      {helperText && (
        <View
          style={[
            chatInputStyles.helperTextContainer,
            { backgroundColor: colors.surface },
          ]}
        >
          <Text style={[chatInputStyles.helperText, { color: colors.text.secondary }]}>
            {helperText}
          </Text>
        </View>
      )}

      {/* Input row */}
      <View style={chatInputStyles.inputRow}>
        <TextInput
          ref={inputRef}
          style={[
            chatInputStyles.textInput,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              color: colors.text.primary,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder={placeholder}
          placeholderTextColor={colors.text.secondary}
          editable={!disabled}
          multiline
          maxLength={500}
          onKeyPress={handleKeyPress}
        />

        <TouchableOpacity
          style={[
            chatInputStyles.sendButton,
            { backgroundColor: colors.primary },
            !canSend && chatInputStyles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!canSend}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatInput;

import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';
import { typingIndicatorStyles } from './chatbot.styles';

interface TypingIndicatorProps {
  isTyping: boolean;
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
 * TypingIndicator Component
 * Animated "AI Coach is typing..." indicator
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  isTyping,
  isDarkMode,
  colors,
}) => {
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isTyping) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot2Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(dot3Opacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isTyping, dot1Opacity, dot2Opacity, dot3Opacity]);

  if (!isTyping) return null;

  return (
    <View style={typingIndicatorStyles.container}>
      <View style={[typingIndicatorStyles.bubble, { backgroundColor: colors.surface }]}>
        <Animated.View
          style={[
            typingIndicatorStyles.dot,
            { backgroundColor: colors.text.secondary, opacity: dot1Opacity },
          ]}
        />
        <Animated.View
          style={[
            typingIndicatorStyles.dot,
            { backgroundColor: colors.text.secondary, opacity: dot2Opacity },
          ]}
        />
        <Animated.View
          style={[
            typingIndicatorStyles.dot,
            { backgroundColor: colors.text.secondary, opacity: dot3Opacity },
          ]}
        />
      </View>
    </View>
  );
};

export default TypingIndicator;

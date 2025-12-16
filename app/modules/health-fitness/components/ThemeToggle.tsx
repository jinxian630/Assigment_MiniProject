import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Animated, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ThemeToggleProps {
  isDarkMode: boolean;
  onToggle: () => void;
  size?: 'small' | 'medium';
}

/**
 * Animated theme toggle button component
 * Switches between sun (light mode) and moon (dark mode) icons
 */
export function ThemeToggle({ isDarkMode, onToggle, size = 'medium' }: ThemeToggleProps) {
  const animatedValue = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: isDarkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isDarkMode]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['#FFD93D', '#1F2937'],
  });

  const iconSize = size === 'small' ? 18 : 22;
  const containerSize = size === 'small' ? 36 : 44;

  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor,
            width: containerSize,
            height: containerSize,
            borderRadius: containerSize / 2,
          },
        ]}
      >
        {isDarkMode ? (
          <Ionicons name="moon" size={iconSize} color="#FFFFFF" />
        ) : (
          <Ionicons name="sunny" size={iconSize} color="#1F2937" />
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ThemeToggle;

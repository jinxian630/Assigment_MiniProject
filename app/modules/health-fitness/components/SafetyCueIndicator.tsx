import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CuePriority } from '@/types/workout';

type SafetyCueIndicatorProps = {
  cueText: string;
  priority: CuePriority;
  visible: boolean;
  isDarkMode?: boolean;
  onReplay?: () => void;
};

export default function SafetyCueIndicator({
  cueText,
  priority,
  visible,
  isDarkMode = false,
  onReplay,
}: SafetyCueIndicatorProps) {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, opacityAnim]);

  const getPriorityColor = (priority: CuePriority): string => {
    switch (priority) {
      case 'critical':
        return '#EF4444'; // red
      case 'high':
        return '#F59E0B'; // orange
      case 'normal':
        return '#3B82F6'; // blue
      case 'low':
        return '#10B981'; // green
      default:
        return '#6B7280'; // gray
    }
  };

  const getPriorityIcon = (priority: CuePriority): keyof typeof Ionicons.glyphMap => {
    switch (priority) {
      case 'critical':
        return 'alert-circle';
      case 'high':
        return 'warning';
      case 'normal':
        return 'information-circle';
      case 'low':
        return 'checkmark-circle';
      default:
        return 'information-circle';
    }
  };

  const priorityColor = getPriorityColor(priority);
  const backgroundColor = isDarkMode
    ? `${priorityColor}20`
    : `${priorityColor}15`;

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          borderLeftColor: priorityColor,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        <Ionicons
          name={getPriorityIcon(priority)}
          size={24}
          color={priorityColor}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.priorityText, { color: priorityColor }]}>
          {priority.toUpperCase()}
        </Text>
        <Text
          style={[
            styles.cueText,
            { color: isDarkMode ? '#E5E7EB' : '#1E1B4B' },
          ]}
        >
          {cueText}
        </Text>
      </View>
      {onReplay && (
        <TouchableOpacity
          style={styles.replayButton}
          onPress={onReplay}
          activeOpacity={0.6}
        >
          <Ionicons
            name="volume-medium"
            size={24}
            color={priorityColor}
          />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cueText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  replayButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle } from 'react-native-svg';

const PRIMARY_PURPLE = '#a855f7';

type SetTimerProps = {
  elapsedTime: number; // in seconds
  isActive: boolean;
  isDarkMode?: boolean;
};

export default function SetTimer({
  elapsedTime,
  isActive,
  isDarkMode = false,
}: SetTimerProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    ring: isDarkMode ? '#374151' : '#E5E7EB',
    ringActive: PRIMARY_PURPLE,
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress for animation (example: complete a ring every 60 seconds)
  const progress = (elapsedTime % 60) / 60;
  const circumference = 2 * Math.PI * 60; // radius = 60
  const strokeDashoffset = circumference - progress * circumference;

  return (
    <View style={styles.container}>
      <View style={styles.ringContainer}>
        <Svg width={140} height={140} style={styles.svg}>
          {/* Background circle */}
          <Circle
            cx={70}
            cy={70}
            r={60}
            stroke={colors.ring}
            strokeWidth={8}
            fill="none"
          />
          {/* Progress circle */}
          {isActive && (
            <Circle
              cx={70}
              cy={70}
              r={60}
              stroke={colors.ringActive}
              strokeWidth={8}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              rotation="-90"
              origin="70, 70"
            />
          )}
        </Svg>
        <View style={styles.timeContainer}>
          <Text style={[styles.timeText, { color: colors.text }]}>
            {formatTime(elapsedTime)}
          </Text>
          <Text style={[styles.labelText, { color: colors.textSoft }]}>
            {isActive ? 'Active' : 'Paused'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringContainer: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  timeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 1,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { statusBarStyles, getColors } from './chatbot.styles';
import { FatigueState } from '@/types/readiness';

interface ReadinessStatusBarProps {
  readinessScore: number; // 0-100
  fatigueState: FatigueState;
  isDarkMode?: boolean;
}

export default function ReadinessStatusBar({
  readinessScore,
  fatigueState,
  isDarkMode = false,
}: ReadinessStatusBarProps) {
  const colors = getColors(isDarkMode);

  // Determine color based on score
  const getScoreColor = () => {
    if (readinessScore < 40) return colors.error;
    if (readinessScore < 70) return colors.warning;
    return colors.success;
  };

  const scoreColor = getScoreColor();
  const progressPercentage = Math.min(Math.max(readinessScore, 0), 100);

  return (
    <View style={[statusBarStyles.container, { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {/* Progress Bar */}
      <View style={statusBarStyles.progressContainer}>
        <Text style={[statusBarStyles.progressLabel, { color: colors.text.secondary }]}>
          Readiness Score
        </Text>
        <View style={[statusBarStyles.progressBarBackground, { backgroundColor: colors.border }]}>
          <View
            style={[
              statusBarStyles.progressBarFill,
              { width: `${progressPercentage}%`, backgroundColor: scoreColor },
            ]}
          />
        </View>
      </View>

      {/* Score Display */}
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[statusBarStyles.scoreText, { color: scoreColor }]}>
          {readinessScore}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons
            name={fatigueState === 'HIGH' ? 'alert-circle' : 'checkmark-circle'}
            size={12}
            color={fatigueState === 'HIGH' ? colors.error : colors.success}
          />
          <Text style={[statusBarStyles.stateText, { color: colors.text.tertiary }]}>
            {fatigueState === 'HIGH' ? 'High Fatigue' : 'Normal'}
          </Text>
        </View>
      </View>
    </View>
  );
}

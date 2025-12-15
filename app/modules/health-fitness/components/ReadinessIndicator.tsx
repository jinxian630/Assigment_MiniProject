import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FatigueState } from '@/types/readiness';

const MODULE_COLOR = '#4ECDC4';

type ReadinessIndicatorProps = {
  readinessScore: number;
  fatigueState: FatigueState;
  isDarkMode?: boolean;
};

export default function ReadinessIndicator({
  readinessScore,
  fatigueState,
  isDarkMode = false,
}: ReadinessIndicatorProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return '#10B981'; // green
    if (score >= 40) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 70) return 'Ready to Train';
    if (score >= 40) return 'Moderate Recovery';
    return 'Need More Rest';
  };

  const getStatusIcon = (): keyof typeof Ionicons.glyphMap => {
    if (readinessScore >= 70) return 'checkmark-circle';
    if (readinessScore >= 40) return 'alert-circle';
    return 'warning';
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Ionicons name="fitness" size={20} color={MODULE_COLOR} />
        <Text style={[styles.title, { color: colors.text }]}>
          Today's Readiness
        </Text>
      </View>

      <View style={styles.content}>
        <View
          style={[
            styles.scoreBadge,
            { backgroundColor: getScoreColor(readinessScore) + '15' },
          ]}
        >
          <Text
            style={[
              styles.scoreText,
              { color: getScoreColor(readinessScore) },
            ]}
          >
            {readinessScore}
          </Text>
          <Text
            style={[
              styles.scoreMaxText,
              { color: getScoreColor(readinessScore) },
            ]}
          >
            /100
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <Ionicons
              name={getStatusIcon()}
              size={18}
              color={getScoreColor(readinessScore)}
            />
            <Text
              style={[
                styles.statusLabel,
                { color: getScoreColor(readinessScore) },
              ]}
            >
              {getScoreLabel(readinessScore)}
            </Text>
          </View>

          {fatigueState === 'HIGH' && (
            <View style={styles.fatigueWarning}>
              <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
              <Text style={[styles.fatigueWarningText, { color: '#EF4444' }]}>
                High Fatigue Detected
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '700',
  },
  scoreMaxText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 2,
  },
  statusContainer: {
    flex: 1,
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  fatigueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  fatigueWarningText: {
    fontSize: 12,
    fontWeight: '500',
  },
});

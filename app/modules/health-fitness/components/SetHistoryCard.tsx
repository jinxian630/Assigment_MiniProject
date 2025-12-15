import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSet, FatigueLevel } from '@/types/workout';
import { Theme } from '@/constants/theme';

const MODULE_COLOR = '#4ECDC4';

type SetHistoryCardProps = {
  set: WorkoutSet;
  isDarkMode?: boolean;
};

export default function SetHistoryCard({ set, isDarkMode = false }: SetHistoryCardProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : Theme.colors.cardBackground,
    text: isDarkMode ? '#E5E7EB' : Theme.colors.textPrimary,
    textSoft: isDarkMode ? '#9CA3AF' : Theme.colors.textSecondary,
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const getFatigueColor = (level?: FatigueLevel): string => {
    if (!level) return Theme.colors.textSecondary;
    if (level <= 2) return '#10B981'; // green - low fatigue
    if (level === 3) return '#F59E0B'; // orange - medium fatigue
    return '#EF4444'; // red - high fatigue
  };

  const getFatigueLabel = (level?: FatigueLevel): string => {
    if (!level) return 'Not recorded';
    switch (level) {
      case 1:
        return 'Very Easy';
      case 2:
        return 'Easy';
      case 3:
        return 'Moderate';
      case 4:
        return 'Hard';
      case 5:
        return 'Very Hard';
      default:
        return 'Moderate';
    }
  };

  const getFatigueIcon = (level?: FatigueLevel): any => {
    if (!level) return 'help-circle-outline';
    if (level <= 2) return 'happy-outline';
    if (level === 3) return 'remove-circle-outline';
    return 'sad-outline';
  };

  // Format performance text (reps and/or weight)
  const getPerformanceText = (): string => {
    const parts: string[] = [];
    if (set.reps) parts.push(`${set.reps} reps`);
    if (set.weight) parts.push(`${set.weight} lbs`);
    if (parts.length === 0) return 'Completed';
    return parts.join(' • ');
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {/* Set Number Header */}
      <View style={styles.header}>
        <View style={[styles.setNumberBadge, { backgroundColor: `${MODULE_COLOR}20` }]}>
          <Text style={[styles.setNumberText, { color: MODULE_COLOR }]}>
            Set {set.setNumber}
          </Text>
        </View>
      </View>

      {/* Performance Info */}
      <View style={styles.performanceRow}>
        <Ionicons name="fitness-outline" size={18} color={MODULE_COLOR} />
        <Text style={[styles.performanceText, { color: colors.text }]}>
          {getPerformanceText()}
        </Text>
      </View>

      {/* Fatigue Level */}
      <View style={styles.infoRow}>
        <Ionicons
          name={getFatigueIcon(set.fatigueLevel)}
          size={18}
          color={getFatigueColor(set.fatigueLevel)}
        />
        <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Fatigue:</Text>
        <Text style={[styles.infoValue, { color: getFatigueColor(set.fatigueLevel) }]}>
          {getFatigueLabel(set.fatigueLevel)}
        </Text>
      </View>

      {/* Rest Duration */}
      {set.restAfter !== undefined && set.restAfter > 0 && (
        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={18} color={colors.textSoft} />
          <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Rest:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {set.restAfter}s
          </Text>
        </View>
      )}

      {/* Duration if available */}
      {set.duration !== undefined && set.duration > 0 && (
        <View style={styles.infoRow}>
          <Ionicons name="stopwatch-outline" size={18} color={colors.textSoft} />
          <Text style={[styles.infoLabel, { color: colors.textSoft }]}>Duration:</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {Math.floor(set.duration / 60)}:{(set.duration % 60).toString().padStart(2, '0')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderLeftColor: MODULE_COLOR,
    ...Theme.shadows.small,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  setNumberBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: '700',
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: `${MODULE_COLOR}08`,
    borderRadius: 8,
  },
  performanceText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
});

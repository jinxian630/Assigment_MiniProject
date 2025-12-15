import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AIIntervention } from '@/types/coach';

const MODULE_COLOR = '#4ECDC4';

type InterventionLogCardProps = {
  intervention: AIIntervention;
  isDarkMode?: boolean;
};

export default function InterventionLogCard({
  intervention,
  isDarkMode = false,
}: InterventionLogCardProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    surface: isDarkMode ? '#111827' : '#F9FAFB',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const getAdjustmentColor = (type: string): string => {
    if (type.includes('Recovery')) return '#F59E0B';
    if (type.includes('Reduction')) return '#F97316';
    if (type.includes('Progressive')) return '#10B981';
    return MODULE_COLOR;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color={colors.textSoft} />
          <Text style={[styles.dateText, { color: colors.textSoft }]}>
            {formatDate(intervention.date)}
          </Text>
        </View>
        <View
          style={[
            styles.adjustmentTypeBadge,
            {
              backgroundColor:
                getAdjustmentColor(intervention.adjustmentType) + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.adjustmentTypeText,
              { color: getAdjustmentColor(intervention.adjustmentType) },
            ]}
          >
            {intervention.adjustmentType}
          </Text>
        </View>
      </View>

      {/* Exercise Name */}
      <Text style={[styles.exerciseName, { color: colors.text }]}>
        {intervention.exerciseName}
      </Text>

      {/* Adjustment Details */}
      <View style={[styles.adjustmentRow, { backgroundColor: colors.surface }]}>
        <View style={styles.adjustmentColumn}>
          <Text style={[styles.adjustmentLabel, { color: colors.textSoft }]}>
            Original
          </Text>
          <Text style={[styles.adjustmentValue, { color: colors.text }]}>
            {intervention.originalPlan.sets} × {intervention.originalPlan.reps}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={16} color={colors.textSoft} />
        <View style={styles.adjustmentColumn}>
          <Text style={[styles.adjustmentLabel, { color: colors.textSoft }]}>
            Adjusted
          </Text>
          <Text style={[styles.adjustmentValue, { color: MODULE_COLOR }]}>
            {intervention.adjustedPlan.sets} × {intervention.adjustedPlan.reps}
          </Text>
        </View>
        <View style={styles.adjustmentColumn}>
          <Text style={[styles.adjustmentLabel, { color: colors.textSoft }]}>
            Intensity
          </Text>
          <Text style={[styles.adjustmentValue, { color: colors.text }]}>
            {(intervention.adjustedPlan.intensityModifier * 100).toFixed(0)}%
          </Text>
        </View>
      </View>

      {/* Reasoning */}
      <Text style={[styles.reasoning, { color: colors.textSoft }]}>
        {intervention.reasoning}
      </Text>

      {/* Student Response (if available) */}
      {intervention.studentResponse && (
        <View style={styles.responseContainer}>
          <Ionicons
            name={
              intervention.studentResponse === 'completed'
                ? 'checkmark-circle'
                : intervention.studentResponse === 'modified'
                ? 'create'
                : 'close-circle'
            }
            size={14}
            color={
              intervention.studentResponse === 'completed'
                ? '#10B981'
                : intervention.studentResponse === 'modified'
                ? '#F59E0B'
                : '#EF4444'
            }
          />
          <Text
            style={[
              styles.responseText,
              {
                color:
                  intervention.studentResponse === 'completed'
                    ? '#10B981'
                    : intervention.studentResponse === 'modified'
                    ? '#F59E0B'
                    : '#EF4444',
              },
            ]}
          >
            {intervention.studentResponse === 'completed'
              ? 'Completed as adjusted'
              : intervention.studentResponse === 'modified'
              ? 'Student modified'
              : 'Student skipped'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  adjustmentTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adjustmentTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  adjustmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  adjustmentColumn: {
    alignItems: 'center',
    gap: 4,
  },
  adjustmentLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  adjustmentValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  reasoning: {
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  responseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  responseText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudentMetrics } from '@/types/coach';

const MODULE_COLOR = '#4ECDC4';

type StudentListViewProps = {
  students: StudentMetrics[];
  onStudentSelect: (studentId: string) => void;
  isDarkMode?: boolean;
};

export default function StudentListView({
  students,
  onStudentSelect,
  isDarkMode = false,
}: StudentListViewProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const getAdherenceColor = (rate: number): string => {
    if (rate >= 80) return '#10B981'; // green
    if (rate >= 50) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  const getFatigueColor = (index: number): string => {
    if (index >= 70) return '#10B981'; // green - well rested
    if (index >= 40) return '#F59E0B'; // yellow - moderate
    return '#EF4444'; // red - high fatigue
  };

  const renderStudentCard = ({ item }: { item: StudentMetrics }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background }]}
      onPress={() => onStudentSelect(item.studentId)}
      activeOpacity={0.7}
    >
      {/* Student Header */}
      <View style={styles.cardHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {item.studentName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.studentInfo}>
          <Text style={[styles.studentName, { color: colors.text }]}>
            {item.studentName}
          </Text>
          <Text style={[styles.fitnessLevel, { color: colors.textSoft }]}>
            {item.fitnessLevel.charAt(0).toUpperCase() + item.fitnessLevel.slice(1)} Level
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textSoft} />
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        {/* Adherence */}
        <View style={styles.metricItem}>
          <Ionicons
            name="checkmark-circle"
            size={16}
            color={getAdherenceColor(item.adherenceRate)}
          />
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {item.adherenceRate}%
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSoft }]}>
            Adherence
          </Text>
        </View>

        {/* Fatigue Index */}
        <View style={styles.metricItem}>
          <Ionicons
            name="fitness"
            size={16}
            color={getFatigueColor(item.currentFatigueIndex)}
          />
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {item.currentFatigueIndex}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSoft }]}>
            Readiness
          </Text>
        </View>

        {/* Total Sessions */}
        <View style={styles.metricItem}>
          <Ionicons name="bar-chart" size={16} color={MODULE_COLOR} />
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {item.totalWorkoutSessions}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSoft }]}>
            Sessions
          </Text>
        </View>

        {/* AI Interventions */}
        <View style={styles.metricItem}>
          <Ionicons name="bulb" size={16} color="#F59E0B" />
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {item.aiInterventionCount}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textSoft }]}>
            AI Adjusts
          </Text>
        </View>
      </View>

      {/* Last Workout */}
      {item.lastWorkoutDate && (
        <View style={styles.lastWorkout}>
          <Ionicons name="time-outline" size={14} color={colors.textSoft} />
          <Text style={[styles.lastWorkoutText, { color: colors.textSoft }]}>
            Last workout: {new Date(item.lastWorkoutDate).toLocaleDateString()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  if (students.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="people-outline" size={64} color={colors.textSoft} />
        <Text style={[styles.emptyText, { color: colors.textSoft }]}>
          No students found
        </Text>
        <Text style={[styles.emptySubtext, { color: colors.textSoft }]}>
          Students will appear here once they start using your exercises
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={students}
      renderItem={renderStudentCard}
      keyExtractor={(item) => item.studentId}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: MODULE_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  fitnessLevel: {
    fontSize: 13,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
    gap: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 11,
  },
  lastWorkout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  lastWorkoutText: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise } from '@/types/workout';

const PRIMARY_PURPLE = '#a855f7';

type ExerciseCardProps = {
  exercise: Exercise;
  isDarkMode?: boolean;
  onPress: () => void;
};

export default function ExerciseCard({
  exercise,
  isDarkMode = false,
  onPress,
}: ExerciseCardProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
    chipBg: isDarkMode ? 'rgba(168,85,247,0.12)' : 'rgba(168,85,247,0.1)',
    chipText: PRIMARY_PURPLE,
  };

  const getCategoryIcon = (category: string): keyof typeof Ionicons.glyphMap => {
    switch (category) {
      case 'strength':
        return 'barbell-outline';
      case 'cardio':
        return 'heart-outline';
      case 'flexibility':
        return 'body-outline';
      case 'balance':
        return 'fitness-outline';
      default:
        return 'fitness-outline';
    }
  };

  const getDifficultyColor = (level: string): string => {
    switch (level) {
      case 'beginner':
        return '#10B981'; // green
      case 'intermediate':
        return '#F59E0B'; // orange
      case 'advanced':
        return '#EF4444'; // red
      default:
        return colors.textSoft;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={getCategoryIcon(exercise.category)}
            size={24}
            color={PRIMARY_PURPLE}
          />
        </View>
        <View style={styles.headerContent}>
          <Text style={[styles.exerciseName, { color: colors.text }]}>
            {exercise.name}
          </Text>
          <View style={styles.chips}>
            <View style={[styles.chip, { backgroundColor: colors.chipBg }]}>
              <Text style={[styles.chipText, { color: colors.chipText }]}>
                {exercise.category}
              </Text>
            </View>
            <View
              style={[
                styles.chip,
                { backgroundColor: `${getDifficultyColor(exercise.difficultyLevel)}20` },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: getDifficultyColor(exercise.difficultyLevel) },
                ]}
              >
                {exercise.difficultyLevel}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {exercise.description && (
        <Text style={[styles.description, { color: colors.textSoft }]} numberOfLines={2}>
          {exercise.description}
        </Text>
      )}

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Ionicons name="body-outline" size={16} color={colors.textSoft} />
          <Text style={[styles.detailText, { color: colors.textSoft }]}>
            {exercise.muscleGroups.slice(0, 3).join(', ')}
            {exercise.muscleGroups.length > 3 && ` +${exercise.muscleGroups.length - 3}`}
          </Text>
        </View>

        {exercise.equipment.length > 0 && (
          <View style={styles.detailRow}>
            <Ionicons name="build-outline" size={16} color={colors.textSoft} />
            <Text style={[styles.detailText, { color: colors.textSoft }]}>
              {exercise.equipment.slice(0, 2).join(', ')}
              {exercise.equipment.length > 2 && ` +${exercise.equipment.length - 2}`}
            </Text>
          </View>
        )}

        <View style={styles.detailRow}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.textSoft} />
          <Text style={[styles.detailText, { color: colors.textSoft }]}>
            {exercise.safetyCuesJSON.length} safety cues
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="chevron-forward" size={20} color={PRIMARY_PURPLE} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(168,85,247,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  detailsContainer: {
    gap: 8,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
});

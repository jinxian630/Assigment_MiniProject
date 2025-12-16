import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Theme } from '@/constants/theme';
import { useExercises } from './hooks/useExercises';
import { ExerciseCategory, DifficultyLevel } from '@/types/workout';
import ExerciseCard from './components/ExerciseCard';
import { useThemeMode } from './hooks/useThemeMode';

const MODULE_COLOR = '#4ECDC4';

export default function ExerciseSelectionScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState<ExerciseCategory | undefined>(
    undefined
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    DifficultyLevel | undefined
  >(undefined);

  const { exercises, loading, error } = useExercises({
    category: selectedCategory,
    difficultyLevel: selectedDifficulty,
  });

  // Theme management
  const { isDarkMode } = useThemeMode();

  const categories: ExerciseCategory[] = ['strength', 'cardio', 'flexibility', 'balance'];
  const difficulties: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

  const handleExercisePress = (exerciseId: string) => {
    // Navigate to workout session screen
    router.push({
      pathname: '/modules/health-fitness/WorkoutSessionScreen',
      params: { exerciseId },
    });
  };

  const renderCategoryFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Category</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            !selectedCategory && styles.filterChipActive,
          ]}
          onPress={() => setSelectedCategory(undefined)}
        >
          <Text
            style={[
              styles.filterChipText,
              !selectedCategory && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories.map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.filterChip,
              selectedCategory === category && styles.filterChipActive,
            ]}
            onPress={() => setSelectedCategory(category)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedCategory === category && styles.filterChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderDifficultyFilter = () => (
    <View style={styles.filterSection}>
      <Text style={styles.filterTitle}>Difficulty</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        <TouchableOpacity
          style={[
            styles.filterChip,
            !selectedDifficulty && styles.filterChipActive,
          ]}
          onPress={() => setSelectedDifficulty(undefined)}
        >
          <Text
            style={[
              styles.filterChipText,
              !selectedDifficulty && styles.filterChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {difficulties.map((difficulty) => (
          <TouchableOpacity
            key={difficulty}
            style={[
              styles.filterChip,
              selectedDifficulty === difficulty && styles.filterChipActive,
            ]}
            onPress={() => setSelectedDifficulty(difficulty)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedDifficulty === difficulty && styles.filterChipTextActive,
              ]}
            >
              {difficulty}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderContent = () => {
    console.log('🎨 ExerciseSelectionScreen: Rendering content. Loading:', loading, 'Exercises:', exercises.length, 'Error:', error);
    
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={MODULE_COLOR} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={Theme.colors.error} />
          <Text style={styles.errorText}>Failed to load exercises</Text>
          <Text style={styles.errorSubtext}>{error.message}</Text>
        </View>
      );
    }

    if (exercises.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🏋️</Text>
          <Text style={styles.emptyText}>No exercises found</Text>
          <Text style={styles.emptySubtext}>
            Try adjusting your filters or check back later
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={exercises}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            isDarkMode={isDarkMode}
            onPress={() => handleExercisePress(item.id)}
          />
        )}
        contentContainerStyle={styles.exerciseList}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>Select Exercise</Text>
          <View style={{ width: 48 }} />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          {renderCategoryFilter()}
          {renderDifficultyFilter()}
        </View>

        {/* Exercise List */}
        <View style={styles.contentContainer}>{renderContent()}</View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.md,
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },
  filtersContainer: {
    paddingHorizontal: Theme.spacing.screenPadding,
    marginBottom: Theme.spacing.md,
  },
  filterSection: {
    marginBottom: Theme.spacing.md,
  },
  filterTitle: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Theme.colors.cardBackground,
    borderWidth: 1,
    borderColor: Theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: MODULE_COLOR,
    borderColor: MODULE_COLOR,
  },
  filterChipText: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  contentContainer: {
    flex: 1,
  },
  exerciseList: {
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingBottom: Theme.spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.screenPadding,
  },
  loadingText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  errorText: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Theme.spacing.md,
  },
  emptyText: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },
  emptySubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
});

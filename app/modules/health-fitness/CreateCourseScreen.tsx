import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { Theme } from '@/constants/theme';
import { AuthContext } from '@/contexts/AuthContext';
import { courseService } from '@/services/course.service';
import { workoutService } from '@/services/workout.service';
import { ExerciseCategory, DifficultyLevel, Exercise } from '@/types/workout';

const MODULE_COLOR = '#4ECDC4';

const CATEGORIES: ExerciseCategory[] = ['strength', 'cardio', 'flexibility', 'balance'];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];

export default function CreateCourseScreen() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id || '';
  const userName = authContext?.user?.displayName || '';

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');
  const [duration, setDuration] = useState('');
  const [tags, setTags] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Available exercises
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loadingExercises, setLoadingExercises] = useState(true);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoadingExercises(true);
      const allExercises = await workoutService.getAllExercises(true); // Coach sees all
      setExercises(allExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      Alert.alert('Error', 'Failed to load exercises');
    } finally {
      setLoadingExercises(false);
    }
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedExercises((prev) =>
      prev.includes(exerciseId)
        ? prev.filter((id) => id !== exerciseId)
        : [...prev, exerciseId]
    );
  };

  const validateForm = (): boolean => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Course title is required');
      return false;
    }

    if (!description.trim()) {
      Alert.alert('Validation Error', 'Course description is required');
      return false;
    }

    if (selectedExercises.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one exercise');
      return false;
    }

    return true;
  };

  const handleCreateCourse = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const courseData = {
        coachId: userId,
        coachName: userName,
        title: title.trim(),
        description: description.trim(),
        category,
        difficultyLevel,
        exercises: selectedExercises,
        duration: duration ? parseInt(duration) : undefined,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter((t) => t),
      };

      await courseService.createCourse(courseData);

      Alert.alert('Success', 'Course created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating course:', error);
      Alert.alert('Error', 'Failed to create course. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <IconButton
                icon="arrow-back"
                onPress={() => router.back()}
                variant="secondary"
                size="medium"
              />
              <Text style={styles.headerTitle}>Create Course</Text>
              <View style={{ width: 48 }} />
            </View>

            {/* Basic Info */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Input
                label="Course Title"
                placeholder="e.g., 30-Day Strength Builder"
                value={title}
                onChangeText={setTitle}
              />
              <Input
                label="Description"
                placeholder="Describe your course..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
              <Input
                label="Estimated Duration (minutes)"
                placeholder="e.g., 45"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
              />
              <Input
                label="Tags (comma-separated)"
                placeholder="e.g., beginner-friendly, home workout"
                value={tags}
                onChangeText={setTags}
              />
            </Card>

            {/* Category */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Category</Text>
              <View style={styles.optionsGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.optionButton, category === cat && styles.optionButtonActive]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        category === cat && styles.optionButtonTextActive,
                      ]}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Difficulty */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Difficulty Level</Text>
              <View style={styles.optionsGrid}>
                {DIFFICULTY_LEVELS.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionButton,
                      difficultyLevel === level && styles.optionButtonActive,
                    ]}
                    onPress={() => setDifficultyLevel(level)}
                  >
                    <Text
                      style={[
                        styles.optionButtonText,
                        difficultyLevel === level && styles.optionButtonTextActive,
                      ]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Exercise Selection */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>
                Select Exercises ({selectedExercises.length} selected)
              </Text>

              {loadingExercises ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={MODULE_COLOR} />
                  <Text style={styles.loadingText}>Loading exercises...</Text>
                </View>
              ) : exercises.length === 0 ? (
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>No exercises available</Text>
                  <Text style={styles.emptySubtext}>Create some exercises first!</Text>
                </View>
              ) : (
                <View style={styles.exercisesList}>
                  {exercises.map((exercise) => (
                    <TouchableOpacity
                      key={exercise.id}
                      style={[
                        styles.exerciseItem,
                        selectedExercises.includes(exercise.id) && styles.exerciseItemSelected,
                      ]}
                      onPress={() => toggleExercise(exercise.id)}
                    >
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <Text style={styles.exerciseMeta}>
                          {exercise.category} • {exercise.difficultyLevel}
                        </Text>
                      </View>
                      {selectedExercises.includes(exercise.id) && (
                        <Ionicons name="checkmark-circle" size={24} color={MODULE_COLOR} />
                      )}
                      {!selectedExercises.includes(exercise.id) && (
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={24}
                          color={Theme.colors.border}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Card>

            {/* Submit Button */}
            <Button
              variant="primary"
              onPress={handleCreateCourse}
              loading={loading}
              fullWidth
              style={styles.submitButton}
            >
              Create Course
            </Button>

            <Text style={styles.note}>
              Note: Your course will be created as a draft. You can publish it later from the
              Coach Dashboard.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.cardBackground,
  },
  optionButtonActive: {
    borderColor: MODULE_COLOR,
    backgroundColor: `${MODULE_COLOR}20`,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  optionButtonTextActive: {
    color: MODULE_COLOR,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  emptySubtext: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  exercisesList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Theme.colors.background,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  exerciseItemSelected: {
    borderColor: MODULE_COLOR,
    backgroundColor: `${MODULE_COLOR}10`,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  exerciseMeta: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  note: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
});

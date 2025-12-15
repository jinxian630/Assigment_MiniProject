import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { workoutService } from '@/services/workout.service';
import {
  ExerciseCategory,
  DifficultyLevel,
  SafetyCue,
  CuePriority,
  CueCondition,
} from '@/types/workout';

const MODULE_COLOR = '#4ECDC4';

const CATEGORIES: ExerciseCategory[] = ['strength', 'cardio', 'flexibility', 'balance'];
const DIFFICULTY_LEVELS: DifficultyLevel[] = ['beginner', 'intermediate', 'advanced'];
const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Forearms',
  'Abs',
  'Obliques',
  'Quads',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Full Body',
];
const EQUIPMENT_OPTIONS = [
  'Bodyweight',
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance Bands',
  'Cable Machine',
  'Pull-up Bar',
  'Bench',
  'Yoga Mat',
  'Medicine Ball',
  'TRX',
  'None',
];

export default function CreateExerciseScreen() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id || '';
  const userName = authContext?.user?.displayName || '';

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [category, setCategory] = useState<ExerciseCategory>('strength');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>('beginner');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [biomechStandards, setBiomechStandards] = useState('');
  const [safetyCues, setSafetyCues] = useState<SafetyCue[]>([]);
  const [loading, setLoading] = useState(false);

  // Safety cue form state
  const [cueTimeWindow, setCueTimeWindow] = useState('');
  const [cueText, setCueText] = useState('');
  const [cuePriority, setCuePriority] = useState<CuePriority>('normal');

  const toggleMuscle = (muscle: string) => {
    setSelectedMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  };

  const toggleEquipment = (equipment: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(equipment) ? prev.filter((e) => e !== equipment) : [...prev, equipment]
    );
  };

  const addSafetyCue = () => {
    if (!cueTimeWindow.trim() || !cueText.trim()) {
      Alert.alert('Validation Error', 'Please enter both time window and cue text');
      return;
    }

    const newCue: SafetyCue = {
      timeWindow: cueTimeWindow.trim(),
      cueText: cueText.trim(),
      priority: cuePriority,
      condition: 'always',
    };

    setSafetyCues([...safetyCues, newCue]);
    setCueTimeWindow('');
    setCueText('');
    setCuePriority('normal');
  };

  const removeSafetyCue = (index: number) => {
    setSafetyCues(safetyCues.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Exercise name is required');
      return false;
    }

    if (selectedMuscles.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one muscle group');
      return false;
    }

    if (selectedEquipment.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one equipment option');
      return false;
    }

    if (safetyCues.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one safety cue');
      return false;
    }

    return true;
  };

  const handleCreateExercise = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      console.log('🔍 CreateExercise: Current userId:', userId);
      console.log('🔍 CreateExercise: Current userName:', userName);
      
      if (!userId || userId.trim() === '') {
        console.error('❌ CreateExercise: userId is empty!');
        Alert.alert('Error', 'User ID is missing. Please log in again.');
        return;
      }

      const exerciseData = {
        name: name.trim(),
        description: description.trim(),
        youtubeLink: youtubeLink.trim(),
        category,
        muscleGroups: selectedMuscles,
        equipment: selectedEquipment,
        biomechStandards: biomechStandards.trim() || 'Custom',
        safetyCuesJSON: safetyCues,
        difficultyLevel,
      };

      console.log('📝 CreateExercise: Exercise data:', exerciseData);
      console.log('📝 CreateExercise: Calling workoutService.createExercise...');

      await workoutService.createExercise(exerciseData, userId, userName);

      Alert.alert('Success', 'Exercise created successfully!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Error creating exercise:', error);
      Alert.alert('Error', 'Failed to create exercise. Please try again.');
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
              <Text style={styles.headerTitle}>Create Exercise</Text>
              <View style={{ width: 48 }} />
            </View>

            {/* Basic Info */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>
              <Input
                label="Exercise Name"
                placeholder="e.g., Barbell Bench Press"
                value={name}
                onChangeText={setName}
              />
              <Input
                label="Description"
                placeholder="Describe the exercise..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
              <Input
                label="YouTube Video Link (Optional)"
                placeholder="e.g., https://www.youtube.com/watch?v=..."
                value={youtubeLink}
                onChangeText={setYoutubeLink}
                autoCapitalize="none"
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

            {/* Muscle Groups */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Muscle Groups (Select all that apply)</Text>
              <View style={styles.chipsContainer}>
                {MUSCLE_GROUPS.map((muscle) => (
                  <TouchableOpacity
                    key={muscle}
                    style={[
                      styles.chip,
                      selectedMuscles.includes(muscle) && styles.chipActive,
                    ]}
                    onPress={() => toggleMuscle(muscle)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedMuscles.includes(muscle) && styles.chipTextActive,
                      ]}
                    >
                      {muscle}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Equipment */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Equipment (Select all that apply)</Text>
              <View style={styles.chipsContainer}>
                {EQUIPMENT_OPTIONS.map((equipment) => (
                  <TouchableOpacity
                    key={equipment}
                    style={[
                      styles.chip,
                      selectedEquipment.includes(equipment) && styles.chipActive,
                    ]}
                    onPress={() => toggleEquipment(equipment)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selectedEquipment.includes(equipment) && styles.chipTextActive,
                      ]}
                    >
                      {equipment}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Card>

            {/* Biomechanical Standards */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Biomechanical Standards (Optional)</Text>
              <Input
                placeholder="e.g., NSCA 4th Edition, ACSM Guidelines"
                value={biomechStandards}
                onChangeText={setBiomechStandards}
              />
            </Card>

            {/* Safety Cues */}
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>Safety Cues</Text>
              <View style={styles.cueForm}>
                <Input
                  label="Time Window"
                  placeholder="e.g., 0-10s, 45-60s"
                  value={cueTimeWindow}
                  onChangeText={setCueTimeWindow}
                />
                <Input
                  label="Cue Text"
                  placeholder="e.g., Keep your core engaged"
                  value={cueText}
                  onChangeText={setCueText}
                  multiline
                />
                <Text style={styles.label}>Priority</Text>
                <View style={styles.priorityButtons}>
                  {(['low', 'normal', 'high', 'critical'] as CuePriority[]).map((priority) => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.priorityButton,
                        cuePriority === priority && styles.priorityButtonActive,
                      ]}
                      onPress={() => setCuePriority(priority)}
                    >
                      <Text
                        style={[
                          styles.priorityButtonText,
                          cuePriority === priority && styles.priorityButtonTextActive,
                        ]}
                      >
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Button variant="secondary" onPress={addSafetyCue} fullWidth>
                  Add Safety Cue
                </Button>
              </View>

              {safetyCues.length > 0 && (
                <View style={styles.cuesList}>
                  <Text style={styles.cuesListTitle}>Added Cues ({safetyCues.length})</Text>
                  {safetyCues.map((cue, index) => (
                    <View key={index} style={styles.cueItem}>
                      <View style={styles.cueContent}>
                        <Text style={styles.cueTimeWindow}>{cue.timeWindow}</Text>
                        <Text style={styles.cueTextItem}>{cue.cueText}</Text>
                        <Text style={styles.cuePriorityTag}>
                          {cue.priority.toUpperCase()}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => removeSafetyCue(index)}>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* Submit Button */}
            <Button
              variant="primary"
              onPress={handleCreateExercise}
              loading={loading}
              fullWidth
              style={styles.submitButton}
            >
              Create Exercise
            </Button>

            <Text style={styles.verificationNote}>
              Your exercise will be visible to all users immediately!
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    backgroundColor: Theme.colors.cardBackground,
  },
  chipActive: {
    borderColor: MODULE_COLOR,
    backgroundColor: `${MODULE_COLOR}20`,
  },
  chipText: {
    fontSize: 13,
    color: Theme.colors.textSecondary,
  },
  chipTextActive: {
    color: MODULE_COLOR,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.textPrimary,
    marginBottom: 8,
  },
  cueForm: {
    marginBottom: 16,
  },
  priorityButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    alignItems: 'center',
  },
  priorityButtonActive: {
    borderColor: MODULE_COLOR,
    backgroundColor: `${MODULE_COLOR}20`,
  },
  priorityButtonText: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
  },
  priorityButtonTextActive: {
    color: MODULE_COLOR,
    fontWeight: '600',
  },
  cuesList: {
    marginTop: 16,
  },
  cuesListTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    marginBottom: 8,
  },
  cueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: Theme.colors.background,
    borderRadius: 8,
    marginBottom: 8,
  },
  cueContent: {
    flex: 1,
  },
  cueTimeWindow: {
    fontSize: 12,
    fontWeight: 'bold',
    color: MODULE_COLOR,
    marginBottom: 4,
  },
  cueTextItem: {
    fontSize: 14,
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  cuePriorityTag: {
    fontSize: 11,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  verificationNote: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
});

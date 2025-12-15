import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WorkoutSet, FatigueLevel } from '@/types/workout';

const PRIMARY_PURPLE = '#a855f7';

type SetInputFormProps = {
  visible: boolean;
  setNumber: number;
  onSubmit: (setData: WorkoutSet) => void;
  onCancel: () => void;
  isDarkMode?: boolean;
};

export default function SetInputForm({
  visible,
  setNumber,
  onSubmit,
  onCancel,
  isDarkMode = false,
}: SetInputFormProps) {
  const [reps, setReps] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [fatigueLevel, setFatigueLevel] = useState<FatigueLevel>(3);
  const [restDuration, setRestDuration] = useState<string>('60');

  const colors = {
    background: isDarkMode ? '#111827' : '#FFFFFF',
    surface: isDarkMode ? '#1F2937' : '#F9FAFB',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const handleSubmit = () => {
    const setData: WorkoutSet = {
      setNumber,
      fatigueLevel,
      restAfter: restDuration ? parseInt(restDuration, 10) : 0,
      ...(reps && { reps: parseInt(reps, 10) }),
      ...(weight && { weight: parseFloat(weight) }),
    };

    onSubmit(setData);

    // Reset form
    setReps('');
    setWeight('');
    setFatigueLevel(3);
    setRestDuration('60');
  };

  const handleCancel = () => {
    // Reset form
    setReps('');
    setWeight('');
    setFatigueLevel(3);
    setRestDuration('60');
    onCancel();
  };

  const getFatigueColor = (level: FatigueLevel): string => {
    if (level <= 2) return '#10B981'; // green - low fatigue
    if (level === 3) return '#F59E0B'; // orange - medium fatigue
    return '#EF4444'; // red - high fatigue
  };

  const getFatigueLabel = (level: FatigueLevel): string => {
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              Set {setNumber} Complete
            </Text>
            <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.textSoft} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Reps Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSoft }]}>
                Reps (optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g., 10"
                placeholderTextColor={colors.textSoft}
                keyboardType="number-pad"
                value={reps}
                onChangeText={setReps}
              />
            </View>

            {/* Weight Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSoft }]}>
                Weight (lbs, optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g., 135"
                placeholderTextColor={colors.textSoft}
                keyboardType="decimal-pad"
                value={weight}
                onChangeText={setWeight}
              />
            </View>

            {/* Fatigue Level */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.textSoft }]}>
                  Fatigue Level
                </Text>
                <Text
                  style={[
                    styles.fatigueLabel,
                    { color: getFatigueColor(fatigueLevel) },
                  ]}
                >
                  {getFatigueLabel(fatigueLevel)}
                </Text>
              </View>
              <View style={styles.fatigueButtons}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.fatigueButton,
                      {
                        backgroundColor:
                          fatigueLevel === level
                            ? getFatigueColor(level as FatigueLevel)
                            : colors.surface,
                        borderColor:
                          fatigueLevel === level
                            ? getFatigueColor(level as FatigueLevel)
                            : colors.border,
                      },
                    ]}
                    onPress={() => setFatigueLevel(level as FatigueLevel)}
                  >
                    <Text
                      style={[
                        styles.fatigueButtonText,
                        {
                          color:
                            fatigueLevel === level ? '#FFFFFF' : colors.textSoft,
                        },
                      ]}
                    >
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Rest Duration */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSoft }]}>
                Rest Duration (seconds)
              </Text>
              <View style={styles.restButtons}>
                {['30', '60', '90', '120'].map((seconds) => (
                  <TouchableOpacity
                    key={seconds}
                    style={[
                      styles.restButton,
                      {
                        backgroundColor:
                          restDuration === seconds ? PRIMARY_PURPLE : colors.surface,
                        borderColor:
                          restDuration === seconds ? PRIMARY_PURPLE : colors.border,
                      },
                    ]}
                    onPress={() => setRestDuration(seconds)}
                  >
                    <Text
                      style={[
                        styles.restButtonText,
                        {
                          color:
                            restDuration === seconds ? '#FFFFFF' : colors.textSoft,
                        },
                      ]}
                    >
                      {seconds}s
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.customRestInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Custom (seconds)"
                placeholderTextColor={colors.textSoft}
                keyboardType="number-pad"
                value={restDuration}
                onChangeText={setRestDuration}
              />
            </View>
          </ScrollView>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: PRIMARY_PURPLE }]}
              onPress={handleSubmit}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Save Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  form: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fatigueLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  customRestInput: {
    marginTop: 8,
  },
  fatigueButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  fatigueButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  fatigueButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  restButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  restButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  restButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 24,
    marginTop: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

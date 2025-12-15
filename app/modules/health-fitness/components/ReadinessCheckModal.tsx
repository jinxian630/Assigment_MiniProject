import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import {
  ReadinessCheckInput,
  SleepQuality,
} from '@/types/readiness';

const MODULE_COLOR = '#4ECDC4'; // Teal accent for health/fitness module

type ReadinessCheckModalProps = {
  visible: boolean;
  onSubmit: (input: ReadinessCheckInput) => Promise<void>;
  isDarkMode?: boolean;
};

export default function ReadinessCheckModal({
  visible,
  onSubmit,
  isDarkMode = false,
}: ReadinessCheckModalProps) {
  const [sleepQuality, setSleepQuality] = useState<SleepQuality>('average');
  const [sorenessLevel, setSorenessLevel] = useState<number>(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = {
    background: isDarkMode ? '#111827' : '#FFFFFF',
    surface: isDarkMode ? '#1F2937' : '#F9FAFB',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        sleepQuality,
        sorenessLevel,
      });
      // Reset form
      setSleepQuality('average');
      setSorenessLevel(5);
    } catch (error) {
      console.error('Error submitting readiness check:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSleepQualityIcon = (quality: SleepQuality): keyof typeof Ionicons.glyphMap => {
    switch (quality) {
      case 'poor':
        return 'moon-outline';
      case 'average':
        return 'moon';
      case 'great':
        return 'moon-sharp';
    }
  };

  const getSorenessLabel = (level: number): string => {
    if (level <= 3) return 'Feeling Fresh';
    if (level <= 5) return 'Slight Soreness';
    if (level <= 7) return 'Moderate Soreness';
    return 'Very Sore';
  };

  const getSorenessColor = (level: number): string => {
    if (level <= 3) return '#10B981'; // green
    if (level <= 5) return '#F59E0B'; // yellow
    if (level <= 7) return '#F97316'; // orange
    return '#EF4444'; // red
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {}} // Prevent dismissal - mandatory check
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="fitness" size={28} color={MODULE_COLOR} />
              <Text style={[styles.title, { color: colors.text }]}>
                Daily Readiness Check
              </Text>
            </View>
            <Text style={[styles.subtitle, { color: colors.textSoft }]}>
              Help us personalize your workout today
            </Text>
          </View>

          {/* Sleep Quality Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSoft }]}>
              How did you sleep last night?
            </Text>
            <View style={styles.sleepButtons}>
              {(['poor', 'average', 'great'] as SleepQuality[]).map((quality) => (
                <TouchableOpacity
                  key={quality}
                  style={[
                    styles.sleepButton,
                    {
                      backgroundColor:
                        sleepQuality === quality ? MODULE_COLOR : colors.surface,
                      borderColor:
                        sleepQuality === quality ? MODULE_COLOR : colors.border,
                    },
                  ]}
                  onPress={() => setSleepQuality(quality)}
                >
                  <Ionicons
                    name={getSleepQualityIcon(quality)}
                    size={24}
                    color={sleepQuality === quality ? '#FFFFFF' : colors.textSoft}
                  />
                  <Text
                    style={[
                      styles.sleepButtonText,
                      {
                        color:
                          sleepQuality === quality ? '#FFFFFF' : colors.text,
                      },
                    ]}
                  >
                    {quality.charAt(0).toUpperCase() + quality.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Soreness Level Section */}
          <View style={styles.section}>
            <View style={styles.labelRow}>
              <Text style={[styles.sectionLabel, { color: colors.textSoft }]}>
                How sore are you today?
              </Text>
              <Text
                style={[
                  styles.sorenessLabel,
                  { color: getSorenessColor(sorenessLevel) },
                ]}
              >
                {getSorenessLabel(sorenessLevel)}
              </Text>
            </View>

            <View style={styles.sliderContainer}>
              <Slider
                style={styles.slider}
                minimumValue={1}
                maximumValue={10}
                step={1}
                value={sorenessLevel}
                onValueChange={setSorenessLevel}
                minimumTrackTintColor={getSorenessColor(sorenessLevel)}
                maximumTrackTintColor={colors.border}
                thumbTintColor={getSorenessColor(sorenessLevel)}
              />
              <View style={styles.sliderLabels}>
                <Text style={[styles.sliderLabelText, { color: colors.textSoft }]}>
                  1 - No soreness
                </Text>
                <Text style={[styles.sliderLabelText, { color: colors.textSoft }]}>
                  10 - Very sore
                </Text>
              </View>
              <View style={styles.sorenessValue}>
                <Text
                  style={[
                    styles.sorenessValueText,
                    { color: getSorenessColor(sorenessLevel) },
                  ]}
                >
                  {sorenessLevel}
                </Text>
              </View>
            </View>
          </View>

          {/* Info Banner */}
          <View style={[styles.infoBanner, { backgroundColor: colors.surface }]}>
            <Ionicons name="information-circle" size={20} color={MODULE_COLOR} />
            <Text style={[styles.infoBannerText, { color: colors.textSoft }]}>
              We'll adjust your workout based on your readiness
            </Text>
          </View>

          {/* Submit Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: MODULE_COLOR },
                isSubmitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>Continue to Workout</Text>
                </>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 24,
    width: '90%',
    maxWidth: 400,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  sleepButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sleepButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sleepButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sorenessLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  sliderContainer: {
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
  },
  sorenessValue: {
    alignItems: 'center',
    marginTop: 12,
  },
  sorenessValueText: {
    fontSize: 32,
    fontWeight: '700',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 24,
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
  },
  footer: {
    paddingHorizontal: 24,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

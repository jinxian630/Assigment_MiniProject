import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { readinessWidgetStyles, getColors } from './chatbot.styles';
import { ReadinessWidgetData } from '../../types/chatbot';

const MODULE_COLOR = '#4ECDC4';

interface ReadinessWidgetProps {
  onSubmit: (data: ReadinessWidgetData) => void;
  onSkip?: () => void;
  isDarkMode?: boolean;
}

type FatigueLevel = 'low' | 'medium' | 'high';

const FATIGUE_EMOJIS: Record<FatigueLevel, { emoji: string; label: string; value: number }> = {
  high: { emoji: '😫', label: 'Exhausted', value: 3 },
  medium: { emoji: '😐', label: 'Moderate', value: 6 },
  low: { emoji: '⚡', label: 'Energized', value: 9 },
};

export default function ReadinessWidget({ onSubmit, onSkip, isDarkMode = false }: ReadinessWidgetProps) {
  const [fatigueScore, setFatigueScore] = useState<number>(5);
  const [selectedEmoji, setSelectedEmoji] = useState<FatigueLevel | null>(null);
  const colors = getColors(isDarkMode);

  const handleEmojiSelect = (level: FatigueLevel) => {
    setSelectedEmoji(level);
    setFatigueScore(FATIGUE_EMOJIS[level].value);
  };

  const handleSubmit = () => {
    const data: ReadinessWidgetData = {
      fatigueScore,
      timestamp: Date.now(),
    };
    onSubmit(data);
  };

  return (
    <View style={[readinessWidgetStyles.container, { backgroundColor: colors.surface }]}>
      {/* Header with Skip Button */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[readinessWidgetStyles.title, { color: colors.text.primary }]}>
          How's your energy today?
        </Text>
        {onSkip && (
          <TouchableOpacity onPress={onSkip} style={{ padding: 4 }}>
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Helper Text */}
      <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 12 }}>
        Quick tap or type your feeling in the chat below
      </Text>

      {/* Emoji Selection */}
      <View style={readinessWidgetStyles.emojiContainer}>
        {(Object.entries(FATIGUE_EMOJIS) as [FatigueLevel, typeof FATIGUE_EMOJIS[FatigueLevel]][]).map(
          ([level, { emoji, label }]) => (
            <TouchableOpacity
              key={level}
              style={[
                readinessWidgetStyles.emojiButton,
                selectedEmoji === level && readinessWidgetStyles.emojiButtonActive,
                { backgroundColor: selectedEmoji === level ? MODULE_COLOR : colors.accentLight },
              ]}
              onPress={() => handleEmojiSelect(level)}
              activeOpacity={0.7}
            >
              <Text style={readinessWidgetStyles.emoji}>{emoji}</Text>
              <Text
                style={[
                  readinessWidgetStyles.emojiLabel,
                  { color: selectedEmoji === level ? '#FFFFFF' : colors.text.secondary },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Slider for Fine-tuning */}
      <View style={readinessWidgetStyles.sliderContainer}>
        <Text style={[readinessWidgetStyles.sliderLabel, { color: colors.text.secondary }]}>
          Fine-tune your energy level:
        </Text>
        <Text style={[readinessWidgetStyles.sliderValue, { color: MODULE_COLOR }]}>
          {fatigueScore}/10
        </Text>
        <Slider
          style={{ width: '100%', height: 40 }}
          minimumValue={1}
          maximumValue={10}
          step={1}
          value={fatigueScore}
          onValueChange={setFatigueScore}
          minimumTrackTintColor={MODULE_COLOR}
          maximumTrackTintColor={colors.border}
          thumbTintColor={MODULE_COLOR}
        />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Low Energy</Text>
          <Text style={{ fontSize: 11, color: colors.text.tertiary }}>High Energy</Text>
        </View>
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={readinessWidgetStyles.submitButton}
        onPress={handleSubmit}
        activeOpacity={0.8}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={readinessWidgetStyles.submitButtonText}>Submit Readiness</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

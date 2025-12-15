import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { bodyMapperStyles, getColors } from './chatbot.styles';
import { BodyMapperSelection, BodyPart, PainSeverity } from '../../types/chatbot';

const MODULE_COLOR = '#4ECDC4';

interface BodyStatusMapperProps {
  onSubmit: (selection: BodyMapperSelection) => void;
  onSkip?: () => void;
  isDarkMode?: boolean;
}

const BODY_PARTS: Record<string, BodyPart[]> = {
  'Upper Body': ['shoulders', 'chest', 'arms', 'upper_back'],
  'Core': ['abs', 'lower_back'],
  'Lower Body': ['hips', 'quads', 'hamstrings', 'knees', 'calves'],
};

const BODY_PART_LABELS: Record<BodyPart, string> = {
  shoulders: 'Shoulders',
  chest: 'Chest',
  arms: 'Arms',
  upper_back: 'Upper Back',
  abs: 'Abs',
  lower_back: 'Lower Back',
  hips: 'Hips',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  knees: 'Knees',
  calves: 'Calves',
};

const SEVERITY_OPTIONS: { value: PainSeverity; label: string; color: string }[] = [
  { value: 'mild', label: 'Mild', color: '#FCD34D' },
  { value: 'moderate', label: 'Moderate', color: '#FB923C' },
  { value: 'severe', label: 'Severe', color: '#EF4444' },
];

export default function BodyStatusMapper({ onSubmit, onSkip, isDarkMode = false }: BodyStatusMapperProps) {
  const [selectedBodyPart, setSelectedBodyPart] = useState<BodyPart | null>(null);
  const [selectedSeverity, setSelectedSeverity] = useState<PainSeverity>('mild');
  const colors = getColors(isDarkMode);

  const handleBodyPartSelect = (bodyPart: BodyPart) => {
    setSelectedBodyPart(bodyPart);
  };

  const handleSubmit = () => {
    if (!selectedBodyPart) return;

    const selection: BodyMapperSelection = {
      bodyPart: selectedBodyPart,
      severity: selectedSeverity,
      timestamp: Date.now(),
    };
    onSubmit(selection);
  };

  return (
    <View style={[bodyMapperStyles.container, { backgroundColor: colors.surface }]}>
      {/* Header with Skip Button */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={[bodyMapperStyles.title, { color: colors.text.primary }]}>
          Where does it hurt?
        </Text>
        {onSkip && (
          <TouchableOpacity onPress={onSkip} style={{ padding: 4 }}>
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>
      
      {/* Helper Text */}
      <Text style={{ fontSize: 12, color: colors.text.tertiary, marginBottom: 12, textAlign: 'center' }}>
        Tap the area or describe it in your own words below
      </Text>

      <ScrollView 
        style={{ maxHeight: 200 }} 
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {Object.entries(BODY_PARTS).map(([sectionName, bodyParts]) => (
          <View key={sectionName} style={bodyMapperStyles.bodySection}>
            <Text style={[bodyMapperStyles.sectionTitle, { color: colors.text.secondary }]}>
              {sectionName}
            </Text>
            <View style={bodyMapperStyles.bodyPartsRow}>
              {bodyParts.map((bodyPart) => {
                const isSelected = selectedBodyPart === bodyPart;
                return (
                  <TouchableOpacity
                    key={bodyPart}
                    style={[
                      bodyMapperStyles.bodyPartButton,
                      {
                        backgroundColor: isSelected ? MODULE_COLOR : colors.background,
                        borderColor: isSelected ? MODULE_COLOR : colors.border,
                      },
                    ]}
                    onPress={() => handleBodyPartSelect(bodyPart)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        bodyMapperStyles.bodyPartText,
                        { color: isSelected ? '#FFFFFF' : colors.text.primary },
                      ]}
                    >
                      {BODY_PART_LABELS[bodyPart]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Severity Selection */}
      {selectedBodyPart && (
        <View
          style={[
            bodyMapperStyles.severityContainer,
            { backgroundColor: colors.accentLight, borderColor: colors.border },
          ]}
        >
          <Text style={[bodyMapperStyles.severityTitle, { color: colors.text.primary }]}>
            How severe is the discomfort?
          </Text>
          <View style={bodyMapperStyles.severityButtons}>
            {SEVERITY_OPTIONS.map(({ value, label, color }) => {
              const isSelected = selectedSeverity === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    bodyMapperStyles.severityButton,
                    {
                      backgroundColor: isSelected ? color : colors.background,
                      borderColor: isSelected ? color : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedSeverity(value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      bodyMapperStyles.severityButtonText,
                      { color: isSelected ? '#FFFFFF' : colors.text.primary },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* Submit Button - Always visible when body part selected */}
      {selectedBodyPart && (
        <TouchableOpacity
          style={[bodyMapperStyles.submitButton, { marginTop: 16 }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="medical" size={20} color="#FFFFFF" />
            <Text style={bodyMapperStyles.submitButtonText}>
              Report {BODY_PART_LABELS[selectedBodyPart]} Discomfort
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

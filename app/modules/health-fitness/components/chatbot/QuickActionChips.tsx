import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { quickActionStyles, getColors } from './chatbot.styles';
import { QuickActionType } from '../../types/chatbot';

const MODULE_COLOR = '#4ECDC4';

interface QuickActionChipsProps {
  onActionPress: (action: QuickActionType) => void;
  isDarkMode?: boolean;
}

const QUICK_ACTIONS: { type: QuickActionType; icon: string; label: string }[] = [
  { type: 'report_pain', icon: '🤕', label: 'Report Pain' },
  { type: 'log_sleep', icon: '💤', label: 'Log Sleep' },
  { type: 'change_time', icon: '⏱️', label: 'Change Time' },
  { type: 'view_stats', icon: '📊', label: 'View Stats' },
];

export default function QuickActionChips({ onActionPress, isDarkMode = false }: QuickActionChipsProps) {
  const colors = getColors(isDarkMode);

  return (
    <View style={[quickActionStyles.container, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {QUICK_ACTIONS.map(({ type, icon, label }) => (
          <TouchableOpacity
            key={type}
            style={[quickActionStyles.chip, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => onActionPress(type)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>{icon}</Text>
            <Text style={[quickActionStyles.chipText, { color: colors.text.primary }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

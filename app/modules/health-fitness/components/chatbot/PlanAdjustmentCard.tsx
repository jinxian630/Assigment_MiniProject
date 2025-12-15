import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { planAdjustmentStyles, getColors } from './chatbot.styles';
import { PlanAdjustmentData } from '../../types/chatbot';

const MODULE_COLOR = '#4ECDC4';

interface PlanAdjustmentCardProps {
  data: PlanAdjustmentData;
  isDarkMode?: boolean;
}

export default function PlanAdjustmentCard({ data, isDarkMode = false }: PlanAdjustmentCardProps) {
  const colors = getColors(isDarkMode);
  const { original, adjusted, reason, recommendation } = data;

  // Determine intensity change direction
  const intensityChange = adjusted.intensity - original.intensity;
  const intensityColor = intensityChange < 0 ? colors.warning : intensityChange > 0 ? colors.success : colors.text.secondary;
  const intensityIcon = intensityChange < 0 ? 'arrow-down' : intensityChange > 0 ? 'arrow-up' : 'remove';

  // Determine reason badge color
  const getBadgeColor = () => {
    if (reason.toLowerCase().includes('high fatigue') || reason.toLowerCase().includes('low sleep')) {
      return colors.error;
    }
    if (reason.toLowerCase().includes('moderate')) {
      return colors.warning;
    }
    return MODULE_COLOR;
  };

  return (
    <View style={[planAdjustmentStyles.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[planAdjustmentStyles.header, { backgroundColor: colors.accentLight }]}>
        <Ionicons name="bulb" size={20} color={MODULE_COLOR} />
        <Text style={[planAdjustmentStyles.headerTitle, { color: colors.text.primary }]}>
          Workout Adjusted for You
        </Text>
      </View>

      {/* Reason Badge */}
      <View style={{ padding: 12 }}>
        <View style={[planAdjustmentStyles.reasonBadge, { backgroundColor: getBadgeColor() }]}>
          <Text style={planAdjustmentStyles.reasonText}>Reason: {reason}</Text>
        </View>
      </View>

      {/* Comparison */}
      <View style={planAdjustmentStyles.comparisonContainer}>
        {/* Original Plan */}
        <View
          style={[
            planAdjustmentStyles.planColumn,
            { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
          ]}
        >
          <Text style={[planAdjustmentStyles.planLabel, { color: colors.text.tertiary }]}>
            Original
          </Text>
          <Text
            style={[
              planAdjustmentStyles.planValue,
              planAdjustmentStyles.planValueStrikethrough,
              { color: colors.text.secondary },
            ]}
          >
            {original.sets} × {original.reps}
          </Text>
          <Text style={[planAdjustmentStyles.planDetail, { color: colors.text.tertiary }]}>
            Sets × Reps
          </Text>
          <Text style={[planAdjustmentStyles.planDetail, { color: colors.text.tertiary }]}>
            Intensity: {(original.intensity * 100).toFixed(0)}%
          </Text>
        </View>

        {/* Adjusted Plan */}
        <View
          style={[
            planAdjustmentStyles.planColumn,
            { backgroundColor: colors.accentLight, borderWidth: 2, borderColor: MODULE_COLOR },
          ]}
        >
          <Text style={[planAdjustmentStyles.planLabel, { color: MODULE_COLOR }]}>
            Adjusted
          </Text>
          <Text style={[planAdjustmentStyles.planValue, { color: MODULE_COLOR }]}>
            {adjusted.sets} × {adjusted.reps}
          </Text>
          <Text style={[planAdjustmentStyles.planDetail, { color: colors.text.primary }]}>
            Sets × Reps
          </Text>
          <View style={planAdjustmentStyles.intensityIndicator}>
            <Ionicons name={intensityIcon} size={14} color={intensityColor} />
            <Text style={[planAdjustmentStyles.intensityText, { color: intensityColor }]}>
              {(adjusted.intensity * 100).toFixed(0)}% Intensity
            </Text>
          </View>
        </View>
      </View>

      {/* Footer with Reasoning */}
      <View style={[planAdjustmentStyles.footer, { borderTopColor: colors.border }]}>
        <Text style={[planAdjustmentStyles.footerText, { color: colors.text.secondary }]}>
          <Text style={{ fontWeight: '600', color: colors.text.primary }}>Why: </Text>
          {recommendation.reasoning}
        </Text>
        {recommendation.expectations && (
          <Text
            style={[
              planAdjustmentStyles.footerText,
              { color: colors.text.secondary, marginTop: 8, fontStyle: 'italic' },
            ]}
          >
            {recommendation.expectations}
          </Text>
        )}
      </View>
    </View>
  );
}

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FatigueState } from '@/types/readiness';

const AI_PURPLE = '#a855f7';

type AIRecommendationCardProps = {
  recommendation: string | null;
  fatigueState: FatigueState;
  readinessScore: number;
  isDarkMode?: boolean;
};

export default function AIRecommendationCard({
  recommendation,
  fatigueState,
  readinessScore,
  isDarkMode = false,
}: AIRecommendationCardProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
  };

  // Helper function to get accent color based on fatigue state and score
  const getAccentColor = (): string => {
    if (fatigueState === 'HIGH') return '#EF4444'; // Red
    if (readinessScore >= 70) return '#10B981'; // Green
    if (readinessScore >= 40) return '#F59E0B'; // Amber
    return '#EF4444'; // Red (low score)
  };

  // Helper function to get appropriate icon
  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    if (fatigueState === 'HIGH') return 'alert-circle';
    if (readinessScore >= 70) return 'checkmark-circle';
    return 'fitness';
  };

  const accentColor = getAccentColor();
  const iconName = getIcon();

  // Handle null or empty recommendation
  const displayText = recommendation?.trim() ||
    "Complete your daily readiness check to receive personalized AI recommendations.";

  const isPlaceholder = !recommendation?.trim();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, { backgroundColor: `${accentColor}15` }]}>
          <Ionicons name={iconName} size={24} color={accentColor} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            AI Recommendation
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSoft }]}>
            Personalized for your readiness
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.recommendationText,
            {
              color: isPlaceholder ? colors.textSoft : colors.text,
              fontStyle: isPlaceholder ? 'normal' : 'italic',
            },
          ]}
        >
          {displayText}
        </Text>
      </View>

      {/* Footer Badge */}
      {!isPlaceholder && (
        <View style={styles.footer}>
          <View style={[styles.badge, { backgroundColor: `${AI_PURPLE}15` }]}>
            <Ionicons name="sparkles" size={14} color={AI_PURPLE} />
            <Text style={[styles.badgeText, { color: AI_PURPLE }]}>
              AI-Generated
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    paddingVertical: 8,
  },
  recommendationText: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
  },
  footer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(168,85,247,0.1)',
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

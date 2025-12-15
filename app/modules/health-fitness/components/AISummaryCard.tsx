import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PRIMARY_PURPLE = '#a855f7';

type AISummaryCardProps = {
  summary: string | null;
  loading?: boolean;
  error?: string | null;
  isDarkMode?: boolean;
};

export default function AISummaryCard({
  summary,
  loading = false,
  error = null,
  isDarkMode = false,
}: AISummaryCardProps) {
  const colors = {
    background: isDarkMode ? '#1F2937' : '#FFFFFF',
    text: isDarkMode ? '#E5E7EB' : '#1E1B4B',
    textSoft: isDarkMode ? '#9CA3AF' : '#6B7280',
    border: isDarkMode ? '#374151' : '#E5E7EB',
    aiGradient: isDarkMode
      ? ['rgba(168,85,247,0.15)', 'rgba(168,85,247,0.05)']
      : ['rgba(168,85,247,0.1)', 'rgba(168,85,247,0.02)'],
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
          <Text style={[styles.loadingText, { color: colors.textSoft }]}>
            Generating AI insights...
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text style={[styles.errorText, { color: colors.text }]}>
            Failed to generate summary
          </Text>
          <Text style={[styles.errorSubtext, { color: colors.textSoft }]}>
            {error}
          </Text>
        </View>
      );
    }

    if (!summary) {
      return (
        <View style={styles.centerContent}>
          <Ionicons name="document-text-outline" size={48} color={colors.textSoft} />
          <Text style={[styles.emptyText, { color: colors.textSoft }]}>
            No AI summary available
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.summaryContent}>
        <Text style={[styles.summaryText, { color: colors.text }]}>
          {summary}
        </Text>
      </View>
    );
  };

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
        <View style={styles.headerIcon}>
          <Ionicons name="sparkles" size={24} color={PRIMARY_PURPLE} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>
            AI Safety Insights
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSoft }]}>
            Powered by Claude 3.5 Sonnet
          </Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* Footer Badge */}
      {summary && !loading && !error && (
        <View style={styles.footer}>
          <View style={[styles.badge, { backgroundColor: `${PRIMARY_PURPLE}15` }]}>
            <Ionicons name="shield-checkmark" size={14} color={PRIMARY_PURPLE} />
            <Text style={[styles.badgeText, { color: PRIMARY_PURPLE }]}>
              AI-Generated Analysis
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
    backgroundColor: 'rgba(168,85,247,0.1)',
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
    minHeight: 100,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  summaryContent: {
    paddingVertical: 8,
  },
  summaryText: {
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

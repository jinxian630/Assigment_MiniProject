import { StyleSheet } from 'react-native';
import { Theme } from '@/constants/theme';

const MODULE_COLOR = '#4ECDC4';

/**
 * Color definitions for chatbot with dark mode support
 */
export const chatbotColors = {
  light: {
    background: '#FFFFFF',
    surface: '#F9FAFB',
    border: '#E5E7EB',
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      tertiary: '#9CA3AF',
    },
    accent: MODULE_COLOR,
    accentLight: `${MODULE_COLOR}20`,
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
  },
  dark: {
    background: '#111827',
    surface: '#1F2937',
    border: '#374151',
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      tertiary: '#9CA3AF',
    },
    accent: MODULE_COLOR,
    accentLight: `${MODULE_COLOR}30`,
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
  },
};

/**
 * Get colors based on theme mode
 */
export const getColors = (isDarkMode: boolean) => 
  isDarkMode ? chatbotColors.dark : chatbotColors.light;

/**
 * Main chatbot container styles
 */
export const chatbotStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  statusBar: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
});

/**
 * Readiness widget styles
 */
export const readinessWidgetStyles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  emojiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  emojiButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 80,
  },
  emojiButtonActive: {
    backgroundColor: MODULE_COLOR,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  sliderContainer: {
    marginBottom: 16,
  },
  sliderLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  sliderValue: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: MODULE_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Body mapper styles
 */
export const bodyMapperStyles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  bodyGrid: {
    gap: 8,
  },
  bodySection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bodyPartsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  bodyPartButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    minWidth: 100,
    alignItems: 'center',
  },
  bodyPartButtonActive: {
    backgroundColor: MODULE_COLOR,
    borderColor: MODULE_COLOR,
  },
  bodyPartText: {
    fontSize: 14,
    fontWeight: '600',
  },
  severityContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
  },
  severityTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  severityButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: MODULE_COLOR,
    paddingVertical: 12,
    marginTop: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

/**
 * Plan adjustment card styles
 */
export const planAdjustmentStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  reasonBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  reasonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  comparisonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  planColumn: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
  },
  planLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  planValueStrikethrough: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  planDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  intensityIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  intensityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

/**
 * Quick action chips styles
 */
export const quickActionStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderTopWidth: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

/**
 * Readiness status bar styles
 */
export const statusBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  progressContainer: {
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressBarBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '700',
  },
  stateText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});

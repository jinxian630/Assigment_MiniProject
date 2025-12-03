import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Theme } from '@/constants/theme';

const MODULE_COLOR = '#FF6B9D';

export default function MemoryBookScreen() {
  const router = useRouter();

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="secondary"
              size="medium"
            />
            <Text style={styles.headerTitle}>Memory Book</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Module Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconContainer, { backgroundColor: `${MODULE_COLOR}20` }]}>
              <Ionicons name="book-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.moduleTitle}>Memory Book</Text>
            <Text style={styles.moduleSubtitle}>Capture your precious moments</Text>
          </View>

          {/* Empty State */}
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <View style={styles.dashedBorder}>
                <Text style={styles.emptyIcon}>📖</Text>
                <Text style={styles.emptyTitle}>No content yet</Text>
                <Text style={styles.emptyMessage}>
                  Your memories will appear here.{'\n'}
                  Start adding your precious moments!
                </Text>
              </View>
            </View>
          </Card>

          {/* Placeholder Timeline */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Memory Timeline</Text>
            <View style={styles.timelinePlaceholder}>
              <Text style={styles.placeholderText}>Timeline view coming soon...</Text>
            </View>
          </View>

          {/* Disabled Add Button */}
          <View style={styles.addButtonContainer}>
            <IconButton
              icon="add"
              onPress={() => {}}
              variant="primary"
              size="large"
              disabled
              style={[styles.addButton, { backgroundColor: Theme.colors.disabled }]}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
  },

  headerTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },

  // Icon Section
  iconSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.medium,
  },

  moduleTitle: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  moduleSubtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
  },

  // Empty State
  emptyCard: {
    marginBottom: Theme.spacing.xl,
  },

  emptyContent: {
    paddingVertical: Theme.spacing.lg,
  },

  dashedBorder: {
    borderWidth: 2,
    borderColor: Theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },

  emptyTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },

  emptyMessage: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSizes.sm * Theme.typography.lineHeights.normal,
  },

  // Section
  section: {
    marginBottom: Theme.spacing.xl,
  },

  sectionTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },

  timelinePlaceholder: {
    backgroundColor: `${Theme.colors.gray[100]}80`,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },

  placeholderText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },

  // Add Button
  addButtonContainer: {
    alignItems: 'flex-end',
    marginTop: Theme.spacing.lg,
  },

  addButton: {
    opacity: 0.5,
  },
});

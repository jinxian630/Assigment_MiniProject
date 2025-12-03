import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Theme } from '@/constants/theme';

const MODULE_COLOR = '#4ECDC4';

export default function HealthFitnessScreen() {
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
            <Text style={styles.headerTitle}>Health & Fitness</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Module Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconContainer, { backgroundColor: `${MODULE_COLOR}20` }]}>
              <Ionicons name="fitness-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.moduleTitle}>Health & Fitness</Text>
            <Text style={styles.moduleSubtitle}>Track your wellness journey</Text>
          </View>

          {/* Progress Ring Placeholder */}
          <Card style={styles.progressCard}>
            <Text style={styles.cardTitle}>Daily Progress</Text>
            <View style={styles.progressRing}>
              <Text style={styles.progressText}>0%</Text>
            </View>
            <Text style={styles.progressSubtext}>
              Your fitness overview will appear here
            </Text>
          </Card>

          {/* Empty Exercise List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercise Log</Text>
            <Card>
              <View style={styles.emptyList}>
                <Text style={styles.emptyIcon}>💪</Text>
                <Text style={styles.emptyText}>No exercises logged yet</Text>
              </View>
            </Card>
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

  progressCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },

  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
  },

  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },

  progressText: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textSecondary,
  },

  progressSubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  section: {
    marginBottom: Theme.spacing.xl,
  },

  sectionTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },

  emptyList: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },

  emptyText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },

  addButtonContainer: {
    alignItems: 'flex-end',
    marginTop: Theme.spacing.lg,
  },

  addButton: {
    opacity: 0.5,
  },
});

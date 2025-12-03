import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Theme } from '@/constants/theme';

const MODULE_COLOR = '#FFD93D';

export default function MoneyManagementScreen() {
  const router = useRouter();

  const categories = ['Food', 'Transport', 'Shopping', 'Bills', 'Entertainment'];

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
            <Text style={styles.headerTitle}>Money Management</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Module Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconContainer, { backgroundColor: `${MODULE_COLOR}20` }]}>
              <Ionicons name="wallet-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.moduleTitle}>Money Management</Text>
            <Text style={styles.moduleSubtitle}>Manage your finances</Text>
          </View>

          {/* Financial Summary */}
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Financial Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={styles.summaryValue}>$0.00</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>$0.00</Text>
              </View>
            </View>
          </Card>

          {/* Empty Chart */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Overview</Text>
            <Card>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartIcon}>📊</Text>
                <Text style={styles.chartText}>No financial data available</Text>
                <Text style={styles.chartSubtext}>
                  Start tracking your expenses to see insights
                </Text>
              </View>
            </Card>
          </View>

          {/* Category Badges */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category, index) => (
                <Badge key={index} variant="primary" style={styles.categoryBadge}>
                  {category}
                </Badge>
              ))}
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

  summaryCard: {
    marginBottom: Theme.spacing.xl,
  },

  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },

  summaryContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Theme.spacing.md,
  },

  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },

  summaryLabel: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },

  summaryValue: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },

  summaryDivider: {
    width: 1,
    backgroundColor: Theme.colors.border,
    marginHorizontal: Theme.spacing.md,
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

  chartPlaceholder: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },

  chartIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },

  chartText: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  chartSubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },

  categoryBadge: {
    marginRight: 0,
  },

  addButtonContainer: {
    alignItems: 'flex-end',
    marginTop: Theme.spacing.lg,
  },

  addButton: {
    opacity: 0.5,
  },
});

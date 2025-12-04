import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Theme } from "@/constants/theme";

const MODULE_COLOR = "#FFD93D";

export default function MoneyManagementScreen() {
  const router = useRouter();

  const categories = [
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
  ];

  // ⬇️ IMPORTANT: use router.push, not navigation.navigate
  // Adjust these paths to match your actual file names inside app/
  const goToAddTransaction = () => {
    // example if your page file is app/modules/money-management/TransactionAdd.tsx
    router.push("/modules/money-management/TransactionAdd");
  };

  const goToTransactionList = () => {
    router.push("/modules/money-management/TransactionList");
  };

  const goToChartDisplay = () => {
    router.push("/modules/money-management/ChartDisplay");
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${MODULE_COLOR}20` },
              ]}
            >
              <Ionicons name="wallet-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.moduleTitle}>Money Management</Text>
            <Text style={styles.moduleSubtitle}>Manage your finances</Text>
          </View>

          {/* Financial Summary (placeholder) */}
          <Card style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Financial Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={styles.summaryValue}>RM 0.00</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Expenses</Text>
                <Text style={styles.summaryValue}>RM 0.00</Text>
              </View>
            </View>
          </Card>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>

            <View style={styles.quickActionsRow}>
              {/* Add Transaction */}
              <Card style={styles.quickActionCard}>
                <View style={styles.quickActionIconWrapper}>
                  <Ionicons
                    name="add-circle-outline"
                    size={28}
                    color="#ff7f50"
                  />
                </View>
                <Text style={styles.quickActionTitle}>Add Transaction</Text>
                <Text style={styles.quickActionSubtitle}>
                  Quick add income or expense
                </Text>
                <IconButton
                  icon="arrow-forward"
                  variant="primary"
                  size="small"
                  onPress={goToAddTransaction}
                  style={styles.quickActionButton}
                />
              </Card>

              {/* Transaction List */}
              <Card style={styles.quickActionCard}>
                <View style={styles.quickActionIconWrapper}>
                  <Ionicons name="list-outline" size={28} color="#4b7bec" />
                </View>
                <Text style={styles.quickActionTitle}>Transaction List</Text>
                <Text style={styles.quickActionSubtitle}>
                  View & manage past records
                </Text>
                <IconButton
                  icon="arrow-forward"
                  variant="primary"
                  size="small"
                  onPress={goToTransactionList}
                  style={styles.quickActionButton}
                />
              </Card>
            </View>

            <View style={styles.quickActionsRow}>
              {/* Charts & Insights */}
              <Card style={[styles.quickActionCard, { flex: 1 }]}>
                <View style={styles.quickActionIconWrapper}>
                  <Ionicons
                    name="pie-chart-outline"
                    size={28}
                    color="#20bf6b"
                  />
                </View>
                <Text style={styles.quickActionTitle}>Charts & Insights</Text>
                <Text style={styles.quickActionSubtitle}>
                  Category breakdown & trends
                </Text>
                <IconButton
                  icon="arrow-forward"
                  variant="primary"
                  size="small"
                  onPress={goToChartDisplay}
                  style={styles.quickActionButton}
                />
              </Card>
              <View style={{ flex: 1 }} />
            </View>
          </View>

          {/* Spending Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Spending Overview</Text>
            <Card>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartIcon}>📊</Text>
                <Text style={styles.chartText}>
                  View detailed charts & trends
                </Text>
                <Text style={styles.chartSubtext}>
                  Tap “Charts & Insights” above to see your monthly income and
                  expenses.
                </Text>
              </View>
            </Card>
          </View>

          {/* Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.categoriesContainer}>
              {categories.map((category, index) => (
                <Badge
                  key={index}
                  variant="primary"
                  style={styles.categoryBadge}
                >
                  {category}
                </Badge>
              ))}
            </View>
          </View>

          {/* Floating Add Button */}
          <View style={styles.addButtonContainer}>
            <IconButton
              icon="add"
              onPress={goToAddTransaction}
              variant="primary"
              size="large"
              style={styles.addButton}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.xl,
  },
  headerTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },
  iconSection: {
    alignItems: "center",
    marginBottom: Theme.spacing.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
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
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Theme.spacing.md,
  },
  summaryItem: {
    alignItems: "center",
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
    alignItems: "center",
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
    textAlign: "center",
  },
  categoriesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.sm,
  },
  categoryBadge: {
    marginRight: 0,
  },
  addButtonContainer: {
    alignItems: "flex-end",
    marginTop: Theme.spacing.lg,
  },
  addButton: {},
  quickActionsRow: {
    flexDirection: "row",
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },
  quickActionCard: {
    flex: 1,
    paddingBottom: Theme.spacing.sm,
  },
  quickActionIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    marginBottom: Theme.spacing.sm,
  },
  quickActionTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textPrimary,
  },
  quickActionSubtitle: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  quickActionButton: {
    alignSelf: "flex-end",
  },
});

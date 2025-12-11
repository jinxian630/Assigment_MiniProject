import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@/components/common/GradientBackground";
import { Card } from "@/components/common/Card";
import { Theme } from "@/constants/theme";

export default function InsightsScreen() {
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
            <Text style={styles.title}>Insights</Text>
            <Text style={styles.subtitle}>
              Track your progress and analytics
            </Text>
          </View>

          {/* Placeholder Charts */}
          <View style={styles.section}>
            <Card style={styles.chartCard}>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartIcon}>📈</Text>
                <Text style={styles.chartTitle}>Activity Overview</Text>
                <Text style={styles.chartSubtitle}>
                  Your activity chart will appear here
                </Text>
              </View>
            </Card>

            <Card style={styles.chartCard}>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartIcon}>📊</Text>
                <Text style={styles.chartTitle}>Progress Tracking</Text>
                <Text style={styles.chartSubtitle}>
                  Track your progress across modules
                </Text>
              </View>
            </Card>

            <Card style={styles.chartCard}>
              <View style={styles.chartPlaceholder}>
                <Text style={styles.chartIcon}>🎯</Text>
                <Text style={styles.chartTitle}>Goal Achievement</Text>
                <Text style={styles.chartSubtitle}>
                  View your goal completion rates
                </Text>
              </View>
            </Card>
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
    paddingTop: Theme.spacing.lg,
    paddingBottom: Theme.spacing.xxl,
  },

  header: {
    marginBottom: Theme.spacing.xl,
  },

  title: {
    fontSize: Theme.typography.fontSizes.xxxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },

  subtitle: {
    fontSize: Theme.typography.fontSizes.lg,
    color: Theme.colors.textSecondary,
  },

  section: {
    gap: Theme.spacing.md,
  },

  chartCard: {
    paddingVertical: Theme.spacing.xl,
    marginBottom: Theme.spacing.md,
  },

  chartPlaceholder: {
    alignItems: "center",
  },

  chartIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },

  chartTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  chartSubtitle: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: "center",
  },
});

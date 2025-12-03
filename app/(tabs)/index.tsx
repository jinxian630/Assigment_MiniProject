import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { WelcomeHeader } from '@/components/dashboard/WelcomeHeader';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import { Card } from '@/components/common/Card';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { MODULES } from '@/constants/modules';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.xxl,
    },
    section: {
      paddingHorizontal: theme.spacing.screenPadding,
      marginBottom: theme.spacing.sectionGap,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSizes.lg,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.lg,
      letterSpacing: 0.5,
    },
    overviewCard: {
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.lg,
    },
    overviewContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chartContainer: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: `${theme.colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.lg,
    },
    overviewText: {
      flex: 1,
    },
    overviewTitle: {
      fontSize: theme.typography.fontSizes.sm,
      fontWeight: theme.typography.fontWeights.semibold,
      color: theme.colors.textSecondary,
      marginBottom: 4,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    overviewSubtitle: {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.colors.textMuted,
      marginBottom: 4,
    },
    overviewData: {
      fontSize: theme.typography.fontSizes.xxl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    modulesGrid: {
      gap: theme.spacing.md,
    },
    chartGlow: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 12,
      backgroundColor: theme.colors.primary,
      opacity: 0.2,
    },
  }), [theme]);

  const handleModulePress = (route: string) => {
    router.push(route as any);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header */}
          <WelcomeHeader userName={user?.displayName || 'User'} />

          {/* Daily Overview Card */}
          <View style={styles.section}>
            <Card style={styles.overviewCard}>
              <View style={styles.overviewContent}>
                {/* Holographic Chart Placeholder */}
                <View style={styles.chartContainer}>
                  <Ionicons name="analytics" size={32} color={theme.colors.primary} />
                  <View style={styles.chartGlow} />
                </View>

                <View style={styles.overviewText}>
                  <Text style={styles.overviewTitle}>DAILY OVERVIEW</Text>
                  <Text style={styles.overviewSubtitle}>
                    {'>'} STATUS: OPTIMAL
                  </Text>
                  <Text style={styles.overviewData}>
                    85% EFFICIENCY
                  </Text>
                </View>
              </View>
            </Card>
          </View>

          {/* Modules Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SYSTEM MODULES</Text>
            <View style={styles.modulesGrid}>
              {MODULES.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onPress={() => handleModulePress(module.route)}
                  fullWidth
                />
              ))}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

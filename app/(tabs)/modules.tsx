import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { ModuleCard } from '@/components/dashboard/ModuleCard';
import { MODULES } from '@/constants/modules';
import { Theme } from '@/constants/theme';

export default function ModulesScreen() {
  const router = useRouter();

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>All Modules</Text>
            <Text style={styles.subtitle}>
              Explore and manage your modules
            </Text>
          </View>

          {/* Modules Grid */}
          <View style={styles.modulesGrid}>
            {MODULES.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onPress={() => handleModulePress(module.route)}
              />
            ))}
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

  modulesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

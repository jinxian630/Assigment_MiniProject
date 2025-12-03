import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Card } from '@/components/common/Card';
import { Theme } from '@/constants/theme';

export default function AddScreen() {
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Card style={styles.card}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>✨</Text>
            </View>
            <Text style={styles.title}>Coming Soon</Text>
            <Text style={styles.message}>
              Quick add functionality will be available soon!
            </Text>
          </Card>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.screenPadding,
  },

  card: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xxl,
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${Theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.lg,
  },

  icon: {
    fontSize: 40,
  },

  title: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },

  message: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSizes.md * Theme.typography.lineHeights.normal,
  },
});

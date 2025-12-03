import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { Theme } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { skipLogin, isAuthenticated } = useAuth();

  // Navigate to tabs when user becomes authenticated
  useEffect(() => {
    console.log('🔍 Welcome screen - Auth state changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('✈️ Navigating to dashboard from welcome screen');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  const handleSkipLogin = () => {
    console.log('🔘 Skip to Dashboard button clicked');
    skipLogin();
    console.log('📍 skipLogin function executed');
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Top Section */}
          <View style={styles.topSection}>
            <Text style={styles.title}>Group 1{'\n'}Task Management</Text>
            <Text style={styles.subtitle}>
              Organize your life with style and simplicity
            </Text>
          </View>

          {/* Illustration Placeholder */}
          <View style={styles.illustrationContainer}>
            <View style={styles.illustrationPlaceholder}>
              <Text style={styles.illustrationText}>📱</Text>
              <Text style={styles.illustrationSubtext}>Welcome to your new app</Text>
            </View>
          </View>

          {/* Bottom Section */}
          <View style={styles.bottomSection}>
            {/* Pagination Dots */}
            <View style={styles.pagination}>
              <View style={[styles.dot, styles.dotActive]} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>

            <Button
              variant="primary"
              onPress={handleGetStarted}
              fullWidth
              style={styles.button}
            >
              Get Started
            </Button>

            <Button
              variant="outline"
              onPress={handleSkipLogin}
              fullWidth
              icon="apps-outline"
            >
              Skip to Dashboard
            </Button>
          </View>
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
    paddingHorizontal: Theme.spacing.screenPadding,
    justifyContent: 'space-between',
  },

  topSection: {
    alignItems: 'center',
    marginTop: Theme.spacing.xxxl,
  },

  title: {
    fontSize: Theme.typography.fontSizes.xxxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSizes.xxxl * Theme.typography.lineHeights.tight,
    marginBottom: Theme.spacing.md,
  },

  subtitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.regular,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: Theme.typography.fontSizes.lg * Theme.typography.lineHeights.normal,
  },

  illustrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xxl,
  },

  illustrationPlaceholder: {
    width: width * 0.7,
    height: width * 0.7,
    backgroundColor: `${Theme.colors.primary}10`,
    borderRadius: Theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.medium,
  },

  illustrationText: {
    fontSize: 80,
    marginBottom: Theme.spacing.md,
  },

  illustrationSubtext: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.fontWeights.medium,
  },

  bottomSection: {
    paddingBottom: Theme.spacing.xl,
  },

  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Theme.colors.gray[300],
    marginHorizontal: Theme.spacing.xs,
  },

  dotActive: {
    width: 24,
    backgroundColor: Theme.colors.primary,
  },

  button: {
    marginBottom: Theme.spacing.md,
  },
});

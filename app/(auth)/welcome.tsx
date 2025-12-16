import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { Theme } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Navigate to tabs when user becomes authenticated
  useEffect(() => {
    console.log('🔍 Welcome screen - Auth state changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('✈️ Navigating to dashboard from welcome screen');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  // Entrance animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous rotation animation for icon
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/(auth)/login');
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* Top Section with Animation */}
          <Animated.View 
            style={[
              styles.topSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.courseCode}>UCCB2513 Mini Project</Text>
            <Text style={styles.title}>Group 1</Text>
            <Text style={styles.subtitle}>
              Organize your life with style and simplicity
            </Text>
          </Animated.View>

          {/* Animated Illustration */}
          <Animated.View 
            style={[
              styles.illustrationContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.illustrationPlaceholder}>
              <Animated.Text 
                style={[
                  styles.illustrationText,
                  { transform: [{ rotate: spin }] },
                ]}
              >
                📱
              </Animated.Text>
              <Text style={styles.illustrationSubtext}>Welcome to your new app</Text>
              
              {/* Floating particles */}
              <View style={[styles.particle, styles.particle1]} />
              <View style={[styles.particle, styles.particle2]} />
              <View style={[styles.particle, styles.particle3]} />
            </View>
          </Animated.View>

          {/* Bottom Section with Animation */}
          <Animated.View 
            style={[
              styles.bottomSection,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
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
          </Animated.View>
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

  courseCode: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.primary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xs,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  title: {
    fontSize: Theme.typography.fontSizes.xxxl + 8,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
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
    backgroundColor: `${Theme.colors.primary}15`,
    borderRadius: Theme.borderRadius.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.large,
    position: 'relative',
    overflow: 'hidden',
  },

  illustrationText: {
    fontSize: 100,
    marginBottom: Theme.spacing.md,
  },

  illustrationSubtext: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.fontWeights.medium,
  },

  particle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Theme.colors.primary,
    opacity: 0.3,
  },

  particle1: {
    top: 30,
    left: 40,
    width: 15,
    height: 15,
  },

  particle2: {
    bottom: 50,
    right: 30,
    width: 25,
    height: 25,
  },

  particle3: {
    top: '50%',
    right: 20,
    width: 12,
    height: 12,
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

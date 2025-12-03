import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import { Theme } from '@/constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isAuthenticated, isLoading } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  // Navigate to tabs when user becomes authenticated
  useEffect(() => {
    console.log('🔍 Signup screen - Auth state changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('✈️ Navigating to dashboard from signup screen');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  const validateForm = () => {
    const newErrors: any = {};

    if (!name || name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!email.includes('@')) {
      newErrors.email = 'Invalid email format';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      await signup({ name, email, password, confirmPassword });
      // Navigation handled by auth state change
    } catch (error: any) {
      Alert.alert('Signup Failed', error.message || 'Please try again');
    }
  };

  const handleLoginPress = () => {
    router.back();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            {/* Signup Form */}
            <Card style={styles.formCard}>
              <Input
                label="Name"
                placeholder="Enter your name"
                value={name}
                onChangeText={setName}
                leftIcon="person-outline"
                autoCapitalize="words"
                error={errors.name}
              />

              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onChangeText={setPassword}
                leftIcon="lock-closed-outline"
                secureTextEntry
                error={errors.password}
              />

              <Input
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                leftIcon="lock-closed-outline"
                secureTextEntry
                error={errors.confirmPassword}
              />

              <Button
                variant="primary"
                onPress={handleSignup}
                fullWidth
                loading={isLoading}
                style={styles.signupButton}
              >
                Create Account
              </Button>
            </Card>

            {/* Login Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={handleLoginPress}>
                <Text style={styles.linkText}>Login</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },

  header: {
    marginBottom: Theme.spacing.xl,
    alignItems: 'center',
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
    fontWeight: Theme.typography.fontWeights.regular,
  },

  formCard: {
    marginBottom: Theme.spacing.lg,
  },

  signupButton: {
    marginTop: Theme.spacing.md,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Theme.spacing.lg,
  },

  footerText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
  },

  linkText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeights.semibold,
  },
});

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
import { Divider } from '@/components/common/Divider';
import { ErrorCard } from '@/components/common/ErrorCard';
import { useAuth } from '@/hooks/useAuth';
import { Theme } from '@/constants/theme';

// Firebase error message mapping
const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  'auth/invalid-email': {
    title: 'Invalid Email',
    message: 'Please enter a valid email address.',
  },
  'auth/user-disabled': {
    title: 'Account Disabled',
    message: 'This account has been disabled. Contact support for help.',
  },
  'auth/user-not-found': {
    title: 'User Not Found',
    message: 'No account exists with this email. Try signing up instead.',
  },
  'auth/wrong-password': {
    title: 'Wrong Password',
    message: 'The password you entered is incorrect. Please try again.',
  },
  'auth/too-many-requests': {
    title: 'Too Many Attempts',
    message: 'Too many login attempts. Please try again later.',
  },
  'auth/operation-not-allowed': {
    title: 'Login Disabled',
    message: 'Email/password login is currently disabled.',
  },
  'auth/network-request-failed': {
    title: 'Network Error',
    message: 'No internet connection. Please check your connection and try again.',
  },
};

const DEFAULT_ERROR = {
  title: 'Login Failed',
  message: 'Something went wrong. Please try again later.',
};

export default function LoginScreen() {
  const router = useRouter();
  const { login, skipLogin, isAuthenticated, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError] = useState<{ title: string; message: string } | null>(null);

  // Navigate to tabs when user becomes authenticated
  useEffect(() => {
    console.log('🔍 Login screen - Auth state changed:', isAuthenticated);
    if (isAuthenticated) {
      console.log('✈️ Navigating to dashboard from login screen');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, router]);

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (authError) {
      const timer = setTimeout(() => {
        setAuthError(null);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [authError]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    try {
      await login({ email, password });
      // Navigation handled by useEffect above
    } catch (error: any) {
      // Extract Firebase error code and map to user-friendly message
      const errorCode = error.code || '';
      const errorInfo = ERROR_MESSAGES[errorCode] || DEFAULT_ERROR;
      setAuthError(errorInfo);
    }
  };

  const handleDismissError = () => {
    setAuthError(null);
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    setAuthError(null); // Clear auth error when user starts typing
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    setAuthError(null); // Clear auth error when user starts typing
  };

  const handleSignupPress = () => {
    router.push('/(auth)/register/step1');
  };

  const handleSkipLogin = () => {
    skipLogin();
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>Sign in to continue</Text>
            </View>

            {/* Error Card */}
            {authError && (
              <ErrorCard
                title={authError.title}
                message={authError.message}
                onDismiss={handleDismissError}
                style={styles.errorCard}
              />
            )}

            {/* Login Form */}
            <Card style={styles.formCard}>
              <Input
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChangeText={handleEmailChange}
                leftIcon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
                error={errors.email}
              />

              <Input
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={handlePasswordChange}
                leftIcon="lock-closed-outline"
                secureTextEntry
                error={errors.password}
              />

              <Button
                variant="primary"
                onPress={handleLogin}
                fullWidth
                loading={isLoading}
                style={styles.loginButton}
              >
                Login
              </Button>

              <Divider spacing="medium" />

              <Button
                variant="secondary"
                onPress={() => Alert.alert('Coming Soon', 'Google sign-in will be available soon')}
                fullWidth
                icon="logo-google"
                disabled
              >
                Continue With Google
              </Button>
            </Card>

            {/* Skip Login Button */}
            <Button
              variant="outline"
              onPress={handleSkipLogin}
              fullWidth
              icon="apps-outline"
              style={styles.skipButton}
            >
              Skip to Dashboard
            </Button>

            {/* Sign Up Link */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleSignupPress}>
                <Text style={styles.linkText}>Create Account</Text>
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

  errorCard: {
    marginBottom: Theme.spacing.md,
  },

  formCard: {
    marginBottom: Theme.spacing.lg,
  },

  loginButton: {
    marginTop: Theme.spacing.md,
  },

  skipButton: {
    marginBottom: Theme.spacing.md,
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

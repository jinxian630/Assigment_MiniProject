import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { useRegistration } from '@/contexts/RegistrationContext';
import { Theme } from '@/constants/theme';

export default function RegisterStep1() {
  const { data, updateStep1, goToNextStep } = useRegistration();

  const [displayName, setDisplayName] = useState(data.displayName || '');
  const [email, setEmail] = useState(data.email || '');
  const [password, setPassword] = useState(data.password || '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    displayName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: any = {};

    if (!displayName || displayName.trim().length < 2) {
      newErrors.displayName = 'Name must be at least 2 characters';
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

  const handleNext = () => {
    if (!validateForm()) return;

    // Save data to context
    updateStep1({
      displayName,
      email,
      password,
    });

    // Navigate to next step
    goToNextStep();
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
              <Text style={styles.subtitle}>
                Let's start with your basic information
              </Text>
            </View>

            {/* Form */}
            <Card style={styles.formCard}>
              <Input
                label="Full Name"
                placeholder="Enter your full name"
                value={displayName}
                onChangeText={setDisplayName}
                leftIcon="person-outline"
                autoCapitalize="words"
                error={errors.displayName}
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
                onPress={handleNext}
                fullWidth
                style={styles.nextButton}
              >
                Next: Profile Details
              </Button>
            </Card>

            {/* Info Text */}
            <Text style={styles.infoText}>
              Step 1 of 3: Account Information
            </Text>
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
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    fontWeight: Theme.typography.fontWeights.regular,
    textAlign: 'center',
  },
  formCard: {
    marginBottom: Theme.spacing.lg,
  },
  nextButton: {
    marginTop: Theme.spacing.md,
  },
  infoText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: Theme.typography.fontWeights.medium,
  },
});

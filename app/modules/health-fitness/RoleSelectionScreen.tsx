import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Theme } from '@/constants/theme';
import { useHealthFitnessRole } from './hooks/useHealthFitnessRole';
import { HealthFitnessRole } from '@/types/modulePreferences';

const MODULE_COLOR = '#4ECDC4';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const { setRole } = useHealthFitnessRole();

  const handleRoleSelect = async (selectedRole: HealthFitnessRole) => {
    try {
      await setRole(selectedRole);

      // Navigate to the appropriate dashboard
      if (selectedRole === 'student') {
        router.replace('/modules/health-fitness/StudentDashboard');
      } else {
        router.replace('/modules/health-fitness/CoachDashboardScreen');
      }
    } catch (error) {
      console.error('Error selecting role:', error);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
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
            <Text style={styles.headerTitle}>Choose Your Role</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Module Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconContainer, { backgroundColor: `${MODULE_COLOR}20` }]}>
              <Ionicons name="fitness-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.title}>Health & Fitness</Text>
            <Text style={styles.subtitle}>How would you like to use this module?</Text>
          </View>

          {/* Role Selection Cards */}
          <View style={styles.roleCardsContainer}>
            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelect('student')}
              activeOpacity={0.7}
            >
              <Card style={styles.roleCardInner}>
                <View style={[styles.roleCardIcon, { backgroundColor: `${MODULE_COLOR}20` }]}>
                  <Ionicons name="barbell-outline" size={48} color={MODULE_COLOR} />
                </View>
                <Text style={styles.roleCardTitle}>Student</Text>
                <Text style={styles.roleCardSubtitle}>
                  Track workouts and follow courses
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.roleCard}
              onPress={() => handleRoleSelect('coach')}
              activeOpacity={0.7}
            >
              <Card style={styles.roleCardInner}>
                <View style={[styles.roleCardIcon, { backgroundColor: `${MODULE_COLOR}20` }]}>
                  <Ionicons name="school" size={48} color={MODULE_COLOR} />
                </View>
                <Text style={styles.roleCardTitle}>Coach</Text>
                <Text style={styles.roleCardSubtitle}>
                  Create exercises and manage courses
                </Text>
              </Card>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <Text style={styles.infoText}>
            You can change this anytime from the dashboard
          </Text>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
    flexGrow: 1,
    justifyContent: 'center',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
  },

  headerTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },

  iconSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xxl,
  },

  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
    ...Theme.shadows.medium,
  },

  title: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  subtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Theme.spacing.lg,
  },

  roleCardsContainer: {
    gap: 16,
    marginBottom: Theme.spacing.xl,
  },

  roleCard: {
    width: '100%',
  },

  roleCardInner: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },

  roleCardIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },

  roleCardTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  roleCardSubtitle: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  infoText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

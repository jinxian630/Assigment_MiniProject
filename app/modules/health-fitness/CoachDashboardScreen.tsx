import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { Theme } from '@/constants/theme';
import { AuthContext } from '@/contexts/AuthContext';
import { courseService } from '@/services/course.service';
import { workoutService } from '@/services/workout.service';
import { Course } from '@/types/course';
import { Exercise } from '@/types/workout';
import { RoleSwitcher } from './components/RoleSwitcher';
import { useThemeMode } from './hooks/useThemeMode';
import ThemeToggle from './components/ThemeToggle';

const MODULE_COLOR = '#4ECDC4';

export default function CoachDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const authContext = useContext(AuthContext);
  const userId = authContext?.user?.id || '';
  const userName = authContext?.user?.displayName || '';
  
  // Theme management
  const { isDarkMode, toggleTheme } = useThemeMode();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleIssues, setRoleIssues] = useState<string[] | null>(null);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [bannerAnimation] = useState(new Animated.Value(0));

  const loadCoachData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 CoachDashboard: Loading data for userId:', userId);
      console.log('🔍 CoachDashboard: User name:', userName);

      if (!userId) {
        console.warn('⚠️ CoachDashboard: No userId available');
        return;
      }

      const [fetchedCourses, fetchedExercises] = await Promise.all([
        courseService.getCoachCourses(userId),
        workoutService.getCoachExercises(userId),
      ]);

      console.log('✅ CoachDashboard: Fetched courses:', fetchedCourses.length);
      console.log('✅ CoachDashboard: Fetched exercises:', fetchedExercises.length);
      console.log('📋 CoachDashboard: Exercise details:', fetchedExercises.map(e => ({
        id: e.id,
        name: e.name,
        verified: e.verified,
      })));

      setCourses(fetchedCourses);
      setExercises(fetchedExercises);
      setRoleIssues(null); // Clear any previous issues
    } catch (error: any) {
      console.error('❌ CoachDashboard: Error loading coach data:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);

      // Check for permission-denied error (indicates role issue)
      if (error.code === 'permission-denied') {
        setRoleIssues(['Missing role field in account']);
        Alert.alert(
          'Account Configuration Issue',
          'Your account is missing required information. Please log out and log back in to fix this automatically.',
          [{ text: 'OK', style: 'default' }]
        );
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userName]);

  useFocusEffect(
    React.useCallback(() => {
      if (!userId) {
        console.warn('⚠️ CoachDashboard: userId is empty! Cannot fetch exercises.');
        console.warn('⚠️ Please ensure you are logged in with a valid account.');
        setLoading(false);
        return;
      }
      console.log('🔄 CoachDashboard: Screen focused, refreshing data...');
      loadCoachData();
    }, [userId, loadCoachData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCoachData();
    setRefreshing(false);
  }, [loadCoachData]);

  // Handle success notification when returning from create exercise
  useEffect(() => {
    if (params.exerciseCreated === 'true') {
      const exerciseName = params.exerciseName || 'Exercise';
      setSuccessMessage(`${exerciseName} created successfully!`);
      setShowSuccessBanner(true);

      // Animate banner in
      Animated.spring(bannerAnimation, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        Animated.timing(bannerAnimation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSuccessBanner(false);
          // Clear the params
          router.setParams({ exerciseCreated: undefined, exerciseName: undefined });
        });
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [params.exerciseCreated, params.exerciseName]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={MODULE_COLOR}
              colors={[MODULE_COLOR]}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="secondary"
              size="medium"
            />
            <Text style={styles.headerTitle}>Coach Dashboard</Text>
            <View style={styles.headerRight}>
              <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} size="small" />
              <RoleSwitcher currentRole="coach" />
            </View>
          </View>

          {/* Success Banner */}
          {showSuccessBanner && (
            <Animated.View
              style={[
                styles.successBanner,
                {
                  opacity: bannerAnimation,
                  transform: [
                    {
                      translateY: bannerAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.successContent}>
                <View style={styles.successIconContainer}>
                  <Ionicons name="checkmark-circle" size={28} color="#10B981" />
                </View>
                <View style={styles.successTextContainer}>
                  <Text style={styles.successTitle}>Success!</Text>
                  <Text style={styles.successMessage}>{successMessage}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Animated.timing(bannerAnimation, {
                      toValue: 0,
                      duration: 200,
                      useNativeDriver: true,
                    }).start(() => setShowSuccessBanner(false));
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={24} color="#059669" />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          {/* Error Banner */}
          {roleIssues && roleIssues.length > 0 && (
            <Card style={styles.errorCard}>
              <View style={styles.errorContent}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                <View style={styles.errorTextContainer}>
                  <Text style={styles.errorTitle}>Account Issue Detected</Text>
                  <Text style={styles.errorMessage}>
                    Your account is missing the role field. Please log out and log back in to fix this.
                  </Text>
                </View>
              </View>
            </Card>
          )}

          {/* Stats Overview */}
          <Card style={styles.statsCard}>
            <Text style={styles.cardTitle}>Your Content</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="barbell-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.statValue}>{exercises.length}</Text>
                <Text style={styles.statLabel}>Exercises</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="book-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.statValue}>{courses.length}</Text>
                <Text style={styles.statLabel}>Courses</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="checkmark-circle-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.statValue}>
                  {exercises.filter(e => e.verified).length}
                </Text>
                <Text style={styles.statLabel}>Verified</Text>
              </View>
            </View>
          </Card>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtonsGrid}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/modules/health-fitness/CreateExerciseScreen')}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: `${MODULE_COLOR}20` }]}>
                  <Ionicons name="add-circle" size={28} color={MODULE_COLOR} />
                </View>
                <Text style={styles.actionButtonTitle}>Create Exercise</Text>
                <Text style={styles.actionButtonSubtitle}>Add new exercise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/modules/health-fitness/CreateCourseScreen')}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: `${MODULE_COLOR}20` }]}>
                  <Ionicons name="book" size={28} color={MODULE_COLOR} />
                </View>
                <Text style={styles.actionButtonTitle}>Create Course</Text>
                <Text style={styles.actionButtonSubtitle}>Build a program</Text>
              </TouchableOpacity>
            </View>
          </View>


        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statsCard: {
    marginBottom: Theme.spacing.xl,
  },
  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.sm,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginTop: 8,
  },
  statLabel: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonsGrid: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionButtonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionButtonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },
  actionButtonSubtitle: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  errorCard: {
    marginBottom: Theme.spacing.md,
    backgroundColor: '#F59E0B20',
    borderColor: '#F59E0B',
    borderWidth: 1,
  },
  errorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  errorTextContainer: {
    flex: 1,
  },
  errorTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: '#F59E0B',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    lineHeight: 18,
  },

  successBanner: {
    backgroundColor: '#10B98120',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#10B981',
    marginBottom: Theme.spacing.md,
    overflow: 'hidden',
  },
  successContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  successIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98130',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTextContainer: {
    flex: 1,
  },
  successTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: '#059669',
    marginBottom: 2,
  },
  successMessage: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textPrimary,
    lineHeight: 18,
  },
});

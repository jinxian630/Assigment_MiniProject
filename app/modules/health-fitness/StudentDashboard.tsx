import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Card } from '@/components/common/Card';
import { ErrorCard } from '@/components/common/ErrorCard';
import { Theme } from '@/constants/theme';
import { AuthContext } from '@/contexts/AuthContext';
import { useSessionHistory } from './hooks/useSessionHistory';
import { WorkoutSession } from '@/types/workout';
import { useAuth } from '@/hooks/useAuth';
import { RoleSwitcher } from './components/RoleSwitcher';
import ReadinessIndicator from './components/ReadinessIndicator';
import AIRecommendationCard from './components/AIRecommendationCard';
import AIChatbot from './components/chatbot/AIChatbot';
import { ChatbotContext } from './types/chatbot';
import { useThemeMode } from './hooks/useThemeMode';
import ThemeToggle from './components/ThemeToggle';

import { readinessService } from '@/services/readiness.service';
import { DailyReadiness } from '@/types/readiness';
import { useGamification } from '@/hooks/useGamification';
import { ProgressChart } from '@/components/ProgressChart';
import { BADGES_MASTER } from '@/types/Badge';


const MODULE_COLOR = '#4ECDC4';

export default function StudentDashboard() {
  const router = useRouter();
  const authContext = useContext(AuthContext);
  const { isCoach } = useAuth();
  const userId = authContext?.user?.id || '';

  // Theme management
  const { isDarkMode, toggleTheme } = useThemeMode();

  // Fetch workout session history
  const { sessions, loading, error, refetch } = useSessionHistory(10);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissedError, setDismissedError] = useState(false);

  // Readiness state
  const [todayReadiness, setTodayReadiness] = useState<DailyReadiness | null>(null);

  // Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);

  // Gamification
  const { stats, refreshMentorMessage } = useGamification();


  // Calculate weekly stats
  const thisWeekSessions = sessions.filter(session => {
    const sessionDate = new Date(session.startTime);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return sessionDate >= weekAgo;
  });

  const weeklyStats = {
    totalSessions: thisWeekSessions.length,
    totalDuration: thisWeekSessions.reduce((sum, s) => sum + (s.totalDuration || 0), 0),
    totalSets: thisWeekSessions.reduce((sum, s) => sum + s.sets.length, 0),
  };

  // Calculate progress percentage (based on weekly goal of 3 sessions)
  const weeklyGoal = 3;
  const progressPercentage = Math.min((thisWeekSessions.length / weeklyGoal) * 100, 100);

  useFocusEffect(
    React.useCallback(() => {
      console.log('🔄 StudentDashboard: Screen focused, refreshing sessions...');
      const loadData = async () => {
        // Refetch sessions silently to avoid screen flicker
        refetch(true);

        // Load today's readiness
        if (userId) {
          try {
            const readiness = await readinessService.checkTodayReadiness(userId);
            setTodayReadiness(readiness);
          } catch (error) {
            console.error('Error loading readiness:', error);
          }
        }
      };
      loadData();
    }, [refetch, userId])
  );
  
  // Refresh mentor message occasionally (e.g. on focus if generic)
  useFocusEffect(
    useCallback(() => {
        if (!stats.mentorMessage) {
            refreshMentorMessage();
        }
    }, [stats.mentorMessage])
  );



  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setDismissedError(false); // Reset error state on refresh
    await refetch(true);

    // Also reload readiness on refresh
    if (userId) {
      try {
        const readiness = await readinessService.checkTodayReadiness(userId);
        setTodayReadiness(readiness);
      } catch (error) {
        console.error('Error loading readiness:', error);
      }
    }

    setRefreshing(false);
  }, [refetch, userId]);

  // Error handlers
  const handleDismissError = () => {
    setDismissedError(true);
  };

  const handleRetryError = async () => {
    console.log('🔄 Retrying session fetch after error');
    setDismissedError(false);
    await refetch();
  };

  // Render recent sessions
  const renderRecentSessions = () => {
    // Show error state if present and not dismissed
    if (error && !dismissedError) {
      const isIndexError = error.message?.includes('index');
      const errorTitle = isIndexError
        ? 'Database Configuration Pending'
        : 'Unable to Load Sessions';

      const errorMessage = isIndexError
        ? 'We\'re setting up your workout history. This usually takes a few minutes. Please try again shortly.'
        : `Error: ${error.message || 'Failed to load your sessions. Please check your connection and try again.'}`;

      return (
        <View>
          <ErrorCard
            title={errorTitle}
            message={errorMessage}
            variant={isIndexError ? 'warning' : 'error'}
            icon={isIndexError ? 'information-circle-outline' : 'alert-circle-outline'}
            onDismiss={handleDismissError}
            style={{ marginBottom: 16 }}
          />
          <TouchableOpacity
            onPress={handleRetryError}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (loading) {
      return (
        <Card>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={MODULE_COLOR} />
            <Text style={styles.loadingText}>Loading sessions...</Text>
          </View>
        </Card>
      );
    }

    if (sessions.length === 0) {
      return (
        <Card>
          <View style={styles.emptyList}>
            <Text style={styles.emptyIcon}>💪</Text>
            <Text style={styles.emptyText}>No exercises logged yet</Text>
            <Text style={styles.emptySubtext}>Start your first workout!</Text>
          </View>
        </Card>
      );
    }

    return sessions.slice(0, 5).map((session, index) => {
      const durationMin = Math.floor((session.totalDuration || 0) / 60);
      const date = new Date(session.startTime);
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
      
      // Determine icon based on exercise name (simple heuristic)
      let iconName: any = 'barbell';
      const lowerName = session.exerciseName.toLowerCase();
      if (lowerName.includes('run') || lowerName.includes('cardio')) iconName = 'walk';
      else if (lowerName.includes('yoga') || lowerName.includes('stretch')) iconName = 'body';
      else if (lowerName.includes('swim')) iconName = 'water';

      return (
        <TouchableOpacity
          key={session.id}
          onPress={() => router.push({
            pathname: '/modules/health-fitness/SessionSummaryScreen',
            params: { sessionId: session.id }
          })}
          activeOpacity={0.7}
        >
          <View style={styles.workoutCard}>
            <View style={styles.workoutCardLeft}>
              <View style={[styles.workoutIconBadge, { backgroundColor: index === 0 ? MODULE_COLOR : `${MODULE_COLOR}15` }]}>
                <Ionicons 
                  name={iconName} 
                  size={24} 
                  color={index === 0 ? '#FFF' : MODULE_COLOR} 
                />
              </View>
              <View style={styles.workoutInfo}>
                <Text style={styles.workoutTitle} numberOfLines={1}>{session.exerciseName}</Text>
                <Text style={styles.workoutDate}>{formattedDate} • {formattedTime}</Text>
              </View>
            </View>
            
            <View style={styles.workoutCardStats}>
              <View style={styles.miniStat}>
                <Ionicons name="time-outline" size={14} color={Theme.colors.textSecondary} />
                <Text style={styles.miniStatText}>{durationMin}m</Text>
              </View>
              <View style={styles.miniStat}>
                <Ionicons name="repeat-outline" size={14} color={Theme.colors.textSecondary} />
                <Text style={styles.miniStatText}>{session.sets.length} sets</Text>
              </View>
            </View>
            
            <Ionicons name="chevron-forward" size={20} color={Theme.colors.border} style={{ marginLeft: 8 }} />
          </View>
        </TouchableOpacity>
      );
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
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
            <Text style={styles.headerTitle}>Health & Fitness</Text>
            <View style={styles.headerRight}>
              <ThemeToggle isDarkMode={isDarkMode} onToggle={toggleTheme} size="small" />
              <RoleSwitcher currentRole="student" />
            </View>
          </View>

          {/* Module Icon */}
          <View style={styles.iconSection}>
            <View style={[styles.iconContainer, { backgroundColor: `${MODULE_COLOR}20` }]}>
              <Ionicons name="fitness-outline" size={64} color={MODULE_COLOR} />
            </View>
            <Text style={styles.moduleTitle}>Health & Fitness</Text>
            <Text style={styles.moduleSubtitle}>Track your wellness journey</Text>
          </View>

          {/* Gamification Stats Row */}
          <View style={styles.gamificationRow}>
             <Card style={[styles.gamificationCard, { borderLeftColor: '#FF6B6B', borderLeftWidth: 4 }]}>
                <Text style={styles.gamificationLabel}>Streak</Text>
                <Text style={styles.gamificationValue}>{stats.streak} 🔥</Text>
             </Card>
             <Card style={[styles.gamificationCard, { borderLeftColor: '#4ECDC4', borderLeftWidth: 4 }]}>
                <Text style={styles.gamificationLabel}>Level</Text>
                <Text style={styles.gamificationValue}>{stats.level} ⭐</Text>
             </Card>
             <Card style={[styles.gamificationCard, { borderLeftColor: '#FFE66D', borderLeftWidth: 4 }]}>
                <Text style={styles.gamificationLabel}>Points</Text>
                <Text style={styles.gamificationValue}>{stats.points}</Text>
             </Card>
          </View>

          {/* AI Mentor Message */}
          <Card style={styles.mentorCard}>
            <View style={styles.mentorHeader}>
                <Ionicons name="bulb-outline" size={20} color="#FFD93D" />
                <Text style={styles.mentorTitle}>Weekly Motivation</Text>
            </View>
            <Text style={styles.mentorText} testID="mentor-message">
                {stats.mentorMessage || "Loading your personalized tip..."}
            </Text>
          </Card>

          {/* Progress Chart */}
          <Card style={styles.chartCard}>
             <Text style={styles.cardTitle}>Activity Trends</Text>
             <ProgressChart 
                recentScores={[10, 20, 15, 30, 25, 40, stats.points > 50 ? stats.points : 50]} // Mock data for demo + current
                labels={["M", "T", "W", "T", "F", "S", "S"]}
             />
          </Card>


          {/* Weekly Stats Card */}
          <Card style={styles.statsCard}>
            <Text style={styles.cardTitle}>This Week</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="barbell-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.statValue}>{weeklyStats.totalSessions}</Text>
                <Text style={styles.statLabel}>Workouts</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="fitness-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.statValue}>{weeklyStats.totalSets}</Text>
                <Text style={styles.statLabel}>Sets</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.statValue}>
                  {Math.floor(weeklyStats.totalDuration / 60)}m
                </Text>
                <Text style={styles.statLabel}>Total Time</Text>
              </View>
            </View>
          </Card>

          {/* Readiness Indicator */}
          {todayReadiness && (
            <ReadinessIndicator
              readinessScore={todayReadiness.calculatedReadinessScore}
              fatigueState={todayReadiness.fatigueState}
              isDarkMode={isDarkMode}
            />
          )}

          {/* AI Recommendation */}
          {todayReadiness && (
            <AIRecommendationCard
              recommendation={todayReadiness.aiRecommendationSummary}
              fatigueState={todayReadiness.fatigueState}
              readinessScore={todayReadiness.calculatedReadinessScore}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Weekly Progress Ring */}
          <Card style={styles.progressCard}>
            <Text style={styles.cardTitle}>Weekly Progress</Text>
            <View style={styles.progressRing}>
              <Text style={styles.progressText}>{progressPercentage.toFixed(0)}%</Text>
            </View>
            <Text style={styles.progressSubtext}>
              {thisWeekSessions.length} of {weeklyGoal} workouts this week
            </Text>
          </Card>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionButtonsGrid}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/modules/health-fitness/ExerciseSelectionScreen')}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: `${MODULE_COLOR}20` }]}>
                  <Ionicons name="barbell" size={28} color={MODULE_COLOR} />
                </View>
                <Text style={styles.actionButtonTitle}>Start Workout</Text>
                <Text style={styles.actionButtonSubtitle}>Begin a new session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/modules/health-fitness/ExerciseSelectionScreen')}
              >
                <View style={[styles.actionButtonIcon, { backgroundColor: `${MODULE_COLOR}20` }]}>
                  <Ionicons name="list" size={28} color={MODULE_COLOR} />
                </View>
                <Text style={styles.actionButtonTitle}>Browse Exercises</Text>
                <Text style={styles.actionButtonSubtitle}>View exercise library</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Workouts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Workouts</Text>
              {sessions.length > 0 && (
                <TouchableOpacity onPress={() => {
                  // Navigate to full workout history if needed
                  console.log('View all sessions');
                }}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {renderRecentSessions()}
          </View>
        </ScrollView>

        {/* AI Chatbot Modal */}
        {userId && (
          <AIChatbot
            visible={showChatbot}
            onClose={() => setShowChatbot(false)}
            context={{
              userId: userId,
              exerciseName: undefined,
              exerciseId: undefined,
              sessionId: undefined,
              currentReadiness: todayReadiness || undefined,
              bodyPartSelections: [],
              recentFatigueScores: [],
            } as ChatbotContext}
            onWorkoutAdjustment={(adjustmentData) => {
              console.log('Workout adjustment from chatbot:', adjustmentData);
            }}
            isDarkMode={isDarkMode}
          />
        )}

        {/* Floating Action Button for Chatbot */}
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: MODULE_COLOR,
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }}
          onPress={() => setShowChatbot(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubbles" size={28} color="#FFFFFF" />
        </TouchableOpacity>

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
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
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

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconSection: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
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

  moduleTitle: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.xs,
  },

  moduleSubtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
  },

  progressCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    marginBottom: Theme.spacing.xl,
  },

  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.lg,
  },

  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: Theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },

  progressText: {
    fontSize: Theme.typography.fontSizes.xxl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textSecondary,
  },

  progressSubtext: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },

  section: {
    marginBottom: Theme.spacing.xl,
  },

  sectionTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },

  emptyList: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: Theme.spacing.md,
  },

  emptyText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },

  emptySubtext: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 4,
  },

  // New Workout Card Styles
  workoutCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadows.small,
  },
  workoutCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  workoutIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  workoutInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  workoutDate: {
    fontSize: 12,
    color: Theme.colors.textSecondary,
    fontWeight: '500',
  },
  workoutCardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  miniStatText: {
    fontSize: 12,
    fontWeight: '600',
    color: Theme.colors.textSecondary,
  },
  
  // Legacy styles kept for reference but can be cleaned up
  sessionCard: {
    marginBottom: Theme.spacing.md,
  },

  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },

  sessionTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textPrimary,
  },

  sessionBadge: {
    backgroundColor: `${MODULE_COLOR}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },

  sessionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: MODULE_COLOR,
  },

  sessionStats: {
    flexDirection: 'row',
    gap: 16,
  },

  sessionStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  sessionStatText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },

  // Stats card styles
  statsCard: {
    marginBottom: Theme.spacing.xl,
  },

  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: Theme.spacing.md,
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

  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },

  seeAllText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: MODULE_COLOR,
    fontWeight: Theme.typography.fontWeights.semibold,
  },

  // Loading container
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.lg,
    gap: 12,
  },

  loadingText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },

  // Action buttons styles
  actionButtonsGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  actionButton: {
    flex: 1,
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Theme.shadows.small,
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
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 4,
  },

  actionButtonSubtitle: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  
  // Gamification Styles
  gamificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xl,
    gap: 8,
  },
  gamificationCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  gamificationLabel: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  gamificationValue: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  mentorCard: {
    marginBottom: Theme.spacing.xl,
    backgroundColor: '#333', // Dark card for contrast if desired, or stick to theme
    borderWidth: 1,
    borderColor: '#eee',
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mentorTitle: {
    fontWeight: 'bold',
    color: Theme.colors.textPrimary,
  },
  mentorText: {
    fontSize: Theme.typography.fontSizes.md,
    fontStyle: 'italic',
    color: Theme.colors.textSecondary,
    lineHeight: 22,
  },
  chartCard: {
    marginBottom: Theme.spacing.xl,
    padding: 0, // Allow chart to take width
    overflow: 'hidden',
  },

  // Retry button styles
  retryButton: {
    backgroundColor: MODULE_COLOR,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});


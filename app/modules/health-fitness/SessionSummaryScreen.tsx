import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Theme } from '@/constants/theme';
import { workoutService } from '@/services/workout.service';
import { WorkoutSession } from '@/types/workout';
import { generatePostSessionSummary } from './utils/openRouterHelper';
import { AISummaryRequest } from './types/safetyCue';
import AISummaryCard from './components/AISummaryCard';

const MODULE_COLOR = '#4ECDC4';

export default function SessionSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch session data
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const fetchedSession = await workoutService.getSessionById(sessionId);
        if (fetchedSession) {
          setSession(fetchedSession);
          // Generate AI summary
          await generateAISummary(fetchedSession);
        } else {
          Alert.alert('Error', 'Session not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        Alert.alert('Error', 'Failed to load session data');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const generateAISummary = async (sessionData: WorkoutSession) => {
    setAiLoading(true);
    setAiError(null);

    try {
      // Prepare AI summary request
      const summaryRequest: AISummaryRequest = {
        exerciseName: sessionData.exerciseName,
        duration: sessionData.totalDuration || 0,
        sets: sessionData.sets.map((set) => ({
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          fatigueLevel: set.fatigueLevel,
        })),
        safetyLog: sessionData.safetyLog.map((log) => ({
          cueText: log.cueText,
          priority: log.priority,
        })),
      };

      const summary = await generatePostSessionSummary(summaryRequest);
      setAiSummary(summary);

      // Update session in Firestore with AI summary
      await workoutService.completeSession(sessionId, summary);
    } catch (error: any) {
      console.error('Error generating AI summary:', error);
      setAiError(error.message || 'Failed to generate AI summary');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDone = () => {
    // Navigate back to main health-fitness screen
    router.push('/modules/health-fitness');
  };

  if (loading || !session) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MODULE_COLOR} />
            <Text style={styles.loadingText}>Loading session summary...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  // Calculate stats
  const totalReps = session.sets.reduce((sum, set) => sum + (set.reps || 0), 0);
  const totalWeight = session.sets.reduce((sum, set) => sum + (set.weight || 0), 0);
  const averageFatigue =
    session.sets.filter((s) => s.fatigueLevel).length > 0
      ? session.sets.reduce((sum, set) => sum + (set.fatigueLevel || 0), 0) /
        session.sets.filter((s) => s.fatigueLevel).length
      : 0;

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
            <View style={styles.celebrationIcon}>
              <Ionicons name="trophy" size={32} color="#F59E0B" />
            </View>
            <Text style={styles.headerTitle}>Workout Complete!</Text>
            <Text style={styles.headerSubtitle}>Great job on your session</Text>
          </View>

          {/* Exercise Name */}
          <View style={styles.exerciseCard}>
            <Text style={styles.exerciseName}>{session.exerciseName}</Text>
            <Text style={styles.exerciseDate}>{formatDate(session.startTime)}</Text>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="time-outline" size={24} color={MODULE_COLOR} />
              <Text style={styles.statValue}>
                {formatDuration(session.totalDuration || 0)}
              </Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="fitness-outline" size={24} color={MODULE_COLOR} />
              <Text style={styles.statValue}>{session.sets.length}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="repeat-outline" size={24} color={MODULE_COLOR} />
              <Text style={styles.statValue}>{totalReps}</Text>
              <Text style={styles.statLabel}>Total Reps</Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons name="barbell-outline" size={24} color={MODULE_COLOR} />
              <Text style={styles.statValue}>{totalWeight.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Total Weight (lbs)</Text>
            </View>
          </View>

          {/* Sets Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sets Breakdown</Text>
            <View style={styles.setsContainer}>
              {session.sets.map((set, index) => (
                <View key={index} style={styles.setRow}>
                  <View style={styles.setNumber}>
                    <Text style={styles.setNumberText}>{set.setNumber}</Text>
                  </View>
                  <View style={styles.setDetails}>
                    {set.reps && (
                      <Text style={styles.setDetailText}>{set.reps} reps</Text>
                    )}
                    {set.weight && (
                      <Text style={styles.setDetailText}>@ {set.weight} lbs</Text>
                    )}
                    {set.fatigueLevel && (
                      <View style={styles.fatigueIndicator}>
                        <Ionicons
                          name="pulse-outline"
                          size={14}
                          color={Theme.colors.textSecondary}
                        />
                        <Text style={styles.setDetailText}>
                          Fatigue: {set.fatigueLevel}/5
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Safety Log */}
          {session.safetyLog.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Safety Cues Triggered</Text>
              <View style={styles.safetyLogContainer}>
                {session.safetyLog.map((log, index) => (
                  <View key={index} style={styles.safetyLogItem}>
                    <View
                      style={[
                        styles.priorityDot,
                        {
                          backgroundColor:
                            log.priority === 'critical'
                              ? '#EF4444'
                              : log.priority === 'high'
                              ? '#F59E0B'
                              : log.priority === 'normal'
                              ? '#3B82F6'
                              : '#10B981',
                        },
                      ]}
                    />
                    <Text style={styles.safetyLogText}>{log.cueText}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* AI Summary */}
          <View style={styles.section}>
            <AISummaryCard
              summary={aiSummary}
              loading={aiLoading}
              error={aiError}
              isDarkMode={false}
            />
          </View>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
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
    paddingTop: Theme.spacing.xl,
    paddingBottom: Theme.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
    marginTop: Theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  celebrationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(245,158,11,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textSecondary,
  },
  exerciseCard: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.small,
  },
  exerciseName: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: 4,
  },
  exerciseDate: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: Theme.spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    ...Theme.shadows.small,
  },
  statValue: {
    fontSize: 24,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
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
  setsContainer: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...Theme.shadows.small,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  setNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${MODULE_COLOR}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  setNumberText: {
    fontSize: 14,
    fontWeight: Theme.typography.fontWeights.bold,
    color: MODULE_COLOR,
  },
  setDetails: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  setDetailText: {
    fontSize: 14,
    color: Theme.colors.textSecondary,
  },
  fatigueIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  safetyLogContainer: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    ...Theme.shadows.small,
  },
  safetyLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  safetyLogText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Theme.colors.textSecondary,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: MODULE_COLOR,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: Theme.spacing.md,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: Theme.typography.fontWeights.bold,
    color: '#FFFFFF',
  },
});

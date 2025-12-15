import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { WebView } from 'react-native-webview'; // Import WebView
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { IconButton } from '@/components/common/IconButton';
import { Theme } from '@/constants/theme';
import { workoutService } from '@/services/workout.service';
import { Exercise, WorkoutSet, CuePriority } from '@/types/workout';
import { SessionState } from './types/sessionState';
import { useWorkoutSession } from './hooks/useWorkoutSession';
import { useAudioCues } from './hooks/useAudioCues';
import SetTimer from './components/SetTimer';
import SafetyCueIndicator from './components/SafetyCueIndicator';
import WorkoutControls from './components/WorkoutControls';
import SetInputForm from './components/SetInputForm';
import SetHistoryCard from './components/SetHistoryCard';
import ReadinessCheckModal from './components/ReadinessCheckModal';
import { useAuth } from '@/hooks/useAuth';
import { readinessService } from '@/services/readiness.service';
import { aiPersonalizationService } from '@/services/aiPersonalization.service';
import {
  DailyReadiness,
  ReadinessCheckInput,
} from '@/types/readiness';
import {
  AIWorkoutRecommendation,
  PersonalizationContext,
} from '@/types/aiPersonalization';
import AIChatbot from './components/chatbot/AIChatbot';
import { ChatbotContext } from './types/chatbot';


const MODULE_COLOR = '#4ECDC4';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const exerciseId = params.exerciseId as string;
  const { user } = useAuth();

  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSetInputForm, setShowSetInputForm] = useState(false);
  const [completedSets, setCompletedSets] = useState<WorkoutSet[]>([]);

  // Readiness check state
  const [showReadinessCheck, setShowReadinessCheck] = useState(false);
  const [readinessChecked, setReadinessChecked] = useState(false);
  const [todayReadiness, setTodayReadiness] = useState<DailyReadiness | null>(null);
  const [aiAdjustment, setAiAdjustment] = useState<AIWorkoutRecommendation | null>(null);
  const [showAdjustmentNotification, setShowAdjustmentNotification] = useState(false);

  // Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);


  // Safety cues state
  const [activeCue, setActiveCue] = useState<{
    text: string;
    priority: CuePriority;
    timestamp: number;
  } | null>(null);
  const [safetyCuesExpanded, setSafetyCuesExpanded] = useState(false);


  // Helper to extract YouTube ID and create embed URL
  const getEmbedUrl = (url: string) => {
    if (!url) return null;

    // Simple regex to extract ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);

    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?playsinline=1`;
    }
    return null;
  };

  const embedUrl = exercise?.youtubeLink ? getEmbedUrl(exercise.youtubeLink) : null;
  const screenWidth = Dimensions.get('window').width;
  const videoWidth = screenWidth - (Theme.spacing.screenPadding * 2);

  // Initialize audio cues hook for manual replay
  const { speakCue } = useAudioCues();

  // Platform-specific video player component
  // Web: Uses HTML iframe with YouTube embed permissions
  // iOS/Android: Uses react-native-webview for native video playback
  const renderVideoPlayer = () => {
    if (!embedUrl) return null;

    if (Platform.OS === 'web') {
      // Web platform: Use iframe element
      return (
        <View style={styles.videoContainer}>
          <iframe
            src={embedUrl}
            width={videoWidth}
            height={(videoWidth * 9) / 16}
            style={{
              border: 'none',
              borderRadius: 12,
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title="Exercise Video"
          />
        </View>
      );
    }

    // Native platforms (iOS/Android): Use WebView
    return (
      <View style={styles.videoContainer}>
        <WebView
          style={{
            width: videoWidth,
            height: (videoWidth * 9) / 16,
            borderRadius: 12
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          source={{ uri: embedUrl }}
          allowsFullscreenVideo={true}
        />
      </View>
    );
  };

  // Fetch exercise data
  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const fetchedExercise = await workoutService.getExerciseById(exerciseId);
        if (fetchedExercise) {
          setExercise(fetchedExercise);
        } else {
          Alert.alert('Error', 'Exercise not found');
          router.back();
        }
      } catch (error) {
        console.error('Error fetching exercise:', error);
        Alert.alert('Error', 'Failed to load exercise');
        router.back();
      } finally {
        setLoading(false);
      }
    };

    if (exerciseId) {
      fetchExercise();
    }
  }, [exerciseId]);

  // Check readiness when exercise is loaded
  useEffect(() => {
    const checkReadiness = async () => {
      if (!exercise || !user?.id) return;

      try {
        const readiness = await readinessService.checkTodayReadiness(user.id);
        if (!readiness) {
          // No readiness check today - show modal (MANDATORY)
          setShowReadinessCheck(true);
        } else {
          setTodayReadiness(readiness);
          setReadinessChecked(true);
          // Generate AI adjustments if fatigue is HIGH
          if (readiness.fatigueState === 'HIGH') {
            await generateAIAdjustments(readiness);
          }
        }
      } catch (error) {
        console.error('Error checking readiness:', error);
        // Allow workout to continue even if readiness check fails
        setReadinessChecked(true);
      }
    };

    if (exercise && !readinessChecked) {
      checkReadiness();
    }
  }, [exercise, user?.id, readinessChecked]);

  // Initialize workout session hook
  const {
    currentState,
    currentSetNumber,
    elapsedTime,
    sessionId,
    currentActiveCues,
    startSet,
    completeSet,
    pause,
    resume,
    endSession,
    isInitialized,
    sets,
  } = useWorkoutSession({
    exercise: exercise,
    aiAdjustment,
    readinessId: todayReadiness?.id,
  });

  // Handle readiness check submission
  const handleReadinessSubmit = async (input: ReadinessCheckInput) => {
    if (!user?.id) return;

    try {
      const readiness = await readinessService.createReadinessCheck(user.id, input);
      setTodayReadiness(readiness);
      setReadinessChecked(true);
      setShowReadinessCheck(false);

      // Generate AI adjustments if fatigue is HIGH
      if (readiness.fatigueState === 'HIGH') {
        await generateAIAdjustments(readiness);
      }
    } catch (error) {
      console.error('Error creating readiness check:', error);
      Alert.alert('Error', 'Failed to save readiness check. You can still continue your workout.');
      setReadinessChecked(true);
      setShowReadinessCheck(false);
    }
  };

  // Generate AI workout adjustments
  const generateAIAdjustments = async (readiness: DailyReadiness) => {
    if (!user?.id || !exercise) return;

    try {
      const context: PersonalizationContext = {
        userId: user.id,
        userProfile: {
          fitnessLevel: 'intermediate',
          injuryHistory: [],
        },
        readiness: {
          sleepQuality: readiness.sleepQuality,
          sorenessLevel: readiness.sorenessLevel,
          fatigueState: readiness.fatigueState,
          readinessScore: readiness.calculatedReadinessScore,
        },
        exercise: {
          name: exercise.name,
          category: exercise.category,
          difficultyLevel: exercise.difficultyLevel,
        },
        recentHistory: {
          weeklyVolumeLoad: 0,
          lastWorkoutDate: '',
          currentFatigueIndex: 0,
        },
      };

      const adjustment = await aiPersonalizationService.generateWorkoutAdjustment(context);
      setAiAdjustment(adjustment);
      setShowAdjustmentNotification(true);

      // Auto-hide after 8 seconds
      setTimeout(() => setShowAdjustmentNotification(false), 8000);
    } catch (error) {
      console.error('Error generating AI adjustments:', error);
      // Silently fail - workout can continue without AI adjustments
    }
  };

  // Handle triggered cues - show the highest priority cue with auto-hide
  useEffect(() => {
    if (!currentActiveCues || currentActiveCues.length === 0) {
      return;
    }

    // Sort by priority and take the highest priority cue
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    const sortedCues = [...currentActiveCues].sort((a, b) => {
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const highestPriorityCue = sortedCues[0];

    // Check if we should interrupt current cue with higher priority
    if (activeCue) {
      const currentPriority = priorityOrder[activeCue.priority];
      const newPriority = priorityOrder[highestPriorityCue.priority];

      // Only replace if new cue has higher or equal priority
      if (newPriority < currentPriority) {
        return;
      }
    }

    setActiveCue({
      text: highestPriorityCue.text,
      priority: highestPriorityCue.priority,
      timestamp: highestPriorityCue.timestamp,
    });

    // Auto-hide after duration based on priority
    const hideDelay = highestPriorityCue.priority === 'critical' ? 8000 :
                      highestPriorityCue.priority === 'high' ? 7000 : 6000;

    const timer = setTimeout(() => {
      setActiveCue(null);
    }, hideDelay);

    return () => clearTimeout(timer);
  }, [currentActiveCues]);

  // Clear active cue when session is not active
  useEffect(() => {
    if (currentState !== SessionState.ActiveSet) {
      setActiveCue(null);
    }
  }, [currentState]);

  // Helper function for priority colors
  const getPriorityColor = (priority: CuePriority): string => {
    switch (priority) {
      case 'critical': return '#EF4444';
      case 'high': return '#F59E0B';
      case 'normal': return '#3B82F6';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Manual replay handler
  const handleReplayCue = () => {
    if (activeCue) {
      speakCue(activeCue.text, activeCue.priority);
    }
  };

  const handleStartSet = async () => {
    // Block workout start until readiness checked
    if (!readinessChecked) {
      Alert.alert(
        'Readiness Check Required',
        'Please complete your daily readiness check first.'
      );
      return;
    }
    await startSet();
  };

  const handleCompleteSetPress = () => {
    setShowSetInputForm(true);
  };

  const handleSetInputSubmit = async (setData: any) => {
    await completeSet(setData);
    setShowSetInputForm(false);
  };

  const handleEndSession = async () => {
    Alert.alert(
      'End Workout',
      'Are you sure you want to end this workout session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'End Workout',
          style: 'destructive',
          onPress: async () => {
            try {
              const completedSession = await endSession();
              // Navigate to session summary screen
              router.replace({
                pathname: '/modules/health-fitness/SessionSummaryScreen',
                params: { sessionId: completedSession.id },
              });
            } catch (error) {
              console.error('Error ending session:', error);
              Alert.alert('Error', 'Failed to end workout session');
            }
          },
        },
      ]
    );
  };

  const handleBack = () => {
    if (currentState === SessionState.Idle || currentState === SessionState.Completed) {
      router.back();
    } else {
      Alert.alert(
        'Workout in Progress',
        'Are you sure you want to leave? Your progress will be saved.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    }
  };

  if (loading || !exercise) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MODULE_COLOR} />
            <Text style={styles.loadingText}>Loading exercise...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (!isInitialized) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={MODULE_COLOR} />
            <Text style={styles.loadingText}>Initializing workout session...</Text>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

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
            <IconButton
              icon="arrow-back"
              onPress={handleBack}
              variant="secondary"
              size="medium"
            />
            <Text style={styles.headerTitle}>Workout</Text>
            <View style={{ width: 48 }} />
          </View>

          {/* Exercise Info */}
          <View style={styles.exerciseInfo}>
            <View style={styles.exerciseIconContainer}>
              <Ionicons name="fitness-outline" size={32} color={MODULE_COLOR} />
            </View>
            <View style={styles.exerciseTextContainer}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <View style={styles.exerciseMeta}>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>{exercise.category}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Text style={styles.metaChipText}>
                    {exercise.difficultyLevel}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Video Player */}
          {renderVideoPlayer()}

          {/* Current Set Number */}
          <View style={styles.setNumberContainer}>
            <Text style={styles.setNumberLabel}>Current Set</Text>
            <Text style={styles.setNumberValue}>
              {currentSetNumber || '-'}
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            <SetTimer
              elapsedTime={elapsedTime}
              isActive={currentState === SessionState.ActiveSet}
              isDarkMode={false}
            />
          </View>

          {/* Safety Cue Indicator */}
          {activeCue && (
            <View style={styles.cueContainer}>
              <SafetyCueIndicator
                cueText={activeCue.text}
                priority={activeCue.priority}
                visible={!!activeCue}
                isDarkMode={false}
                onReplay={handleReplayCue}
              />
            </View>
          )}

          {/* Workout Controls */}
          <View style={styles.controlsContainer}>
            <WorkoutControls
              currentState={currentState}
              onPause={pause}
              onResume={resume}
              onStop={handleEndSession}
              onStartSet={handleStartSet}
              onCompleteSet={handleCompleteSetPress}
              isDarkMode={false}
            />
          </View>

          {/* AI Adjustment Notification */}
          {showAdjustmentNotification && aiAdjustment && (
            <View style={styles.adjustmentNotification}>
              <View style={styles.adjustmentHeader}>
                <Ionicons name="bulb" size={24} color={MODULE_COLOR} />
                <Text style={styles.adjustmentTitle}>Workout Adjusted for You</Text>
              </View>
              <Text style={styles.adjustmentReason}>{aiAdjustment.reasoning}</Text>
              <View style={styles.adjustmentDetails}>
                <View style={styles.adjustmentDetailItem}>
                  <Text style={styles.adjustmentDetailLabel}>Recommended:</Text>
                  <Text style={styles.adjustmentDetailValue}>
                    {aiAdjustment.adjustedSets} sets × {aiAdjustment.adjustedReps} reps
                  </Text>
                </View>
                <View style={styles.adjustmentDetailItem}>
                  <Text style={styles.adjustmentDetailLabel}>Intensity:</Text>
                  <Text style={styles.adjustmentDetailValue}>
                    {(aiAdjustment.intensityModifier * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              <Text style={styles.adjustmentExpectations}>{aiAdjustment.expectations}</Text>
            </View>
          )}

          {/* Session Info */}
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionInfoTitle}>Session Info</Text>
            <View style={styles.sessionInfoRow}>
              <Ionicons name="time-outline" size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.sessionInfoText}>
                Total Time: {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <View style={styles.sessionInfoRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.sessionInfoText}>
                Safety Cues: {exercise?.safetyCuesJSON?.length || 0} available
              </Text>
            </View>
            <View style={styles.sessionInfoRow}>
              <Ionicons name="information-circle-outline" size={20} color={Theme.colors.textSecondary} />
              <Text style={styles.sessionInfoText}>
                Status: {currentState.replace('_', ' ')}
              </Text>
            </View>
          </View>

          {/* Safety Cues Reference Section */}
          {exercise?.safetyCuesJSON && exercise.safetyCuesJSON.length > 0 && (
            <View style={styles.safetyCuesSection}>
              <TouchableOpacity
                style={styles.safetyCuesHeader}
                onPress={() => setSafetyCuesExpanded(!safetyCuesExpanded)}
                activeOpacity={0.7}
              >
                <View style={styles.safetyCuesHeaderLeft}>
                  <Ionicons name="shield-checkmark" size={24} color={MODULE_COLOR} />
                  <Text style={styles.safetyCuesTitle}>
                    Safety Cues ({exercise.safetyCuesJSON.length})
                  </Text>
                </View>
                <Ionicons
                  name={safetyCuesExpanded ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={Theme.colors.textSecondary}
                />
              </TouchableOpacity>

              {safetyCuesExpanded && (
                <View style={styles.safetyCuesContent}>
                  <Text style={styles.safetyCuesDescription}>
                    These safety cues will be announced automatically during your workout based on timing and conditions.
                  </Text>
                  {exercise.safetyCuesJSON.map((cue, index) => (
                    <View key={index} style={styles.safetyCueItem}>
                      <View style={styles.safetyCueItemHeader}>
                        <View style={[
                          styles.priorityBadge,
                          { backgroundColor: getPriorityColor(cue.priority) }
                        ]}>
                          <Text style={styles.priorityBadgeText}>
                            {cue.priority.toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.safetyCueTime}>{cue.timeWindow}</Text>
                      </View>
                      <Text style={styles.safetyCueText}>{cue.cueText}</Text>
                      {cue.condition && cue.condition !== 'always' && (
                        <View style={styles.conditionChip}>
                          <Ionicons name="information-circle-outline" size={14} color={Theme.colors.textSecondary} />
                          <Text style={styles.conditionText}>
                            Condition: {cue.condition.replace('_', ' ')}
                          </Text>
                        </View>
                      )}
                      {cue.reference && (
                        <Text style={styles.referenceText}>Ref: {cue.reference}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Set History */}
          {sets.length > 0 && (
            <View style={styles.setHistorySection}>
              <View style={styles.setHistoryHeader}>
                <Ionicons name="list-outline" size={24} color={MODULE_COLOR} />
                <Text style={styles.setHistoryTitle}>
                  Set History ({sets.length} {sets.length === 1 ? 'set' : 'sets'})
                </Text>
              </View>
              {sets.map((set, index) => (
                <SetHistoryCard key={index} set={set} isDarkMode={false} />
              ))}
            </View>
          )}

        </ScrollView>

        {/* Readiness Check Modal */}
        <ReadinessCheckModal
          visible={showReadinessCheck}
          onSubmit={handleReadinessSubmit}
          isDarkMode={false}
        />

        {/* Set Input Form Modal */}
        <SetInputForm
          visible={showSetInputForm}
          setNumber={currentSetNumber}
          onSubmit={handleSetInputSubmit}
          onCancel={() => setShowSetInputForm(false)}
          isDarkMode={false}
        />

        {/* AI Chatbot Modal */}
        {user?.id && exercise && (
          <AIChatbot
            visible={showChatbot}
            onClose={() => setShowChatbot(false)}
            context={{
              userId: user.id,
              exerciseName: exercise.name,
              exerciseId: exercise.id,
              sessionId: sessionId || undefined,
              currentReadiness: todayReadiness || undefined,
              bodyPartSelections: [],
              recentFatigueScores: [],
            } as ChatbotContext}
            onWorkoutAdjustment={(adjustmentData) => {
              // Update AI adjustment state when chatbot triggers adjustment
              if (adjustmentData?.recommendation) {
                setAiAdjustment(adjustmentData.recommendation);
                setShowAdjustmentNotification(true);
                setTimeout(() => setShowAdjustmentNotification(false), 8000);
              }
            }}
            isDarkMode={false}
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
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.small,
  },
  exerciseIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${MODULE_COLOR}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  exerciseTextContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: 6,
  },
  exerciseMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${MODULE_COLOR}15`,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: MODULE_COLOR,
    textTransform: 'capitalize',
  },
  setNumberContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  setNumberLabel: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.semibold,
    color: Theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  setNumberValue: {
    fontSize: 48,
    fontWeight: Theme.typography.fontWeights.bold,
    color: MODULE_COLOR,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: Theme.spacing.xl,
  },
  cueContainer: {
    marginBottom: Theme.spacing.lg,
  },
  controlsContainer: {
    marginBottom: Theme.spacing.xl,
  },
  sessionInfo: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    ...Theme.shadows.small,
  },
  sessionInfoTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  sessionInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sessionInfoText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },
  adjustmentNotification: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: Theme.spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: MODULE_COLOR,
    ...Theme.shadows.small,
  },
  adjustmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  adjustmentTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },
  adjustmentReason: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  adjustmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: `${MODULE_COLOR}10`,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  adjustmentDetailItem: {
    alignItems: 'center',
  },
  adjustmentDetailLabel: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    marginBottom: 4,
  },
  adjustmentDetailValue: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: MODULE_COLOR,
  },
  adjustmentExpectations: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  setHistorySection: {
    marginTop: Theme.spacing.lg,
  },
  setHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Theme.spacing.md,
  },
  setHistoryTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },
  videoContainer: {
    overflow: 'hidden',
    borderRadius: 16,
    marginBottom: Theme.spacing.lg,
    backgroundColor: 'black',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyCuesSection: {
    backgroundColor: Theme.colors.cardBackground,
    borderRadius: 16,
    marginTop: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    overflow: 'hidden',
    ...Theme.shadows.small,
  },
  safetyCuesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  safetyCuesHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  safetyCuesTitle: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
  },
  safetyCuesContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  safetyCuesDescription: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  safetyCueItem: {
    backgroundColor: `${MODULE_COLOR}08`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: MODULE_COLOR,
  },
  safetyCueItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  safetyCueTime: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
    fontWeight: '600',
  },
  safetyCueText: {
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textPrimary,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  conditionText: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    textTransform: 'capitalize',
  },
  referenceText: {
    fontSize: Theme.typography.fontSizes.xs,
    color: Theme.colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

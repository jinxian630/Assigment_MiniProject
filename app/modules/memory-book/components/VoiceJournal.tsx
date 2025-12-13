import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  AppState,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";

const PRIMARY_PURPLE = "#a855f7";

// Emoji options with associated feelings
const EMOJI_OPTIONS = [
  { emoji: "😊", feeling: "Happy", color: "#FCD34D" },
  { emoji: "😢", feeling: "Sad", color: "#60A5FA" },
  { emoji: "😰", feeling: "Anxious", color: "#F87171" },
  { emoji: "😴", feeling: "Tired", color: "#A78BFA" },
  { emoji: "😍", feeling: "Loved", color: "#F472B6" },
  { emoji: "😤", feeling: "Frustrated", color: "#FB923C" },
  { emoji: "😌", feeling: "Peaceful", color: "#34D399" },
  { emoji: "🤔", feeling: "Thoughtful", color: "#818CF8" },
  { emoji: "😎", feeling: "Confident", color: "#FBBF24" },
  { emoji: "🥺", feeling: "Vulnerable", color: "#A78BFA" },
  { emoji: "😮", feeling: "Surprised", color: "#F59E0B" },
  { emoji: "😑", feeling: "Neutral", color: "#9CA3AF" },
];

// Mood tags for Guided Voice Journal
const MOOD_TAGS = [
  { emoji: "🙂", label: "Good", color: "#10B981" },
  { emoji: "😐", label: "Okay", color: "#F59E0B" },
  { emoji: "🙁", label: "Tough", color: "#EF4444" },
];

// AI-generated prompts based on emoji
const getPromptForEmoji = (feeling: string): string => {
  const prompts: { [key: string]: string[] } = {
    Happy: [
      "What made you feel happy today?",
      "Share a moment that brought you joy.",
      "What are you grateful for right now?",
    ],
    Sad: [
      "What's weighing on your heart?",
      "What do you need right now?",
      "What would help you feel better?",
    ],
    Anxious: [
      "What's making you feel anxious?",
      "What can you do to feel more calm?",
      "What support do you need?",
    ],
    Tired: [
      "What drained your energy today?",
      "How can you rest and recharge?",
      "What do you need to let go of?",
    ],
    Loved: [
      "Who or what made you feel loved?",
      "How does it feel to be loved?",
      "What love do you want to share?",
    ],
    Frustrated: [
      "What's frustrating you right now?",
      "What would help you feel heard?",
      "What do you need to express?",
    ],
    Peaceful: [
      "What brings you peace?",
      "How does this peaceful moment feel?",
      "What helps you stay centered?",
    ],
    Thoughtful: [
      "What's on your mind?",
      "What are you reflecting on?",
      "What insights are you discovering?",
    ],
    Confident: [
      "What makes you feel confident?",
      "What strength are you recognizing?",
      "What are you proud of?",
    ],
    Vulnerable: [
      "What are you afraid to share?",
      "What do you need to be gentle with?",
      "How can you be kind to yourself?",
    ],
    Surprised: [
      "What surprised you today?",
      "How did this surprise make you feel?",
      "What did you learn from it?",
    ],
    Neutral: [
      "How are you feeling right now?",
      "What's happening in your life?",
      "What do you want to remember about today?",
    ],
  };

  const feelingPrompts = prompts[feeling] || prompts["Neutral"];
  return feelingPrompts[Math.floor(Math.random() * feelingPrompts.length)];
};

type VoiceJournalProps = {
  onRecordingComplete?: (data: {
    emoji?: string;
    feeling?: string;
    prompt?: string;
    audioURI?: string;
    duration?: number;
    moodTag?: string;
    timestamp: number;
  }) => void;
  isDarkMode: boolean;
};

export default function VoiceJournal({
  onRecordingComplete,
  isDarkMode,
}: VoiceJournalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedFeeling, setSelectedFeeling] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingURI, setRecordingURI] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [selectedMoodTag, setSelectedMoodTag] = useState<string | null>(null);
  const [mode, setMode] = useState<"emoji" | "mood" | "recording">("emoji");
  const [loading, setLoading] = useState(false);
  const [playbackSound, setPlaybackSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const durationCounter = useRef<number>(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const colors = {
    background: isDarkMode ? "#1E293B" : "#F5F3FF",
    surface: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1F2937",
    textSoft: isDarkMode ? "#94A3B8" : "#6B7280",
    border: isDarkMode ? "#334155" : "#E5E7EB",
    accent: PRIMARY_PURPLE,
  };

  useEffect(() => {
    return () => {
      // Cleanup: stop recording and clear interval
      if (recording) {
        recording
          .getStatusAsync()
          .then((status) => {
            if (!status.isDoneRecording) {
              // Only stop if still recording
              recording.stopAndUnloadAsync().catch((err: any) => {
                // Silently ignore if already unloaded
                if (!err.message?.includes("already been unloaded")) {
                  console.error("Error cleaning up recording:", err);
                }
              });
            }
          })
          .catch(() => {
            // If getStatusAsync fails, recording is likely already unloaded
          });
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }
    };
  }, [recording]);

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording]);

  const handleEmojiSelect = (emoji: string, feeling: string) => {
    setSelectedEmoji(emoji);
    setSelectedFeeling(feeling);
    const generatedPrompt = getPromptForEmoji(feeling);
    setPrompt(generatedPrompt);
    setMode("recording");
  };

  const handleMoodTagSelect = (tag: string) => {
    setSelectedMoodTag(tag);
    const prompts = [
      "What happened?",
      "What are you feeling right now?",
      "What do you need?",
    ];
    setPrompt(prompts[Math.floor(Math.random() * prompts.length)]);
    setMode("recording");
  };

  const startRecording = async () => {
    try {
      // Stop any playback before starting new recording
      if (playbackSound) {
        await stopPlayback();
      }

      // Clean up any existing recording first
      if (recording) {
        try {
          const status = await recording.getStatusAsync();
          if (!status.isDoneRecording) {
            await recording.stopAndUnloadAsync();
          }
        } catch (cleanupError: any) {
          // Ignore cleanup errors - recording might already be unloaded
          console.log(
            "Cleanup warning (expected if already unloaded):",
            cleanupError.message
          );
        }
        setRecording(null);
      }

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow microphone access to record voice."
        );
        return;
      }

      // Configure audio mode - ensure recording is enabled
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Small delay to ensure previous recording is fully cleaned up
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      durationCounter.current = 0;

      // Start duration counter - use ref to persist counter value
      durationInterval.current = setInterval(() => {
        durationCounter.current += 1;
        setRecordingDuration(durationCounter.current);
        console.log("⏱️ Duration:", durationCounter.current, "seconds");

        // Max duration: 5 minutes (300 seconds)
        if (durationCounter.current >= 300) {
          Alert.alert(
            "Maximum Duration Reached",
            "You've reached the 5-minute recording limit. The recording will be saved automatically.",
            [{ text: "OK" }]
          );
          stopRecording();
        }
      }, 1000) as any; // Update every second
    } catch (error: any) {
      console.error("Failed to start recording:", error);

      // Clear recording state on error
      setRecording(null);
      setIsRecording(false);

      let errorMessage = "Failed to start recording. Please try again.";
      if (error.message?.includes("Only one Recording object")) {
        errorMessage =
          "Please wait a moment and try again. Another recording is being cleaned up.";
      }

      Alert.alert("Error", errorMessage);
    }
  };

  const stopRecording = async () => {
    if (!recording) {
      console.log("❌ No recording to stop");
      return;
    }

    try {
      console.log("🛑 Stopping recording...");
      setIsRecording(false);

      // Stop the interval first to prevent further updates
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      // Get status to get actual duration from recording (more accurate)
      const status = await recording.getStatusAsync();
      let actualDuration = durationCounter.current;

      // Get actual duration from recording status if available
      // RecordingStatus has canRecord, isDoneRecording, durationMillis
      if (
        status.durationMillis !== undefined &&
        status.durationMillis !== null
      ) {
        actualDuration = Math.floor(status.durationMillis / 1000);
        console.log(
          "⏱️ Actual duration from status:",
          actualDuration,
          "seconds"
        );
        setRecordingDuration(actualDuration);
        durationCounter.current = actualDuration;
      } else {
        console.log("⏱️ Using counter duration:", actualDuration, "seconds");
      }

      // Stop the recording first - URI is available after stopping
      let uri: string | null = null;
      if (!status.isDoneRecording) {
        console.log("🛑 Stopping and unloading recording...");
        await recording.stopAndUnloadAsync();
        // Get URI AFTER stopping - this is when it becomes available
        uri = recording.getURI();
        console.log("📁 Recording URI after stop:", uri);
      } else {
        console.log("🛑 Recording already stopped");
        uri = recording.getURI();
        console.log("📁 Recording URI:", uri);
      }

      setRecordingURI(uri);
      setRecording(null);

      console.log(
        "✅ Recording stopped. URI:",
        uri,
        "Duration:",
        actualDuration
      );

      if (uri && onRecordingComplete) {
        console.log("📤 Calling onRecordingComplete with:", {
          audioURI: uri,
          duration: actualDuration,
          emoji: selectedEmoji,
          feeling: selectedFeeling,
        });
        onRecordingComplete({
          emoji: selectedEmoji || undefined,
          feeling: selectedFeeling || undefined,
          prompt: prompt || undefined,
          audioURI: uri,
          duration: actualDuration,
          moodTag: selectedMoodTag || undefined,
          timestamp: Date.now(),
        });
      } else {
        console.warn("⚠️ No URI or callback:", {
          uri,
          hasCallback: !!onRecordingComplete,
        });
      }
    } catch (error: any) {
      console.error("Failed to stop recording:", error);
      // If recording is already unloaded, that's okay - just get the URI if we can
      if (recording) {
        try {
          const uri = recording.getURI();
          if (uri) {
            setRecordingURI(uri);
            setRecording(null);
            if (onRecordingComplete) {
              onRecordingComplete({
                emoji: selectedEmoji || undefined,
                feeling: selectedFeeling || undefined,
                prompt: prompt || undefined,
                audioURI: uri,
                duration: recordingDuration,
                moodTag: selectedMoodTag || undefined,
                timestamp: Date.now(),
              });
            }
          }
        } catch {
          // If we can't get URI either, just clear the recording
          setRecording(null);
        }
      }
      if (!error.message?.includes("already been unloaded")) {
        Alert.alert("Error", "Failed to stop recording.");
      }
    }
  };

  const reset = async () => {
    // Stop and clean up any active recording
    if (recording) {
      try {
        const status = await recording.getStatusAsync();
        if (!status.isDoneRecording) {
          await recording.stopAndUnloadAsync();
        }
      } catch (error: any) {
        // Ignore errors - recording might already be unloaded
        console.log("Reset cleanup warning:", error.message);
      }
      setRecording(null);
    }

    // Clear interval
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }

    // Reset state
    setSelectedEmoji(null);
    setSelectedFeeling(null);
    setPrompt(null);
    setRecordingURI(null);
    setSelectedMoodTag(null);
    setIsRecording(false);
    setMode("emoji");
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const playRecording = async () => {
    if (!recordingURI) return;

    try {
      // Stop any existing playback
      if (playbackSound) {
        await playbackSound.unloadAsync();
        setPlaybackSound(null);
        setIsPlaying(false);
      }

      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      // Load and play the recording
      const { sound } = await Audio.Sound.createAsync(
        { uri: recordingURI },
        { shouldPlay: true }
      );

      setPlaybackSound(sound);

      // Set up status listener
      // Note: setOnPlaybackStatusUpdate doesn't return a subscription object
      // We'll handle cleanup by unsetting the callback when needed
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
            sound.unloadAsync();
            setPlaybackSound(null);
          }
        }
      });
    } catch (error: any) {
      console.error("Error playing recording:", error);
      Alert.alert("Error", "Could not play recording. Please try again.");
    }
  };

  const stopPlayback = async () => {
    if (playbackSound) {
      await playbackSound.unloadAsync();
      setPlaybackSound(null);
      setIsPlaying(false);
    }
  };

  // Cleanup playback on unmount
  useEffect(() => {
    return () => {
      if (playbackSound) {
        // Unset status update listener before unloading
        playbackSound.setOnPlaybackStatusUpdate(null);
        playbackSound.unloadAsync().catch(console.error);
      }
    };
  }, [playbackSound]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Emoji Selection Mode */}
      {mode === "emoji" && (
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            How are you feeling?
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>
            Choose an emoji that represents your feeling
          </Text>
          <View style={styles.emojiGrid}>
            {EMOJI_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.feeling}
                onPress={() => handleEmojiSelect(option.emoji, option.feeling)}
                style={[
                  styles.emojiButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.emojiText}>{option.emoji}</Text>
                <Text style={[styles.emojiLabel, { color: colors.textSoft }]}>
                  {option.feeling}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.divider} />

          {/* Mood Tag Selection */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Quick Mood Check
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>
            Or choose a quick mood tag
          </Text>
          <View style={styles.moodTagRow}>
            {MOOD_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag.label}
                onPress={() => handleMoodTagSelect(tag.label)}
                style={[
                  styles.moodTagButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={styles.moodTagEmoji}>{tag.emoji}</Text>
                <Text style={[styles.moodTagLabel, { color: colors.text }]}>
                  {tag.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Recording Mode */}
      {mode === "recording" && (
        <View>
          {prompt && (
            <View
              style={[
                styles.promptContainer,
                {
                  backgroundColor: isDarkMode ? "#1E293B" : "#F3F4F6",
                },
              ]}
            >
              <Text style={[styles.promptLabel, { color: colors.textSoft }]}>
                Question:
              </Text>
              <Text style={[styles.promptText, { color: colors.text }]}>
                {prompt}
              </Text>
            </View>
          )}

          <Text style={[styles.optionalLabel, { color: colors.textSoft }]}>
            (Optional - You can skip recording)
          </Text>

          {!recordingURI ? (
            <View style={styles.recordingContainer}>
              {!isRecording ? (
                <TouchableOpacity
                  onPress={startRecording}
                  style={[
                    styles.recordButton,
                    {
                      backgroundColor: PRIMARY_PURPLE,
                      shadowColor: PRIMARY_PURPLE,
                    },
                  ]}
                >
                  <Ionicons name="mic" size={32} color="#fff" />
                  <Text style={styles.recordButtonText}>Start Recording</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.recordingActive}>
                  <Animated.View
                    style={[
                      styles.recordingIndicator,
                      {
                        transform: [{ scale: pulseAnim }],
                        backgroundColor: "#EF4444",
                      },
                    ]}
                  >
                    <Ionicons name="mic" size={24} color="#fff" />
                  </Animated.View>
                  <Text style={[styles.recordingText, { color: colors.text }]}>
                    Recording... {formatDuration(recordingDuration)}
                  </Text>
                  <TouchableOpacity
                    onPress={stopRecording}
                    style={[styles.stopButton, { backgroundColor: "#EF4444" }]}
                  >
                    <Ionicons name="stop" size={20} color="#fff" />
                    <Text style={styles.stopButtonText}>Stop</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.recordingComplete}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={[styles.completeText, { color: colors.text }]}>
                Recording saved!
              </Text>
              <Text style={[styles.durationText, { color: colors.textSoft }]}>
                Duration: {formatDuration(recordingDuration)}
              </Text>

              {/* Playback Controls */}
              <TouchableOpacity
                onPress={isPlaying ? stopPlayback : playRecording}
                style={[
                  styles.playbackButton,
                  {
                    backgroundColor: isPlaying ? "#EF4444" : PRIMARY_PURPLE,
                  },
                ]}
              >
                <Ionicons
                  name={isPlaying ? "stop" : "play"}
                  size={24}
                  color="#fff"
                />
                <Text style={styles.playbackButtonText}>
                  {isPlaying ? "Stop Playback" : "Play Recording"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={reset}
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                {recordingURI ? "Record Again" : "Back"}
              </Text>
            </TouchableOpacity>
            {recordingURI && (
              <TouchableOpacity
                onPress={async () => {
                  // Get actual duration - use the saved recordingDuration state
                  // (it should already be set correctly from stopRecording)
                  let finalDuration = recordingDuration;

                  // If duration is still 0, try to get it from the recording if still available
                  if (finalDuration === 0 && recording) {
                    try {
                      const status = await recording.getStatusAsync();
                      if (
                        status.durationMillis !== undefined &&
                        status.durationMillis !== null
                      ) {
                        finalDuration = Math.floor(
                          status.durationMillis / 1000
                        );
                      }
                    } catch (error) {
                      // Use current recordingDuration if we can't get status
                      console.log("Could not get recording duration:", error);
                    }
                  }

                  if (onRecordingComplete) {
                    onRecordingComplete({
                      emoji: selectedEmoji || undefined,
                      feeling: selectedFeeling || undefined,
                      prompt: prompt || undefined,
                      audioURI: recordingURI,
                      duration:
                        finalDuration > 0 ? finalDuration : recordingDuration,
                      moodTag: selectedMoodTag || undefined,
                      timestamp: Date.now(),
                    });
                  }
                  await reset();
                }}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Text style={styles.actionButtonTextWhite}>
                  Save & Continue
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  emojiButton: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  emojiText: {
    fontSize: 32,
    marginBottom: 4,
  },
  emojiLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginVertical: 20,
    opacity: 0.3,
  },
  moodTagRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  moodTagButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  moodTagEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  moodTagLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  promptContainer: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    // backgroundColor is set dynamically based on theme
  },
  promptLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  promptText: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  optionalLabel: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 16,
    fontStyle: "italic",
  },
  recordingContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  recordButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  recordButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  recordingActive: {
    alignItems: "center",
    gap: 16,
  },
  recordingIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  stopButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  stopButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  recordingComplete: {
    alignItems: "center",
    padding: 24,
  },
  completeText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 12,
  },
  durationText: {
    fontSize: 14,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  actionButtonTextWhite: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  playbackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  playbackButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});

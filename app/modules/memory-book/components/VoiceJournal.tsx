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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useTheme } from "@/hooks/useTheme";

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

  const durationInterval = useRef<NodeJS.Timeout | null>(null);
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
      if (recording) {
        stopRecording();
      }
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
    };
  }, []);

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
      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Please allow microphone access to record voice."
        );
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error: any) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
        durationInterval.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecordingURI(uri || null);
      setRecording(null);

      if (uri && onRecordingComplete) {
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
    } catch (error: any) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording.");
    }
  };

  const reset = () => {
    setSelectedEmoji(null);
    setSelectedFeeling(null);
    setPrompt(null);
    setRecordingURI(null);
    setSelectedMoodTag(null);
    setMode("emoji");
    setRecordingDuration(0);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

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
            <View style={styles.promptContainer}>
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
                onPress={() => {
                  if (onRecordingComplete) {
                    onRecordingComplete({
                      emoji: selectedEmoji || undefined,
                      feeling: selectedFeeling || undefined,
                      prompt: prompt || undefined,
                      audioURI: recordingURI,
                      duration: recordingDuration,
                      moodTag: selectedMoodTag || undefined,
                      timestamp: Date.now(),
                    });
                  }
                  reset();
                }}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Text style={styles.actionButtonTextWhite}>Save & Continue</Text>
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
    backgroundColor: "#1E293B",
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
});


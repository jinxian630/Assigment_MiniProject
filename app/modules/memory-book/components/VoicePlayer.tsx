import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";

const PRIMARY_PURPLE = "#a855f7";

type VoicePlayerProps = {
  audioURL: string;
  duration?: number;
  emoji?: string;
  feeling?: string;
  moodTag?: string;
  prompt?: string;
  isDarkMode: boolean;
};

export default function VoicePlayer({
  audioURL,
  duration,
  emoji,
  feeling,
  moodTag,
  prompt,
  isDarkMode,
}: VoicePlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(duration || 0);
  const statusUpdateSubscription = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: remove status listener and unload sound
      if (statusUpdateSubscription.current) {
        statusUpdateSubscription.current.remove();
        statusUpdateSubscription.current = null;
      }
      if (sound) {
        sound.unloadAsync().catch((err) => {
          console.error("Error unloading sound:", err);
        });
      }
    };
  }, [sound]);

  const loadSound = async () => {
    try {
      setIsLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioURL },
        { shouldPlay: false }
      );

      // Get duration if not provided
      const status = await newSound.getStatusAsync();
      if (status.isLoaded && status.durationMillis) {
        setPlaybackDuration(Math.floor(status.durationMillis / 1000));
      }

      setSound(newSound);

      // Set up status update listener and store subscription for cleanup
      const subscription = newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setPlaybackPosition(Math.floor(status.positionMillis / 1000));
          setIsPlaying(status.isPlaying);

          if (status.didJustFinish) {
            setIsPlaying(false);
            setPlaybackPosition(0);
            // Cleanup subscription when playback finishes
            if (statusUpdateSubscription.current) {
              statusUpdateSubscription.current.remove();
              statusUpdateSubscription.current = null;
            }
          }
        }
      });
      statusUpdateSubscription.current = subscription;
    } catch (error: any) {
      console.error("Error loading audio:", error);
      setIsLoading(false);
    } finally {
      setIsLoading(false);
    }
  };

  const playPause = async () => {
    if (!sound) {
      await loadSound();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error: any) {
      console.error("Error playing/pausing audio:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const colors = {
    background: isDarkMode ? "#1E293B" : "#F3F4F6",
    surface: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1F2937",
    textSoft: isDarkMode ? "#94A3B8" : "#6B7280",
    border: isDarkMode ? "#334155" : "#E5E7EB",
  };

  const progress =
    playbackDuration > 0 ? playbackPosition / playbackDuration : 0;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Header with emoji/feeling info */}
      {(emoji || feeling || moodTag) && (
        <View style={styles.header}>
          {emoji && <Text style={styles.emoji}>{emoji}</Text>}
          {(feeling || moodTag) && (
            <Text style={[styles.feeling, { color: colors.text }]}>
              {feeling || moodTag}
            </Text>
          )}
        </View>
      )}

      {/* Prompt text */}
      {prompt && (
        <Text
          style={[styles.prompt, { color: colors.textSoft }]}
          numberOfLines={2}
        >
          {prompt}
        </Text>
      )}

      {/* Audio player controls */}
      <View style={styles.playerContainer}>
        <TouchableOpacity
          onPress={playPause}
          disabled={isLoading}
          style={[
            styles.playButton,
            {
              backgroundColor: PRIMARY_PURPLE,
            },
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons
              name={isPlaying ? "pause" : "play"}
              size={20}
              color="#fff"
            />
          )}
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.timeContainer}>
            <Text style={[styles.timeText, { color: colors.textSoft }]}>
              {formatTime(playbackPosition)}
            </Text>
            <Text style={[styles.timeText, { color: colors.textSoft }]}>
              {formatTime(playbackDuration)}
            </Text>
          </View>
          <View
            style={[styles.progressBar, { backgroundColor: colors.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: PRIMARY_PURPLE,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 24,
  },
  feeling: {
    fontSize: 16,
    fontWeight: "600",
  },
  prompt: {
    fontSize: 13,
    marginBottom: 12,
    fontStyle: "italic",
  },
  playerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  progressContainer: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
});

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Slider from "@react-native-community/slider";

export type MoodData = {
  energy: number;
  stress: number;
  clarity: number;
  warmth: number;
  color: string;
};

type Props = {
  moodData: MoodData;
  setMoodData: (data: MoodData) => void;
  isDarkMode: boolean;
};

/** 🎨 Cyberpunk neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accentColor + (isDark ? "66" : "CC"), // Stronger border in light mode
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.75, // Stronger shadow in light mode
    shadowRadius: isDark ? 30 : 25, // Larger glow in light mode
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 18 : 15, // Higher elevation in light mode
    ...extra,
  };
};

/** 🎨 Glow text styles - adapts to theme */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#E0F2FE" : "#6B21A8", // Dark purple for light mode
  textShadowColor: accentColor + (isDark ? "CC" : "88"), // Stronger glow in light mode
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 8 : 6, // Stronger glow radius in light mode
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#9333EA", // Dark glowing purple for light mode
});

const PRIMARY_PURPLE = "#a855f7";

export default function EmotionSelector({
  moodData,
  setMoodData,
  isDarkMode,
}: Props) {
  // 🎨 Enhanced light mode colors with better harmony
  const colors = {
    text: isDarkMode ? "#e2e8f0" : "#1E1B4B",
    sub: isDarkMode ? "#94a3b8" : "#9333EA", // Dark glowing purple for light mode
    card: isDarkMode ? "#020617" : "#FFFFFF",
    border: isDarkMode ? "#1f2937" : "#7C3AED", // Dark purple border for light mode
    accent: PRIMARY_PURPLE,
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)", // Dark purple with glow for light mode
    sliderTrack: isDarkMode ? "#1f2937" : "#C4B5FD", // Dark purple track for light mode
  };

  const emotionColors = [
    "#f87171",
    "#fb923c",
    "#facc15",
    "#4ade80",
    "#60a5fa",
    "#a78bfa",
    "#334155",
    "#e2e8f0",
  ];

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

  const update = (key: keyof MoodData, value: number | string) => {
    setMoodData({ ...moodData, [key]: value });
  };

  const SliderItem = (label: string, value: number, key: keyof MoodData) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={[{ fontSize: 14, fontWeight: "600" }, glowText]}>
        {label}
      </Text>
      <Slider
        value={value}
        onValueChange={(v) => update(key, Math.round(v))}
        minimumValue={0}
        maximumValue={100}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.sliderTrack}
        thumbTintColor={colors.accent}
      />
      <Text style={[{ fontSize: 12 }, softText]}>{value}%</Text>
    </View>
  );

  return (
    <View
      style={[
        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
          padding: 16,
          marginBottom: 20,
        }),
        {
          backgroundColor: colors.card,
        },
      ]}
    >
      <Text
        style={[{ fontSize: 16, fontWeight: "700", marginBottom: 6 }, glowText]}
      >
        Emotional spectrum
      </Text>

      <Text style={[{ fontSize: 12, marginBottom: 16 }, softText]}>
        Use the sliders to describe how you felt for this memory.
      </Text>

      {SliderItem("Energy", moodData.energy, "energy")}
      {SliderItem("Stress", moodData.stress, "stress")}
      {SliderItem("Clarity", moodData.clarity, "clarity")}
      {SliderItem("Warmth", moodData.warmth, "warmth")}

      <View style={{ marginTop: 16 }}>
        <Text
          style={[
            { fontSize: 16, fontWeight: "700", marginBottom: 10 },
            glowText,
          ]}
        >
          Emotion color
        </Text>

        <Text style={[{ fontSize: 12, marginBottom: 10 }, softText]}>
          Pick the color that best represents this memory.
        </Text>

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 10,
            marginTop: 6,
          }}
        >
          {emotionColors.map((c) => {
            const selected = moodData.color === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => update("color", c)}
                style={[
                  {
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: c,
                    borderWidth: selected ? 3 : 1,
                    borderColor: selected
                      ? PRIMARY_PURPLE
                      : isDarkMode
                      ? colors.border
                      : "#DDD6FE",
                    shadowColor: selected ? PRIMARY_PURPLE : "transparent",
                    shadowOpacity: selected ? (isDarkMode ? 0.9 : 0.5) : 0,
                    shadowRadius: selected ? (isDarkMode ? 12 : 8) : 0,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: selected ? (isDarkMode ? 8 : 6) : 0,
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

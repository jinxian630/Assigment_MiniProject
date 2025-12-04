import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import Slider from "@react-native-community/slider";
import { useTheme } from "react-native-rapi-ui";

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
};

export default function EmotionSelector({ moodData, setMoodData }: Props) {
  const { isDarkmode } = useTheme();

  const colors = {
    text: isDarkmode ? "#e2e8f0" : "#0f172a",
    sub: isDarkmode ? "#94a3b8" : "#64748b",
    card: isDarkmode ? "#0f172a" : "#ffffff",
    border: isDarkmode ? "#1f2937" : "#e2e8f0",
  };

  const emotionColors = [
    "#f87171", // red
    "#fb923c", // orange
    "#facc15", // yellow
    "#4ade80", // green
    "#60a5fa", // blue
    "#a78bfa", // purple
    "#334155", // dark
    "#e2e8f0", // light grey
  ];

  const update = (key: keyof MoodData, value: number | string) => {
    setMoodData({ ...moodData, [key]: value });
  };

  const SliderItem = (label: string, value: number, key: keyof MoodData) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: colors.text }}>
        {label}
      </Text>
      <Slider
        value={value}
        onValueChange={(v) => update(key, Math.round(v))}
        minimumValue={0}
        maximumValue={100}
        minimumTrackTintColor="#ec4899"
        maximumTrackTintColor={colors.border}
      />
      <Text style={{ fontSize: 12, color: colors.sub }}>{value}%</Text>
    </View>
  );

  return (
    <View
      style={{
        padding: 16,
        borderRadius: 16,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20,
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: colors.text,
          marginBottom: 6,
        }}
      >
        Emotional Spectrum
      </Text>
      <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 16 }}>
        Move the sliders to describe your emotional state.
      </Text>

      {SliderItem("Energy", moodData.energy, "energy")}
      {SliderItem("Stress", moodData.stress, "stress")}
      {SliderItem("Clarity", moodData.clarity, "clarity")}
      {SliderItem("Warmth", moodData.warmth, "warmth")}

      <View style={{ marginTop: 16 }}>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: colors.text,
            marginBottom: 10,
          }}
        >
          Emotion Color
        </Text>
        <Text style={{ color: colors.sub, fontSize: 12, marginBottom: 10 }}>
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
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: c,
                  borderWidth: selected ? 3 : 1,
                  borderColor: selected ? "#ec4899" : colors.border,
                }}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

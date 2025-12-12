import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type { Memory } from "../utils/memoryHelpers";

const PRIMARY_PURPLE = "#a855f7";

const EMOTION_COLORS = [
  { name: "Red", value: "#f87171" },
  { name: "Orange", value: "#fb923c" },
  { name: "Yellow", value: "#facc15" },
  { name: "Green", value: "#4ade80" },
  { name: "Blue", value: "#60a5fa" },
  { name: "Purple", value: "#a78bfa" },
  { name: "Gray", value: "#334155" },
  { name: "White", value: "#e2e8f0" },
];

type FilterOptions = {
  keyword: string;
  emotionColor: string | null;
  feelingType: "stress" | "clarity" | "energy" | "warmth" | null;
  feelingRank: "most" | "least" | null;
};

type FilterModalProps = {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  isDarkMode: boolean;
  memories: Memory[];
};

export default function FilterModal({
  visible,
  onClose,
  onApply,
  isDarkMode,
  memories,
}: FilterModalProps) {
  const [keyword, setKeyword] = useState("");
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [feelingType, setFeelingType] = useState<
    "stress" | "clarity" | "energy" | "warmth" | null
  >(null);
  const [feelingRank, setFeelingRank] = useState<"most" | "least" | null>(null);

  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
    inputBg: isDarkMode ? "#0F172A" : "#FFFFFF",
  };

  const handleApply = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onApply({
      keyword: keyword.trim(),
      emotionColor: selectedColor,
      feelingType,
      feelingRank,
    });
    onClose();
  };

  const handleReset = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setKeyword("");
    setSelectedColor(null);
    setFeelingType(null);
    setFeelingRank(null);
  };

  const handleClose = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Filter Memories
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* Keyword Search */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Search by Keyword
              </Text>
              <TextInput
                placeholder="Search in title or description..."
                placeholderTextColor={colors.textSoft}
                value={keyword}
                onChangeText={setKeyword}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
              />
            </View>

            {/* Emotion Color Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Filter by Color Theme
              </Text>
              <View style={styles.colorGrid}>
                {EMOTION_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color.value}
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setSelectedColor(
                        selectedColor === color.value ? null : color.value
                      );
                    }}
                    style={[
                      styles.colorOption,
                      {
                        backgroundColor: color.value,
                        borderColor:
                          selectedColor === color.value
                            ? PRIMARY_PURPLE
                            : colors.border,
                        borderWidth: selectedColor === color.value ? 3 : 2,
                        shadowColor:
                          selectedColor === color.value
                            ? PRIMARY_PURPLE
                            : "#000",
                        shadowOpacity:
                          selectedColor === color.value ? 0.8 : 0.2,
                        shadowRadius: selectedColor === color.value ? 8 : 4,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: selectedColor === color.value ? 8 : 2,
                      },
                    ]}
                  >
                    {selectedColor === color.value && (
                      <Ionicons name="checkmark" size={20} color="#000" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Feeling Rank Filter */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Filter by Feeling Rank
              </Text>
              <Text
                style={[styles.sectionSubtitle, { color: colors.textSoft }]}
              >
                Show memories with highest or lowest values
              </Text>

              {/* Feeling Type */}
              <View style={styles.feelingTypeContainer}>
                {[
                  { key: "stress", label: "Stress", icon: "alert-circle" },
                  { key: "clarity", label: "Clarity", icon: "bulb" },
                  { key: "energy", label: "Energy", icon: "flash" },
                  { key: "warmth", label: "Warmth", icon: "heart" },
                ].map((feeling) => (
                  <TouchableOpacity
                    key={feeling.key}
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setFeelingType(
                        feelingType === feeling.key
                          ? null
                          : (feeling.key as any)
                      );
                      if (feelingType !== feeling.key) {
                        setFeelingRank(null);
                      }
                    }}
                    style={[
                      styles.feelingButton,
                      {
                        backgroundColor:
                          feelingType === feeling.key
                            ? colors.chipBg
                            : colors.inputBg,
                        borderColor:
                          feelingType === feeling.key
                            ? PRIMARY_PURPLE
                            : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={feeling.icon as any}
                      size={18}
                      color={
                        feelingType === feeling.key
                          ? PRIMARY_PURPLE
                          : colors.textSoft
                      }
                    />
                    <Text
                      style={[
                        styles.feelingButtonText,
                        {
                          color:
                            feelingType === feeling.key
                              ? PRIMARY_PURPLE
                              : colors.textSoft,
                        },
                      ]}
                    >
                      {feeling.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Rank Selection */}
              {feelingType && (
                <View style={styles.rankContainer}>
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setFeelingRank("most");
                    }}
                    style={[
                      styles.rankButton,
                      {
                        backgroundColor:
                          feelingRank === "most"
                            ? PRIMARY_PURPLE
                            : colors.inputBg,
                        borderColor:
                          feelingRank === "most"
                            ? PRIMARY_PURPLE
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankButtonText,
                        {
                          color:
                            feelingRank === "most" ? "#FFFFFF" : colors.text,
                        },
                      ]}
                    >
                      Highest
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      if (Platform.OS === "ios") {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setFeelingRank("least");
                    }}
                    style={[
                      styles.rankButton,
                      {
                        backgroundColor:
                          feelingRank === "least"
                            ? PRIMARY_PURPLE
                            : colors.inputBg,
                        borderColor:
                          feelingRank === "least"
                            ? PRIMARY_PURPLE
                            : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rankButtonText,
                        {
                          color:
                            feelingRank === "least" ? "#FFFFFF" : colors.text,
                        },
                      ]}
                    >
                      Lowest
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleReset}
              style={[
                styles.resetButton,
                {
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.resetButtonText, { color: colors.text }]}>
                Reset
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={[styles.applyButton, { backgroundColor: PRIMARY_PURPLE }]}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(168,85,247,0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(168,85,247,0.1)",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 15,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  colorOption: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  feelingTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  feelingButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  feelingButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  rankContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  rankButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  rankButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(168,85,247,0.2)",
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});

export type { FilterOptions };

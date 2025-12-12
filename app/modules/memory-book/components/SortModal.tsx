import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { PRIMARY_PURPLE, SPACING } from "../utils/constants";

export type SortOption = "newest" | "oldest" | "mostLiked" | "mostCommented" | "highestMood" | "lowestMood";

type SortModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: SortOption) => void;
  currentSort: SortOption;
  isDarkMode: boolean;
};

const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "newest", label: "Newest First", icon: "arrow-down" },
  { value: "oldest", label: "Oldest First", icon: "arrow-up" },
  { value: "mostLiked", label: "Most Liked", icon: "heart" },
  { value: "mostCommented", label: "Most Commented", icon: "chatbubble" },
  { value: "highestMood", label: "Highest Mood", icon: "trending-up" },
  { value: "lowestMood", label: "Lowest Mood", icon: "trending-down" },
];

export default function SortModal({
  visible,
  onClose,
  onSelect,
  currentSort,
  isDarkMode,
}: SortModalProps) {
  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
  };

  const handleSelect = (option: SortOption) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onSelect(option);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
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
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Sort Memories
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close sort modal"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.optionsList}>
            {SORT_OPTIONS.map((option) => {
              const isSelected = currentSort === option.value;
              return (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: isSelected
                        ? colors.chipBg
                        : "transparent",
                      borderColor: isSelected ? PRIMARY_PURPLE : colors.border,
                    },
                  ]}
                  accessibilityLabel={`Sort by ${option.label}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.optionContent}>
                    <Ionicons
                      name={option.icon as any}
                      size={20}
                      color={isSelected ? PRIMARY_PURPLE : colors.textSoft}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        {
                          color: isSelected ? PRIMARY_PURPLE : colors.text,
                          fontWeight: isSelected ? "600" : "400",
                        },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={PRIMARY_PURPLE}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
    maxHeight: "70%",
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(168,85,247,0.2)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  optionsList: {
    paddingHorizontal: SPACING.lg,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: SPACING.md,
  },
  optionLabel: {
    fontSize: 15,
  },
});


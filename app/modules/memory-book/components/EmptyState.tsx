import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  isDarkMode: boolean;
  iconColor?: string;
};

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  isDarkMode,
  iconColor,
}: EmptyStateProps) {
  const colors = {
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    accent: "#a855f7",
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: colors.chipBg,
            borderColor: (iconColor || colors.accent) + (isDarkMode ? "66" : "80"),
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={48}
          color={iconColor || colors.accent}
        />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textSoft }]}>
        {subtitle}
      </Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={[
            styles.actionButton,
            {
              backgroundColor: colors.accent,
            },
          ]}
        >
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0.2,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});


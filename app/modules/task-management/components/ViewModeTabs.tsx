import React from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ViewMode } from "../utils/types";
import { MODULE_COLOR } from "../TS FILE/TaskSharedUI";

interface ViewModeTabsProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const ViewModeTabs: React.FC<ViewModeTabsProps> = ({
  viewMode,
  onViewModeChange,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    chipTabsWrapper: {
      flexDirection: "row",
      borderRadius: 20,
      backgroundColor: theme.isDark ? "#020617" : "#E5E7EB",
      padding: 5,
      marginBottom: 12,
    },
    tabChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    tabChipActive: {
      backgroundColor: MODULE_COLOR,
      shadowColor: MODULE_COLOR,
      shadowOpacity: theme.isDark ? 0.5 : 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    tabText: {
      fontSize: 14,
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    tabTextActive: {
      color: "#0F172A",
    },
    tabTextInactive: {
      color: theme.isDark ? "#9CA3AF" : "#6B7280",
    },
  });

  const modes: { mode: ViewMode; label: string }[] = [
    { mode: "all", label: "All Tasks" },
    { mode: "assignedToMe", label: "Assigned To Me" },
    { mode: "ai", label: "AI Assistant" },
  ];

  return (
    <View style={styles.chipTabsWrapper}>
      {modes.map(({ mode, label }) => {
        const active = viewMode === mode;
        return (
          <TouchableOpacity
            key={mode}
            onPress={() => onViewModeChange(mode)}
            activeOpacity={0.7}
            style={[styles.tabChip, active && styles.tabChipActive]}
          >
            <Text
              style={[
                styles.tabText,
                active ? styles.tabTextActive : styles.tabTextInactive,
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

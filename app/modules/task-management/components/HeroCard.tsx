import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";
import { TaskType } from "../utils/types";
import { formatDate } from "../utils/taskUtils";
import { MODULE_COLOR } from "../TS FILE/TaskSharedUI";

interface HeroCardProps {
  topFocusTasks: TaskType[];
  overdueCount: number;
  completionRate: number;
  completedCount: number;
  totalCount: number;
  doNowCount: number;
  overdueTasksCount: number;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  topFocusTasks,
  overdueCount,
  completionRate,
  completedCount,
  totalCount,
  doNowCount,
  overdueTasksCount,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    heroCard: {
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      marginBottom: 14,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.isDark ? "#000" : MODULE_COLOR,
      shadowOpacity: theme.isDark ? 0.45 : 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      overflow: "hidden",
    },
    heroRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    heroTitle: {
      fontSize: 17,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      letterSpacing: 0.2,
    },
    heroSubtitle: {
      fontSize: 13,
      fontWeight: "400",
      color: theme.colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    heroBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: theme.isDark ? "#022C22" : "#DCFCE7",
    },
    heroBadgeText: {
      fontSize: 12,
      color: theme.isDark ? "#6EE7B7" : "#166534",
      fontWeight: "600",
      letterSpacing: 0.2,
    },
    focusList: {
      marginTop: 8,
    },
    focusItemRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
    },
    focusBullet: {
      width: 6,
      height: 6,
      borderRadius: 999,
      backgroundColor: MODULE_COLOR,
      marginRight: 8,
    },
    focusText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "500",
      color: theme.colors.textPrimary,
      letterSpacing: 0.1,
    },
    focusMeta: {
      fontSize: 12,
      fontWeight: "400",
      color: theme.colors.textSecondary,
      marginTop: 3,
      letterSpacing: 0.1,
    },
    progressWrapper: {
      marginTop: 10,
    },
    progressLabelRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 4,
    },
    progressBarBase: {
      height: 6,
      borderRadius: 999,
      backgroundColor: theme.isDark ? "#111827" : "#E5E7EB",
      overflow: "hidden",
    },
    progressBarFill: {
      height: 6,
      borderRadius: 999,
      backgroundColor: MODULE_COLOR,
    },
    insightRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 8,
    },
    insightPill: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 4,
      marginRight: 6,
      marginTop: 4,
      backgroundColor: theme.isDark ? "#020617" : "#E5E7EB",
      borderWidth: 1,
      borderColor: theme.isDark ? "#1F2937" : "#D1D5DB",
    },
    insightPillText: {
      fontSize: 12,
      fontWeight: "500",
      color: theme.colors.textSecondary,
      letterSpacing: 0.1,
    },
    neonBottomLine: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 3,
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
      backgroundColor: MODULE_COLOR,
      shadowColor: MODULE_COLOR,
      shadowOpacity: 0.9,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
    },
  });

  return (
    <Card style={styles.heroCard}>
      <View style={styles.heroRow}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.heroTitle}>Today's AI Focus</Text>
          <Text style={styles.heroSubtitle}>
            Based on due dates and priority scores, these are the tasks that
            matter most right now.
          </Text>
        </View>
        <View style={styles.heroBadge}>
          <Text style={styles.heroBadgeText}>
            {overdueCount > 0 ? `${overdueCount} overdue` : "All on track"}
          </Text>
        </View>
      </View>

      <View style={styles.focusList}>
        {topFocusTasks.length === 0 ? (
          <Text style={styles.focusText}>
            No active tasks. Create a new task from the Task menu to get AI
            guidance.
          </Text>
        ) : (
          topFocusTasks.map((t, idx) => (
            <View key={t.id} style={styles.focusItemRow}>
              <View style={styles.focusBullet} />
              <View style={{ flex: 1 }}>
                <Text style={styles.focusText} numberOfLines={1}>
                  {idx + 1}. {t.taskName}
                </Text>
                <Text style={styles.focusMeta}>
                  Score {t.priorityScore ?? 0} • Due {formatDate(t.dueDate)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.progressWrapper}>
        <View style={styles.progressLabelRow}>
          <Text style={styles.focusMeta}>
            Completion rate: {Math.round(completionRate * 100)}%
          </Text>
          <Text style={styles.focusMeta}>
            {completedCount}/{totalCount} done
          </Text>
        </View>
        <View style={styles.progressBarBase}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${Math.round(completionRate * 100)}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.insightRow}>
        <View style={styles.insightPill}>
          <Ionicons
            name="flame"
            size={14}
            color="#F97316"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.insightPillText}>{doNowCount} high-priority</Text>
        </View>
        <View style={styles.insightPill}>
          <Ionicons
            name="time-outline"
            size={14}
            color="#FACC15"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.insightPillText}>
            {overdueTasksCount} overdue task(s)
          </Text>
        </View>
        <View style={styles.insightPill}>
          <Ionicons
            name="checkmark-done-outline"
            size={14}
            color="#4ADE80"
            style={{ marginRight: 4 }}
          />
          <Text style={styles.insightPillText}>
            {completedCount} completed overall
          </Text>
        </View>
      </View>

      <View style={styles.neonBottomLine} />
    </Card>
  );
};

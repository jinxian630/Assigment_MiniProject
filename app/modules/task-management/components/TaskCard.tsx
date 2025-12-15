import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Text } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { TaskType } from "../utils/types";
import { formatDate, isOverdue } from "../utils/taskUtils";
import { useTheme } from "@/hooks/useTheme";

interface TaskCardProps {
  task: TaskType;
  onToggleComplete: (task: TaskType) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
}) => {
  const { theme } = useTheme();
  const score = task.priorityScore ?? 0;

  let neonColor = "#22D3EE";
  if (score >= 90) neonColor = "#F87171";
  else if (score >= 60) neonColor = "#FBBF24";
  else if (score >= 30) neonColor = "#60A5FA";
  else neonColor = "#9CA3AF";

  const isDone = task.completed === true;

  const styles = StyleSheet.create({
    taskCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      padding: 12,
      marginBottom: 10,
      position: "relative",
      overflow: "hidden",
      shadowColor: neonColor,
      shadowOpacity: theme.isDark ? 0.35 : 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
      opacity: isDone ? 0.6 : 1,
    },
    contentRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    checkbox: {
      marginRight: 10,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: 15,
      fontWeight: "700",
      color: theme.colors.textPrimary,
      marginBottom: 2,
      textDecorationLine: isDone ? "line-through" : "none",
    },
    details: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    meta: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginTop: 4,
    },
    neonLine: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      height: 4,
      backgroundColor: neonColor,
      shadowColor: neonColor,
      shadowOpacity: 0.9,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
    },
  });

  return (
    <View style={styles.taskCard}>
      <View style={styles.contentRow}>
        <TouchableOpacity
          onPress={() => onToggleComplete(task)}
          style={styles.checkbox}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isDone ? "checkmark-circle" : "ellipse-outline"}
            size={22}
            color={isDone ? "#22C55E" : theme.colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {task.taskName}
          </Text>

          {task.details ? (
            <Text style={styles.details} numberOfLines={1}>
              {task.details}
            </Text>
          ) : null}

          <Text style={styles.meta}>
            Start: {formatDate(task.startDate)} • Due:{" "}
            {formatDate(task.dueDate)}
            {isOverdue(task.dueDate) ? " • Overdue" : ""}
          </Text>
        </View>
      </View>

      <View style={styles.neonLine} />
    </View>
  );
};

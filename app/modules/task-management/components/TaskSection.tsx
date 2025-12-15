import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "react-native-rapi-ui";
import { useTheme } from "@/hooks/useTheme";
import { TaskType } from "../utils/types";
import { TaskCard } from "./TaskCard";

interface TaskSectionProps {
  title: string;
  subtitle: string;
  tasks: TaskType[];
  onToggleComplete: (task: TaskType) => void;
}

export const TaskSection: React.FC<TaskSectionProps> = ({
  title,
  subtitle,
  tasks,
  onToggleComplete,
}) => {
  const { theme } = useTheme();

  if (tasks.length === 0) return null;

  const styles = StyleSheet.create({
    section: {
      marginTop: 18,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 2,
      color: theme.colors.textPrimary,
    },
    sectionSubtitle: {
      fontSize: 11,
      color: theme.colors.textSecondary,
      marginBottom: 8,
    },
  });

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      {tasks.map((task) => (
        <TaskCard
          key={task.id}
          task={task}
          onToggleComplete={onToggleComplete}
        />
      ))}
    </View>
  );
};

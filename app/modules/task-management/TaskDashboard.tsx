import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { doc, updateDoc, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { MODULE_COLOR } from "./utils/sharedUI";
import { TaskType, ViewMode } from "./utils/types";
import { useTasks } from "./hooks/useTasks";
import { useAIAssistant } from "./hooks/useAIAssistant";
import { HeroCard } from "./components/HeroCard";
import { SummaryCards } from "./components/SummaryCards";
import { ViewModeTabs } from "./components/ViewModeTabs";
import { TaskSection } from "./components/TaskSection";
import { AICard } from "./components/AICard";
import { createDashboardStyles } from "./styles/dashboardStyles";

export default function TaskDashboard() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const db = getFirestore();
  const auth = getAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("all");

  const { activeTasks, buckets, stats, topFocusTasks } = useTasks(viewMode);
  const {
    aiQuestion,
    setAiQuestion,
    aiAnswer,
    aiLoading,
    chatHistory,
    aiScrollRef,
    handleAskPriorityAI,
    clearChat,
  } = useAIAssistant(activeTasks);

  const styles = useMemo(
    () => createDashboardStyles(theme, MODULE_COLOR),
    [theme]
  );

  const handleCompleteTaskToggle = async (task: TaskType) => {
    if (!task) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to update tasks.");
      return;
    }

    try {
      const ref = doc(db, "Tasks", task.id);
      await updateDoc(ref, {
        completed: !task.completed,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Failed to update task:", error);
      Alert.alert("Error", "Failed to update task");
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.headerRow}>
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="secondary"
              size="medium"
            />
            <Text style={styles.headerTitle}>AI Task Dashboard</Text>
            <View style={styles.headerRight}>
              <IconButton
                icon={theme.isDark ? "moon" : "sunny"}
                onPress={() => toggleTheme && toggleTheme()}
                variant="secondary"
                size="small"
              />
            </View>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={{ paddingBottom: 140 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header with orb icon */}
            <View style={styles.headerContainer}>
              <View style={styles.headerOrb}>
                <Ionicons
                  name="sparkles-outline"
                  size={62}
                  color={MODULE_COLOR}
                />
              </View>
              <Text style={styles.headerTitleText}>AI Prioritized Tasks</Text>
              <Text style={styles.headerSubtitleText}>
                Smart suggestions based on urgency & priority
              </Text>
            </View>

            {/* Today's AI Focus card */}
            <HeroCard
              topFocusTasks={topFocusTasks}
              overdueCount={stats.overdueTasksAll}
              completionRate={stats.completionRate}
              completedCount={stats.completedTasksAll}
              totalCount={stats.totalTasksAll}
              doNowCount={buckets.doNow.length}
              overdueTasksCount={stats.overdueTasksAll}
            />

            {/* Summary cards row */}
            <SummaryCards
              doNow={buckets.doNow.length}
              doSoon={buckets.doSoon.length}
              plan={buckets.plan.length}
              low={buckets.low.length}
            />

            <Text style={styles.activeTasksHint}>
              {stats.totalActive} active tasks sorted by AI priority score
            </Text>

            {/* View mode tabs */}
            <ViewModeTabs viewMode={viewMode} onViewModeChange={setViewMode} />

            {/* Content based on view mode */}
            {viewMode === "ai" ? (
              <AICard
                totalActive={stats.totalActive}
                aiQuestion={aiQuestion}
                setAiQuestion={setAiQuestion}
                aiAnswer={aiAnswer}
                aiLoading={aiLoading}
                chatHistory={chatHistory}
                aiScrollRef={aiScrollRef}
                onAskAI={handleAskPriorityAI}
                onClearChat={clearChat}
              />
            ) : (
              <>
                <TaskSection
                  title="Do Now (Highest Priority)"
                  subtitle="Tasks that are urgent and important. Work on these first."
                  tasks={buckets.doNow}
                  onToggleComplete={handleCompleteTaskToggle}
                />
                <TaskSection
                  title="Do Soon"
                  subtitle="Tasks that are important but slightly less urgent."
                  tasks={buckets.doSoon}
                  onToggleComplete={handleCompleteTaskToggle}
                />
                <TaskSection
                  title="Plan / Later"
                  subtitle="Tasks with medium priority. Keep them on your radar."
                  tasks={buckets.plan}
                  onToggleComplete={handleCompleteTaskToggle}
                />
                <TaskSection
                  title="Low Priority"
                  subtitle="Nice-to-do tasks with lower urgency."
                  tasks={buckets.low}
                  onToggleComplete={handleCompleteTaskToggle}
                />

                {stats.totalActive === 0 && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                      No active tasks to show.
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

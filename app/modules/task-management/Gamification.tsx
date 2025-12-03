// src/screens/Task/Gamification.tsx
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  Button,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";
import {
  getGamificationStats,
  GamificationStats,
  computeLevelFromPoints,
} from "./taskGamifications";

export default function TaskGamificationScreen() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
  const auth = getAuth();

  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setLoading(true);
    try {
      const data = await getGamificationStats(user.uid);
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const totalPoints = stats?.totalPoints ?? 0;
  const level = stats?.level ?? computeLevelFromPoints(totalPoints) ?? 1;
  const streak = stats?.streak ?? 0;
  const completedTasks = stats?.completedTasks ?? 0;

  const pointsThisLevel = totalPoints % 100;
  const progress = Math.min(pointsThisLevel / 100, 1);
  const nextLevel = level + 1;
  const pointsToNextLevel = 100 - pointsThisLevel;

  return (
    <Layout>
      <TopNav
        middleContent="My Productivity"
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
      />

      <ScrollView contentContainerStyle={styles.container}>
        {/* Refresh row */}
        <View style={styles.topRow}>
          <Button
            size="sm"
            text={loading ? "Refreshing..." : "Refresh"}
            onPress={loadStats}
            disabled={loading}
          />
          <Text size="sm" style={{ marginLeft: 8, opacity: 0.7 }}>
            Complete tasks to earn XP and maintain your streak.
          </Text>
        </View>

        {/* Streak: main highlight card */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDarkmode ? "#020617" : "#fef3c7" },
          ]}
        >
          <Text fontWeight="bold" style={{ fontSize: 16, marginBottom: 4 }}>
            Daily Streak
          </Text>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            {streak} 🔥
          </Text>
          <Text style={{ fontSize: 13, opacity: 0.8, marginBottom: 6 }}>
            Days in a row you’ve completed at least one task.
          </Text>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>
            Your streak only resets when you let a task become{" "}
            <Text fontWeight="bold">overdue</Text> and you didn’t complete any
            tasks that day.
          </Text>
        </View>

        {/* Level + progress bar */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDarkmode ? "#020617" : "#eef2ff" },
          ]}
        >
          <Text fontWeight="bold" style={{ fontSize: 18, marginBottom: 4 }}>
            Level {level}
          </Text>
          <Text style={{ marginBottom: 8 }}>
            {pointsThisLevel}/100 XP to next level
          </Text>
          <View style={styles.progressBarBackground}>
            <View
              style={[styles.progressBarFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={{ fontSize: 12, marginTop: 6, opacity: 0.7 }}>
            Next: <Text fontWeight="bold">Level {nextLevel}</Text> — earn{" "}
            <Text fontWeight="bold">{pointsToNextLevel}</Text> more XP to level
            up.
          </Text>
        </View>

        {/* Summary stats */}
        <View
          style={[
            styles.card,
            { backgroundColor: isDarkmode ? "#020617" : "#f1f5f9" },
          ]}
        >
          <Text fontWeight="bold" style={{ marginBottom: 8 }}>
            Summary
          </Text>
          <Text style={{ fontSize: 14, marginBottom: 4 }}>
            Total XP: <Text fontWeight="bold">{totalPoints}</Text>
          </Text>
          <Text style={{ fontSize: 14, marginBottom: 4 }}>
            Tasks completed: <Text fontWeight="bold">{completedTasks}</Text>
          </Text>
          <Text style={{ fontSize: 12, opacity: 0.7 }}>
            Finish tasks before they become overdue to keep your streak alive.
          </Text>
        </View>

        {/* Simple badges */}
        <View style={styles.card}>
          <Text fontWeight="bold" style={{ marginBottom: 6 }}>
            Badges
          </Text>
          <Text style={{ fontSize: 13 }}>
            {completedTasks >= 1 && "✅ First Task Completed\n"}
            {completedTasks >= 10 && "🏅 Task Finisher (10+ tasks)\n"}
            {completedTasks >= 30 && "🏆 Task Master (30+ tasks)\n"}
            {streak >= 3 && "🔥 3-Day Streak\n"}
            {streak >= 7 && "💥 7-Day Streak Warrior\n"}
            {level >= 5 && "⭐ Level 5 Achiever\n"}
            {level >= 10 && "🌟 Productivity Pro (Level 10)\n"}
            {completedTasks < 1 &&
              "Complete your first task to unlock your first badge!"}
          </Text>
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    paddingBottom: 24,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  progressBarBackground: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#2563eb",
  },
});

// src/screens/Task/Gamifications.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Modal,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Text,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

import {
  GamificationStats,
  subscribeGamificationStats,
  awardTaskCompletionOnce,
} from "../task-management/taskGamifications";

const MODULE_COLOR = "#38BDF8";

/** 🔧 Neon card: border + glow only (NO background here) */
const createNeonCardShell = (
  accentColor: string,
  theme: any,
  extra: any = {}
) => {
  return {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: accentColor + "66",

    shadowColor: accentColor,
    shadowOpacity: theme.isDark ? 0.9 : 0.5,
    shadowRadius: theme.isDark ? 30 : 20,
    shadowOffset: { width: 0, height: 0 },

    elevation: theme.isDark ? 18 : 8,
    ...extra,
  };
};

export default function GamificationsScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const auth = getAuth();

  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isDark = theme?.isDark === true;

  // ✅ Animated XP bar
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },

        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        },
        headerTitle: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
        },
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
        },

        contentScroll: {
          flex: 1,
          paddingHorizontal: 16,
          paddingTop: 10,
        },

        // ===== HERO ORB (same as EventList icon) =====
        heroWrapper: {
          alignItems: "center",
          marginTop: 12,
          marginBottom: 18,
        },
        heroOrbOuter: {
          width: 120,
          height: 120,
          borderRadius: 60,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: theme.spacing.md,
          backgroundColor: `${MODULE_COLOR}10`,
          shadowColor: MODULE_COLOR,
          shadowOpacity: theme.isDark ? 0.7 : 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        },
        heroLevelText: {
          marginTop: 1,
          fontSize: 19,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        heroRankText: {
          marginTop: 12,
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        heroSubtitle: {
          marginTop: 4,
          fontSize: 12,
          textAlign: "center",
          color: theme.colors.textSecondary,
        },

        // XP progress
        sectionTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        },
        sectionTitle: {
          fontSize: 15,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        sectionSubtitle: {
          fontSize: 11,
          color: theme.colors.textSecondary,
        },

        neonShellCard: createNeonCardShell("#ff00ffff", theme, {
          backgroundColor: theme.colors.cardBackground,
          paddingVertical: 12,
          paddingHorizontal: 14,
        }),
        neonBottomLine: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        },

        progressCard: {
          marginBottom: 14,
        },
        progressLabelRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 6,
        },
        progressBarTrack: {
          height: 8,
          borderRadius: 999,
          backgroundColor: isDark ? "#0B1120" : "#DBEAFE",
          overflow: "hidden",
        },
        progressBarFill: {
          height: 8,
          borderRadius: 999,
          backgroundColor: "#ff00ffff",
        },

        chipRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginTop: 10,
        },
        chip: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isDark ? "#1F2937" : "#CBD5E1",
          backgroundColor: isDark ? "#020617" : "#F9FAFB",
          marginRight: 6,
          marginTop: 4,
        },
        chipText: {
          fontSize: 11,
          color: theme.colors.textSecondary,
        },
        chipButton: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        },
        chipButtonText: {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
        },

        smallCardsRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 10,
        },
        smallCard: {
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 10,
          marginHorizontal: 4,
        },
        smallCardLabel: {
          fontSize: 11,
          color: theme.colors.textSecondary,
        },
        smallCardValue: {
          fontSize: 18,
          fontWeight: "700",
          marginTop: 2,
          color: theme.colors.textPrimary,
        },

        helperText: {
          marginTop: 6,
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginBottom: 80,
        },

        centerWrapper: {
          marginTop: 40,
          alignItems: "center",
        },
        errorText: {
          marginTop: 8,
          fontSize: 13,
          color: "#FCA5A5",
        },
        floatingAdd: {
          position: "absolute",
          top: -34,
          alignSelf: "center",
          zIndex: 10,
          elevation: 10,
        },
        floatingAddButton: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: MODULE_COLOR,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 3,
          borderColor: MODULE_COLOR + "AA",
          shadowColor: MODULE_COLOR,
          shadowOpacity: 0.9,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 25,
          zIndex: 400,
        },
        bottomBar: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: Platform.OS === "ios" ? 16 : 12,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingVertical: 10,
          backgroundColor: isDark
            ? "rgba(10,10,15,0.98)"
            : "rgba(15,23,42,0.95)",
          borderRadius: 26,
          borderWidth: 1,
          borderColor: isDark ? "#1F2937" : "#111827",
          shadowColor: "#000",
          shadowOpacity: 0.4,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -2 },
          zIndex: 10,
          elevation: 10,
        },
        bottomBarItem: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        bottomBarIconWrapper: {
          padding: 6,
          borderRadius: 999,
        },
        bottomBarLabel: {
          fontSize: 11,
          marginTop: 2,
          color: theme.colors.textSecondary,
        },
      }),
    [theme, isDark]
  );

  // ✅ Real-time subscription + animated bar update
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setError("You need to be logged in to see your gamification stats.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = subscribeGamificationStats(
      user.uid,
      (s) => {
        setStats(s);
        setLoading(false);

        Animated.timing(progressAnim, {
          toValue: s.progressToNextLevel,
          duration: 650,
          useNativeDriver: false, // width animation needs false
        }).start();
      },
      (err) => {
        console.error("subscribeGamificationStats error:", err);
        setError("Unable to load statistics.");
        setLoading(false);
      }
    );

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.push("/")}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>My Productivity</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon={isDark ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          {loading ? (
            <View style={styles.centerWrapper}>
              <ActivityIndicator size="large" color={MODULE_COLOR} />
            </View>
          ) : error ? (
            <View style={styles.centerWrapper}>
              <Ionicons name="warning-outline" size={28} color="#FCA5A5" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : !stats ? (
            <View style={styles.centerWrapper}>
              <Text style={styles.errorText}>No stats to show yet.</Text>
            </View>
          ) : (
            <>
              {/* HERO ORB */}
              <View style={styles.heroWrapper}>
                <View style={styles.heroOrbOuter}>
                  <Ionicons
                    name="game-controller-outline"
                    size={64}
                    color={MODULE_COLOR}
                  />
                </View>

                <Text style={styles.heroLevelText}>Level {stats.level}</Text>
                <Text style={styles.heroRankText}>{stats.rankTitle}</Text>
                <Text style={styles.heroSubtitle}>
                  Stay organized and productive. Every completed task gives you
                  XP, levels and streaks.
                </Text>
              </View>

              {/* XP PROGRESS – neon card */}
              <View style={{ marginBottom: 8 }}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>XP Progress</Text>
                  <Text style={styles.sectionSubtitle}>
                    {stats.xpInLevel}/{stats.xpNeededForLevel} XP this level
                  </Text>
                </View>

                <Card style={[styles.neonShellCard, styles.progressCard]}>
                  <View style={styles.progressLabelRow}>
                    <Text style={styles.sectionSubtitle}>
                      Total points: {stats.totalPoints}
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      {Math.round(stats.progressToNextLevel * 100)}% to next
                      level
                    </Text>
                  </View>

                  {/* ✅ Animated progress bar */}
                  <View
                    style={styles.progressBarTrack}
                    onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
                  >
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, trackWidth || 0],
                          }),
                        },
                      ]}
                    />
                  </View>

                  <View style={styles.chipRow}>
                    <View style={styles.chip}>
                      <Ionicons
                        name="sparkles-outline"
                        size={14}
                        color={"#ffd000ff"}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.chipText}>
                        +10 XP per completed task
                      </Text>
                    </View>
                    <View style={styles.chip}>
                      <Ionicons
                        name="checkbox-outline"
                        size={14}
                        color={MODULE_COLOR}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.chipText}>
                        +5 XP per completed subtask
                      </Text>
                    </View>
                    <View style={styles.chip}>
                      <Ionicons
                        name="flame-outline"
                        size={14}
                        color="#F97316"
                        style={{ marginRight: 4 }}
                      />
                      <Text style={styles.chipText}>
                        Streak only resets if tasks are overdue
                      </Text>
                    </View>
                  </View>

                  {/* neon bottom glow line */}
                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: "#ff00ffff",
                        shadowColor: MODULE_COLOR,
                        shadowOpacity: 0.9,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  />
                </Card>
              </View>

              {/* SMALL STAT CARDS – with neon bottom lines */}
              <View style={styles.smallCardsRow}>
                {/* Streak */}
                <Card
                  style={[
                    createNeonCardShell("#F97316", theme, {
                      backgroundColor: theme.colors.cardBackground,
                    }),
                    styles.smallCard,
                  ]}
                >
                  <Text style={styles.smallCardLabel}>Daily streak</Text>
                  <Text style={styles.smallCardValue}>{stats.streak} 🔥</Text>

                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: "#F97316",
                        shadowColor: "#F97316",
                        shadowOpacity: 0.9,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  />
                </Card>

                {/* Completed tasks */}
                <Card
                  style={[
                    createNeonCardShell("#22C55E", theme, {
                      backgroundColor: theme.colors.cardBackground,
                    }),
                    styles.smallCard,
                  ]}
                >
                  <Text style={styles.smallCardLabel}>Completed tasks</Text>
                  <Text style={styles.smallCardValue}>
                    {stats.completedTasks}
                  </Text>

                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: "#22C55E",
                        shadowColor: "#22C55E",
                        shadowOpacity: 0.9,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  />
                </Card>

                {/* Level / Rank */}
                <Card
                  style={[
                    createNeonCardShell(MODULE_COLOR, theme, {
                      backgroundColor: theme.colors.cardBackground,
                    }),
                    styles.smallCard,
                  ]}
                >
                  <Text style={styles.smallCardLabel}>Rank</Text>
                  <Text style={styles.smallCardValue}>{stats.rankTitle}</Text>

                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: MODULE_COLOR,
                        shadowColor: MODULE_COLOR,
                        shadowOpacity: 0.9,
                        shadowRadius: 12,
                        shadowOffset: { width: 0, height: 0 },
                      },
                    ]}
                  />
                </Card>
              </View>

              <Text style={styles.helperText}>
                Tip: Keep finishing tasks without letting any become overdue to
                grow your streak and unlock higher ranks.
              </Text>
            </>
          )}
        </ScrollView>

        <Modal
          visible={showAddMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddMenu(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={1}
            onPressOut={() => setShowAddMenu(false)}
          >
            <Card
              style={[
                styles.neonShellCard,
                {
                  width: "70%",
                  backgroundColor: theme.isDark ? "#020617" : "#0B1220",
                },
              ]}
            >
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: MODULE_COLOR,
                    shadowColor: MODULE_COLOR,
                    shadowOpacity: 0.9,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
              <Text
                style={{
                  fontSize: theme.typography.fontSizes.md,
                  fontWeight: theme.typography.fontWeights.bold,
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.textPrimary,
                }}
              >
                Add...
              </Text>

              <TouchableOpacity
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/TaskAdd");
                }}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: MODULE_COLOR,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                  Add Task
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/EventAdd");
                }}
                style={[styles.chipButton, { backgroundColor: "#0256ffff" }]}
              >
                <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                  Add Event
                </Text>
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        </Modal>

        {/* 🔻 BOTTOM TASKBAR NAVIGATION */}
        <View style={styles.bottomBar}>
          {/* Center FAB attached to bar */}
          <View style={styles.floatingAdd}>
            <View
              style={{
                width: 65,
                height: 65,
                borderRadius: 32,
                borderColor: MODULE_COLOR,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#000",
                shadowColor: MODULE_COLOR,
                shadowOpacity: 1,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <TouchableOpacity
                style={styles.floatingAddButton}
                onPress={() => setShowAddMenu(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={34} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* My Task */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Task
            </Text>
          </TouchableOpacity>

          {/* My Event */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/EventList")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Event
            </Text>
          </TouchableOpacity>

          {/* Productivity (current) */}
          <TouchableOpacity style={styles.bottomBarItem} disabled>
            <View
              style={[
                styles.bottomBarIconWrapper,
                { backgroundColor: `${MODULE_COLOR}22` },
              ]}
            >
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={MODULE_COLOR}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: MODULE_COLOR, fontWeight: "600" },
              ]}
            >
              Productivity
            </Text>
          </TouchableOpacity>

          {/* Chart */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/TaskChart")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Chart
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

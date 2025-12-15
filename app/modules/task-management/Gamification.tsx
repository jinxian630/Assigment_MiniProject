import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import TaskBottomBar from "./components/TaskBottomBar";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

import {
  GamificationStats,
  subscribeGamificationStats,
} from "./utils/gamification";
const XP_ACCENT = "#ff00ffff";
import {
  MODULE_COLOR,
  createNeonCardShell,
  NeonBottomLine,
} from "./utils/sharedUI";
export default function GamificationsScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const auth = getAuth();

  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDark = theme?.isDark === true;

  const progressAnim = useRef(new Animated.Value(0)).current;
  const [trackWidth, setTrackWidth] = useState(0);

  const percentText = useMemo(() => {
    if (!stats) return "0%";
    const pct = Math.round((stats.progressToNextLevel || 0) * 100);
    return `${Math.max(0, Math.min(100, pct))}%`;
  }, [stats]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        /* -------------------------- Styles -------------------------- */
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
          paddingHorizontal: theme.spacing.screenPadding,
          paddingTop: 10,
        },

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

        // Titles
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

        neonShellCard: createNeonCardShell(XP_ACCENT, theme, {
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
          backgroundColor: XP_ACCENT,
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
      }),
    [theme, isDark]
  );

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
          toValue: Math.max(0, Math.min(1, s.progressToNextLevel || 0)),
          duration: 650,
          useNativeDriver: false,
        }).start();
      },
      (err) => {
        console.error("subscribeGamificationStats error:", err);
        setError("Unable to load statistics.");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [auth, progressAnim]);

  const onTrackLayout = useCallback((e: any) => {
    const w = e?.nativeEvent?.layout?.width ?? 0;
    setTrackWidth(w);
  }, []);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
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

              {/* XP PROGRESS */}
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
                      {percentText} to next level
                    </Text>
                  </View>

                  <View
                    style={styles.progressBarTrack}
                    onLayout={onTrackLayout}
                  >
                    <Animated.View
                      style={[
                        styles.progressBarFill,
                        {
                          width: progressAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, Math.max(0, trackWidth)],
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

                  <NeonBottomLine
                    color={XP_ACCENT}
                    style={styles.neonBottomLine}
                  />
                </Card>
              </View>

              <View style={styles.smallCardsRow}>
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
                  <NeonBottomLine
                    color="#F97316"
                    style={styles.neonBottomLine}
                  />
                </Card>

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
                  <NeonBottomLine
                    color="#22C55E"
                    style={styles.neonBottomLine}
                  />
                </Card>

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
                  <NeonBottomLine
                    color={MODULE_COLOR}
                    style={styles.neonBottomLine}
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
        <TaskBottomBar active="Productivity" useAddMenu />
      </SafeAreaView>
    </GradientBackground>
  );
}

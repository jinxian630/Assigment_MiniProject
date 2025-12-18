import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { GradientBackground } from "@/components/common/GradientBackground";
import InteractiveButton from "./components/InteractiveButton";
import { subscribeToUserMemories } from "./utils/firebaseHelpers";
import type { Memory } from "./utils/memoryHelpers";
import { checkOllamaConnection } from "./utils/ollamaHelper";
import BottomNavBar from "./components/BottomNavBar";
import {
  generateComprehensiveInsights,
  extractThemes,
  getHighlights,
  comparePeriods,
  type ComprehensiveInsights,
} from "./utils/aiInsightsHelper";

const PRIMARY_PURPLE = "#a855f7";

type TimeRange = "7D" | "30D" | "90D";

export default function AIInsightsPage() {
  const router = useRouter();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30D");
  const [ollamaAvailable, setOllamaAvailable] = useState(false);
  const [moodTrends, setMoodTrends] = useState<
    Array<{ date: string; mood: number }>
  >([]);
  const [loadingAI, setLoadingAI] = useState(false);

  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
    accent: PRIMARY_PURPLE,
  };

  useEffect(() => {
    const userId = user?.id || (user as any)?.uid;
    if (!userId) {
      setLoading(false);
      setError("Please log in to view insights");
      return;
    }

    setLoading(true);
    setError(null);
    setMemories([]); // Reset memories

    let timeout: ReturnType<typeof setTimeout>;
    let unsubscribe: (() => void) | null = null;
    let hasReceivedData = false;

    try {
      unsubscribe = subscribeToUserMemories(userId, (memoriesList) => {
        console.log("AI Insights: Received memories:", memoriesList.length);
        hasReceivedData = true;
        setMemories(memoriesList);
        setLoading(false);
        setError(null);
        if (timeout) clearTimeout(timeout);
      });

      // Timeout fallback - stop loading after 5 seconds (reduced from 10)
      timeout = setTimeout(() => {
        if (!hasReceivedData) {
          console.warn("AI Insights: Loading timeout - no data received");
          setLoading(false);
          setError(
            "Loading took too long. This might be due to Firebase permissions or connection issues. Please check your Firebase configuration."
          );
          // Set empty memories so page can still render
          setMemories([]);
        }
      }, 5000);
    } catch (err: any) {
      console.error("AI Insights: Error subscribing to memories:", err);
      setLoading(false);
      setError(
        err.message ||
          "Failed to connect to Firebase. Please check your Firebase configuration."
      );
      setMemories([]);
    }

    return () => {
      if (timeout) clearTimeout(timeout);
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  useEffect(() => {
    checkOllamaConnection().then(setOllamaAvailable);
  }, []);

  // Filter memories by time range
  const filteredMemories = useMemo(() => {
    const now = Date.now();
    const daysAgo = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const cutoff = now - daysAgo * 24 * 60 * 60 * 1000;
    return memories.filter((m) => m.startDate >= cutoff);
  }, [memories, timeRange]);

  // Calculate mood trends over time
  useEffect(() => {
    if (filteredMemories.length === 0) {
      setMoodTrends([]);
      return;
    }

    // Group memories by day and calculate average mood for each day
    const dailyMood: Record<string, number[]> = {};

    filteredMemories.forEach((memory) => {
      if (memory.emotionSpectrum && memory.startDate) {
        const date = new Date(memory.startDate);
        const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD

        const mood =
          (memory.emotionSpectrum.energy +
            memory.emotionSpectrum.clarity +
            memory.emotionSpectrum.warmth -
            memory.emotionSpectrum.stress +
            100) /
          4;

        if (!dailyMood[dateKey]) {
          dailyMood[dateKey] = [];
        }
        dailyMood[dateKey].push(mood);
      }
    });

    // Calculate average mood per day and sort by date
    const trends = Object.entries(dailyMood)
      .map(([date, moods]) => ({
        date,
        mood: Math.round(moods.reduce((sum, m) => sum + m, 0) / moods.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14); // Last 14 days for visualization

    setMoodTrends(trends);
  }, [filteredMemories]);

  // Calculate period comparison
  const periodComparison = useMemo(() => {
    if (filteredMemories.length === 0) return null;
    const daysAgo = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const previousCutoff = Date.now() - daysAgo * 2 * 24 * 60 * 60 * 1000;
    const previousMemories = memories.filter(
      (m) =>
        m.startDate >= previousCutoff &&
        m.startDate < previousCutoff + daysAgo * 24 * 60 * 60 * 1000
    );
    return comparePeriods(filteredMemories, previousMemories);
  }, [filteredMemories, memories, timeRange]);

  // Get insights (async) - Generate immediately, enhance with AI if available
  const [insights, setInsights] = useState<ComprehensiveInsights | null>(null);

  useEffect(() => {
    if (filteredMemories.length === 0) {
      setInsights(null);
      setLoadingAI(false);
      return;
    }

    let isCancelled = false;

    // Generate basic insights immediately (without AI) - with timeout
    const basicTimeout = setTimeout(() => {
      if (!isCancelled && !insights) {
        console.warn("Basic insights generation timeout - using fallback");
        setInsights({
          overallMood: "Neutral",
          moodScore: 50,
          emotionDistribution: [],
          suggestions: ["Not enough data for insights yet"],
        });
        setLoadingAI(false);
      }
    }, 3000);

    generateComprehensiveInsights(filteredMemories, false)
      .then((basicResult) => {
        clearTimeout(basicTimeout);
        if (!isCancelled) {
          setInsights(basicResult);
          setLoadingAI(false);
        }
      })
      .catch((error) => {
        clearTimeout(basicTimeout);
        console.error("Error generating basic insights:", error);
        if (!isCancelled) {
          // Set fallback insights so page can render
          setInsights({
            overallMood: "Neutral",
            moodScore: 50,
            emotionDistribution: [],
            suggestions: ["Unable to generate insights. Please try again."],
          });
          setLoadingAI(false);
        }
      });

    // Then try to enhance with AI if available (non-blocking)
    if (ollamaAvailable) {
      setLoadingAI(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        setLoadingAI(false);
      }, 8000);

      generateComprehensiveInsights(filteredMemories, true)
        .then((aiResult) => {
          clearTimeout(timeoutId);
          if (!isCancelled) {
            setInsights(aiResult);
            setLoadingAI(false);
          }
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (error.name !== "AbortError") {
            console.error("Error generating AI insights:", error);
          }
          if (!isCancelled) {
            setLoadingAI(false);
          }
        });

      return () => {
        isCancelled = true;
        clearTimeout(timeoutId);
        clearTimeout(basicTimeout);
        controller.abort();
      };
    }

    return () => {
      isCancelled = true;
      clearTimeout(basicTimeout);
    };
  }, [filteredMemories, ollamaAvailable]);

  // Get themes
  const themes = useMemo(() => {
    if (filteredMemories.length === 0) return [];
    return extractThemes(filteredMemories);
  }, [filteredMemories]);

  // Get highlights
  const highlights = useMemo(() => {
    if (filteredMemories.length === 0) return [];
    return getHighlights(filteredMemories);
  }, [filteredMemories]);

  // Get memories to revisit (1+ days old, worth reflecting on)
  const memoriesToRevisit = useMemo(() => {
    if (memories.length === 0) return [];

    const now = Date.now();
    const oneDayMs = 1 * 24 * 60 * 60 * 1000; // Minimum 1 day old
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;

    return memories
      .filter((m) => {
        const daysSinceMs = now - m.startDate;
        // Between 1 day and 1 year old
        return daysSinceMs >= oneDayMs && daysSinceMs <= oneYearMs;
      })
      .map((memory) => {
        const daysSince = Math.floor(
          (now - memory.startDate) / (24 * 60 * 60 * 1000)
        );
        let prompt = "";

        if (daysSince >= 365) {
          prompt = "It's been a year since this moment";
        } else if (daysSince >= 180) {
          prompt = "6 months ago you wrote this";
        } else if (daysSince >= 90) {
          prompt = "3 months have passed since this memory";
        } else if (daysSince >= 60) {
          prompt = "2 months ago you captured this";
        } else if (daysSince >= 30) {
          prompt = "A month ago you captured this";
        } else if (daysSince >= 7) {
          prompt = `${daysSince} days ago you felt this way`;
        } else if (daysSince >= 1) {
          prompt =
            daysSince === 1
              ? "Yesterday you wrote this"
              : `${daysSince} days ago`;
        } else {
          prompt = "Recently you captured this";
        }

        return { memory, daysSince, prompt };
      })
      .sort((a, b) => b.daysSince - a.daysSince) // Oldest first
      .slice(0, 3); // Top 3
  }, [memories]);

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.center, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
            <Text style={[styles.loadingText, { color: colors.textSoft }]}>
              Loading insights...
            </Text>
            <Text style={[styles.loadingSubtext, { color: colors.textSoft }]}>
              Analyzing your memories...
            </Text>
          </View>
          <BottomNavBar isDarkMode={isDarkMode} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View
            style={[styles.container, { backgroundColor: colors.background }]}
          >
            <View
              style={[
                styles.header,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <InteractiveButton
                onPress={() => router.back()}
                icon="arrow-back"
                variant="ghost"
                size="sm"
                isDarkMode={isDarkMode}
                iconColor={colors.text}
                style={styles.backButton}
                accessibilityLabel="Go back"
              />
              <View style={styles.headerCenter}>
                <Ionicons name="sparkles" size={24} color={PRIMARY_PURPLE} />
                <Text style={[styles.headerTitle, { color: colors.text }]}>
                  AI Insights
                </Text>
              </View>
              <InteractiveButton
                onPress={toggleTheme}
                icon={isDarkMode ? "sunny-outline" : "moon-outline"}
                description={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
                variant="ghost"
                size="sm"
                isDarkMode={isDarkMode}
                iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
                iconSize={Platform.OS === "ios" ? 24 : 22}
                noBorder={true}
                style={styles.themeToggle}
                accessibilityLabel="Toggle theme"
                accessibilityHint={`Changes to ${
                  isDarkMode ? "light" : "dark"
                } mode`}
              />
            </View>
            <View style={styles.center}>
              <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Error Loading Insights
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSoft }]}>
                {error}
              </Text>
              <InteractiveButton
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  // Retry by re-triggering useEffect
                  const userId = user?.id || (user as any)?.uid;
                  if (userId) {
                    const unsubscribe = subscribeToUserMemories(
                      userId,
                      (memoriesList) => {
                        setMemories(memoriesList);
                        setLoading(false);
                        setError(null);
                      }
                    );
                    setTimeout(() => unsubscribe(), 100);
                  }
                }}
                label="Retry"
                variant="primary"
                size="md"
                isDarkMode={isDarkMode}
                style={{ marginTop: 20 }}
                accessibilityLabel="Retry loading"
              />
            </View>
          </View>
          <BottomNavBar isDarkMode={isDarkMode} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View
          style={[styles.container, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View
            style={[
              styles.header,
              {
                backgroundColor: colors.surface,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <InteractiveButton
              onPress={() => router.back()}
              icon="arrow-back"
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              style={styles.backButton}
              noBorder={true}
              accessibilityLabel="Go back"
              accessibilityHint="Returns to previous screen"
            />
            <View style={styles.headerCenter}>
              <Ionicons name="sparkles" size={24} color={PRIMARY_PURPLE} />
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                AI Insights
              </Text>
            </View>
            <InteractiveButton
              onPress={toggleTheme}
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              description={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              noBorder={true}
              style={styles.themeToggle}
              accessibilityLabel="Toggle theme"
              accessibilityHint={`Changes to ${
                isDarkMode ? "light" : "dark"
              } mode`}
            />
          </View>

          {filteredMemories.length === 0 ? (
            <View style={styles.center}>
              <Ionicons
                name="analytics-outline"
                size={64}
                color={colors.textSoft}
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No memories yet
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSoft }]}>
                Create some memories to see AI insights
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Show loading indicator for AI processing */}
              {loadingAI && !insights && (
                <View style={styles.aiLoadingContainer}>
                  <ActivityIndicator size="small" color={PRIMARY_PURPLE} />
                  <Text
                    style={[styles.aiLoadingText, { color: colors.textSoft }]}
                  >
                    Generating AI insights...
                  </Text>
                </View>
              )}
              {/* Time Range Selector */}
              <View style={styles.timeRangeContainer}>
                {(["7D", "30D", "90D"] as TimeRange[]).map((range) => (
                  <TouchableOpacity
                    key={range}
                    onPress={() => setTimeRange(range)}
                    style={[
                      styles.timeRangeButton,
                      {
                        backgroundColor:
                          timeRange === range ? PRIMARY_PURPLE : colors.chipBg,
                        borderColor:
                          timeRange === range ? PRIMARY_PURPLE : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeRangeText,
                        {
                          color: timeRange === range ? "#FFFFFF" : colors.text,
                          fontWeight: timeRange === range ? "700" : "500",
                        },
                      ]}
                    >
                      {range}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hero Card: This Period in 10 Seconds */}
              {insights && (
                <View
                  style={[
                    styles.heroCard,
                    createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                      padding: 20,
                      marginBottom: 20,
                    }),
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text style={[styles.heroTitle, { color: colors.text }]}>
                    This{" "}
                    {timeRange === "7D"
                      ? "Week"
                      : timeRange === "30D"
                      ? "Month"
                      : "Quarter"}{" "}
                    in 10 seconds
                  </Text>
                  <Text
                    style={[
                      styles.heroMood,
                      {
                        color: PRIMARY_PURPLE,
                        textShadowColor:
                          PRIMARY_PURPLE + (isDarkMode ? "CC" : "88"),
                        textShadowRadius: isDarkMode ? 8 : 6,
                      },
                    ]}
                  >
                    {insights.overallMood}
                  </Text>

                  {periodComparison && (
                    <View style={styles.changesContainer}>
                      {periodComparison.changes.map((change, idx) => (
                        <View key={idx} style={styles.changeItem}>
                          <Ionicons
                            name={
                              change.trend === "up"
                                ? "trending-up"
                                : change.trend === "down"
                                ? "trending-down"
                                : "remove"
                            }
                            size={16}
                            color={
                              change.trend === "up"
                                ? "#10b981"
                                : change.trend === "down"
                                ? "#ef4444"
                                : colors.textSoft
                            }
                          />
                          <Text
                            style={[styles.changeText, { color: colors.text }]}
                          >
                            {change.message}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Trends Section */}
              {insights ? (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Mood Trends
                  </Text>

                  {/* Mood Trend Chart */}
                  {moodTrends.length > 0 && (
                    <View
                      style={[
                        styles.trendChartCard,
                        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                          padding: 20,
                          marginBottom: 16,
                        }),
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[
                          styles.trendCardTitle,
                          { color: colors.text, marginBottom: 16 },
                        ]}
                      >
                        Mood Over Time
                      </Text>
                      <View style={styles.chartContainer}>
                        <View style={styles.chartBars}>
                          {moodTrends.map((trend, idx) => {
                            const maxMood = Math.max(
                              ...moodTrends.map((t) => t.mood),
                              100
                            );
                            const height = (trend.mood / maxMood) * 100;
                            const date = new Date(trend.date);
                            const dayLabel = date.getDate();
                            const monthLabel = date.toLocaleDateString(
                              "en-US",
                              { month: "short" }
                            );

                            return (
                              <View key={idx} style={styles.chartBarContainer}>
                                <View
                                  style={[
                                    styles.chartBar,
                                    {
                                      height: `${height}%`,
                                      backgroundColor:
                                        trend.mood > 60
                                          ? "#10b981"
                                          : trend.mood > 40
                                          ? PRIMARY_PURPLE
                                          : "#ef4444",
                                      minHeight: 4,
                                    },
                                  ]}
                                />
                                <Text
                                  style={[
                                    styles.chartLabel,
                                    { color: colors.textSoft },
                                  ]}
                                >
                                  {dayLabel}
                                </Text>
                                {idx === 0 && (
                                  <Text
                                    style={[
                                      styles.chartMonthLabel,
                                      { color: colors.textSoft },
                                    ]}
                                  >
                                    {monthLabel}
                                  </Text>
                                )}
                              </View>
                            );
                          })}
                        </View>
                        <View style={styles.chartYAxis}>
                          <Text
                            style={[
                              styles.chartYLabel,
                              { color: colors.textSoft },
                            ]}
                          >
                            100
                          </Text>
                          <Text
                            style={[
                              styles.chartYLabel,
                              { color: colors.textSoft },
                            ]}
                          >
                            50
                          </Text>
                          <Text
                            style={[
                              styles.chartYLabel,
                              { color: colors.textSoft },
                            ]}
                          >
                            0
                          </Text>
                        </View>
                      </View>
                      <View style={styles.chartLegend}>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: "#10b981" },
                            ]}
                          />
                          <Text
                            style={[styles.legendText, { color: colors.text }]}
                          >
                            High
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: PRIMARY_PURPLE },
                            ]}
                          />
                          <Text
                            style={[styles.legendText, { color: colors.text }]}
                          >
                            Medium
                          </Text>
                        </View>
                        <View style={styles.legendItem}>
                          <View
                            style={[
                              styles.legendDot,
                              { backgroundColor: "#ef4444" },
                            ]}
                          />
                          <Text
                            style={[styles.legendText, { color: colors.text }]}
                          >
                            Low
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  <View style={styles.trendsRow}>
                    {/* Mood Score Card */}
                    <View
                      style={[
                        styles.trendCard,
                        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                          padding: 16,
                        }),
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[styles.trendCardTitle, { color: colors.text }]}
                      >
                        Average Mood
                      </Text>
                      <Text
                        style={[
                          styles.trendCardValue,
                          {
                            color: PRIMARY_PURPLE,
                            textShadowColor:
                              PRIMARY_PURPLE + (isDarkMode ? "CC" : "88"),
                            textShadowRadius: isDarkMode ? 8 : 6,
                          },
                        ]}
                      >
                        {insights.moodScore}%
                      </Text>
                      <View style={styles.moodBar}>
                        <View
                          style={[
                            styles.moodBarFill,
                            {
                              width: `${insights.moodScore}%`,
                              backgroundColor: PRIMARY_PURPLE,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Emotion Distribution */}
                    <View
                      style={[
                        styles.trendCard,
                        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                          padding: 16,
                        }),
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[styles.trendCardTitle, { color: colors.text }]}
                      >
                        Emotions
                      </Text>
                      <View style={styles.emotionRing}>
                        {insights.emotionDistribution.map((emotion, idx) => (
                          <View key={idx} style={styles.emotionItem}>
                            <View
                              style={[
                                styles.emotionDot,
                                { backgroundColor: emotion.color },
                              ]}
                            />
                            <Text
                              style={[
                                styles.emotionLabel,
                                { color: colors.text },
                              ]}
                            >
                              {emotion.label}: {emotion.percentage}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Mood Trends
                  </Text>
                  <View style={styles.aiLoadingContainer}>
                    <ActivityIndicator size="small" color={PRIMARY_PURPLE} />
                    <Text
                      style={[styles.aiLoadingText, { color: colors.textSoft }]}
                    >
                      Calculating mood trends...
                    </Text>
                  </View>
                </View>
              )}

              {/* Themes Section */}
              {themes.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Top Themes
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.themesScroll}
                    contentContainerStyle={styles.themesContainer}
                  >
                    {themes.map((theme, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.themeChip,
                          {
                            backgroundColor: colors.chipBg,
                            borderColor: PRIMARY_PURPLE + "66",
                          },
                        ]}
                      >
                        <Text
                          style={[styles.themeChipText, { color: colors.text }]}
                        >
                          {theme.name}
                        </Text>
                        <Text
                          style={[
                            styles.themeChipCount,
                            { color: PRIMARY_PURPLE },
                          ]}
                        >
                          {theme.count}
                        </Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Highlights Section */}
              {highlights.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Highlights
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.highlightsScroll}
                    contentContainerStyle={styles.highlightsContainer}
                  >
                    {highlights.map((highlight, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          router.push({
                            pathname: "/modules/memory-book/MemoryPostDetail",
                            params: { memoryId: highlight.memory.id },
                          });
                        }}
                        style={[
                          styles.highlightCard,
                          createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                            padding: 0,
                            overflow: "hidden",
                          }),
                          { backgroundColor: colors.surface },
                        ]}
                      >
                        {highlight.memory.imageURL && (
                          <Image
                            source={{ uri: highlight.memory.imageURL }}
                            style={styles.highlightImage}
                          />
                        )}
                        <View style={styles.highlightContent}>
                          <Text
                            style={[
                              styles.highlightTitle,
                              { color: colors.text },
                            ]}
                            numberOfLines={1}
                          >
                            {highlight.memory.title}
                          </Text>
                          <Text
                            style={[
                              styles.highlightReason,
                              { color: colors.textSoft },
                            ]}
                            numberOfLines={2}
                          >
                            {highlight.reason}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Memory Revisit / Time Capsule Section */}
              {memoriesToRevisit.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons
                      name="time-outline"
                      size={22}
                      color={PRIMARY_PURPLE}
                    />
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.text, marginBottom: 0, marginLeft: 8 },
                      ]}
                    >
                      Time to Revisit
                    </Text>
                  </View>
                  <Text
                    style={[styles.revisitSubtitle, { color: colors.textSoft }]}
                  >
                    Reflect on these moments from your past
                  </Text>
                  {memoriesToRevisit.map((item, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => {
                        router.push({
                          pathname: "/modules/memory-book/MemoryPostDetail",
                          params: { memoryId: item.memory.id },
                        });
                      }}
                      style={[
                        styles.revisitCard,
                        createNeonCardShell("#f59e0b", isDarkMode, {
                          padding: 0,
                          overflow: "hidden",
                        }),
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <View style={styles.revisitContent}>
                        {item.memory.imageURL && (
                          <Image
                            source={{ uri: item.memory.imageURL }}
                            style={styles.revisitImage}
                          />
                        )}
                        <View style={styles.revisitTextContent}>
                          <View
                            style={[
                              styles.revisitBadge,
                              { backgroundColor: "#f59e0b20" },
                            ]}
                          >
                            <Ionicons
                              name="hourglass-outline"
                              size={12}
                              color="#f59e0b"
                            />
                            <Text
                              style={[
                                styles.revisitBadgeText,
                                { color: "#f59e0b" },
                              ]}
                            >
                              {item.prompt}
                            </Text>
                          </View>
                          <Text
                            style={[
                              styles.revisitTitle,
                              { color: colors.text },
                            ]}
                            numberOfLines={2}
                          >
                            {item.memory.title}
                          </Text>
                          <Text
                            style={[
                              styles.revisitDescription,
                              { color: colors.textSoft },
                            ]}
                            numberOfLines={2}
                          >
                            {item.memory.description}
                          </Text>
                          <View style={styles.revisitAction}>
                            <Text
                              style={[
                                styles.revisitActionText,
                                { color: PRIMARY_PURPLE },
                              ]}
                            >
                              Tap to revisit →
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* AI Suggestions */}
              {insights?.suggestions && insights.suggestions.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Suggestions
                  </Text>
                  {insights.suggestions.map((suggestion, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.suggestionCard,
                        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                          padding: 16,
                        }),
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="bulb-outline"
                        size={20}
                        color={PRIMARY_PURPLE}
                        style={{ marginRight: 12 }}
                      />
                      <Text
                        style={[styles.suggestionText, { color: colors.text }]}
                      >
                        {suggestion}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Ollama Status */}
              <View style={styles.statusCard}>
                <Ionicons
                  name={
                    ollamaAvailable
                      ? "checkmark-circle"
                      : "alert-circle-outline"
                  }
                  size={16}
                  color={ollamaAvailable ? "#10b981" : colors.textSoft}
                />
                <Text style={[styles.statusText, { color: colors.textSoft }]}>
                  {ollamaAvailable
                    ? "Powered by DeepSeek AI"
                    : "Using local analysis (Ollama not detected)"}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>

        {/* Bottom Navigation */}
        <BottomNavBar isDarkMode={isDarkMode} />
      </SafeAreaView>
    </GradientBackground>
  );
}

// Helper function for neon card shell
function createNeonCardShell(
  accentColor: string,
  isDark: boolean,
  overrides: any = {}
) {
  return {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: accentColor + (isDark ? "66" : "CC"),
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.75,
    shadowRadius: isDark ? 30 : 25,
    shadowOffset: { width: 0, height: 4 },
    elevation: isDark ? 18 : 15,
    ...overrides,
  };
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    opacity: 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderBottomWidth: 1,
    minHeight: Platform.OS === "ios" ? 52 : 50,
  },
  backButton: {
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  themeToggle: {
    minWidth: Platform.OS === "ios" ? 40 : 38,
    minHeight: Platform.OS === "ios" ? 40 : 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 18 : 17,
    fontWeight: "700",
    flexShrink: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  timeRangeContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  timeRangeText: {
    fontSize: 14,
  },
  heroCard: {
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  heroMood: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 16,
  },
  changesContainer: {
    gap: 8,
  },
  changeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  changeText: {
    fontSize: 14,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  trendsRow: {
    flexDirection: "row",
    gap: 12,
  },
  trendCard: {
    flex: 1,
  },
  trendCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  trendCardValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  moodBar: {
    height: 8,
    backgroundColor: "rgba(168, 85, 247, 0.2)",
    borderRadius: 4,
    overflow: "hidden",
  },
  moodBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  emotionRing: {
    gap: 8,
  },
  emotionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emotionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emotionLabel: {
    fontSize: 12,
  },
  themesScroll: {
    marginHorizontal: -16,
  },
  themesContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  themeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  themeChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  themeChipCount: {
    fontSize: 12,
    fontWeight: "700",
  },
  highlightsScroll: {
    marginHorizontal: -16,
  },
  highlightsContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  highlightCard: {
    width: 200,
    borderRadius: 16,
  },
  highlightImage: {
    width: "100%",
    height: 120,
    resizeMode: "cover",
  },
  highlightContent: {
    padding: 12,
  },
  highlightTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  highlightReason: {
    fontSize: 12,
    lineHeight: 16,
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  suggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  statusText: {
    fontSize: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
  },
  aiLoadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  aiLoadingText: {
    fontSize: 14,
    fontWeight: "500",
  },
  trendChartCard: {
    width: "100%",
  },
  chartContainer: {
    flexDirection: "row",
    height: 200,
    marginBottom: 12,
  },
  chartBars: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
    paddingBottom: 30,
    paddingHorizontal: 8,
  },
  chartBarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
    maxWidth: 40,
  },
  chartBar: {
    width: "80%",
    borderRadius: 4,
    marginBottom: 4,
  },
  chartLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  chartMonthLabel: {
    fontSize: 9,
    fontWeight: "400",
    marginTop: 2,
  },
  chartYAxis: {
    width: 30,
    justifyContent: "space-between",
    paddingBottom: 30,
    alignItems: "flex-end",
  },
  chartYLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  chartLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  revisitSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    marginLeft: 30,
  },
  revisitCard: {
    marginBottom: 12,
    borderRadius: 16,
  },
  revisitContent: {
    flexDirection: "row",
  },
  revisitImage: {
    width: 100,
    height: 100,
    resizeMode: "cover",
  },
  revisitTextContent: {
    flex: 1,
    padding: 12,
    justifyContent: "center",
  },
  revisitBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 6,
    gap: 4,
  },
  revisitBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  revisitTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  revisitDescription: {
    fontSize: 12,
    lineHeight: 16,
  },
  revisitAction: {
    marginTop: 8,
  },
  revisitActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
});

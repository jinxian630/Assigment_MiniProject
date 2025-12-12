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
import {
  generateComprehensiveInsights,
  extractThemes,
  getHighlights,
  comparePeriods,
} from "./utils/aiInsightsHelper";

const PRIMARY_PURPLE = "#a855f7";

type TimeRange = "7D" | "30D" | "90D";

export default function AIInsightsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30D");
  const [ollamaAvailable, setOllamaAvailable] = useState(false);

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
    if (!user?.uid) {
      setLoading(false);
      setError("Please log in to view insights");
      return;
    }

    setLoading(true);
    setError(null);

    let timeout: NodeJS.Timeout;
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = subscribeToUserMemories(
        user.uid,
        (memoriesList) => {
          console.log("AI Insights: Received memories:", memoriesList.length);
          setMemories(memoriesList);
          setLoading(false);
          setError(null);
          if (timeout) clearTimeout(timeout);
        }
      );

      // Timeout fallback - stop loading after 10 seconds
      timeout = setTimeout(() => {
        console.warn("AI Insights: Loading timeout");
        setLoading(false);
        setError("Loading took too long. Please check your Firebase connection and try again.");
      }, 10000);
    } catch (err: any) {
      console.error("AI Insights: Error subscribing to memories:", err);
      setLoading(false);
      setError(
        err.message || 
        "Failed to connect to Firebase. Please check your Firebase configuration."
      );
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

  // Calculate period comparison
  const periodComparison = useMemo(() => {
    if (filteredMemories.length === 0) return null;
    const daysAgo = timeRange === "7D" ? 7 : timeRange === "30D" ? 30 : 90;
    const previousCutoff = Date.now() - daysAgo * 2 * 24 * 60 * 60 * 1000;
    const previousMemories = memories.filter(
      (m) => m.startDate >= previousCutoff && m.startDate < previousCutoff + daysAgo * 24 * 60 * 60 * 1000
    );
    return comparePeriods(filteredMemories, previousMemories);
  }, [filteredMemories, memories, timeRange]);

  // Get insights
  const insights = useMemo(() => {
    if (filteredMemories.length === 0) return null;
    return generateComprehensiveInsights(filteredMemories, ollamaAvailable);
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
        </SafeAreaView>
      </GradientBackground>
    );
  }

  if (error) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={[styles.container, { backgroundColor: colors.background }]}>
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
              <View style={{ width: 40 }} />
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
                  if (user?.uid) {
                    const unsubscribe = subscribeToUserMemories(
                      user.uid,
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
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            <View style={{ width: 40 }} />
          </View>

          {filteredMemories.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="analytics-outline" size={64} color={colors.textSoft} />
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
                          color:
                            timeRange === range ? "#FFFFFF" : colors.text,
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
                    This {timeRange} in 10 seconds
                  </Text>
                  <Text
                    style={[
                      styles.heroMood,
                      {
                        color: PRIMARY_PURPLE,
                        textShadowColor: PRIMARY_PURPLE + (isDarkMode ? "CC" : "88"),
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
                          <Text style={[styles.changeText, { color: colors.text }]}>
                            {change.message}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* Trends Section */}
              {insights && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Trends
                  </Text>
                  <View style={styles.trendsRow}>
                    {/* Mood Score Chart */}
                    <View
                      style={[
                        styles.trendCard,
                        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                          padding: 16,
                        }),
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text style={[styles.trendCardTitle, { color: colors.text }]}>
                        Mood Score
                      </Text>
                      <Text
                        style={[
                          styles.trendCardValue,
                          {
                            color: PRIMARY_PURPLE,
                            textShadowColor: PRIMARY_PURPLE + (isDarkMode ? "CC" : "88"),
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
                      <Text style={[styles.trendCardTitle, { color: colors.text }]}>
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
                            <Text style={[styles.emotionLabel, { color: colors.text }]}>
                              {emotion.label}: {emotion.percentage}%
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
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
                        <Text style={[styles.themeChipText, { color: colors.text }]}>
                          {theme.name}
                        </Text>
                        <Text style={[styles.themeChipCount, { color: PRIMARY_PURPLE }]}>
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
                            style={[styles.highlightTitle, { color: colors.text }]}
                            numberOfLines={1}
                          >
                            {highlight.memory.title}
                          </Text>
                          <Text
                            style={[styles.highlightReason, { color: colors.textSoft }]}
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
                      <Text style={[styles.suggestionText, { color: colors.text }]}>
                        {suggestion}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Ollama Status */}
              <View style={styles.statusCard}>
                <Ionicons
                  name={ollamaAvailable ? "checkmark-circle" : "alert-circle-outline"}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
});


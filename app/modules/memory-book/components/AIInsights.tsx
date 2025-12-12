import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { analyzeMoodTrends, checkOllamaConnection, MoodInsight } from "../utils/ollamaHelper";

const PRIMARY_PURPLE = "#a855f7";

type AIInsightsProps = {
  memories: Array<{
    emotionSpectrum?: {
      energy: number;
      stress: number;
      clarity: number;
      warmth: number;
    };
    startDate: number;
  }>;
  isDarkMode: boolean;
};

export default function AIInsights({ memories, isDarkMode }: AIInsightsProps) {
  const [insights, setInsights] = useState<MoodInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [ollamaAvailable, setOllamaAvailable] = useState(false);

  const colors = {
    background: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
    positive: "#10b981",
    negative: "#ef4444",
    neutral: "#6b7280",
  };

  useEffect(() => {
    checkOllama();
    if (memories.length > 0) {
      loadInsights();
    }
  }, [memories]);

  const checkOllama = async () => {
    const available = await checkOllamaConnection();
    setOllamaAvailable(available);
  };

  const loadInsights = async () => {
    setLoading(true);
    try {
      const moodInsights = await analyzeMoodTrends(memories);
      setInsights(moodInsights);
    } catch (error) {
      console.error("Error loading insights:", error);
    } finally {
      setLoading(false);
    }
  };

  if (memories.length === 0) {
    return null;
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "positive":
        return "trending-up";
      case "negative":
        return "trending-down";
      default:
        return "remove";
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "positive":
        return colors.positive;
      case "negative":
        return colors.negative;
      default:
        return colors.neutral;
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: PRIMARY_PURPLE + (isDarkMode ? "66" : "CC"),
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.chipBg, borderColor: PRIMARY_PURPLE + "66" },
            ]}
          >
            <Ionicons name="sparkles" size={20} color={PRIMARY_PURPLE} />
          </View>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>AI Insights</Text>
            <Text style={[styles.subtitle, { color: colors.textSoft }]}>
              {ollamaAvailable ? "Powered by DeepSeek" : "Local analysis"}
            </Text>
          </View>
        </View>
        {loading && <ActivityIndicator size="small" color={PRIMARY_PURPLE} />}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
          <Text style={[styles.loadingText, { color: colors.textSoft }]}>
            Analyzing your mood patterns...
          </Text>
        </View>
      ) : insights.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {insights.map((insight, index) => (
            <View
              key={index}
              style={[
                styles.insightCard,
                {
                  backgroundColor: colors.chipBg,
                  borderColor: getTrendColor(insight.trend) + "44",
                },
              ]}
            >
              <View style={styles.insightHeader}>
                <Ionicons
                  name={getTrendIcon(insight.trend) as any}
                  size={18}
                  color={getTrendColor(insight.trend)}
                />
                <Text
                  style={[
                    styles.trendLabel,
                    { color: getTrendColor(insight.trend) },
                  ]}
                >
                  {insight.trend.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.insightText, { color: colors.text }]}>
                {insight.message}
              </Text>
              <Text style={[styles.insightPeriod, { color: colors.textSoft }]}>
                {insight.period}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={32} color={colors.textSoft} />
          <Text style={[styles.emptyText, { color: colors.textSoft }]}>
            Not enough data for insights yet
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  insightCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  trendLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  insightText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 6,
  },
  insightPeriod: {
    fontSize: 11,
    fontStyle: "italic",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 13,
  },
});


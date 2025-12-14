import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/config/firebase";
import { subscribeToSavedMemories } from "./utils/saveHelpers";
import PostCard from "./components/PostCard";
import BottomNavBar from "./components/BottomNavBar";
import FilterModal, { type FilterOptions } from "./components/FilterModal";
import InteractiveButton from "./components/InteractiveButton";
import { applyFilters } from "./utils/filterHelpers";
import type { Memory } from "./utils/memoryHelpers";

const PRIMARY_PURPLE = "#a855f7";

/** 🎨 Cyberpunk neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accentColor + (isDark ? "66" : "CC"),
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.75,
    shadowRadius: isDark ? 30 : 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 18 : 15,
    ...extra,
  };
};

/** 🎨 Glow text styles */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#E0F2FE" : "#6B21A8",
  textShadowColor: accentColor + (isDark ? "CC" : "88"),
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 8 : 6,
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#9333EA",
});

export default function SavedPosts() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [savedMemories, setSavedMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showNoResults, setShowNoResults] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    keyword: "",
    emotionColor: null,
    feelingType: null,
    feelingRank: null,
  });

  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
  };

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

  useEffect(() => {
    const userId = auth.currentUser?.uid || user?.id;
    if (!userId) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToSavedMemories(userId, (memories) => {
      setSavedMemories(memories);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, auth.currentUser]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const filteredMemories = useMemo(() => {
    const hasActiveFilters =
      activeFilters.keyword ||
      activeFilters.emotionColor ||
      (activeFilters.feelingType && activeFilters.feelingRank);

    if (!hasActiveFilters) {
      return savedMemories;
    }

    const filtered = applyFilters(savedMemories, activeFilters);
    return filtered;
  }, [savedMemories, activeFilters]);

  // Show overlay when filters are active and no results
  useEffect(() => {
    const hasActiveFilters =
      activeFilters.keyword ||
      activeFilters.emotionColor ||
      (activeFilters.feelingType && activeFilters.feelingRank);

    if (
      hasActiveFilters &&
      filteredMemories.length === 0 &&
      savedMemories.length > 0
    ) {
      // Only show if not already showing
      if (!showNoResults) {
        setTimeout(() => {
          setShowNoResults(true);
        }, 300);
      }
    } else if (filteredMemories.length > 0) {
      // Hide overlay if results are found
      setShowNoResults(false);
    }
  }, [filteredMemories, activeFilters, savedMemories.length]);

  const handleApplyFilters = (filters: FilterOptions) => {
    setActiveFilters(filters);
    const filtered = applyFilters(savedMemories, filters);

    if (filtered.length === 0 && savedMemories.length > 0) {
      setTimeout(() => {
        setShowNoResults(true);
      }, 300);
    } else {
      setShowNoResults(false);
    }
  };

  const hasActiveFilters = useMemo(() => {
    return (
      !!activeFilters.keyword ||
      !!activeFilters.emotionColor ||
      (!!activeFilters.feelingType && !!activeFilters.feelingRank)
    );
  }, [activeFilters]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* NO RESULTS OVERLAY */}
        {showNoResults && (
          <View
            style={[
              styles.successOverlay,
              {
                backgroundColor: isDarkMode
                  ? "rgba(15,23,42,0.95)"
                  : "rgba(255,255,255,0.95)",
              },
            ]}
          >
            <View
              style={[
                styles.successCard,
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  padding: 24,
                }),
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.successIcon,
                  {
                    backgroundColor: PRIMARY_PURPLE + "20",
                    borderColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Ionicons
                  name="filter-outline"
                  size={64}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <Text style={[styles.successTitle, glowText]}>
                No Results Found
              </Text>
              <Text style={[styles.successSubtitle, softText]}>
                No memories match your filter criteria. Try adjusting your
                filters.
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowNoResults(false);
                }}
                style={[
                  styles.successButton,
                  {
                    backgroundColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Text style={styles.successButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          />
          <View style={styles.headerCenter}>
            <Ionicons name="bookmark" size={24} color={PRIMARY_PURPLE} />
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Saved Posts
            </Text>
          </View>
          <View style={styles.headerRight}>
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
            <View style={{ position: "relative" }}>
              <InteractiveButton
                onPress={() => {
                  setShowFilterModal(true);
                }}
                icon="filter"
                description={
                  hasActiveFilters
                    ? "Filter active - tap to adjust filters"
                    : "Filter saved memories by mood, color, feeling, or keyword"
                }
                variant={hasActiveFilters ? "primary" : "ghost"}
                size="sm"
                isDarkMode={isDarkMode}
                iconColor={
                  hasActiveFilters
                    ? "#FFFFFF"
                    : isDarkMode
                    ? "#E5E7EB"
                    : PRIMARY_PURPLE
                }
                iconSize={Platform.OS === "ios" ? 26 : 24}
                noBorder={true}
                style={styles.filterButton}
                accessibilityLabel="Filter saved memories"
                accessibilityHint="Opens filter options"
              />
              {hasActiveFilters && (
                <View
                  style={[styles.filterBadge, { backgroundColor: "#FFFFFF" }]}
                />
              )}
            </View>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
            <Text style={[styles.loadingText, { color: colors.textSoft }]}>
              Loading saved posts...
            </Text>
          </View>
        ) : savedMemories.length === 0 ? (
          <ScrollView
            contentContainerStyle={styles.emptyContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PRIMARY_PURPLE}
              />
            }
          >
            <View
              style={[
                styles.emptyIconWrapper,
                {
                  backgroundColor: colors.chipBg,
                  borderColor: PRIMARY_PURPLE + (isDarkMode ? "66" : "CC"),
                },
              ]}
            >
              <Ionicons
                name="bookmark-outline"
                size={48}
                color={PRIMARY_PURPLE}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              No saved posts yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSoft }]}>
              Tap the bookmark icon on any post to save it here
            </Text>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={PRIMARY_PURPLE}
              />
            }
          >
            <View style={styles.feedSection}>
              <View style={styles.feedHeader}>
                <Ionicons name="bookmark" size={20} color={colors.text} />
                <Text style={[styles.feedTitle, { color: colors.text }]}>
                  {hasActiveFilters
                    ? `${filteredMemories.length} of ${savedMemories.length}`
                    : savedMemories.length}{" "}
                  {filteredMemories.length === 1 ? "Saved Post" : "Saved Posts"}
                  {hasActiveFilters ? " (Filtered)" : ""}
                </Text>
              </View>

              {filteredMemories.length === 0 && hasActiveFilters ? (
                <View style={styles.emptyFilterContainer}>
                  <Ionicons
                    name="filter-outline"
                    size={48}
                    color={colors.textSoft}
                  />
                  <Text
                    style={[styles.emptyFilterText, { color: colors.text }]}
                  >
                    No memories match your filters
                  </Text>
                  <Text
                    style={[
                      styles.emptyFilterSubtext,
                      { color: colors.textSoft },
                    ]}
                  >
                    Try adjusting your filter criteria
                  </Text>
                </View>
              ) : (
                filteredMemories.map((memory) => (
                  <PostCard
                    key={memory.id}
                    memory={memory as any}
                    isDarkMode={isDarkMode}
                  />
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilters}
          isDarkMode={isDarkMode}
          memories={savedMemories}
        />

        {/* Bottom Navigation */}
        <BottomNavBar isDarkMode={isDarkMode} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 17 : 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  feedSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  feedHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  feedTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyIconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    maxWidth: 280,
  },
  filterButton: {
    minWidth: Platform.OS === "ios" ? 44 : 40,
    minHeight: Platform.OS === "ios" ? 44 : 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  filterBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    alignItems: "center",
    maxWidth: 320,
    width: "100%",
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  successButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 160,
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyFilterContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyFilterText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyFilterSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
});

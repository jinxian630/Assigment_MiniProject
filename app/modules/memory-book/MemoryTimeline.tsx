import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import FilterModal, { type FilterOptions } from "./components/FilterModal";
import InteractiveButton from "./components/InteractiveButton";
import { applyFilters } from "./utils/filterHelpers";

import {
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { extractStoragePathFromURL } from "./utils/storageHelpers";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import BottomNavBar from "./components/BottomNavBar";

const PRIMARY_PURPLE = "#a855f7";

type MemoryPost = {
  id: string;
  title: string;
  description: string;
  imageURL?: string;
  startDate: number;
  emotionColor?: string;
  emotionSpectrum?: {
    energy: number;
    stress: number;
    clarity: number;
    warmth: number;
  };
  CreatedUser?: {
    CreatedUserName?: string;
    CreatedUserPhoto?: string;
  };
};

/** 🎨 Cyberpunk neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accentColor + (isDark ? "66" : "CC"), // Stronger border in light mode for dark purple glow
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.75, // Stronger shadow in light mode for dark purple glow
    shadowRadius: isDark ? 30 : 25, // Larger glow radius in light mode
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 18 : 15, // Higher elevation in light mode
    ...extra,
  };
};

/** 🎨 Glow text styles */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#E0F2FE" : "#6B21A8", // Dark purple for light mode
  textShadowColor: accentColor + (isDark ? "CC" : "88"), // Stronger glow in light mode
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 8 : 6, // Stronger glow radius in light mode
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#9333EA", // Dark glowing purple for light mode
});

export default function MemoryTimeline() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    memoryId: string;
    title: string;
    imageURL?: string;
  } | null>(null);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    keyword: "",
    emotionColor: null,
    feelingType: null,
    feelingRank: null,
  });

  // Animation refs for each memory card
  const animationRefs = useRef<
    Record<
      string,
      {
        imageHeight: Animated.Value;
        cardScale: Animated.Value;
        opacity: Animated.Value;
      }
    >
  >({});

  // 🎨 Theme-aware colors
  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA", // Dark glowing purple for light mode
    borderSoft: isDarkMode ? "#1F2937" : "#7C3AED", // Dark purple border for light mode
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)", // Dark purple with glow for light mode
  };

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

  useEffect(() => {
    console.log("🔄 MemoryTimeline: Setting up subscription...");
    const postsRef = collection(db, "MemoryPosts");
    
    // Try query with orderBy first
    const q = query(postsRef, orderBy("startDate", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("📖 MemoryTimeline: Received", snapshot.size, "documents");
        const list: MemoryPost[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          console.log("📄 Timeline doc:", d.id, "startDate:", data.startDate);
          list.push({ id: d.id, ...(data as any) });
        });
        console.log("✅ MemoryTimeline: Total memories:", list.length);
        setMemories(list);
      },
      (error: any) => {
        console.error("❌ MemoryTimeline query error:", error);
        console.error("❌ Error code:", error.code);
        
        // Fallback: query without orderBy if index is missing
        if (error.code === "failed-precondition" || error.code === 9) {
          console.log("⚠️ Index missing, trying fallback query...");
          const fallbackQ = query(postsRef);
          
          return onSnapshot(
            fallbackQ,
            (snapshot) => {
              console.log("📖 MemoryTimeline fallback: Received", snapshot.size, "documents");
              const list: MemoryPost[] = [];
              snapshot.forEach((d) => {
                list.push({ id: d.id, ...(d.data() as any) });
              });
              // Sort manually
              list.sort((a, b) => (b.startDate || 0) - (a.startDate || 0));
              console.log("✅ MemoryTimeline fallback: Total memories:", list.length);
              setMemories(list);
            },
            (fallbackError: any) => {
              console.error("❌ MemoryTimeline fallback also failed:", fallbackError);
              setMemories([]);
            }
          );
        } else {
          setMemories([]);
        }
      }
    );

    return () => {
      console.log("🛑 MemoryTimeline: Unsubscribing");
      unsubscribe();
    };
  }, []);

  const groupByYear = (items: MemoryPost[]) => {
    const groups: Record<string, MemoryPost[]> = {};
    items.forEach((m) => {
      const year = new Date(m.startDate).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(m);
    });
    return groups;
  };

  const filteredMemories = useMemo(() => {
    const hasActiveFilters =
      activeFilters.keyword ||
      activeFilters.emotionColor ||
      (activeFilters.feelingType && activeFilters.feelingRank);

    if (!hasActiveFilters) {
      return memories;
    }

    const filtered = applyFilters(memories as any[], activeFilters);
    return filtered;
  }, [memories, activeFilters]);

  const groupedMemories = groupByYear(filteredMemories);

  const hasActiveFilters = useMemo(() => {
    return (
      !!activeFilters.keyword ||
      !!activeFilters.emotionColor ||
      (!!activeFilters.feelingType && !!activeFilters.feelingRank)
    );
  }, [activeFilters]);

  const handleApplyFilters = (filters: FilterOptions) => {
    setActiveFilters(filters);
    const filtered = applyFilters(memories as any[], filters);

    if (filtered.length === 0 && memories.length > 0) {
      setTimeout(() => {
        Alert.alert(
          "No Results Found",
          "No memories match your filter criteria. Try adjusting your filters.",
          [
            {
              text: "OK",
              onPress: () => {
                if (Platform.OS === "ios") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              },
            },
          ]
        );
      }, 300);
    }
  };

  const toggleExpand = (id: string) => {
    const isCurrentlyExpanded = expandedMemoryId === id;
    const willBeExpanded = !isCurrentlyExpanded;

    // Haptic feedback
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Initialize animation refs if needed
    if (!animationRefs.current[id]) {
      animationRefs.current[id] = {
        imageHeight: new Animated.Value(isCurrentlyExpanded ? 300 : 180),
        cardScale: new Animated.Value(1),
        opacity: new Animated.Value(1),
      };
    }

    const anims = animationRefs.current[id];

    // Animate image height smoothly
    Animated.parallel([
      Animated.spring(anims.imageHeight, {
        toValue: willBeExpanded ? 300 : 180,
        useNativeDriver: false,
        tension: 50,
        friction: 7,
      }),
      Animated.sequence([
        Animated.timing(anims.cardScale, {
          toValue: 0.98,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(anims.cardScale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    setExpandedMemoryId((prev) => (prev === id ? null : id));
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const deleteMemory = async (memoryId: string, imageURL?: string) => {
    try {
      setDeleteLoadingId(memoryId);

      // Animate card out before deletion
      if (animationRefs.current[memoryId]) {
        Animated.parallel([
          Animated.timing(animationRefs.current[memoryId].opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animationRefs.current[memoryId].cardScale, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Delete the document from Firestore
      await deleteDoc(doc(db, "MemoryPosts", memoryId));

      // Delete the image from Storage if it exists
      if (imageURL) {
        try {
          const storagePath = extractStoragePathFromURL(imageURL);
          if (storagePath) {
            const imageRef = ref(storage, storagePath);
            await deleteObject(imageRef);
            console.log("✅ Image deleted from storage:", storagePath);
          } else {
            console.warn("⚠️ Could not extract storage path from URL:", imageURL);
          }
        } catch (err: any) {
          // Image might already be deleted or not exist - this is okay
          if (err.code !== "storage/object-not-found") {
            console.warn("Image deletion warning:", err.message);
          }
        }
      }

      // Success haptic
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Show formal success overlay (matching create post style)
      setShowDeleteSuccess(true);
    } catch (err: any) {
      console.error("Delete error:", err);

      // Error haptic
      if (Platform.OS === "ios") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      let errorMessage = err.message || "Failed to delete memory. Please try again.";
      
      if (err.code === "permission-denied") {
        errorMessage = `Permission denied!\n\nYour Firestore security rules are blocking deletes.\n\nMake sure you:\n1. Are logged in\n2. Own this memory post\n3. Have updated Firestore rules\n\nCheck rules at:\nhttps://console.firebase.google.com/project/${db.app.options.projectId}/firestore/rules`;
      }
      
      Alert.alert("Error", errorMessage);

      // Reset animation on error
      if (animationRefs.current[memoryId]) {
        Animated.parallel([
          Animated.timing(animationRefs.current[memoryId].opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animationRefs.current[memoryId].cardScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const confirmDelete = (
    memoryId: string,
    title: string,
    imageURL?: string
  ) => {
    console.log("🔔 confirmDelete called with:", { memoryId, title });
    
    // Haptic feedback
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }

    // Show custom confirmation modal (works on web)
    setDeleteTarget({ memoryId, title, imageURL });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    
    console.log("✅ User confirmed deletion");
    if (Platform.OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    setShowDeleteConfirm(false);
    deleteMemory(deleteTarget.memoryId, deleteTarget.title, deleteTarget.imageURL);
  };

  const handleCancelDelete = () => {
    console.log("❌ User cancelled deletion");
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* DELETE CONFIRMATION MODAL */}
        {showDeleteConfirm && deleteTarget && (
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
                styles.confirmCard,
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
                  styles.confirmIcon,
                  {
                    backgroundColor: "rgba(239, 68, 68, 0.2)",
                    borderColor: "#ef4444",
                  },
                ]}
              >
                <Ionicons
                  name="warning"
                  size={64}
                  color="#ef4444"
                />
              </View>
              <Text style={[styles.confirmTitle, glowText]}>
                Delete Memory
              </Text>
              <Text style={[styles.confirmSubtitle, softText]}>
                Are you sure you want to delete "{deleteTarget.title || "this memory"}"?
              </Text>
              <Text style={[styles.confirmWarning, softText]}>
                This action cannot be undone.
              </Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  onPress={handleCancelDelete}
                  style={[
                    styles.confirmButton,
                    styles.cancelButton,
                    {
                      borderColor: colors.borderSoft,
                    },
                  ]}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.textSoft }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmDelete}
                  style={[
                    styles.confirmButton,
                    styles.deleteButton,
                    {
                      backgroundColor: "#ef4444",
                    },
                  ]}
                >
                  <Text style={styles.confirmButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* DELETE SUCCESS OVERLAY */}
        {showDeleteSuccess && (
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
                  name="checkmark-circle"
                  size={64}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <Text style={[styles.successTitle, glowText]}>
                Memory Deleted!
              </Text>
              <Text style={[styles.successSubtitle, softText]}>
                Your memory has been deleted successfully
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowDeleteSuccess(false);
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

        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, glowText]}>Memory Timeline</Text>
            {memories.length > 0 && (
              <Text style={[styles.headerSubtitle, softText]}>
                {hasActiveFilters
                  ? `${filteredMemories.length} of ${memories.length}`
                  : memories.length}{" "}
                {filteredMemories.length === 1 ? "memory" : "memories"}
                {hasActiveFilters && " (Filtered)"}
              </Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <View style={{ position: "relative", marginRight: 8 }}>
              <InteractiveButton
                onPress={() => {
                  setShowFilterModal(true);
                }}
                icon="filter"
                description={
                  hasActiveFilters
                    ? "Filter active - tap to adjust filters"
                    : "Filter memories by mood, color, feeling, or keyword"
                }
                variant={hasActiveFilters ? "primary" : "ghost"}
                size="sm"
                isDarkMode={isDarkMode}
                iconColor={hasActiveFilters ? "#FFFFFF" : (isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE)}
                iconSize={Platform.OS === "ios" ? 26 : 24}
                noBorder={true}
                style={styles.filterButton}
                accessibilityLabel="Filter memories"
                accessibilityHint="Opens filter options"
              />
              {hasActiveFilters && (
                <View
                  style={[styles.filterBadge, { backgroundColor: "#FFFFFF" }]}
                />
              )}
            </View>
            <InteractiveButton
              onPress={toggleTheme}
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              description={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              noBorder={true}
              accessibilityLabel="Toggle theme"
              accessibilityHint={`Changes to ${isDarkMode ? "light" : "dark"} mode`}
            />
          </View>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {filteredMemories.length === 0 && hasActiveFilters ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconWrapper,
                  { borderColor: PRIMARY_PURPLE + (isDarkMode ? "66" : "CC") },
                ]}
              >
                <Ionicons
                  name="filter-outline"
                  size={48}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <Text style={[styles.emptyTitle, glowText]}>
                No memories match your filters
              </Text>
              <Text style={[styles.emptySubtitle, softText]}>
                Try adjusting your filter criteria
              </Text>
            </View>
          ) : memories.length === 0 ? (
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconWrapper,
                  { borderColor: PRIMARY_PURPLE + (isDarkMode ? "66" : "CC") },
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={48}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <Text style={[styles.emptyTitle, glowText]}>No memories yet</Text>
              <Text style={[styles.emptySubtitle, softText]}>
                Create your first memory to see it appear on your timeline
              </Text>
              <TouchableOpacity
                style={[
                  styles.createBtn,
                  createNeonCardShell(PRIMARY_PURPLE, isDarkMode),
                  { backgroundColor: PRIMARY_PURPLE, marginTop: 20 },
                ]}
                onPress={() => router.back()}
              >
                <Ionicons name="add-circle" size={18} color="#fff" />
                <Text style={styles.createBtnText}>Create Memory</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Object.entries(groupedMemories)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, yearMemories]) => (
                <View key={year} style={styles.yearSection}>
                  {/* Year Header */}
                  <View style={styles.yearHeaderRow}>
                    <View
                      style={[
                        styles.yearBadge,
                        {
                          backgroundColor: colors.chipBg,
                          borderColor:
                            PRIMARY_PURPLE + (isDarkMode ? "66" : "AA"),
                        },
                      ]}
                    >
                      <Text style={[styles.yearLabel, glowText]}>{year}</Text>
                    </View>
                    <View style={styles.yearDivider} />
                    <View
                      style={[
                        styles.countBadge,
                        {
                          backgroundColor: colors.chipBg,
                        },
                      ]}
                    >
                      <Ionicons
                        name="images-outline"
                        size={12}
                        color={PRIMARY_PURPLE}
                      />
                      <Text style={[styles.memoryCount, softText]}>
                        {yearMemories.length}
                      </Text>
                    </View>
                  </View>

                  {/* Timeline Container */}
                  <View style={styles.timelineContainer}>
                    {/* Vertical Timeline Line */}
                    <View
                      style={[
                        styles.timelineLineWrapper,
                        {
                          backgroundColor:
                            PRIMARY_PURPLE + (isDarkMode ? "33" : "55"),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: PRIMARY_PURPLE },
                        ]}
                      />
                    </View>

                    {/* Memory Items */}
                    <View style={styles.memoriesWrapper}>
                      {yearMemories
                        .sort((a, b) => b.startDate - a.startDate)
                        .map((memory, index) => {
                          const isExpanded = expandedMemoryId === memory.id;
                          const isDeleting = deleteLoadingId === memory.id;
                          const emotionColor =
                            memory.emotionColor || PRIMARY_PURPLE;

                          // Initialize animation refs for this memory
                          if (!animationRefs.current[memory.id]) {
                            animationRefs.current[memory.id] = {
                              imageHeight: new Animated.Value(180),
                              cardScale: new Animated.Value(1),
                              opacity: new Animated.Value(1),
                            };
                          }
                          const anims = animationRefs.current[memory.id];

                          return (
                            <View
                              key={memory.id}
                              style={styles.memoryItemWrapper}
                            >
                              {/* Timeline Dot */}
                              <View
                                style={[
                                  styles.timelineDot,
                                  {
                                    backgroundColor: emotionColor,
                                    borderColor: colors.surface,
                                    shadowColor: emotionColor,
                                  },
                                ]}
                              />

                              {/* Memory Card */}
                              <Animated.View
                                style={[
                                  createNeonCardShell(
                                    emotionColor,
                                    isDarkMode,
                                    {
                                      paddingBottom: 0,
                                      marginBottom: 24,
                                      overflow: "hidden",
                                    }
                                  ),
                                  {
                                    backgroundColor: colors.surface,
                                    transform: [{ scale: anims.cardScale }],
                                    opacity: anims.opacity,
                                  },
                                ]}
                              >
                                {/* Delete Button - Wrapped in View to prevent parent TouchableOpacity from blocking */}
                                <TouchableOpacity
                                  onPress={(e) => {
                                    e.stopPropagation();
                                    console.log("🗑️ Delete button pressed for:", memory.id);
                                    if (Platform.OS === "ios") {
                                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                    }
                                    confirmDelete(memory.id, memory.title, memory.imageURL);
                                  }}
                                  disabled={isDeleting}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                                  style={[
                                    styles.deleteBtn,
                                    {
                                      position: "absolute",
                                      top: 12,
                                      right: 12,
                                      zIndex: 9999,
                                      backgroundColor: isDeleting
                                        ? "rgba(168, 85, 247, 0.5)"
                                        : "rgba(239, 68, 68, 0.95)",
                                      opacity: isDeleting ? 0.6 : 1,
                                    },
                                  ]}
                                >
                                  {isDeleting ? (
                                    <Ionicons name="hourglass-outline" size={18} color="#fff" />
                                  ) : (
                                    <Ionicons name="trash-outline" size={18} color="#fff" />
                                  )}
                                </TouchableOpacity>

                                {/* Card Content - Touchable for expand/collapse */}
                                <TouchableOpacity
                                  activeOpacity={0.92}
                                  onPress={() => toggleExpand(memory.id)}
                                  style={{ flex: 1 }}
                                  onPressIn={() => {
                                    // Scale down animation on press
                                    Animated.spring(anims.cardScale, {
                                      toValue: 0.97,
                                      useNativeDriver: true,
                                      tension: 300,
                                      friction: 10,
                                    }).start();
                                  }}
                                  onPressOut={() => {
                                    // Scale back up
                                    Animated.spring(anims.cardScale, {
                                      toValue: 1,
                                      useNativeDriver: true,
                                      tension: 300,
                                      friction: 10,
                                    }).start();
                                  }}
                                  disabled={isDeleting}
                                  style={{ flex: 1 }}
                                >
                                  {/* Date Chip */}
                                  <View style={styles.dateChipWrapper}>
                                    <View
                                      style={[
                                        styles.dateChip,
                                        {
                                          backgroundColor: emotionColor,
                                        },
                                      ]}
                                    >
                                      <Ionicons
                                        name="calendar-outline"
                                        size={12}
                                        color="#fff"
                                        style={{ marginRight: 4 }}
                                      />
                                      <Text style={styles.dateChipText}>
                                        {formatDate(memory.startDate)}
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Cover Image */}
                                  {memory.imageURL && (
                                    <Animated.View
                                      style={[
                                        styles.imageContainer,
                                        {
                                          height: anims.imageHeight,
                                        },
                                      ]}
                                    >
                                      <Image
                                        source={{ uri: memory.imageURL }}
                                        style={[
                                          styles.image,
                                          {
                                            resizeMode: isExpanded
                                              ? "contain"
                                              : "cover",
                                          },
                                        ]}
                                      />
                                      {/* Image overlay gradient */}
                                      <Animated.View
                                        style={[
                                          styles.imageOverlay,
                                          {
                                            backgroundColor: isDarkMode
                                              ? "rgba(2,6,23,0.3)"
                                              : "rgba(250,245,255,0.3)",
                                            opacity: isExpanded ? 0 : 1,
                                          },
                                        ]}
                                      />
                                    </Animated.View>
                                  )}

                                  {/* Content Section */}
                                  <View style={styles.contentSection}>
                                    {/* Title */}
                                    <View style={styles.titleRow}>
                                      <Text
                                        numberOfLines={
                                          isExpanded ? undefined : 2
                                        }
                                        style={[styles.title, glowText]}
                                      >
                                        {memory.title}
                                      </Text>
                                    </View>

                                    {/* Emotion Spectrum (if available) */}
                                    {memory.emotionSpectrum && (
                                      <View
                                        style={[
                                          styles.emotionSpectrumCard,
                                          {
                                            backgroundColor: colors.chipBg,
                                            borderColor:
                                              emotionColor +
                                              (isDarkMode ? "33" : "88"),
                                          },
                                        ]}
                                      >
                                        <View style={styles.emotionHeaderRow}>
                                          <Ionicons
                                            name="pulse-outline"
                                            size={14}
                                            color={emotionColor}
                                          />
                                          <Text
                                            style={[
                                              styles.emotionHeaderText,
                                              { color: emotionColor },
                                            ]}
                                          >
                                            Emotional State
                                          </Text>
                                        </View>
                                        {[
                                          {
                                            key: "energy",
                                            icon: "flash",
                                            label: "Energy",
                                            color: "#f59e0b",
                                          },
                                          {
                                            key: "stress",
                                            icon: "alert-circle",
                                            label: "Stress",
                                            color: "#ef4444",
                                          },
                                          {
                                            key: "clarity",
                                            icon: "bulb",
                                            label: "Clarity",
                                            color: "#3b82f6",
                                          },
                                          {
                                            key: "warmth",
                                            icon: "heart",
                                            label: "Warmth",
                                            color: "#ec4899",
                                          },
                                        ].map((emotion) => {
                                          const value =
                                            memory.emotionSpectrum?.[
                                              emotion.key as keyof typeof memory.emotionSpectrum
                                            ] || 0;
                                          return (
                                            <View
                                              key={emotion.key}
                                              style={styles.emotionBarRow}
                                            >
                                              <View
                                                style={styles.emotionBarLabel}
                                              >
                                                <Ionicons
                                                  name={emotion.icon as any}
                                                  size={14}
                                                  color={emotion.color}
                                                />
                                                <Text
                                                  style={[
                                                    styles.emotionLabel,
                                                    softText,
                                                  ]}
                                                >
                                                  {emotion.label}
                                                </Text>
                                              </View>
                                              <View
                                                style={
                                                  styles.emotionBarContainer
                                                }
                                              >
                                                <View
                                                  style={[
                                                    styles.emotionBarTrack,
                                                    {
                                                      backgroundColor:
                                                        colors.borderSoft,
                                                    },
                                                  ]}
                                                >
                                                  <View
                                                    style={[
                                                      styles.emotionBarFill,
                                                      {
                                                        width: `${value}%`,
                                                        backgroundColor:
                                                          emotion.color,
                                                        shadowColor:
                                                          emotion.color,
                                                        shadowOpacity:
                                                          isDarkMode
                                                            ? 0.8
                                                            : 0.5,
                                                        shadowRadius: 8,
                                                        shadowOffset: {
                                                          width: 0,
                                                          height: 0,
                                                        },
                                                      },
                                                    ]}
                                                  />
                                                </View>
                                                <Text
                                                  style={[
                                                    styles.emotionValue,
                                                    { color: emotion.color },
                                                  ]}
                                                >
                                                  {value}%
                                                </Text>
                                              </View>
                                            </View>
                                          );
                                        })}
                                      </View>
                                    )}

                                    {/* Description */}
                                    <Text
                                      numberOfLines={isExpanded ? undefined : 3}
                                      style={[
                                        styles.description,
                                        { color: colors.text },
                                      ]}
                                    >
                                      {memory.description}
                                    </Text>

                                    {/* DateTime & Creator Row */}
                                    <View style={styles.metaRow}>
                                      <View style={styles.dateTimeRow}>
                                        <Ionicons
                                          name="time-outline"
                                          size={13}
                                          color={PRIMARY_PURPLE}
                                        />
                                        <Text
                                          style={[styles.dateTime, softText]}
                                        >
                                          {formatDateTime(memory.startDate)}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* Creator Info */}
                                    {memory.CreatedUser?.CreatedUserName && (
                                      <View
                                        style={[
                                          styles.creatorRow,
                                          {
                                            backgroundColor: colors.chipBg,
                                            borderColor:
                                              emotionColor +
                                              (isDarkMode ? "33" : "88"),
                                          },
                                        ]}
                                      >
                                        {memory.CreatedUser.CreatedUserPhoto ? (
                                          <Image
                                            source={{
                                              uri: memory.CreatedUser
                                                .CreatedUserPhoto,
                                            }}
                                            style={styles.creatorAvatar}
                                          />
                                        ) : (
                                          <View
                                            style={[
                                              styles.creatorAvatar,
                                              styles.creatorAvatarPlaceholder,
                                              {
                                                backgroundColor: colors.surface,
                                              },
                                            ]}
                                          >
                                            <Ionicons
                                              name="person-outline"
                                              size={12}
                                              color={PRIMARY_PURPLE}
                                            />
                                          </View>
                                        )}
                                        <Text
                                          style={[styles.creatorName, softText]}
                                        >
                                          {memory.CreatedUser.CreatedUserName}
                                        </Text>
                                      </View>
                                    )}

                                    {/* Expand/Collapse Indicator */}
                                    <View
                                      style={[
                                        styles.expandIndicator,
                                        {
                                          backgroundColor: colors.chipBg,
                                          borderTopWidth: 1,
                                          borderTopColor:
                                            emotionColor +
                                            (isDarkMode ? "33" : "88"),
                                        },
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.expandText,
                                          { color: emotionColor },
                                        ]}
                                      >
                                        {isExpanded ? "Show less" : "Read more"}
                                      </Text>
                                      <Ionicons
                                        name={
                                          isExpanded
                                            ? "chevron-up"
                                            : "chevron-down"
                                        }
                                        size={16}
                                        color={emotionColor}
                                      />
                                    </View>
                                  </View>
                                </TouchableOpacity>
                              </Animated.View>
                            </View>
                          );
                        })}
                    </View>
                  </View>
                </View>
              ))
          )}
        </ScrollView>

        {/* Filter Modal */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          onApply={handleApplyFilters}
          isDarkMode={isDarkMode}
          memories={memories as any[]}
        />

        {/* Bottom Navigation */}
        <BottomNavBar isDarkMode={isDarkMode} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    paddingTop: Platform.OS === "ios" ? 6 : 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    minHeight: Platform.OS === "ios" ? 50 : 48,
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 17 : 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  headerSubtitle: {
    fontSize: Platform.OS === "ios" ? 10 : 9,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Platform.OS === "ios" ? 10 : 12,
    flexShrink: 0,
  },
  themeToggle: {
    width: 40,
    alignItems: "flex-end",
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

  scrollContent: {
    paddingHorizontal: Platform.OS === "ios" ? 12 : 16,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },

  /* Empty State */
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 8,
  },

  /* Year Section */
  yearSection: {
    marginBottom: 32,
  },
  yearHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  yearBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: "700",
  },
  yearDivider: {
    flex: 1,
    height: 1,
    backgroundColor: PRIMARY_PURPLE + "33",
    marginHorizontal: 12,
  },
  countBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  memoryCount: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* Timeline */
  timelineContainer: {
    position: "relative",
    paddingLeft: 24,
  },
  timelineLineWrapper: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 8,
    borderRadius: 4,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    marginLeft: 3,
  },
  memoriesWrapper: {
    position: "relative",
  },

  memoryItemWrapper: {
    position: "relative",
    marginBottom: 8,
    zIndex: 1,
  },
  timelineDot: {
    position: "absolute",
    left: -32,
    top: 24,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2.5,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
    zIndex: 10,
  },

  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ef4444",
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 20,
    borderWidth: 2.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
  },

  dateChipWrapper: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  dateChipText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

  imageContainer: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },

  contentSection: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },

  titleRow: {
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },

  emotionSpectrumCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  emotionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 6,
  },
  emotionHeaderText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emotionBarRow: {
    marginBottom: 10,
  },
  emotionBarLabel: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  emotionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  emotionBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  emotionBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  emotionBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  emotionValue: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 36,
    textAlign: "right",
  },

  metaRow: {
    marginTop: 8,
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dateTime: {
    fontSize: 11,
    fontWeight: "500",
  },

  description: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.9,
  },

  creatorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
    alignSelf: "flex-start",
  },
  creatorAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  creatorAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: PRIMARY_PURPLE + "66",
  },
  creatorName: {
    fontSize: 12,
  },

  expandIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 6,
    marginTop: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* Success Overlay Styles */
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

  /* Confirmation Modal Styles */
  confirmCard: {
    alignItems: "center",
    maxWidth: 320,
    width: "100%",
  },
  confirmIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  confirmSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  confirmWarning: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
    opacity: 0.8,
  },
  confirmButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  deleteButton: {
    shadowColor: "#ef4444",
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});

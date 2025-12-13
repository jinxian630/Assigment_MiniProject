import React, { useEffect, useState, useRef } from "react";
import {
  View,
  ScrollView,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  RefreshControl,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import { auth, db } from "@/config/firebase";
import { doc, getDoc } from "firebase/firestore";
import { subscribeToLatestMemories } from "./utils/firebaseHelpers";
import type { Memory } from "./utils/memoryHelpers";
import PostCard from "./components/PostCard";
import BottomNavBar from "./components/BottomNavBar";
import AIInsights from "./components/AIInsights";
import InteractiveButton from "./components/InteractiveButton";

const PRIMARY_PURPLE = "#a855f7";

// Using Memory type from memoryHelpers

type UserProfile = {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
};

export default function MemoryBookScreen() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user: authUser } = useAuth();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(true);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Animation refs for interactive elements
  const profileCardGlow = useRef(new Animated.Value(0)).current;
  const headerGlow = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const headerIconScale1 = useRef(new Animated.Value(1)).current;
  const headerIconScale2 = useRef(new Animated.Value(1)).current;
  const statItemScales = useRef<Record<number, Animated.Value>>({}).current;

  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
  };

  // Load user profile from Firestore
  useEffect(() => {
    const loadUserProfile = async () => {
      const currentUserId = auth.currentUser?.uid || authUser?.id;
      if (!currentUserId) {
        // Fallback to auth user data if available
        if (authUser) {
          setUser({
            id: authUser.id,
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
          });
        }
        setLoadingUser(false);
        return;
      }

      try {
        // Try users collection first
        let userRef = doc(db, "users", currentUserId);
        let userSnap = await getDoc(userRef);

        // If not found, try Users collection (capitalized)
        if (!userSnap.exists()) {
          userRef = doc(db, "Users", currentUserId);
          userSnap = await getDoc(userRef);
        }

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({
            id: currentUserId,
            displayName: userData.displayName,
            email: userData.email,
            photoURL: userData.photoURL,
            bio: userData.bio,
          });
        } else {
          // Fallback to auth user data
          if (authUser) {
            setUser({
              id: authUser.id,
              displayName: authUser.displayName,
              email: authUser.email,
              photoURL: authUser.photoURL,
            });
          }
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
        // Fallback to auth user data
        if (authUser) {
          setUser({
            id: authUser.id,
            displayName: authUser.displayName,
            email: authUser.email,
            photoURL: authUser.photoURL,
          });
        }
      } finally {
        setLoadingUser(false);
      }
    };

    loadUserProfile();
  }, [authUser]);

  useEffect(() => {
    console.log("🔄 Setting up memory subscription...");
    const unsubscribe = subscribeToLatestMemories(20, (memoriesList) => {
      console.log("📦 Memory feed: Received", memoriesList.length, "memories");
      console.log(
        "📋 Memory IDs:",
        memoriesList.map((m) => m.id)
      );
      setMemories(memoriesList);
    });

    return () => {
      console.log("🛑 Unsubscribing from memories");
      unsubscribe();
    };
  }, []);

  // Pulsing glow animation for profile card
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(profileCardGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(profileCardGlow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    glowAnimation.start();

    // Header glow animation
    const headerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(headerGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: false,
        }),
        Animated.timing(headerGlow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: false,
        }),
      ])
    );
    headerAnimation.start();

    return () => {
      glowAnimation.stop();
      headerAnimation.stop();
    };
  }, []);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleProfilePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();

    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Pass current user's ID to UserProfile
    const currentUserId = user?.id || authUser?.id || auth.currentUser?.uid;
    if (currentUserId) {
      router.push(`/modules/memory-book/UserProfile?userId=${currentUserId}`);
    } else {
      router.push("/modules/memory-book/UserProfile");
    }
  };

  const stats = {
    posts: memories.length,
    following: 0, // Can be implemented later
    followers: 0, // Can be implemented later
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
          <View style={styles.headerLeft}>
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="ghost"
            />
            <Animated.Text
              style={[
                styles.headerTitle,
                {
                  color: colors.text,
                  textShadowColor: PRIMARY_PURPLE + (isDarkMode ? "CC" : "88"),
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: headerGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [4, 12],
                  }) as any,
                  opacity: headerGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.9],
                  }),
                },
              ]}
            >
              Memory Book
            </Animated.Text>
          </View>
          <View style={styles.headerRight}>
            <InteractiveButton
              onPress={() => {
                router.push("/modules/memory-book/UserSearch");
              }}
              icon="person-add-outline"
              description="Search and add friends to your network"
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              style={styles.headerIcon}
              noBorder={true}
              accessibilityLabel="Search users"
              accessibilityHint="Opens user search page"
            />
            <InteractiveButton
              onPress={toggleTheme}
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              description={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              style={styles.headerIcon}
              noBorder={true}
              accessibilityLabel="Toggle theme"
              accessibilityHint={`Changes to ${
                isDarkMode ? "light" : "dark"
              } mode`}
            />
            <TouchableOpacity
              onPress={handleProfilePress}
              activeOpacity={0.8}
              style={styles.profileButton}
            >
              {user?.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.headerAvatar}
                />
              ) : (
                <View
                  style={[
                    styles.headerAvatar,
                    styles.headerAvatarPlaceholder,
                    {
                      backgroundColor: "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={Platform.OS === "ios" ? 18 : 16}
                    color={PRIMARY_PURPLE}
                  />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

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
          {/* User Profile Section */}
          <Animated.View
            style={[
              styles.profileSection,
              {
                backgroundColor: isDarkMode
                  ? "rgba(30, 41, 59, 0.85)"
                  : "rgba(255, 255, 255, 0.98)",
                borderColor: PRIMARY_PURPLE + (isDarkMode ? "66" : "CC"),
                shadowColor: PRIMARY_PURPLE,
                shadowOpacity: profileCardGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: isDarkMode ? [0.6, 1.0] : [0.4, 0.7],
                }),
                shadowRadius: profileCardGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 35],
                }),
                shadowOffset: { width: 0, height: 0 },
                elevation: isDarkMode ? 18 : 12,
              },
            ]}
          >
            <View style={styles.profileTop}>
              <TouchableOpacity
                onPress={handleProfilePress}
                activeOpacity={0.8}
                style={styles.avatarContainer}
              >
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  {user?.photoURL ? (
                    <Image
                      source={{ uri: user.photoURL }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View
                      style={[
                        styles.avatar,
                        styles.avatarPlaceholder,
                        {
                          backgroundColor: colors.chipBg,
                          borderColor: PRIMARY_PURPLE + "66",
                        },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={40}
                        color={PRIMARY_PURPLE}
                      />
                    </View>
                  )}
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.statsRow}>
                {[
                  { value: stats.posts, label: "posts", index: 0 },
                  { value: stats.followers, label: "followers", index: 1 },
                  { value: stats.following, label: "following", index: 2 },
                ].map((stat) => {
                  if (!statItemScales[stat.index]) {
                    statItemScales[stat.index] = new Animated.Value(1);
                  }
                  const scaleAnim = statItemScales[stat.index];

                  return (
                    <TouchableOpacity
                      key={stat.index}
                      activeOpacity={0.8}
                      onPressIn={() => {
                        Animated.spring(scaleAnim, {
                          toValue: 0.9,
                          useNativeDriver: true,
                          tension: 300,
                          friction: 10,
                        }).start();
                        if (Platform.OS === "ios") {
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Light
                          );
                        }
                      }}
                      onPressOut={() => {
                        Animated.spring(scaleAnim, {
                          toValue: 1,
                          useNativeDriver: true,
                          tension: 300,
                          friction: 10,
                        }).start();
                      }}
                    >
                      <Animated.View
                        style={[
                          styles.statItem,
                          {
                            transform: [{ scale: scaleAnim }],
                          },
                        ]}
                      >
                        <Text
                          style={[styles.statNumber, { color: colors.text }]}
                        >
                          {stat.value}
                        </Text>
                        <Text
                          style={[styles.statLabel, { color: colors.textSoft }]}
                        >
                          {stat.label}
                        </Text>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.profileInfo}>
              <Text style={[styles.username, { color: colors.text }]}>
                {user?.displayName || authUser?.displayName || "User"}
              </Text>
              <Text style={[styles.bio, { color: colors.textSoft }]}>
                {user?.bio || "Preserving moments, crafting memories"}
              </Text>
            </View>

            <View style={styles.profileActions}>
              <InteractiveButton
                onPress={() => {
                  router.push("/modules/memory-book/MemoryPostCreate");
                }}
                icon="add-circle"
                label="New Memory"
                description="Create a new memory with photo, title, and mood"
                variant="primary"
                size="md"
                isDarkMode={isDarkMode}
                style={styles.profileActionButton}
                noBorder={true}
                accessibilityLabel="Create new memory"
                accessibilityHint="Opens the memory creation screen"
              />
              <InteractiveButton
                onPress={handleProfilePress}
                icon="person-outline"
                label="View Profile"
                description="View your profile, stats, and all your memories"
                variant="ghost"
                size="md"
                isDarkMode={isDarkMode}
                iconColor={PRIMARY_PURPLE}
                style={styles.profileActionButton}
                noBorder={true}
                accessibilityLabel="View profile"
                accessibilityHint="Opens your profile page"
              />
            </View>
          </Animated.View>

          {/* AI Insights Toggle */}
          {memories.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setShowAIInsights(!showAIInsights);
                if (Platform.OS === "ios") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
              }}
              activeOpacity={0.8}
              style={[
                styles.insightsToggle,
                {
                  backgroundColor: colors.chipBg,
                },
              ]}
            >
              <Ionicons
                name={showAIInsights ? "chevron-up" : "chevron-down"}
                size={18}
                color={PRIMARY_PURPLE}
              />
              <Text style={[styles.insightsToggleText, { color: colors.text }]}>
                {showAIInsights ? "Hide" : "Show"} AI Insights
              </Text>
            </TouchableOpacity>
          )}

          {/* AI Insights */}
          {showAIInsights && memories.length > 0 && (
            <AIInsights memories={memories} isDarkMode={isDarkMode} />
          )}

          {/* Feed */}
          <View style={styles.feedSection}>
            <View style={styles.feedHeader}>
              <Ionicons name="grid" size={20} color={colors.text} />
              <Text style={[styles.feedTitle, { color: colors.text }]}>
                Your Memories
              </Text>
            </View>

            {memories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="images-outline"
                  size={48}
                  color={colors.textSoft}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No memories yet
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textSoft }]}
                >
                  Start by creating your first memory
                </Text>
                <InteractiveButton
                  onPress={() => {
                    router.push("/modules/memory-book/MemoryPostCreate");
                  }}
                  icon="add"
                  label="Create Memory"
                  description="Start creating your first memory with photo and story"
                  variant="primary"
                  size="lg"
                  isDarkMode={isDarkMode}
                  style={styles.createButton}
                  accessibilityLabel="Create memory"
                  accessibilityHint="Opens memory creation screen"
                />
              </View>
            ) : (
              memories.map((memory) => (
                <PostCard
                  key={memory.id}
                  memory={memory}
                  isDarkMode={isDarkMode}
                />
              ))
            )}
          </View>
        </ScrollView>

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
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    borderBottomWidth: 1,
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    minHeight: Platform.OS === "ios" ? 50 : 48,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0, // Allow text to shrink
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 17 : 16,
    fontWeight: "700",
    marginLeft: Platform.OS === "ios" ? 8 : 6,
    flexShrink: 1, // Allow text to shrink if needed
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Platform.OS === "ios" ? 6 : 8,
    flexShrink: 0, // Prevent icons from shrinking
  },
  headerIcon: {
    padding: 0,
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  profileButton: {
    marginLeft: Platform.OS === "ios" ? 2 : 4,
    padding: 2,
    minWidth: Platform.OS === "ios" ? 36 : 32,
    minHeight: Platform.OS === "ios" ? 36 : 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatar: {
    width: Platform.OS === "ios" ? 30 : 28,
    height: Platform.OS === "ios" ? 30 : 28,
    borderRadius: Platform.OS === "ios" ? 15 : 14,
    borderWidth: 0,
  },
  headerAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
  },
  profileSection: {
    margin: Platform.OS === "ios" ? 12 : 16,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: Platform.OS === "ios" ? 16 : 18,
  },
  profileTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: Platform.OS === "ios" ? 70 : 80,
    height: Platform.OS === "ios" ? 70 : 80,
    borderRadius: Platform.OS === "ios" ? 35 : 40,
  },
  avatarPlaceholder: {
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: Platform.OS === "ios" ? 18 : 20,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statLabel: {
    fontSize: Platform.OS === "ios" ? 12 : 11,
    fontWeight: "500",
    marginTop: Platform.OS === "ios" ? 4 : 6,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    opacity: 0.8,
  },
  profileInfo: {
    marginBottom: 16,
    paddingTop: 4,
  },
  username: {
    fontSize: Platform.OS === "ios" ? 20 : 22,
    fontWeight: "700",
    marginBottom: Platform.OS === "ios" ? 6 : 8,
    letterSpacing: 0.5,
  },
  bio: {
    fontSize: Platform.OS === "ios" ? 15 : 14,
    lineHeight: Platform.OS === "ios" ? 22 : 20,
    fontWeight: "400",
    letterSpacing: 0.2,
    opacity: 0.85,
  },
  profileActions: {
    flexDirection: "row",
    gap: Platform.OS === "ios" ? 10 : 8,
  },
  profileActionButton: {
    flex: 1,
    minHeight: Platform.OS === "ios" ? 48 : 46,
    borderRadius: 14,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  editButtonTextOutline: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  insightsToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 0, // Remove black border
    gap: 8,
    minHeight: Platform.OS === "ios" ? 44 : 42,
  },
  insightsToggleText: {
    fontSize: 13,
    fontWeight: "600",
  },
  feedSection: {
    paddingHorizontal: 16,
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
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: "center",
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  createButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});

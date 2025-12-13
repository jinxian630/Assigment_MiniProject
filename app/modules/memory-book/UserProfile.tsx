// app/modules/memory-book/UserProfile.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Animated,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { auth, db, storage } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToComments } from "./utils/commentHelpers";
import type { Comment } from "./utils/commentHelpers";
import InteractiveButton from "./components/InteractiveButton";
import BottomNavBar from "./components/BottomNavBar";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateDoc } from "firebase/firestore";

const PRIMARY_PURPLE = "#a855f7";

/** 🎨 Professional neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: accentColor + (isDark ? "66" : "AA"),
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.8 : 0.3,
    shadowRadius: isDark ? 24 : 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: isDark ? 16 : 8,
    ...extra,
  };
};

/** 🎨 Professional text styles - adapts to theme */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#F1F5F9" : "#0F172A", // Light in dark, dark in light
  textShadowColor: accentColor + (isDark ? "AA" : "40"),
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 6 : 3,
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#475569", // Light gray in dark, dark gray in light
});

const getMutedText = (isDark: boolean) => ({
  color: isDark ? "#94A3B8" : "#64748B", // Muted for secondary info
});

type User = {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
};

type Memory = {
  id: string;
  title: string;
  description?: string;
  imageURL?: string;
  startDate?: number;
  emotionColor?: string;
  likesCount?: number;
  commentsCount?: number;
  userId: string;
};

type PostWithComments = Memory & {
  comments: Comment[];
  totalComments: number;
};

type TabType = "posts" | "comments" | "stats";

export default function UserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";
  const { user: authUser } = useAuth();

  // Use provided userId or fall back to current user's ID
  const providedUserId = params.userId as string | undefined;
  const currentUserId = auth.currentUser?.uid || authUser?.id;
  const userId = providedUserId || currentUserId;
  const isOwnProfile = userId === currentUserId;

  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [postsWithComments, setPostsWithComments] = useState<
    PostWithComments[]
  >([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMemories, setLoadingMemories] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("posts");
  const [tabAnim] = useState(new Animated.Value(0));

  // Edit profile modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPhotoURI, setEditPhotoURI] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 🎨 Light purple glowing boxes with dark text
  const colors = {
    // Backgrounds - Darker purple in light mode for better contrast
    bg: isDarkMode ? "#020617" : "#FAF5FF",
    card: isDarkMode ? "#1E293B" : "#E9D5FF", // Darker purple in light mode
    cardElevated: isDarkMode ? "#334155" : "#DDD6FE", // Darker purple for elevated cards

    // Text colors - Dark for visibility on light purple
    textMain: isDarkMode ? "#F1F5F9" : "#1E1B4B", // Dark purple/indigo on light purple
    textSecondary: isDarkMode ? "#CBD5E1" : "#4C1D95", // Dark purple on light purple
    textMuted: isDarkMode ? "#94A3B8" : "#6B21A8", // Darker purple for muted text

    // Borders and dividers - Purple tint
    border: isDarkMode ? "#334155" : "#C4B5FD", // Light purple border
    borderSoft: isDarkMode ? "#1E293B" : "#DDD6FE", // Softer purple border

    // Accent colors
    accent: PRIMARY_PURPLE,
    accentLight: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(168,85,247,0.25)", // Darker purple in light mode
    accentMedium: isDarkMode ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.35)", // Darker purple in light mode

    // Interactive elements
    tabActive: PRIMARY_PURPLE,
    tabInactive: isDarkMode ? "#64748B" : "#7C3AED", // Purple tint for inactive
    tabBg: isDarkMode ? "rgba(168,85,247,0.1)" : "rgba(168,85,247,0.25)", // Darker purple in light mode

    // Stats cards - Darker purple in light mode
    statBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(168,85,247,0.25)", // Darker purple in light mode
    statBorder: isDarkMode ? "rgba(168,85,247,0.4)" : "rgba(168,85,247,0.5)", // Stronger border in light mode

    // Button colors - Darker purple in light mode
    buttonBg: isDarkMode ? "rgba(168,85,247,0.2)" : "rgba(168,85,247,0.3)", // Darker purple in light mode
    buttonBorder: isDarkMode ? PRIMARY_PURPLE : "rgba(168,85,247,0.7)", // Stronger purple border in light mode
  };

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);
  const mutedText = getMutedText(isDarkMode);

  // Load user data
  useEffect(() => {
    if (!userId) {
      if (!currentUserId) {
        setLoadingUser(false);
        return;
      }
      if (authUser) {
        setUser({
          id: authUser.id,
          displayName: authUser.displayName,
          email: authUser.email,
          photoURL: authUser.photoURL,
        });
        setLoadingUser(false);
      }
      return;
    }

    (async () => {
      try {
        let ref = doc(db, "users", userId);
        let snap = await getDoc(ref);

        if (!snap.exists()) {
          ref = doc(db, "Users", userId);
          snap = await getDoc(ref);
        }

        if (snap.exists()) {
          setUser({ id: snap.id, ...(snap.data() as any) });
        } else {
          if (authUser && userId === currentUserId) {
            setUser({
              id: authUser.id,
              displayName: authUser.displayName,
              email: authUser.email,
              photoURL: authUser.photoURL,
            });
          }
        }
      } catch (err) {
        console.log("UserProfile user error:", err);
        if (authUser && userId === currentUserId) {
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
    })();
  }, [userId, currentUserId, authUser]);

  // Load memories
  useEffect(() => {
    const finalUserId = userId || currentUserId;
    if (!finalUserId) {
      setLoadingMemories(false);
      return;
    }

    const postsRef = collection(db, "MemoryPosts");
    const q = query(postsRef, where("userId", "==", finalUserId));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Memory[] = [];
        snap.forEach((doc) =>
          list.push({ id: doc.id, ...(doc.data() as any) })
        );
        // Sort manually by startDate descending
        list.sort((a, b) => (b.startDate || 0) - (a.startDate || 0));
        setMemories(list);
        setLoadingMemories(false);
      },
      (err) => {
        console.log("UserProfile memories error:", err);
        setLoadingMemories(false);
      }
    );

    return () => unsub();
  }, [userId, currentUserId]);

  // Load comments for all posts
  useEffect(() => {
    if (memories.length === 0) {
      setPostsWithComments([]);
      return;
    }

    const unsubscribers: (() => void)[] = [];

    memories.forEach((memory) => {
      const unsub = subscribeToComments(memory.id, (comments) => {
        setPostsWithComments((prev) => {
          const existing = prev.find((p) => p.id === memory.id);
          if (existing) {
            return prev.map((p) =>
              p.id === memory.id
                ? { ...p, comments, totalComments: comments.length }
                : p
            );
          } else {
            return [
              ...prev,
              {
                ...memory,
                comments,
                totalComments: comments.length,
              },
            ];
          }
        });
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [memories]);

  // Tab animation
  useEffect(() => {
    Animated.spring(tabAnim, {
      toValue: activeTab === "posts" ? 0 : activeTab === "comments" ? 1 : 2,
      useNativeDriver: true,
      tension: 300,
      friction: 20,
    }).start();
  }, [activeTab]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleTabChange = (tab: TabType) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setActiveTab(tab);
  };

  // Edit profile handlers
  const handleEditProfile = () => {
    setEditDisplayName(user?.displayName || "");
    setEditBio(user?.bio || "");
    setEditPhotoURI(null);
    setEditModalVisible(true);
  };

  const pickProfileImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setEditPhotoURI(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    if (!currentUserId || !auth.currentUser) {
      Alert.alert("Error", "You must be logged in to edit your profile.");
      return;
    }

    if (!editDisplayName.trim()) {
      Alert.alert("Invalid Input", "Please enter a display name.");
      return;
    }

    setIsSaving(true);
    try {
      let photoURL = user?.photoURL || "";

      // Upload new photo if selected
      if (editPhotoURI) {
        const response = await fetch(editPhotoURI);
        const blob = await response.blob();
        const storageRef = ref(storage, `users/${currentUserId}/profile.jpg`);
        await uploadBytes(storageRef, blob);
        photoURL = await getDownloadURL(storageRef);
      }

      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: editDisplayName.trim(),
        photoURL: photoURL || auth.currentUser.photoURL || undefined,
      });

      // Update Firestore user document
      const userRef = doc(db, "users", currentUserId);
      const updates: any = {
        displayName: editDisplayName.trim(),
        bio: editBio.trim() || null,
        photoURL: photoURL || user?.photoURL || "",
        updatedAt: new Date(),
      };

      // Try users collection first, then Users collection
      try {
        await updateDoc(userRef, updates);
      } catch (err: any) {
        if (err.code === "not-found") {
          const altUserRef = doc(db, "Users", currentUserId);
          await updateDoc(altUserRef, updates);
        } else {
          throw err;
        }
      }

      // Update local state
      setUser({
        ...user!,
        displayName: editDisplayName.trim(),
        bio: editBio.trim() || undefined,
        photoURL: photoURL || user?.photoURL || "",
      });

      setEditModalVisible(false);
      setShowSuccess(true);
    } catch (error: any) {
      console.error("Error updating profile:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const memoriesCount = memories.length;
  const totalLikes = useMemo(
    () =>
      memories.reduce(
        (acc, m) => acc + (typeof m.likesCount === "number" ? m.likesCount : 0),
        0
      ),
    [memories]
  );
  const totalComments = useMemo(
    () => postsWithComments.reduce((acc, p) => acc + p.totalComments, 0),
    [postsWithComments]
  );

  // Get all comments for display
  const allComments = useMemo(() => {
    const comments: Array<Comment & { postId: string; postTitle: string }> = [];
    postsWithComments.forEach((post) => {
      post.comments.forEach((comment) => {
        comments.push({
          ...comment,
          postId: post.id,
          postTitle: post.title,
        });
      });
    });
    return comments.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [postsWithComments]);

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCommentDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const openMemoryDetail = (id: string) => {
    router.push(`/modules/memory-book/MemoryPostDetail?id=${id}`);
  };

  const tabIndicatorPosition = tabAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: ["0%", "33.33%", "66.66%"],
  });

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* SUCCESS OVERLAY */}
        {showSuccess && (
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
                  backgroundColor: colors.card,
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
                Profile Updated!
              </Text>
              <Text style={[styles.successSubtitle, softText]}>
                Your profile has been updated successfully
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSuccess(false);
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
            styles.headerRow,
            {
              backgroundColor: colors.card,
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
            accessibilityLabel="Go back"
            accessibilityHint="Returns to previous screen"
            tooltipPosition="top"
            noBorder={true}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { color: colors.textMain }]}>
              Profile
            </Text>
          </View>
          <View style={styles.headerRight}>
            {/* Theme Toggle Button - Always visible */}
            <InteractiveButton
              onPress={() => {
                if (Platform.OS === "ios") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                toggleTheme();
              }}
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              style={styles.themeButton}
              accessibilityLabel="Toggle theme"
              accessibilityHint={`Changes to ${
                isDarkMode ? "light" : "dark"
              } mode`}
              tooltipPosition="top"
              noBorder={true}
            />
            {isOwnProfile && (
              <InteractiveButton
                onPress={() => {
                  if (Platform.OS === "ios") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  handleEditProfile();
                }}
                icon="create-outline"
                variant="ghost"
                size="sm"
                isDarkMode={isDarkMode}
                iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
                iconSize={Platform.OS === "ios" ? 24 : 22}
                style={styles.editButton}
                accessibilityLabel="Edit profile"
                accessibilityHint="Opens profile editing screen"
                tooltipPosition="top"
                noBorder={true}
              />
            )}
            {!isOwnProfile && <View style={{ width: 8 }} />}
          </View>
        </View>

        {loadingUser ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
          </View>
        ) : !user ? (
          <View style={styles.centerBox}>
            <Ionicons
              name="person-circle-outline"
              size={64}
              color={colors.textMuted}
            />
            <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
              User not found
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.textSecondary }]}
            >
              This profile may have been removed or is unavailable.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
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
            {/* Profile Header Card - Enhanced Design */}
            <View
              style={[
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  padding: 28,
                  marginBottom: 24,
                }),
                {
                  backgroundColor: colors.card,
                },
              ]}
            >
              <View style={styles.profileHeader}>
                {user.photoURL ? (
                  <View style={styles.avatarContainer}>
                    <Image
                      source={{ uri: user.photoURL }}
                      style={styles.avatarLarge}
                    />
                    <View
                      style={[
                        styles.avatarRing,
                        {
                          borderColor:
                            PRIMARY_PURPLE + (isDarkMode ? "80" : "AA"),
                        },
                      ]}
                    />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.avatarLarge,
                      styles.avatarPlaceholder,
                      {
                        backgroundColor: colors.accentLight,
                        borderColor:
                          PRIMARY_PURPLE + (isDarkMode ? "66" : "AA"),
                      },
                    ]}
                  >
                    <Ionicons name="person" size={48} color={PRIMARY_PURPLE} />
                  </View>
                )}

                <View style={styles.profileInfo}>
                  <Text
                    style={[styles.profileName, { color: colors.textMain }]}
                  >
                    {user.displayName || "Unnamed user"}
                  </Text>
                  {user.email && (
                    <Text
                      style={[
                        styles.profileEmail,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {user.email}
                    </Text>
                  )}
                  {user.bio && (
                    <Text
                      style={[
                        styles.profileBio,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {user.bio}
                    </Text>
                  )}
                  {!user.bio && isOwnProfile && (
                    <Text
                      style={[
                        styles.profileBio,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Preserving moments, crafting memories
                    </Text>
                  )}
                </View>
              </View>

              {/* Enhanced Stats Row */}
              <View style={styles.statsRow}>
                <TouchableOpacity
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.statBg,
                      borderColor: colors.statBorder,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => handleTabChange("posts")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, { color: colors.textMain }]}>
                    {memoriesCount}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Memories
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.statBg,
                      borderColor: colors.statBorder,
                      borderWidth: 1.5,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, { color: colors.textMain }]}>
                    {totalLikes}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Likes
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.statCard,
                    {
                      backgroundColor: colors.statBg,
                      borderColor: colors.statBorder,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={() => handleTabChange("comments")}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.statValue, { color: colors.textMain }]}>
                    {totalComments}
                  </Text>
                  <Text
                    style={[styles.statLabel, { color: colors.textSecondary }]}
                  >
                    Comments
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Enhanced Tabs */}
            <View
              style={[
                styles.tabContainer,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabChange("posts")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "posts"
                          ? colors.tabActive
                          : colors.tabInactive,
                      fontWeight: activeTab === "posts" ? "700" : "600",
                    },
                  ]}
                >
                  Posts
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabChange("comments")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "comments"
                          ? colors.tabActive
                          : colors.tabInactive,
                      fontWeight: activeTab === "comments" ? "700" : "600",
                    },
                  ]}
                >
                  Comments
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.tab}
                onPress={() => handleTabChange("stats")}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color:
                        activeTab === "stats"
                          ? colors.tabActive
                          : colors.tabInactive,
                      fontWeight: activeTab === "stats" ? "700" : "600",
                    },
                  ]}
                >
                  Stats
                </Text>
              </TouchableOpacity>
              <Animated.View
                style={[
                  styles.tabIndicator,
                  {
                    backgroundColor: PRIMARY_PURPLE + "20",
                    left: tabIndicatorPosition,
                  },
                ]}
              />
            </View>

            {/* Tab Content */}
            {activeTab === "posts" && (
              <View style={styles.tabContent}>
                {loadingMemories ? (
                  <View style={styles.centerBox}>
                    <ActivityIndicator size="small" color={PRIMARY_PURPLE} />
                  </View>
                ) : memories.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        {
                          backgroundColor: colors.accentLight,
                          borderColor:
                            PRIMARY_PURPLE + (isDarkMode ? "66" : "AA"),
                        },
                      ]}
                    >
                      <Ionicons
                        name="images-outline"
                        size={40}
                        color={PRIMARY_PURPLE}
                      />
                    </View>
                    <Text
                      style={[styles.emptyTitle, { color: colors.textMain }]}
                    >
                      No memories yet
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {isOwnProfile
                        ? "Start creating your first memory!"
                        : "When this user posts a memory, it will appear here."}
                    </Text>
                  </View>
                ) : (
                  memories.map((memory) => (
                    <TouchableOpacity
                      key={memory.id}
                      onPress={() => openMemoryDetail(memory.id)}
                      activeOpacity={0.9}
                      style={[
                        createNeonCardShell(
                          memory.emotionColor || PRIMARY_PURPLE,
                          isDarkMode,
                          {
                            padding: 0,
                            marginBottom: 16,
                            overflow: "hidden",
                          }
                        ),
                        {
                          backgroundColor: colors.card,
                        },
                      ]}
                    >
                      {memory.imageURL && (
                        <Image
                          source={{ uri: memory.imageURL }}
                          style={styles.postImage}
                        />
                      )}
                      <View style={styles.postContent}>
                        <View style={styles.postHeader}>
                          <View style={{ flex: 1 }}>
                            <Text
                              numberOfLines={2}
                              style={[
                                styles.postTitle,
                                { color: colors.textMain },
                              ]}
                            >
                              {memory.title}
                            </Text>
                            {memory.description && (
                              <Text
                                numberOfLines={2}
                                style={[
                                  styles.postDescription,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {memory.description}
                              </Text>
                            )}
                          </View>
                          <View
                            style={[
                              styles.emotionDot,
                              {
                                backgroundColor:
                                  memory.emotionColor || PRIMARY_PURPLE,
                              },
                            ]}
                          />
                        </View>
                        <View style={styles.postFooter}>
                          <Text
                            style={[
                              styles.postDate,
                              { color: colors.textMuted },
                            ]}
                          >
                            {formatDate(memory.startDate)}
                          </Text>
                          <View style={styles.postStats}>
                            {(memory.likesCount ?? 0) > 0 && (
                              <View style={styles.postStatItem}>
                                <Ionicons
                                  name="heart"
                                  size={14}
                                  color={PRIMARY_PURPLE}
                                />
                                <Text
                                  style={[
                                    styles.postStatText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {memory.likesCount ?? 0}
                                </Text>
                              </View>
                            )}
                            {(memory.commentsCount ?? 0) > 0 && (
                              <View style={styles.postStatItem}>
                                <Ionicons
                                  name="chatbubble"
                                  size={14}
                                  color={PRIMARY_PURPLE}
                                />
                                <Text
                                  style={[
                                    styles.postStatText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  {memory.commentsCount ?? 0}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {activeTab === "comments" && (
              <View style={styles.tabContent}>
                {allComments.length === 0 ? (
                  <View style={styles.emptyState}>
                    <View
                      style={[
                        styles.emptyIconCircle,
                        {
                          backgroundColor: colors.accentLight,
                          borderColor:
                            PRIMARY_PURPLE + (isDarkMode ? "66" : "AA"),
                        },
                      ]}
                    >
                      <Ionicons
                        name="chatbubbles-outline"
                        size={40}
                        color={PRIMARY_PURPLE}
                      />
                    </View>
                    <Text
                      style={[styles.emptyTitle, { color: colors.textMain }]}
                    >
                      No comments yet
                    </Text>
                    <Text
                      style={[
                        styles.emptySubtitle,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {isOwnProfile
                        ? "Comments on your posts will appear here."
                        : "This user hasn't received any comments yet."}
                    </Text>
                  </View>
                ) : (
                  allComments.map((comment) => (
                    <TouchableOpacity
                      key={comment.id}
                      onPress={() => openMemoryDetail(comment.postId)}
                      activeOpacity={0.9}
                      style={[
                        createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                          padding: 18,
                          marginBottom: 12,
                        }),
                        {
                          backgroundColor: colors.card,
                        },
                      ]}
                    >
                      <View style={styles.commentHeader}>
                        {comment.userPhoto ? (
                          <Image
                            source={{ uri: comment.userPhoto }}
                            style={styles.commentAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              styles.commentAvatar,
                              styles.commentAvatarPlaceholder,
                              {
                                backgroundColor: colors.accentLight,
                                borderColor:
                                  PRIMARY_PURPLE + (isDarkMode ? "66" : "AA"),
                              },
                            ]}
                          >
                            <Ionicons
                              name="person"
                              size={16}
                              color={PRIMARY_PURPLE}
                            />
                          </View>
                        )}
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text
                            style={[
                              styles.commentAuthor,
                              { color: colors.textMain },
                            ]}
                          >
                            {comment.userName}
                          </Text>
                          <Text
                            style={[
                              styles.commentPost,
                              { color: colors.textMuted },
                            ]}
                          >
                            on "{comment.postTitle}"
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.commentDate,
                            { color: colors.textMuted },
                          ]}
                        >
                          {formatCommentDate(comment.createdAt || 0)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.commentText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {comment.text}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {activeTab === "stats" && (
              <View style={styles.tabContent}>
                <View
                  style={[
                    createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                      padding: 24,
                      marginBottom: 16,
                    }),
                    {
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statsSectionTitle,
                      { color: colors.textMain },
                    ]}
                  >
                    Activity Overview
                  </Text>
                  <View style={styles.statsGrid}>
                    <View
                      style={[
                        styles.statsItem,
                        { backgroundColor: colors.accentLight },
                      ]}
                    >
                      <Ionicons
                        name="calendar"
                        size={24}
                        color={PRIMARY_PURPLE}
                      />
                      <Text
                        style={[
                          styles.statsItemValue,
                          { color: colors.textMain },
                        ]}
                      >
                        {memoriesCount}
                      </Text>
                      <Text
                        style={[
                          styles.statsItemLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Total Posts
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statsItem,
                        { backgroundColor: colors.accentLight },
                      ]}
                    >
                      <Ionicons name="heart" size={24} color={PRIMARY_PURPLE} />
                      <Text
                        style={[
                          styles.statsItemValue,
                          { color: colors.textMain },
                        ]}
                      >
                        {totalLikes}
                      </Text>
                      <Text
                        style={[
                          styles.statsItemLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Total Likes
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statsItem,
                        { backgroundColor: colors.accentLight },
                      ]}
                    >
                      <Ionicons
                        name="chatbubbles"
                        size={24}
                        color={PRIMARY_PURPLE}
                      />
                      <Text
                        style={[
                          styles.statsItemValue,
                          { color: colors.textMain },
                        ]}
                      >
                        {totalComments}
                      </Text>
                      <Text
                        style={[
                          styles.statsItemLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Total Comments
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statsItem,
                        { backgroundColor: colors.accentLight },
                      ]}
                    >
                      <Ionicons
                        name="trending-up"
                        size={24}
                        color={PRIMARY_PURPLE}
                      />
                      <Text
                        style={[
                          styles.statsItemValue,
                          { color: colors.textMain },
                        ]}
                      >
                        {memoriesCount > 0
                          ? Math.round((totalLikes / memoriesCount) * 10) / 10
                          : 0}
                      </Text>
                      <Text
                        style={[
                          styles.statsItemLabel,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Avg Likes/Post
                      </Text>
                    </View>
                  </View>
                </View>

                {memories.length > 0 && (
                  <View
                    style={[
                      createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                        padding: 24,
                      }),
                      {
                        backgroundColor: colors.card,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statsSectionTitle,
                        { color: colors.textMain },
                      ]}
                    >
                      Recent Activity
                    </Text>
                    <Text
                      style={[
                        styles.statsDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      Your most recent memory was posted{" "}
                      {formatDate(memories[0]?.startDate)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        )}

        {/* Edit Profile Modal */}
        <Modal
          visible={editModalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              {/* Modal Header */}
              <View
                style={[
                  styles.modalHeader,
                  { borderBottomColor: colors.border },
                ]}
              >
                <Text style={[styles.modalTitle, { color: colors.textMain }]}>
                  Edit Profile
                </Text>
                <TouchableOpacity
                  onPress={() => setEditModalVisible(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={colors.textMain} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScrollView}
                showsVerticalScrollIndicator={false}
              >
                {/* Profile Picture Section */}
                <View style={styles.editPhotoSection}>
                  <TouchableOpacity
                    onPress={pickProfileImage}
                    style={styles.editPhotoButton}
                    activeOpacity={0.7}
                  >
                    {editPhotoURI || user?.photoURL ? (
                      <Image
                        source={{
                          uri: editPhotoURI || user?.photoURL || "",
                        }}
                        style={styles.editPhotoPreview}
                      />
                    ) : (
                      <View
                        style={[
                          styles.editPhotoPlaceholder,
                          {
                            backgroundColor: colors.accentLight,
                            borderColor: PRIMARY_PURPLE + "66",
                          },
                        ]}
                      >
                        <Ionicons
                          name="camera"
                          size={32}
                          color={PRIMARY_PURPLE}
                        />
                      </View>
                    )}
                    <View
                      style={[
                        styles.editPhotoOverlay,
                        {
                          backgroundColor: isDarkMode
                            ? "rgba(0,0,0,0.5)"
                            : "rgba(255,255,255,0.7)",
                        },
                      ]}
                    >
                      <Ionicons
                        name="camera"
                        size={20}
                        color={PRIMARY_PURPLE}
                      />
                      <Text
                        style={[
                          styles.editPhotoText,
                          { color: colors.textMain },
                        ]}
                      >
                        Change
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Display Name Input */}
                <View style={styles.inputSection}>
                  <Text
                    style={[styles.inputLabel, { color: colors.textSecondary }]}
                  >
                    Display Name
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.cardElevated,
                        color: colors.textMain,
                        borderColor: colors.border,
                      },
                    ]}
                    value={editDisplayName}
                    onChangeText={setEditDisplayName}
                    placeholder="Enter your name"
                    placeholderTextColor={colors.textMuted}
                    maxLength={50}
                  />
                </View>

                {/* Bio Input */}
                <View style={styles.inputSection}>
                  <Text
                    style={[styles.inputLabel, { color: colors.textSecondary }]}
                  >
                    Bio
                  </Text>
                  <TextInput
                    style={[
                      styles.textArea,
                      {
                        backgroundColor: colors.cardElevated,
                        color: colors.textMain,
                        borderColor: colors.border,
                      },
                    ]}
                    value={editBio}
                    onChangeText={setEditBio}
                    placeholder="Tell us about yourself..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                    numberOfLines={4}
                    maxLength={200}
                    textAlignVertical="top"
                  />
                  <Text style={[styles.charCount, { color: colors.textMuted }]}>
                    {editBio.length}/200
                  </Text>
                </View>
              </ScrollView>

              {/* Save Button */}
              <View
                style={[styles.modalFooter, { borderTopColor: colors.border }]}
              >
                <TouchableOpacity
                  onPress={handleSaveProfile}
                  disabled={isSaving}
                  style={[
                    styles.saveButton,
                    {
                      backgroundColor: isSaving
                        ? colors.textMuted
                        : PRIMARY_PURPLE,
                      opacity: isSaving ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Bottom Navigation */}
        <BottomNavBar isDarkMode={isDarkMode} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    borderBottomWidth: 1,
    minHeight: Platform.OS === "ios" ? 52 : 50,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: Platform.OS === "ios" ? 8 : 10,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 20 : 18,
    fontWeight: "700",
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 120 : 100,
    paddingTop: 20,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarLarge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 3,
  },
  avatarRing: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 59,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  profileEmail: {
    fontSize: 15,
    marginBottom: 10,
    fontWeight: "500",
  },
  profileBio: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  statCard: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: 18,
    borderWidth: 1.5,
    marginBottom: 24,
    padding: 6,
    position: "relative",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    zIndex: 1,
  },
  tabText: {
    fontSize: 16,
    letterSpacing: 0.3,
  },
  tabIndicator: {
    position: "absolute",
    bottom: 6,
    width: "33.33%",
    height: 44,
    borderRadius: 14,
    zIndex: 0,
  },
  tabContent: {
    minHeight: 200,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: "center",
    maxWidth: 300,
    lineHeight: 22,
  },
  postImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#1F2937",
  },
  postContent: {
    padding: 18,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  postTitle: {
    fontSize: 19,
    fontWeight: "700",
    flex: 1,
    marginRight: 12,
    lineHeight: 26,
  },
  emotionDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginTop: 6,
  },
  postDescription: {
    fontSize: 15,
    marginTop: 6,
    lineHeight: 22,
  },
  postFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  postDate: {
    fontSize: 13,
    fontWeight: "500",
  },
  postStats: {
    flexDirection: "row",
    gap: 18,
  },
  postStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postStatText: {
    fontSize: 13,
    fontWeight: "600",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
  },
  commentAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  commentAuthor: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },
  commentPost: {
    fontSize: 13,
    fontWeight: "500",
  },
  commentDate: {
    fontSize: 12,
    fontWeight: "500",
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
  },
  statsSectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  statsItem: {
    width: "48%",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
  },
  statsItemValue: {
    fontSize: 32,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  statsItemLabel: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
  },
  statsDescription: {
    fontSize: 15,
    lineHeight: 23,
    marginTop: 4,
  },
  backButton: {
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  themeButton: {
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  editButton: {
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  themeButton: {
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  editButton: {
    minWidth: Platform.OS === "ios" ? 40 : 36,
    minHeight: Platform.OS === "ios" ? 40 : 36,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  // Edit Profile Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 500,
    maxHeight: "85%",
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "transparent", // Will be set dynamically
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: "60%",
  },
  editPhotoSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  editPhotoButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: "hidden",
    position: "relative",
  },
  editPhotoPreview: {
    width: "100%",
    height: "100%",
  },
  editPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: 60,
  },
  editPhotoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "40%",
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  editPhotoText: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  inputSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  textArea: {
    minHeight: 100,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "500",
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: 4,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "transparent", // Will be set dynamically
  },
  saveButton: {
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
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
});

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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { auth, db } from "@/config/firebase";
import { useAuth } from "@/hooks/useAuth";

const MODULE_PURPLE = "#a855f7";

/** 🎨 Cyberpunk neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accentColor + (isDark ? "66" : "80"),
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.6,
    shadowRadius: isDark ? 30 : 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 18 : 12,
    ...extra,
  };
};

/** 🎨 Glow text styles - adapts to theme */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#E0F2FE" : "#4C1D95",
  textShadowColor: accentColor + (isDark ? "CC" : "55"),
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 8 : 4,
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#7C3AED",
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
};

export default function UserProfile() {
  const router = useRouter();
  const params = useLocalSearchParams<{ userId?: string }>();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const { user: authUser } = useAuth();

  // Use provided userId or fall back to current user's ID
  const providedUserId = params.userId as string | undefined;
  const currentUserId = auth.currentUser?.uid || authUser?.id;
  const userId = providedUserId || currentUserId;

  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMemories, setLoadingMemories] = useState(true);

  const colors = {
    bg: isDarkMode ? "#020617" : "#FAF5FF",
    card: isDarkMode ? "#020617" : "#FFFFFF",
    textMain: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#6366F1",
    borderSoft: isDarkMode ? "#1F2937" : "#E9D5FF",
    chipBg: isDarkMode
      ? "rgba(168,85,247,0.12)"
      : "rgba(139,92,246,0.15)",
  };

  const glowText = getGlowText(MODULE_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

  useEffect(() => {
    if (!userId) {
      // If no userId and no current user, show error
      if (!currentUserId) {
        setLoadingUser(false);
        return;
      }
      // Otherwise, use current user's data from auth context
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

    // Fetch user document - try both "users" and "Users" collections
    (async () => {
      try {
        // Try "users" first (lowercase, more common)
        let ref = doc(db, "users", userId);
        let snap = await getDoc(ref);
        
        // If not found, try "Users" (uppercase)
        if (!snap.exists()) {
          ref = doc(db, "Users", userId);
          snap = await getDoc(ref);
        }
        
        if (snap.exists()) {
          setUser({ id: snap.id, ...(snap.data() as any) });
        } else {
          // If still not found, use auth user data as fallback
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
        // Fallback to auth user data
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

    // Subscribe to this user's memories
    const finalUserId = userId || currentUserId;
    if (!finalUserId) {
      setLoadingMemories(false);
      return;
    }

    const postsRef = collection(db, "MemoryPosts");
    const q = query(
      postsRef,
      where("userId", "==", finalUserId),
      orderBy("startDate", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Memory[] = [];
        snap.forEach((doc) =>
          list.push({ id: doc.id, ...(doc.data() as any) })
        );
        setMemories(list);
        setLoadingMemories(false);
      },
      (err) => {
        console.log("UserProfile memories error:", err);
        setLoadingMemories(false);
      }
    );

    return () => unsub();
  }, [userId, currentUserId, authUser]);

  const memoriesCount = memories.length;
  const totalLikes = useMemo(
    () =>
      memories.reduce(
        (acc, m: any) =>
          acc + (typeof m.likesCount === "number" ? m.likesCount : 0),
        0
      ),
    [memories]
  );

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const openMemoryDetail = (id: string) => {
    router.push(`/modules/memory-book/MemoryPostDetail?id=${id}`);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            variant="ghost"
            onPress={() => router.back()}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, glowText]}>Profile</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {loadingUser ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="small" color={MODULE_PURPLE} />
          </View>
        ) : !user ? (
          <View style={styles.centerBox}>
            <Ionicons
              name="person-circle-outline"
              size={34}
              color={colors.textSoft}
            />
            <Text style={[styles.emptyTitle, glowText]}>User not found</Text>
            <Text style={[styles.emptySubtitle, softText]}>
              This profile may have been removed or is unavailable.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Profile header card */}
            <View
              style={[
                createNeonCardShell(MODULE_PURPLE, isDarkMode, {
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  marginBottom: 18,
                }),
                {
                  backgroundColor: colors.card,
                },
              ]}
            >
              <View style={styles.profileTopRow}>
                {user.photoURL ? (
                  <Image
                    source={{ uri: user.photoURL }}
                    style={styles.avatarLg}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarLgPlaceholder,
                      {
                        backgroundColor: colors.chipBg,
                        borderColor: MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={32}
                      color={MODULE_PURPLE}
                    />
                  </View>
                )}

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    numberOfLines={1}
                    style={[styles.profileName, glowText]}
                  >
                    {user.displayName || "Unnamed user"}
                  </Text>
                  {user.email && (
                    <Text
                      numberOfLines={1}
                      style={[styles.profileEmail, softText]}
                    >
                      {user.email}
                    </Text>
                  )}
                  {user.bio && (
                    <Text
                      numberOfLines={2}
                      style={[styles.profileBio, softText]}
                    >
                      {user.bio}
                    </Text>
                  )}
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View
                  style={[
                    styles.statItem,
                    {
                      backgroundColor: colors.chipBg,
                      borderColor: MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                    },
                  ]}
                >
                  <Text style={[styles.statValue, glowText]}>
                    {memoriesCount}
                  </Text>
                  <Text style={[styles.statLabel, softText]}>Memories</Text>
                </View>
                <View
                  style={[
                    styles.statItem,
                    {
                      backgroundColor: colors.chipBg,
                      borderColor: MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                    },
                  ]}
                >
                  <Text style={[styles.statValue, glowText]}>{totalLikes}</Text>
                  <Text style={[styles.statLabel, softText]}>Likes</Text>
                </View>
              </View>
            </View>

            {/* Memories list */}
            <Text style={[styles.sectionTitle, glowText]}>
              Shared memories
            </Text>
            <Text style={[styles.sectionSubtitle, softText]}>
              Scroll through {user.displayName || "this user"}&apos;s public
              memories.
            </Text>

            {loadingMemories ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={MODULE_PURPLE} />
              </View>
            ) : memories.length === 0 ? (
              <View style={styles.emptyMemoriesBox}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    {
                      backgroundColor: colors.chipBg,
                      borderColor: MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                    },
                  ]}
                >
                  <Ionicons
                    name="images-outline"
                    size={32}
                    color={MODULE_PURPLE}
                  />
                </View>
                <Text style={[styles.emptyTitle, glowText]}>
                  No memories yet
                </Text>
                <Text style={[styles.emptySubtitle, softText]}>
                  When this user posts a memory, it will appear here.
                </Text>
              </View>
            ) : (
              memories.map((memory) => (
                <TouchableOpacity
                  key={memory.id}
                  onPress={() => openMemoryDetail(memory.id)}
                  style={[
                    createNeonCardShell(
                      memory.emotionColor || MODULE_PURPLE,
                      isDarkMode,
                      {
                        paddingHorizontal: 0,
                        paddingVertical: 0,
                        marginTop: 12,
                        overflow: "hidden",
                      }
                    ),
                    {
                      backgroundColor: colors.card,
                    },
                  ]}
                >
                  {/* Left strip with emotion color */}
                  <View
                    style={[
                      styles.colorStrip,
                      { backgroundColor: memory.emotionColor || MODULE_PURPLE },
                    ]}
                  />

                  <View style={styles.memoryContentRow}>
                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.memoryTitle, glowText]}
                      >
                        {memory.title}
                      </Text>
                      {memory.description && (
                        <Text
                          numberOfLines={2}
                          style={[styles.memoryDescription, softText]}
                        >
                          {memory.description}
                        </Text>
                      )}
                      <Text style={[styles.memoryMeta, softText]}>
                        {formatDate(memory.startDate)}
                      </Text>
                    </View>

                    {memory.imageURL && (
                      <Image
                        source={{ uri: memory.imageURL }}
                        style={styles.thumbnail}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  profileTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarLg: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarLgPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700",
  },
  profileEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  profileBio: {
    fontSize: 12,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: "row",
    marginTop: 16,
  },
  statItem: {
    marginRight: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 100,
    alignItems: "center",
  },
  statValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginBottom: 10,
  },
  emptyMemoriesBox: {
    alignItems: "center",
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 12,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
  colorStrip: {
    width: 4,
  },
  memoryContentRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  memoryTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  memoryDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  memoryMeta: {
    fontSize: 11,
    marginTop: 6,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginLeft: 10,
  },
});

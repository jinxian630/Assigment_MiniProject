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
  getFirestore,
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

const MODULE_PURPLE = "#a855f7";

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

  const userId = params.userId as string | undefined;

  const [user, setUser] = useState<User | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingMemories, setLoadingMemories] = useState(true);

  const colors = {
    bg: isDarkMode ? "#020617" : "#f9fafb",
    card: isDarkMode ? "#020617" : "#ffffff",
    textMain: isDarkMode ? "#F9FAFB" : "#020617",
    textSoft: isDarkMode ? "#9CA3AF" : "#6B7280",
    borderSoft: isDarkMode ? "#1F2937" : "#E5E7EB",
  };

  useEffect(() => {
    if (!userId) return;

    const db = getFirestore();

    // Fetch user document
    (async () => {
      try {
        const ref = doc(db, "Users", userId); // change "Users" if your collection name differs
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setUser({ id: snap.id, ...(snap.data() as any) });
        }
      } catch (err) {
        console.log("UserProfile user error:", err);
      } finally {
        setLoadingUser(false);
      }
    })();

    // Subscribe to this user's memories
    const postsRef = collection(db, "MemoryPosts");
    const q = query(
      postsRef,
      where("userId", "==", userId),
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
  }, [userId]);

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
            <Text style={[styles.headerTitle, { color: colors.textMain }]}>
              Profile
            </Text>
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
            <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
              User not found
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSoft }]}>
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
                styles.profileCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.borderSoft,
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
                  <View style={styles.avatarLgPlaceholder}>
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
                    style={[styles.profileName, { color: colors.textMain }]}
                  >
                    {user.displayName || "Unnamed user"}
                  </Text>
                  {user.email && (
                    <Text
                      numberOfLines={1}
                      style={[styles.profileEmail, { color: colors.textSoft }]}
                    >
                      {user.email}
                    </Text>
                  )}
                  {user.bio && (
                    <Text
                      numberOfLines={2}
                      style={[styles.profileBio, { color: colors.textSoft }]}
                    >
                      {user.bio}
                    </Text>
                  )}
                </View>
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textMain }]}>
                    {memoriesCount}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSoft }]}>
                    Memories
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.textMain }]}>
                    {totalLikes}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textSoft }]}>
                    Likes
                  </Text>
                </View>
              </View>
            </View>

            {/* Memories list */}
            <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
              Shared memories
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSoft }]}>
              Scroll through {user.displayName || "this user"}&apos;s public
              memories.
            </Text>

            {loadingMemories ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color={MODULE_PURPLE} />
              </View>
            ) : memories.length === 0 ? (
              <View style={styles.emptyMemoriesBox}>
                <Ionicons
                  name="images-outline"
                  size={26}
                  color={colors.textSoft}
                />
                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                  No memories yet
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textSoft }]}
                >
                  When this user posts a memory, it will appear here.
                </Text>
              </View>
            ) : (
              memories.map((memory) => (
                <TouchableOpacity
                  key={memory.id}
                  onPress={() => openMemoryDetail(memory.id)}
                  style={[
                    styles.memoryCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.borderSoft,
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
                        style={[styles.memoryTitle, { color: colors.textMain }]}
                      >
                        {memory.title}
                      </Text>
                      {memory.description && (
                        <Text
                          numberOfLines={2}
                          style={[
                            styles.memoryDescription,
                            { color: colors.textSoft },
                          ]}
                        >
                          {memory.description}
                        </Text>
                      )}
                      <Text
                        style={[styles.memoryMeta, { color: colors.textSoft }]}
                      >
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
  profileCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 18,
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
    backgroundColor: "rgba(15,23,42,0.9)",
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
    marginRight: 24,
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
  memoryCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 10,
    overflow: "hidden",
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

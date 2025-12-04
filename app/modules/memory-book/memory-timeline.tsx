import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet,
} from "react-native";
<<<<<<< HEAD:app/modules/memory-book/MemoryTimeline.tsx
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
=======
import { useRouter } from "expo-router";
import { Layout, TopNav, useTheme, themeColor } from "react-native-rapi-ui";
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e:app/modules/memory-book/memory-timeline.tsx
import { Ionicons } from "@expo/vector-icons";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

import {
  getFirestore,
  collection,
  onSnapshot,
  orderBy,
  query,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

<<<<<<< HEAD:app/modules/memory-book/MemoryTimeline.tsx
type MemoryDoc = {
  id: string;
  title: string;
  description: string;
  startDate: number;
  imageURL: string;
  CreatedUser?: {
    CreatedUserName?: string;
    CreatedUserPhoto?: string;
  };
};

export default function MemoryTimelineScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme(); // adjust if your hook exposes different keys

  const [memories, setMemories] = useState<MemoryDoc[]>([]);
=======
export default function MemoryTimeline() {
  const router = useRouter();
  // ⬇️ now using setTheme as well
  const { isDarkmode, setTheme } = useTheme();
  const [memories, setMemories] = useState<any[]>([]);
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e:app/modules/memory-book/memory-timeline.tsx
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts");
    const q = query(postsRef, orderBy("startDate", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: MemoryDoc[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setMemories(list);
    });

    return () => unsubscribe();
  }, []);

  const colors = {
    primary: "#38bdf8",
    background: "#020617",
    surface: "#020617",
    text: "#e5e7eb",
    subtitle: "#9ca3af",
    accent: "#22c55e",
    line: "#0ea5e9",
  };

  const groupByYear = (items: MemoryDoc[]) => {
    const groups: Record<string, MemoryDoc[]> = {};
    items.forEach((memory) => {
      const year = new Date(memory.startDate).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(memory);
    });
    return groups;
  };

  const groupedMemories = groupByYear(memories);

  const toggleExpand = (memoryId: string) => {
    setExpandedMemoryId(expandedMemoryId === memoryId ? null : memoryId);
  };

  const deleteMemory = async (memoryId: string, imageURL?: string) => {
    try {
      const db = getFirestore();
      await deleteDoc(doc(db, "MemoryPosts", memoryId));

      if (imageURL) {
        const storage = getStorage();
        const imageRef = ref(storage, imageURL);
        await deleteObject(imageRef);
      }

      Alert.alert("Success", "Memory deleted successfully!");
    } catch (error: any) {
      Alert.alert("Error", "Failed to delete memory: " + error.message);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />
<<<<<<< HEAD:app/modules/memory-book/MemoryTimeline.tsx
=======
        }
        leftAction={() => router.back()}
        // ⬇️ theme toggle here (same style as Home / MemoryMenu)
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => {
          setTheme(isDarkmode ? "light" : "dark");
        }}
      />
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e:app/modules/memory-book/memory-timeline.tsx

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>MEMORY TIMELINE</Text>
            <Text style={styles.headerSubtitle}>
              Browse your memories chronologically
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {memories.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={48} color={colors.subtitle} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No memories yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.subtitle }]}>
                Start capturing your moments to see them on the timeline.
              </Text>
            </View>
          ) : (
            Object.entries(groupedMemories)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, yearMemories]) => (
                <View key={year} style={styles.yearBlock}>
                  <Text style={[styles.yearLabel, { color: colors.accent }]}>
                    {year}
                  </Text>

                  <View style={styles.timeline}>
                    <View
                      style={[
                        styles.timelineLine,
                        { backgroundColor: colors.line },
                      ]}
                    />

                    {yearMemories
                      .sort((a, b) => b.startDate - a.startDate)
                      .map((memory) => {
                        const date = new Date(memory.startDate);
                        const monthDay = date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });

                        const isExpanded = expandedMemoryId === memory.id;

                        return (
                          <View
                            key={memory.id}
                            style={styles.memoryItemWrapper}
                          >
                            <View
                              style={[
                                styles.timelineDot,
                                { backgroundColor: colors.accent },
                              ]}
                            />

                            <View style={styles.datePillWrapper}>
                              <View
                                style={[
                                  styles.datePill,
                                  { backgroundColor: colors.primary },
                                ]}
                              >
                                <Text style={styles.datePillText}>
                                  {monthDay}
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={() => toggleExpand(memory.id)}
                              activeOpacity={0.9}
                              style={[
                                styles.memoryCard,
                                { backgroundColor: colors.surface },
                              ]}
                            >
                              {/* Delete button */}
                              <TouchableOpacity
                                onPress={() =>
                                  Alert.alert(
                                    "Delete memory",
                                    "Are you sure you want to delete this memory?",
                                    [
                                      { text: "Cancel", style: "cancel" },
                                      {
                                        text: "Delete",
                                        style: "destructive",
                                        onPress: () =>
                                          deleteMemory(
                                            memory.id,
                                            memory.imageURL
                                          ),
                                      },
                                    ]
                                  )
                                }
                                style={styles.deleteButton}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={16}
                                  color="#fff"
                                />
                              </TouchableOpacity>

                              {memory.imageURL ? (
                                <View
                                  style={[
                                    styles.imageWrapper,
                                    {
                                      height: isExpanded ? 260 : 140,
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
                                </View>
                              ) : null}

                              <Text
                                numberOfLines={2}
                                style={[
                                  styles.memoryTitle,
                                  { color: colors.text },
                                ]}
                              >
                                {memory.title}
                              </Text>

                              <View style={styles.timeRow}>
                                <Ionicons
                                  name="time-outline"
                                  size={14}
                                  color={colors.accent}
                                  style={{ marginRight: 4 }}
                                />
                                <Text
                                  style={[
                                    styles.timeText,
                                    { color: colors.accent },
                                  ]}
                                >
                                  {formatDate(memory.startDate)}
                                </Text>
                              </View>

                              <Text
                                numberOfLines={isExpanded ? undefined : 3}
                                style={[
                                  styles.memoryDescription,
                                  { color: colors.text },
                                ]}
                              >
                                {memory.description}
                              </Text>

                              <View style={styles.readMoreRow}>
                                <Text
                                  style={[
                                    styles.readMoreText,
                                    { color: colors.primary },
                                  ]}
                                >
                                  {isExpanded ? "Show less" : "Read more"}
                                </Text>
                                <Ionicons
                                  name={
                                    isExpanded ? "chevron-up" : "chevron-down"
                                  }
                                  size={16}
                                  color={colors.primary}
                                  style={{ marginLeft: 4 }}
                                />
                              </View>

                              {memory.CreatedUser?.CreatedUserName && (
                                <View style={styles.userRow}>
                                  {memory.CreatedUser?.CreatedUserPhoto ? (
                                    <Image
                                      source={{
                                        uri: memory.CreatedUser
                                          .CreatedUserPhoto,
                                      }}
                                      style={styles.userAvatar}
                                    />
                                  ) : (
                                    <View style={styles.userAvatarPlaceholder}>
                                      <Ionicons
                                        name="person-outline"
                                        size={12}
                                        color={colors.subtitle}
                                      />
                                    </View>
                                  )}
                                  <Text
                                    style={[
                                      styles.userName,
                                      { color: colors.subtitle },
                                    ]}
                                  >
                                    {memory.CreatedUser?.CreatedUserName}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                  </View>
                </View>
              ))
          )}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#e5e7eb",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
  yearBlock: {
    marginBottom: 32,
  },
  yearLabel: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 16,
  },
  timeline: {
    position: "relative",
    paddingLeft: 40,
  },
  timelineLine: {
    position: "absolute",
    left: 16,
    top: 0,
    bottom: 0,
    width: 2,
  },
  memoryItemWrapper: {
    marginBottom: 24,
    position: "relative",
  },
  timelineDot: {
    position: "absolute",
    left: 9,
    top: 24,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#020617",
  },
  datePillWrapper: {
    position: "absolute",
    right: 16,
    top: 14,
    zIndex: 2,
  },
  datePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  datePillText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  memoryCard: {
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  deleteButton: {
    position: "absolute",
    top: 12,
    left: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(239,68,68,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 3,
  },
  imageWrapper: {
    width: "100%",
    marginBottom: 12,
    overflow: "hidden",
    borderRadius: 10,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  memoryTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 6,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  timeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  memoryDescription: {
    fontSize: 14,
    opacity: 0.9,
    lineHeight: 20,
  },
  readMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  userAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  userAvatarPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#1f2937",
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  userName: {
    fontSize: 12,
  },
});

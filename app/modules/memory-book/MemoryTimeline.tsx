import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { Layout, TopNav, useTheme, themeColor } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

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

type MemoryPost = {
  id: string;
  title: string;
  description: string;
  imageURL?: string;
  startDate: number;
  CreatedUser?: {
    CreatedUserName?: string;
    CreatedUserPhoto?: string;
  };
};

export default function MemoryTimelineScreen() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();

  const [memories, setMemories] = useState<MemoryPost[]>([]);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts");
    const q = query(postsRef, orderBy("startDate", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: MemoryPost[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) });
      });
      setMemories(list);
    });

    return () => unsubscribe();
  }, []);

  const colors = {
    primary: "#a855f7",
    background: isDarkmode ? "#020617" : "#0f172a",
    surface: isDarkmode ? "#020617" : "#020617",
    text: isDarkmode ? "#e5e7eb" : "#e5e7eb",
    accent: "#38bdf8",
  };

  const groupByYear = (items: MemoryPost[]) => {
    const groups: Record<string, MemoryPost[]> = {};
    items.forEach((m) => {
      const year = new Date(m.startDate).getFullYear().toString();
      if (!groups[year]) groups[year] = [];
      groups[year].push(m);
    });
    return groups;
  };

  const groupedMemories = groupByYear(memories);

  const toggleExpand = (id: string) => {
    setExpandedMemoryId((prev) => (prev === id ? null : id));
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const deleteMemory = async (memoryId: string, imageURL?: string) => {
    try {
      const db = getFirestore();
      const storage = getStorage();

      // 1. delete Firestore document
      await deleteDoc(doc(db, "MemoryPosts", memoryId));

      // 2. delete image from Storage (if exists)
      if (imageURL) {
        const imageRef = ref(storage, imageURL);
        await deleteObject(imageRef).catch(() => {});
      }

      Alert.alert("Deleted", "Memory deleted successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to delete memory.");
    }
  };

  return (
    <Layout>
      <TopNav
        middleContent="Memory Timeline"
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
      >
        {memories.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 80 }}>
            <Ionicons
              name="time-outline"
              size={48}
              color={colors.text}
              style={{ opacity: 0.35 }}
            />
            <Text
              style={{
                marginTop: 14,
                fontSize: 18,
                color: colors.text,
                opacity: 0.85,
              }}
            >
              No memories yet
            </Text>
            <Text
              style={{
                marginTop: 6,
                fontSize: 13,
                color: colors.text,
                opacity: 0.6,
                textAlign: "center",
              }}
            >
              Create a new memory from the Memory Book home screen to see it
              appear here.
            </Text>
          </View>
        ) : (
          Object.entries(groupedMemories)
            .sort(([a], [b]) => parseInt(b) - parseInt(a))
            .map(([year, yearMemories]) => (
              <View key={year} style={{ marginBottom: 32 }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: "700",
                    color: colors.accent,
                    marginBottom: 18,
                    textAlign: "center",
                  }}
                >
                  {year}
                </Text>

                <View style={{ position: "relative", paddingLeft: 30 }}>
                  {/* timeline vertical line */}
                  <View
                    style={{
                      position: "absolute",
                      left: 10,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      backgroundColor: colors.primary,
                      opacity: 0.9,
                    }}
                  />

                  {yearMemories
                    .sort((a, b) => b.startDate - a.startDate)
                    .map((memory) => {
                      const dateObj = new Date(memory.startDate);
                      const chipLabel = dateObj.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                      const isExpanded = expandedMemoryId === memory.id;

                      return (
                        <View
                          key={memory.id}
                          style={{ marginBottom: 26, position: "relative" }}
                        >
                          {/* timeline dot */}
                          <View
                            style={{
                              position: "absolute",
                              left: -2,
                              top: 24,
                              width: 14,
                              height: 14,
                              borderRadius: 7,
                              backgroundColor: colors.primary,
                              borderWidth: 2,
                              borderColor: colors.background,
                            }}
                          />

                          {/* date chip on right */}
                          <View
                            style={{
                              position: "absolute",
                              right: 12,
                              top: 10,
                              paddingHorizontal: 10,
                              paddingVertical: 4,
                              borderRadius: 999,
                              backgroundColor: colors.primary,
                            }}
                          >
                            <Text
                              style={{
                                color: "#f9fafb",
                                fontSize: 12,
                                fontWeight: "600",
                              }}
                            >
                              {chipLabel}
                            </Text>
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => toggleExpand(memory.id)}
                            style={{
                              backgroundColor: colors.surface,
                              borderRadius: 16,
                              padding: 14,
                              shadowColor: "#000",
                              shadowOpacity: 0.18,
                              shadowRadius: 6,
                              shadowOffset: { width: 0, height: 3 },
                              elevation: 3,
                            }}
                          >
                            {/* delete button */}
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
                              style={{
                                position: "absolute",
                                top: 10,
                                left: 10,
                                width: 26,
                                height: 26,
                                borderRadius: 13,
                                backgroundColor: "rgba(239,68,68,0.9)",
                                alignItems: "center",
                                justifyContent: "center",
                                zIndex: 10,
                              }}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={15}
                                color="#fff"
                              />
                            </TouchableOpacity>

                            {/* image */}
                            {memory.imageURL && (
                              <View
                                style={{
                                  width: "100%",
                                  height: isExpanded ? 320 : 140,
                                  marginBottom: 10,
                                  overflow: "hidden",
                                  borderRadius: 10,
                                }}
                              >
                                <Image
                                  source={{ uri: memory.imageURL }}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    resizeMode: isExpanded
                                      ? "contain"
                                      : "cover",
                                  }}
                                />
                              </View>
                            )}

                            {/* title */}
                            <Text
                              numberOfLines={2}
                              style={{
                                fontSize: 18,
                                fontWeight: "600",
                                color: colors.text,
                                marginBottom: 6,
                              }}
                            >
                              {memory.title}
                            </Text>

                            {/* date row */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                marginBottom: 6,
                                paddingVertical: 4,
                                paddingHorizontal: 8,
                                borderRadius: 999,
                                backgroundColor: isDarkmode
                                  ? "#020617"
                                  : "#0b1020",
                                alignSelf: "flex-start",
                              }}
                            >
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color={colors.accent}
                                style={{ marginRight: 4 }}
                              />
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: colors.accent,
                                  fontWeight: "600",
                                }}
                              >
                                {formatDateTime(memory.startDate)}
                              </Text>
                            </View>

                            {/* description */}
                            <Text
                              numberOfLines={isExpanded ? undefined : 3}
                              style={{
                                fontSize: 13,
                                lineHeight: 19,
                                color: colors.text,
                                opacity: 0.85,
                              }}
                            >
                              {memory.description}
                            </Text>

                            {/* created user (optional) */}
                            {memory.CreatedUser?.CreatedUserName && (
                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginTop: 10,
                                }}
                              >
                                {memory.CreatedUser.CreatedUserPhoto ? (
                                  <Image
                                    source={{
                                      uri: memory.CreatedUser.CreatedUserPhoto,
                                    }}
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 11,
                                      marginRight: 8,
                                    }}
                                  />
                                ) : (
                                  <View
                                    style={{
                                      width: 22,
                                      height: 22,
                                      borderRadius: 11,
                                      backgroundColor: "#111827",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      marginRight: 8,
                                    }}
                                  >
                                    <Ionicons
                                      name="person-outline"
                                      size={13}
                                      color="#9ca3af"
                                    />
                                  </View>
                                )}
                                <Text
                                  style={{
                                    fontSize: 12,
                                    color: colors.text,
                                    opacity: 0.7,
                                  }}
                                >
                                  {memory.CreatedUser.CreatedUserName}
                                </Text>
                              </View>
                            )}

                            {/* read more / less */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: 8,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: colors.primary,
                                  fontWeight: "600",
                                }}
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
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                </View>
              </View>
            ))
        )}
      </ScrollView>
    </Layout>
  );
}

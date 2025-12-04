import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Image,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Layout, TopNav, useTheme, themeColor } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
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

export default function MemoryTimeline() {
  const router = useRouter();
  // ⬇️ now using setTheme as well
  const { isDarkmode, setTheme } = useTheme();
  const [memories, setMemories] = useState<any[]>([]);
  const [expandedMemoryId, setExpandedMemoryId] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts");
    const q = query(postsRef, orderBy("startDate", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMemories(list);
    });

    return () => unsubscribe();
  }, []);

  const colors = {
    primary: isDarkmode ? "#6366f1" : "#8b5cf6",
    background: isDarkmode ? "#0f172a" : "#f8fafc",
    surface: isDarkmode ? "#1e293b" : "#ffffff",
    text: isDarkmode ? "#e2e8f0" : "#1e293b",
    accent: isDarkmode ? "#3b82f6" : "#10b981",
  };

  const groupByYear = (memories: any[]) => {
    const groups: Record<string, any[]> = {};
    memories.forEach((memory) => {
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

  const deleteMemory = async (memoryId: string, imageURL: string) => {
    try {
      const db = getFirestore();
      const storage = getStorage();

      // 1. Delete the Firestore document
      await deleteDoc(doc(db, "MemoryPosts", memoryId));

      // 2. Delete image from Firebase Storage
      const imageRef = ref(storage, imageURL);
      await deleteObject(imageRef);

      alert("Memory deleted successfully!");
    } catch (error: any) {
      alert("Failed to delete memory: " + error.message);
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

      <ScrollView style={{ backgroundColor: colors.background, flex: 1 }}>
        <View style={{ padding: 20, paddingBottom: 100 }}>
          {memories.length === 0 ? (
            <View style={{ alignItems: "center", padding: 60 }}>
              <Ionicons
                name="time"
                size={48}
                color={colors.text}
                opacity={0.3}
              />
              <Text
                style={{
                  marginTop: 15,
                  fontSize: 18,
                  color: colors.text,
                  opacity: 0.7,
                }}
              >
                No memories yet
              </Text>
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 14,
                  color: colors.text,
                  opacity: 0.5,
                }}
              >
                Start capturing your moments to see your timeline
              </Text>
            </View>
          ) : (
            Object.entries(groupedMemories)
              .sort(([a], [b]) => parseInt(b) - parseInt(a))
              .map(([year, yearMemories]) => (
                <View key={year} style={{ marginBottom: 30 }}>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: "bold",
                      color: colors.accent,
                      marginBottom: 20,
                      textAlign: "center",
                    }}
                  >
                    {year}
                  </Text>

                  <View style={{ position: "relative", paddingLeft: 30 }}>
                    <View
                      style={{
                        position: "absolute",
                        left: 8,
                        top: 10,
                        bottom: 10,
                        width: 2,
                        backgroundColor: colors.primary,
                      }}
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
                            style={{ marginBottom: 25, position: "relative" }}
                          >
                            <View
                              style={{
                                position: "absolute",
                                left: -22,
                                top: 20,
                                width: 16,
                                height: 16,
                                borderRadius: 8,
                                backgroundColor: colors.accent,
                                borderWidth: 2,
                                borderColor: colors.background,
                              }}
                            />

                            <View
                              style={{
                                position: "absolute",
                                right: 12,
                                top: 12,
                                backgroundColor: colors.primary,
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}
                            >
                              <Text
                                style={{
                                  color: "white",
                                  fontSize: 12,
                                  fontWeight: "600",
                                }}
                              >
                                {monthDay}
                              </Text>
                            </View>

                            <TouchableOpacity
                              onPress={() => toggleExpand(memory.id)}
                              style={{
                                backgroundColor: colors.surface,
                                borderRadius: 12,
                                padding: 16,
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                              }}
                            >
                              {/* Delete button */}
                              <TouchableOpacity
                                onPress={() => {
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
                                  );
                                }}
                                style={{
                                  position: "absolute",
                                  top: 12,
                                  right: 12,
                                  width: 30,
                                  height: 30,
                                  borderRadius: 15,
                                  backgroundColor: "rgba(239, 68, 68, 0.8)",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  zIndex: 10,
                                  shadowColor: "#000",
                                  shadowOffset: { width: 0, height: 2 },
                                  shadowOpacity: 0.3,
                                  shadowRadius: 4,
                                  elevation: 5,
                                }}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={16}
                                  color="white"
                                />
                              </TouchableOpacity>

                              <View
                                style={{
                                  width: "100%",
                                  height: isExpanded ? 400 : 120,
                                  marginBottom: 12,
                                  overflow: "hidden",
                                }}
                              >
                                <Image
                                  source={{ uri: memory.imageURL }}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: 8,
                                    resizeMode: isExpanded
                                      ? "contain"
                                      : "cover",
                                  }}
                                />
                              </View>

                              <Text
                                numberOfLines={2}
                                style={{
                                  fontSize: 18,
                                  fontWeight: "600",
                                  color: colors.text,
                                  marginBottom: 8,
                                }}
                              >
                                {memory.title}
                              </Text>

                              <View
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  marginBottom: 8,
                                  paddingVertical: 4,
                                  paddingHorizontal: 8,
                                  backgroundColor: isDarkmode
                                    ? "#1a1f2e"
                                    : "#f1f5f9",
                                  borderRadius: 8,
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
                                    fontSize: 12,
                                    color: colors.accent,
                                    fontWeight: "600",
                                  }}
                                >
                                  {formatDate(memory.startDate)}
                                </Text>
                              </View>

                              <Text
                                numberOfLines={isExpanded ? undefined : 3}
                                style={{
                                  fontSize: 14,
                                  color: colors.text,
                                  opacity: 0.8,
                                  lineHeight: 20,
                                }}
                              >
                                {memory.description}
                              </Text>

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

                              {memory.CreatedUser?.CreatedUserName && (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    marginTop: 12,
                                  }}
                                >
                                  {memory.CreatedUser?.CreatedUserPhoto ? (
                                    <Image
                                      source={{
                                        uri: memory.CreatedUser
                                          .CreatedUserPhoto,
                                      }}
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        marginRight: 8,
                                      }}
                                    />
                                  ) : (
                                    <View
                                      style={{
                                        width: 20,
                                        height: 20,
                                        borderRadius: 10,
                                        backgroundColor: isDarkmode
                                          ? "#334155"
                                          : "#d1d5db",
                                        marginRight: 8,
                                        justifyContent: "center",
                                        alignItems: "center",
                                      }}
                                    >
                                      <Ionicons
                                        name="person-outline"
                                        size={12}
                                        color={
                                          isDarkmode ? "#94a3b8" : "#64748b"
                                        }
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
        </View>
      </ScrollView>
    </Layout>
  );
}

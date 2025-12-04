import React, { useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  Button,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { formatShortDate } from "./utils/dateHelpers";

type Memory = {
  id: string;
  title: string;
  description: string;
  mood?: string;
  startDate?: number;
  imageURL?: string;
};

export default function MemoryBookScreen() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
  const [latestMemory, setLatestMemory] = useState<Memory | null>(null);
  const [totalMemories, setTotalMemories] = useState(0);

  useEffect(() => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts");

    // Get latest 1 memory
    const qLatest = query(postsRef, orderBy("startDate", "desc"), limit(1));
    const unsubLatest = onSnapshot(qLatest, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setLatestMemory({ id: doc.id, ...(doc.data() as any) });
      } else {
        setLatestMemory(null);
      }
    });

    // Count all memories (simple way)
    const qAll = query(postsRef, orderBy("startDate", "desc"));
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      setTotalMemories(snapshot.size);
    });

    return () => {
      unsubLatest();
      unsubAll();
    };
  }, []);

  const colors = {
    bg: isDarkmode ? "#020617" : "#f8fafc",
    card: isDarkmode ? "#0f172a" : "#ffffff",
    accent: isDarkmode ? "#38bdf8" : "#0ea5e9",
    accentSoft: isDarkmode ? "#082f49" : "#e0f2fe",
    text: isDarkmode ? "#e2e8f0" : "#0f172a",
    subtitle: isDarkmode ? "#94a3b8" : "#64748b",
    pink: "#ec4899",
    violet: "#8b5cf6",
  };

  return (
    <Layout>
      <TopNav
        middleContent="Memory Book"
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
        rightContent={
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => setTheme(isDarkmode ? "light" : "dark")}
              style={{ marginRight: 12 }}
            >
              <Ionicons
                name={isDarkmode ? "sunny" : "moon"}
                size={20}
                color={isDarkmode ? themeColor.white100 : themeColor.dark}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/modules/memory-book/user-search")}
            >
              <Ionicons
                name="person-add-outline"
                size={22}
                color={isDarkmode ? themeColor.white100 : themeColor.dark}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: colors.bg }}
        contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
      >
        {/* Header */}
        <View
          style={{
            padding: 18,
            borderRadius: 18,
            marginBottom: 20,
            backgroundColor: isDarkmode ? "#020617" : "#e0f2fe",
            borderWidth: 1,
            borderColor: isDarkmode ? "#1e293b" : "#bae6fd",
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "700",
              color: colors.text,
              marginBottom: 4,
            }}
          >
            Capture your story
          </Text>
          <Text
            style={{
              fontSize: 13,
              color: colors.subtitle,
            }}
          >
            Save your moments, moods, and reflections in one place.
          </Text>

          <View
            style={{
              flexDirection: "row",
              marginTop: 12,
              alignItems: "center",
            }}
          >
            <View
              style={{
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: colors.card,
                marginRight: 8,
              }}
            >
              <Text
                style={{
                  fontSize: 12,
                  color: colors.subtitle,
                }}
              >
                Memories recorded:{" "}
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  {totalMemories}
                </Text>
              </Text>
            </View>

            {latestMemory && (
              <View
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: colors.card,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: colors.subtitle,
                  }}
                  numberOfLines={1}
                >
                  Last:{" "}
                  <Text style={{ fontWeight: "600", color: colors.text }}>
                    {latestMemory.title}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Today card / latest memory preview */}
        <View
          style={{
            marginBottom: 24,
            padding: 16,
            borderRadius: 18,
            backgroundColor: colors.card,
            shadowColor: "#000",
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 3,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: colors.accentSoft,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 10,
              }}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={colors.accent}
              />
            </View>
            <View>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "700",
                  color: colors.text,
                }}
              >
                Today&apos;s Reflection
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.subtitle,
                }}
              >
                Take a minute to remember something meaningful.
              </Text>
            </View>
          </View>

          {latestMemory ? (
            <>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.subtitle,
                  marginBottom: 4,
                }}
              >
                Last saved:
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: colors.text,
                  marginBottom: 4,
                }}
                numberOfLines={1}
              >
                {latestMemory.title}
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.subtitle,
                }}
                numberOfLines={2}
              >
                {latestMemory.description}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 10,
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  {latestMemory.mood && (
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        borderRadius: 999,
                        backgroundColor: colors.accentSoft,
                        marginRight: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.accent,
                          fontWeight: "600",
                        }}
                      >
                        Mood: {latestMemory.mood}
                      </Text>
                    </View>
                  )}
                  {latestMemory.startDate && (
                    <Text
                      style={{
                        fontSize: 11,
                        color: colors.subtitle,
                      }}
                    >
                      {formatShortDate(latestMemory.startDate)}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  onPress={() =>
                    router.push("/modules/memory-book/memory-timeline")
                  }
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: colors.accent,
                      fontWeight: "600",
                    }}
                  >
                    View timeline
                  </Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.accent}
                    style={{ marginLeft: 4 }}
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={{ marginTop: 8 }}>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.subtitle,
                  marginBottom: 10,
                }}
              >
                You don&apos;t have any memories yet. Start by creating your
                first one.
              </Text>
              <Button
                text="Create first memory"
                onPress={() =>
                  router.push("/modules/memory-book/memory-post-create")
                }
                leftContent={
                  <Ionicons name="add-circle-outline" size={18} color="white" />
                }
              />
            </View>
          )}
        </View>

        {/* Feature cards */}
        <View style={{ gap: 16 }}>
          {/* Create memory */}
          <TouchableOpacity
            onPress={() =>
              router.push("/modules/memory-book/memory-post-create")
            }
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: isDarkmode ? "#1f2937" : "#e5e7eb",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.pink,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="add" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 2,
                }}
              >
                New Memory
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.subtitle,
                }}
              >
                Capture a moment with photo, title, description and mood.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.subtitle}
            />
          </TouchableOpacity>

          {/* Timeline */}
          <TouchableOpacity
            onPress={() =>
              router.push("/modules/memory-book/memory-timeline")
            }
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: isDarkmode ? "#1f2937" : "#e5e7eb",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.violet,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="time-outline" size={22} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 2,
                }}
              >
                Timeline
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.subtitle,
                }}
              >
                Browse your memories in chronological order and reflect back.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.subtitle}
            />
          </TouchableOpacity>

          {/* Stories */}
          <TouchableOpacity
            onPress={() =>
              router.push("/modules/memory-book/memory-stories")
            }
            style={{
              padding: 16,
              borderRadius: 18,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: isDarkmode ? "#1f2937" : "#e5e7eb",
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: "#f97316",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="play-circle-outline" size={24} color="white" />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: colors.text,
                  marginBottom: 2,
                }}
              >
                Stories View
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  color: colors.subtitle,
                }}
              >
                Relive your memories in a full-screen story-like experience.
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.subtitle}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        onPress={() =>
          router.push("/modules/memory-book/memory-post-create")
        }
        style={{
          position: "absolute",
          right: 20,
          bottom: 24,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.pink,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 6,
        }}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </Layout>
  );
}

import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getFirestore, doc, getDoc } from "firebase/firestore";

type PostData = {
  title: string;
  description: string;
  imageURL?: string;
  startDate?: number;
  emotionColor?: string;
  emotionSpectrum?: {
    energy?: number;
    stress?: number;
    clarity?: number;
    warmth?: number;
  };
  CreatedUser?: {
    CreatedUserName?: string;
    CreatedUserPhoto?: string;
  };
};

export default function MemoryPostDetail() {
  const router = useRouter();
  const { postId } = useLocalSearchParams<{ postId?: string }>();

  const { isDarkmode } = useTheme();
  const colors = themeColor[isDarkmode ? "dark" : "light"];

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        if (!postId) {
          setPost(null);
          setLoading(false);
          return;
        }
        const db = getFirestore();
        const ref = doc(db, "MemoryPosts", String(postId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPost(snap.data() as PostData);
        } else {
          setPost(null);
        }
      } catch (e) {
        console.log("Error loading memory post detail:", e);
        setPost(null);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [postId]);

  const formatShortDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const accent = post?.emotionColor || "#a855f7";

  return (
    <Layout>
      <TopNav
        middleContent={post?.title || "Memory Detail"}
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? colors.white100 : colors.dark}
          />
        }
        leftAction={() => router.back()}
      />

      {loading ? (
        <View style={styles.center}>
          <Text>Loading memory...</Text>
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <Text>Memory not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {/* Image header */}
          {post.imageURL && (
            <Image source={{ uri: post.imageURL }} style={styles.image} />
          )}

          <View style={{ paddingHorizontal: 18, paddingTop: 14 }}>
            {/* Title + date row */}
            <Text style={styles.title}>{post.title}</Text>

            <View style={styles.metaRow}>
              {post.startDate && (
                <View style={[styles.datePill, { borderColor: accent }]}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={accent}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.dateText, { color: accent }]}>
                    {formatShortDate(post.startDate)}
                  </Text>
                </View>
              )}

              {post.CreatedUser?.CreatedUserName && (
                <View style={styles.createdByRow}>
                  {post.CreatedUser.CreatedUserPhoto ? (
                    <Image
                      source={{ uri: post.CreatedUser.CreatedUserPhoto }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Ionicons
                        name="person-outline"
                        size={14}
                        color="#9ca3af"
                      />
                    </View>
                  )}
                  <Text style={styles.createdByText}>
                    {post.CreatedUser.CreatedUserName}
                  </Text>
                </View>
              )}
            </View>

            {/* Emotion chip row (optional) */}
            {post.emotionSpectrum && (
              <View style={styles.emotionRow}>
                <View
                  style={[
                    styles.emotionDot,
                    { backgroundColor: accent || "#a855f7" },
                  ]}
                />
                <Text style={styles.emotionLabel}>Mood snapshot</Text>
              </View>
            )}

            {/* Description */}
            <Text style={styles.description}>{post.description}</Text>
          </View>
        </ScrollView>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  image: {
    width: "100%",
    height: 260,
    resizeMode: "cover",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
  },
  createdByRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
  },
  avatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  createdByText: {
    fontSize: 12,
    color: "#6b7280",
  },
  emotionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  emotionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  emotionLabel: {
    fontSize: 12,
    color: "#9ca3af",
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
});

// app/modules/memory-book/MemoryPostDetail.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";

import { getFirestore, doc, getDoc } from "firebase/firestore";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

type PostData = {
  title: string;
  description: string;
  imageURL?: string;
  startDate?: number;
};

export default function MemoryPostDetailScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const { postId } = useLocalSearchParams<{ postId?: string | string[] }>();

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  const db = getFirestore();

  // normalise postId in case it comes as string[]
  const resolvedPostId =
    typeof postId === "string"
      ? postId
      : Array.isArray(postId)
      ? postId[0]
      : "";

  useEffect(() => {
    if (!resolvedPostId) {
      setLoading(false);
      return;
    }

    const loadPost = async () => {
      try {
        const ref = doc(db, "MemoryPosts", resolvedPostId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPost(snap.data() as PostData);
        } else {
          setPost(null);
        }
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [db, resolvedPostId]);

  const formatShortDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const colors = {
    bg: "#020617",
    surface: "rgba(15,23,42,0.96)",
    text: "#e5e7eb",
    subtitle: "#9ca3af",
    accent: "#38bdf8",
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>
              {post?.title ? "MEMORY DETAIL" : "MEMORY"}
            </Text>
            <Text style={styles.headerSubtitle}>View this moment in full</Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={{ marginTop: 8, color: colors.subtitle }}>
              Loading memory...
            </Text>
          </View>
        ) : !post ? (
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={32}
              color={colors.subtitle}
            />
            <Text style={{ marginTop: 8, color: colors.subtitle }}>
              Memory not found.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero image */}
            {post.imageURL && (
              <View style={styles.imageWrapper}>
                <Image source={{ uri: post.imageURL }} style={styles.image} />
              </View>
            )}

            {/* Content card */}
            <View style={[styles.card, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text }]}>
                {post.title}
              </Text>

              {post.startDate && (
                <View style={styles.dateRow}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={colors.accent}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.dateText, { color: colors.subtitle }]}>
                    {formatShortDate(post.startDate)}
                  </Text>
                </View>
              )}

              <Text style={[styles.description, { color: colors.text }]}>
                {post.description}
              </Text>
            </View>
          </ScrollView>
        )}
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
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    letterSpacing: 1.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageWrapper: {
    width: "100%",
    height: 260,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  card: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  dateText: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
});

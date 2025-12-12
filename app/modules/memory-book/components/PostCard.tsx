import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { incrementLikes } from "../utils/firebaseHelpers";
import { saveMemory, unsaveMemory, isMemorySaved } from "../utils/saveHelpers";
import type { Memory } from "../utils/memoryHelpers";
import { getAuth } from "firebase/auth";

const PRIMARY_PURPLE = "#a855f7";

type PostCardProps = {
  memory: Memory & {
    CreatedUser?: {
      CreatedUserName?: string;
      CreatedUserPhoto?: string;
    };
  };
  isDarkMode: boolean;
};

export default function PostCard({ memory, isDarkMode }: PostCardProps) {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(memory.likes || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];
  const heartScale = useState(new Animated.Value(1))[0];
  const bookmarkScale = useState(new Animated.Value(1))[0];

  // Check if memory is saved on mount
  React.useEffect(() => {
    const checkSaved = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        try {
          const saved = await isMemorySaved(memory.id, user.uid);
          setIsSaved(saved);
        } catch (error) {
          console.error("Error checking saved status:", error);
        }
      }
    };
    checkSaved();
  }, [memory.id]);

  const colors = {
    background: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
  };

  const handleLike = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount((prev) => (newLiked ? prev + 1 : prev - 1));

    // Animate heart
    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1.3,
        useNativeDriver: true,
        tension: 300,
        friction: 3,
      }),
      Animated.spring(heartScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 3,
      }),
    ]).start();

    // Update in Firestore
    if (newLiked) {
      try {
        await incrementLikes(memory.id);
      } catch (error) {
        console.error("Error liking post:", error);
      }
    }
  };

  const handleSave = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setSaving(true);
    const newSaved = !isSaved;

    // Animate bookmark
    Animated.sequence([
      Animated.spring(bookmarkScale, {
        toValue: 1.2,
        useNativeDriver: true,
        tension: 300,
        friction: 3,
      }),
      Animated.spring(bookmarkScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 3,
      }),
    ]).start();

    try {
      if (newSaved) {
        await saveMemory(memory.id);
      } else {
        await unsaveMemory(memory.id);
      }
      setIsSaved(newSaved);
    } catch (error: any) {
      console.error("Error saving/unsaving post:", error);
      Alert.alert("Error", error.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.97,
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

    router.push({
      pathname: "/modules/memory-book/MemoryPostDetail",
      params: { memoryId: memory.id, postId: memory.id, id: memory.id },
    });
  };

  const formatDate = (timestamp: number) => {
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

  const emotionColor = memory.emotionColor || PRIMARY_PURPLE;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          borderColor: emotionColor + (isDarkMode ? "66" : "CC"),
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          {memory.CreatedUser?.CreatedUserPhoto ? (
            <Image
              source={{ uri: memory.CreatedUser.CreatedUserPhoto }}
              style={styles.avatar}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                styles.avatarPlaceholder,
                {
                  backgroundColor: colors.chipBg,
                  borderColor: emotionColor + "66",
                },
              ]}
            >
              <Ionicons name="person" size={16} color={emotionColor} />
            </View>
          )}
          <View style={styles.userText}>
            <Text style={[styles.username, { color: colors.text }]}>
              {memory.CreatedUser?.CreatedUserName || "Unknown User"}
            </Text>
            <Text style={[styles.timestamp, { color: colors.textSoft }]}>
              {formatDate(memory.startDate)}
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <Ionicons
            name="ellipsis-horizontal"
            size={20}
            color={colors.textSoft}
          />
        </TouchableOpacity>
      </View>

      {/* Image */}
      {memory.imageURL && (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.95}>
          <Image source={{ uri: memory.imageURL }} style={styles.image} />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionLeft}>
          <TouchableOpacity onPress={handleLike} activeOpacity={0.7}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={26}
                color={isLiked ? "#ef4444" : colors.text}
              />
            </Animated.View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.actionButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chatbubble-outline" size={24} color={colors.text} />
            {memory.comments && memory.comments > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{memory.comments}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
            <Ionicons
              name={isSaved ? "bookmark" : "bookmark-outline"}
              size={24}
              color={isSaved ? PRIMARY_PURPLE : colors.text}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>

      {/* Likes */}
      {likeCount > 0 && (
        <Text style={[styles.likes, { color: colors.text }]}>
          {likeCount} {likeCount === 1 ? "like" : "likes"}
        </Text>
      )}

      {/* Caption */}
      <View style={styles.caption}>
        <Text style={[styles.captionText, { color: colors.text }]}>
          <Text style={styles.captionUsername}>
            {memory.CreatedUser?.CreatedUserName || "Unknown"}{" "}
          </Text>
          {memory.title}
        </Text>
      </View>

      {/* Description */}
      {memory.description && (
        <Text
          style={[styles.description, { color: colors.textSoft }]}
          numberOfLines={2}
        >
          {memory.description}
        </Text>
      )}

      {/* Comments */}
      {memory.comments && memory.comments > 0 && (
        <TouchableOpacity onPress={handlePress}>
          <Text style={[styles.viewComments, { color: colors.textSoft }]}>
            View all {memory.comments}{" "}
            {memory.comments === 1 ? "comment" : "comments"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Emotion Spectrum Preview */}
      {memory.emotionSpectrum && (
        <View
          style={[
            styles.emotionPreview,
            {
              backgroundColor: colors.chipBg,
              borderColor: emotionColor + "44",
            },
          ]}
        >
          <View style={styles.emotionRow}>
            <Ionicons name="flash" size={12} color="#f59e0b" />
            <View
              style={[styles.emotionBar, { backgroundColor: colors.border }]}
            >
              <View
                style={[
                  styles.emotionFill,
                  {
                    width: `${memory.emotionSpectrum.energy}%`,
                    backgroundColor: "#f59e0b",
                  },
                ]}
              />
            </View>
            <Text style={[styles.emotionValue, { color: colors.textSoft }]}>
              {memory.emotionSpectrum.energy}%
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarPlaceholder: {
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  userText: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: 11,
    marginTop: 2,
  },
  image: {
    width: "100%",
    height: 400,
    backgroundColor: "#1F2937",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  actionButton: {
    marginLeft: 0,
  },
  likes: {
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  caption: {
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  captionText: {
    fontSize: 14,
  },
  captionUsername: {
    fontWeight: "700",
  },
  description: {
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  viewComments: {
    fontSize: 13,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  emotionPreview: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  emotionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emotionBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  emotionFill: {
    height: "100%",
    borderRadius: 2,
  },
  emotionValue: {
    fontSize: 10,
    minWidth: 32,
    textAlign: "right",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});

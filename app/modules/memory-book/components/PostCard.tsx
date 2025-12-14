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
import { saveMemory, unsaveMemory, isMemorySaved } from "../utils/saveHelpers";
import { isMemoryLiked, likeMemory, unlikeMemory } from "../utils/likeHelpers";
import { shareMemory } from "../utils/shareHelpers";
import { getSmartDate } from "../utils/dateHelpers";
import type { Memory } from "../utils/memoryHelpers";
import { auth } from "@/config/firebase";
import ImageZoomViewer from "./ImageZoomViewer";
import InteractiveButton from "./InteractiveButton";
import VoicePlayer from "./VoicePlayer";

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
  const currentUser = auth.currentUser;
  const isOwnPost = memory.userId === currentUser?.uid;

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(memory.likes || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];
  const heartScale = useState(new Animated.Value(1))[0];
  const bookmarkScale = useState(new Animated.Value(1))[0];

  // Check if memory is saved and liked on mount
  React.useEffect(() => {
    const checkStatus = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const [saved, liked] = await Promise.all([
            isMemorySaved(memory.id, user.uid),
            isMemoryLiked(memory.id, user.uid),
          ]);
          setIsSaved(saved);
          setIsLiked(liked);
        } catch (error) {
          console.error("Error checking memory status:", error);
        }
      }
    };
    checkStatus();
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
    try {
      if (newLiked) {
        await likeMemory(memory.id);
      } else {
        await unlikeMemory(memory.id);
      }
    } catch (error: any) {
      console.error("Error liking/unliking post:", error);
      // Revert UI state on error
      setIsLiked(!newLiked);
      setLikeCount((prev) => (newLiked ? prev - 1 : prev + 1));
      Alert.alert("Error", error.message || "Failed to update like");
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

  const handleShare = async () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await shareMemory(memory.title, memory.description, memory.imageURL);
  };

  const handleImagePress = () => {
    if (memory.imageURL) {
      setShowImageZoom(true);
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } else {
      handlePress();
    }
  };

  const handleShareImage = async () => {
    if (memory.imageURL) {
      await shareMemory(
        memory.title || "Memory",
        memory.description || "",
        memory.imageURL
      );
    }
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
              {getSmartDate(memory.startDate)}
            </Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {isOwnPost && (
            <InteractiveButton
              onPress={() => {
                router.push({
                  pathname: "/modules/memory-book/MemoryPostCreate",
                  params: { editId: memory.id },
                });
              }}
              icon="create-outline"
              description="Edit this memory's title, description, and mood"
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={colors.textSoft}
              style={styles.editButton}
              noBorder={true}
              accessibilityLabel="Edit memory"
              accessibilityHint="Opens edit screen for this memory"
            />
          )}
          <InteractiveButton
            onPress={handleShare}
            icon="share-outline"
            description="Share this memory via email, messages, or social media"
            variant="ghost"
            size="sm"
            isDarkMode={isDarkMode}
            iconColor={colors.textSoft}
            style={styles.shareButton}
            noBorder={true}
            accessibilityLabel="Share memory"
            accessibilityHint="Shares this memory with other apps"
          />
        </View>
      </View>

      {/* Image */}
      {memory.imageURL && (
        <TouchableOpacity
          onPress={handleImagePress}
          activeOpacity={0.95}
          accessibilityLabel="View image"
          accessibilityRole="imagebutton"
          accessibilityHint="Double tap to view full screen image"
        >
          <Image
            source={{ uri: memory.imageURL }}
            style={styles.image}
            onError={() => {
              console.warn("Failed to load image:", memory.imageURL);
            }}
          />
        </TouchableOpacity>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.actionLeft}>
          <InteractiveButton
            onPress={handleLike}
            icon={isLiked ? "heart" : "heart-outline"}
            description={isLiked ? "Unlike this memory" : "Like this memory"}
            variant="ghost"
            size="sm"
            isDarkMode={isDarkMode}
            iconColor={isLiked ? "#ef4444" : colors.text}
            iconSize={Platform.OS === "ios" ? 24 : 22}
            style={{
              minWidth: Platform.OS === "ios" ? 44 : 40,
              minHeight: Platform.OS === "ios" ? 44 : 40,
            }}
            noBorder={true}
            accessibilityLabel={isLiked ? "Unlike memory" : "Like memory"}
            accessibilityHint={
              isLiked ? "Remove your like" : "Like this memory"
            }
          />
          <View style={{ position: "relative" }}>
            <InteractiveButton
              onPress={handlePress}
              icon="chatbubble-outline"
              description={`View ${
                memory.comments || 0
              } comments on this memory`}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={colors.text}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              style={[
                styles.actionButton,
                {
                  minWidth: Platform.OS === "ios" ? 44 : 40,
                  minHeight: Platform.OS === "ios" ? 44 : 40,
                },
              ]}
              noBorder={true}
              accessibilityLabel="View comments"
              accessibilityHint={`${
                memory.comments || 0
              } comments on this memory`}
            />
            {memory.comments && memory.comments > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{memory.comments}</Text>
              </View>
            )}
          </View>
        </View>
        <InteractiveButton
          onPress={handleSave}
          icon={isSaved ? "bookmark" : "bookmark-outline"}
          description={isSaved ? "Unsave" : "Save"}
          variant="ghost"
          size="sm"
          isDarkMode={isDarkMode}
          disabled={saving}
          iconColor={isSaved ? PRIMARY_PURPLE : colors.text}
          iconSize={Platform.OS === "ios" ? 24 : 22}
          style={{
            minWidth: Platform.OS === "ios" ? 44 : 40,
            minHeight: Platform.OS === "ios" ? 44 : 40,
          }}
          noBorder={true}
          accessibilityLabel={isSaved ? "Remove from saved" : "Save memory"}
          accessibilityHint={
            isSaved ? "Unsave this memory" : "Save this memory for later"
          }
        />
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

      {/* Image Zoom Viewer */}
      <ImageZoomViewer
        visible={showImageZoom}
        imageURL={memory.imageURL || ""}
        onClose={() => setShowImageZoom(false)}
        onShare={handleShareImage}
      />
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
    padding: Platform.OS === "ios" ? 14 : 12,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    minWidth: Platform.OS === "ios" ? 44 : 40,
    minHeight: Platform.OS === "ios" ? 44 : 40,
    justifyContent: "center",
    alignItems: "center",
  },
  shareButton: {
    minWidth: Platform.OS === "ios" ? 44 : 40,
    minHeight: Platform.OS === "ios" ? 44 : 40,
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: Platform.OS === "ios" ? 15 : 14,
    fontWeight: "600",
  },
  timestamp: {
    fontSize: Platform.OS === "ios" ? 12 : 11,
    marginTop: Platform.OS === "ios" ? 3 : 2,
  },
  image: {
    width: "100%",
    height: Platform.OS === "ios" ? 350 : 400,
    backgroundColor: "#1F2937",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
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
    fontSize: Platform.OS === "ios" ? 15 : 14,
    fontWeight: "600",
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    marginBottom: Platform.OS === "ios" ? 6 : 4,
  },
  caption: {
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    marginBottom: Platform.OS === "ios" ? 6 : 4,
  },
  captionText: {
    fontSize: Platform.OS === "ios" ? 15 : 14,
    lineHeight: Platform.OS === "ios" ? 22 : 20,
  },
  captionUsername: {
    fontWeight: "700",
  },
  description: {
    fontSize: Platform.OS === "ios" ? 14 : 13,
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    marginBottom: Platform.OS === "ios" ? 10 : 8,
    lineHeight: Platform.OS === "ios" ? 20 : 18,
  },
  viewComments: {
    fontSize: Platform.OS === "ios" ? 14 : 13,
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    marginBottom: Platform.OS === "ios" ? 10 : 8,
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

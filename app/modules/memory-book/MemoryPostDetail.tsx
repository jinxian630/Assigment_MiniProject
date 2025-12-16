import React, { useEffect, useState, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/config/firebase";
import * as Haptics from "expo-haptics";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import InteractiveButton from "./components/InteractiveButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import BottomNavBar from "./components/BottomNavBar";
import {
  subscribeToComments,
  addComment,
  deleteComment,
  Comment,
} from "./utils/commentHelpers";
import { saveMemory, unsaveMemory, isMemorySaved } from "./utils/saveHelpers";
import VoicePlayer from "./components/VoicePlayer";

const PRIMARY_PURPLE = "#a855f7";

/** 🎨 Cyberpunk neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accentColor + (isDark ? "66" : "CC"),
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.75,
    shadowRadius: isDark ? 30 : 25,
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 18 : 15,
    ...extra,
  };
};

/** 🎨 Glow text styles */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#E0F2FE" : "#6B21A8",
  textShadowColor: accentColor + (isDark ? "CC" : "88"),
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 8 : 6,
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#9333EA",
});

type PostData = {
  id?: string;
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
  likes?: number;
  comments?: number;
};

export default function MemoryPostDetail() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    memoryId?: string;
    postId?: string;
    id?: string;
  }>();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { user: authUser } = useAuth();

  // Support multiple parameter names for compatibility
  const memoryId = params.memoryId || params.postId || params.id;

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
    inputBg: isDarkMode ? "#020617" : "#F8F7FF",
    inputBorder: isDarkMode ? "#1F2937" : "#C4B5FD",
  };

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

  useEffect(() => {
    const loadPost = async () => {
      try {
        if (!memoryId) {
          setPost(null);
          setLoading(false);
          return;
        }
        const ref = doc(db, "MemoryPosts", String(memoryId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPost({ id: snap.id, ...(snap.data() as PostData) });

          // Check if post is saved
          const userId = authUser?.id || (authUser as any)?.uid;
          if (userId) {
            const saved = await isMemorySaved(memoryId, userId);
            setIsSaved(saved);
          }
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
  }, [memoryId, authUser]);

  // Subscribe to comments
  useEffect(() => {
    if (!memoryId) return;

    const unsubscribe = subscribeToComments(memoryId, (commentsList) => {
      setComments(commentsList);
    });

    return () => unsubscribe();
  }, [memoryId]);

  const formatShortDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCommentDate = (timestamp: number) => {
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

  const handleAddComment = async () => {
    const trimmedText = commentText.trim();
    if (!memoryId || !trimmedText) {
      Alert.alert("Empty Comment", "Please enter a comment before submitting.");
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to comment");
      return;
    }

    setSubmittingComment(true);
    try {
      await addComment(memoryId, trimmedText);
      setCommentText("");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!memoryId) return;

    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(memoryId, commentId);
            } catch (error: any) {
              Alert.alert("Error", error.message || "Failed to delete comment");
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!memoryId) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to save posts");
      return;
    }

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
        await saveMemory(memoryId);
        setShowSaveSuccess(true);
      } else {
        await unsaveMemory(memoryId);
        setShowSaveSuccess(true);
      }
      setIsSaved(newSaved);
    } catch (error: any) {
      console.error("Error saving/unsaving post:", error);
      Alert.alert("Error", error.message || "Failed to save post");
    } finally {
      setSaving(false);
    }
  };

  const accent = post?.emotionColor || PRIMARY_PURPLE;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* SAVE SUCCESS OVERLAY */}
        {showSaveSuccess && (
          <View
            style={[
              styles.successOverlay,
              {
                backgroundColor: isDarkMode
                  ? "rgba(15,23,42,0.95)"
                  : "rgba(255,255,255,0.95)",
              },
            ]}
          >
            <View
              style={[
                styles.successCard,
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  padding: 24,
                }),
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.successIcon,
                  {
                    backgroundColor: PRIMARY_PURPLE + "20",
                    borderColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={64}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <Text style={[styles.successTitle, glowText]}>
                {isSaved ? "Saved!" : "Removed"}
              </Text>
              <Text style={[styles.successSubtitle, softText]}>
                {isSaved
                  ? "Memory saved to your collection!"
                  : "Memory removed from saved posts"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSaveSuccess(false);
                }}
                style={[
                  styles.successButton,
                  {
                    backgroundColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Text style={styles.successButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Memory Detail
          </Text>
          <View style={styles.headerRight}>
            <InteractiveButton
              onPress={toggleTheme}
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              description={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 24 : 22}
              noBorder={true}
              style={styles.themeToggle}
              accessibilityLabel="Toggle theme"
              accessibilityHint={`Changes to ${
                isDarkMode ? "light" : "dark"
              } mode`}
            />
            <TouchableOpacity
              onPress={handleSave}
              disabled={saving || !memoryId}
              style={styles.saveButton}
              activeOpacity={0.7}
            >
              <Animated.View
                style={[
                  { transform: [{ scale: bookmarkScale }] },
                  saving && { opacity: 0.5 },
                ]}
              >
                <Ionicons
                  name={isSaved ? "bookmark" : "bookmark-outline"}
                  size={24}
                  color={isSaved ? PRIMARY_PURPLE : colors.text}
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={PRIMARY_PURPLE} />
            <Text style={[styles.loadingText, { color: colors.textSoft }]}>
              Loading memory...
            </Text>
          </View>
        ) : !post ? (
          <View style={styles.center}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.textSoft}
            />
            <Text style={[styles.errorText, { color: colors.text }]}>
              Memory not found
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={
              Platform.OS === "ios"
                ? "padding"
                : Platform.OS === "android"
                ? "height"
                : undefined
            }
            keyboardVerticalOffset={
              Platform.OS === "ios" ? 100 : Platform.OS === "android" ? 80 : 0
            }
            enabled={Platform.OS !== "web"}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Image header */}
              {post.imageURL && (
                <Image
                  source={{ uri: post.imageURL }}
                  style={styles.image}
                  onError={() => {
                    console.warn("Failed to load post image:", post.imageURL);
                  }}
                />
              )}

              <View
                style={[styles.content, { backgroundColor: colors.surface }]}
              >
                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>
                  {post.title}
                </Text>

                {/* Meta row */}
                <View style={styles.metaRow}>
                  {post.startDate && (
                    <View
                      style={[
                        styles.datePill,
                        { borderColor: accent, backgroundColor: colors.chipBg },
                      ]}
                    >
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
                          onError={() => {
                            console.warn(
                              "Failed to load user avatar:",
                              post.CreatedUser?.CreatedUserPhoto
                            );
                          }}
                        />
                      ) : (
                        <View
                          style={[
                            styles.avatarFallback,
                            { backgroundColor: colors.chipBg },
                          ]}
                        >
                          <Ionicons
                            name="person-outline"
                            size={14}
                            color={accent}
                          />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.createdByText,
                          { color: colors.textSoft },
                        ]}
                      >
                        {post.CreatedUser.CreatedUserName}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                <Text style={[styles.description, { color: colors.text }]}>
                  {post.description}
                </Text>

                {/* Voice Journal Player */}
                {(post as any).voiceJournal?.audioURL && (
                  <VoicePlayer
                    audioURL={(post as any).voiceJournal.audioURL}
                    duration={(post as any).voiceJournal.duration}
                    emoji={(post as any).voiceJournal.emoji}
                    feeling={(post as any).voiceJournal.feeling}
                    moodTag={(post as any).voiceJournal.moodTag}
                    prompt={(post as any).voiceJournal.prompt}
                    isDarkMode={isDarkMode}
                  />
                )}

                {/* Comment Input - Moved here between description and comments */}
                <View
                  style={[
                    styles.commentInputContainer,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.commentInput,
                      {
                        backgroundColor: colors.inputBg,
                        borderColor: colors.inputBorder,
                        color: colors.text,
                      },
                    ]}
                    placeholder="Add a comment..."
                    placeholderTextColor={colors.textSoft}
                    value={commentText}
                    onChangeText={setCommentText}
                    multiline
                    maxLength={500}
                    editable={!submittingComment}
                    returnKeyType="send"
                    onSubmitEditing={
                      commentText.trim() && !submittingComment
                        ? handleAddComment
                        : undefined
                    }
                  />
                  <TouchableOpacity
                    onPress={handleAddComment}
                    disabled={!commentText.trim() || submittingComment}
                    activeOpacity={0.7}
                    style={[
                      styles.sendButton,
                      {
                        backgroundColor:
                          commentText.trim() && !submittingComment
                            ? isDarkMode
                              ? "#374151"
                              : "#E5E7EB"
                            : isDarkMode
                            ? "#1F2937"
                            : "#F3F4F6",
                        opacity:
                          !commentText.trim() || submittingComment ? 0.5 : 1,
                      },
                    ]}
                    accessibilityLabel="Send comment"
                    accessibilityHint="Posts your comment"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    {submittingComment ? (
                      <ActivityIndicator
                        size="small"
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                    ) : (
                      <Ionicons
                        name="send"
                        size={Platform.OS === "ios" ? 20 : 18}
                        color={isDarkMode ? "#9CA3AF" : "#6B7280"}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Comments Section */}
                <View style={styles.commentsSection}>
                  <View style={styles.commentsHeader}>
                    <Ionicons
                      name="chatbubbles-outline"
                      size={20}
                      color={accent}
                    />
                    <Text
                      style={[styles.commentsTitle, { color: colors.text }]}
                    >
                      Comments ({comments.length})
                    </Text>
                  </View>

                  {comments.length === 0 ? (
                    <View style={styles.emptyComments}>
                      <Ionicons
                        name="chatbubble-outline"
                        size={32}
                        color={colors.textSoft}
                      />
                      <Text
                        style={[
                          styles.emptyCommentsText,
                          { color: colors.textSoft },
                        ]}
                      >
                        No comments yet. Be the first to comment!
                      </Text>
                    </View>
                  ) : (
                    comments.map((comment) => (
                      <View
                        key={comment.id}
                        style={[
                          styles.commentItem,
                          {
                            backgroundColor: colors.chipBg,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <View style={styles.commentHeader}>
                          {comment.userPhoto ? (
                            <Image
                              source={{ uri: comment.userPhoto }}
                              style={styles.commentAvatar}
                              onError={() => {
                                console.warn(
                                  "Failed to load comment avatar:",
                                  comment.userPhoto
                                );
                              }}
                            />
                          ) : (
                            <View
                              style={[
                                styles.commentAvatar,
                                styles.commentAvatarPlaceholder,
                                { backgroundColor: colors.border },
                              ]}
                            >
                              <Ionicons
                                name="person"
                                size={12}
                                color={accent}
                              />
                            </View>
                          )}
                          <View style={styles.commentInfo}>
                            <Text
                              style={[
                                styles.commentAuthor,
                                { color: colors.text },
                              ]}
                            >
                              {comment.userName}
                            </Text>
                            <Text
                              style={[
                                styles.commentDate,
                                { color: colors.textSoft },
                              ]}
                            >
                              {formatCommentDate(comment.createdAt)}
                            </Text>
                          </View>
                          {auth.currentUser?.uid === comment.userId && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteComment(comment.id);
                              }}
                              style={styles.deleteCommentBtn}
                              hitSlop={{
                                top: 10,
                                bottom: 10,
                                left: 10,
                                right: 10,
                              }}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={18}
                                color={colors.textSoft}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text
                          style={[styles.commentText, { color: colors.text }]}
                        >
                          {comment.text}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}

        {/* Bottom Navigation */}
        <BottomNavBar isDarkMode={isDarkMode} />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  themeToggle: {
    minWidth: Platform.OS === "ios" ? 40 : 38,
    minHeight: Platform.OS === "ios" ? 40 : 38,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Platform.OS === "ios" ? 100 : 80,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  image: {
    width: "100%",
    height: 300,
    resizeMode: "cover",
  },
  content: {
    padding: 18,
    borderRadius: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: PRIMARY_PURPLE + "44",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  datePill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  avatarFallback: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  createdByText: {
    fontSize: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  commentsSection: {
    marginTop: 8,
  },
  commentsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyComments: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyCommentsText: {
    marginTop: 12,
    fontSize: 13,
    textAlign: "center",
  },
  commentItem: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentAvatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: "600",
  },
  commentDate: {
    fontSize: 11,
    marginTop: 2,
  },
  deleteCommentBtn: {
    padding: 8,
    minWidth: 36,
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginTop: 20,
    marginBottom: 20,
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    borderStyle: "solid",
  },
  commentInput: {
    flex: 1,
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: Platform.OS === "ios" ? 15 : 14,
    maxHeight: 100,
    minHeight: Platform.OS === "ios" ? 44 : 42,
  },
  sendButton: {
    width: Platform.OS === "ios" ? 44 : 40,
    height: Platform.OS === "ios" ? 44 : 40,
    minWidth: Platform.OS === "ios" ? 44 : 40,
    minHeight: Platform.OS === "ios" ? 44 : 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    alignItems: "center",
    maxWidth: 320,
    width: "100%",
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
  },
  successButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 160,
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});

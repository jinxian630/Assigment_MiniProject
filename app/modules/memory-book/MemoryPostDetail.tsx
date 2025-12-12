import React, { useEffect, useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeToComments,
  addComment,
  deleteComment,
  Comment,
} from "./utils/commentHelpers";

const PRIMARY_PURPLE = "#a855f7";

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
  const { theme, isDarkMode } = useTheme();
  const { user: authUser } = useAuth();
  const auth = getAuth();

  // Support multiple parameter names for compatibility
  const memoryId = params.memoryId || params.postId || params.id;

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

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

  useEffect(() => {
    const loadPost = async () => {
      try {
        if (!memoryId) {
          setPost(null);
          setLoading(false);
          return;
        }
        const db = getFirestore();
        const ref = doc(db, "MemoryPosts", String(memoryId));
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPost({ id: snap.id, ...(snap.data() as PostData) });
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
  }, [memoryId]);

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
    if (!memoryId || !commentText.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please log in to comment");
      return;
    }

    setSubmittingComment(true);
    try {
      await addComment(memoryId, commentText);
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

  const accent = post?.emotionColor || PRIMARY_PURPLE;

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
          <View style={{ width: 40 }} />
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
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={90}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Image header */}
              {post.imageURL && (
                <Image source={{ uri: post.imageURL }} style={styles.image} />
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
                              onPress={() => handleDeleteComment(comment.id)}
                              style={styles.deleteCommentBtn}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={16}
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

            {/* Comment Input */}
            <View
              style={[
                styles.commentInputContainer,
                {
                  backgroundColor: colors.surface,
                  borderTopColor: colors.border,
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
              />
              <TouchableOpacity
                onPress={handleAddComment}
                disabled={!commentText.trim() || submittingComment}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      commentText.trim() && !submittingComment
                        ? PRIMARY_PURPLE
                        : colors.border,
                  },
                ]}
              >
                {submittingComment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        )}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
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
    padding: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});

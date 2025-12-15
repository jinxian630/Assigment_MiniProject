import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { Text, TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import { MODULE_COLOR } from "../utils/sharedUI";
import { ChatMsg } from "../utils/types";

interface AICardProps {
  totalActive: number;
  aiQuestion: string;
  setAiQuestion: (text: string) => void;
  aiAnswer: string;
  aiLoading: boolean;
  chatHistory: ChatMsg[];
  aiScrollRef: React.RefObject<ScrollView>;
  onAskAI: (customQuestion?: string) => void;
  onClearChat: () => void;
}

export const AICard: React.FC<AICardProps> = ({
  totalActive,
  aiQuestion,
  setAiQuestion,
  aiAnswer,
  aiLoading,
  chatHistory,
  aiScrollRef,
  onAskAI,
  onClearChat,
}) => {
  const { theme } = useTheme();

  const styles = StyleSheet.create({
    aiCardOuter: {
      marginTop: 12,
      marginBottom: 12,
      borderRadius: 20,
      padding: 2,
      backgroundColor: "#07101a",
      shadowColor: "#00E5FF",
      shadowOpacity: 0.6,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 10,
      borderWidth: 1,
      borderColor: "rgba(124,58,237,0.12)",
    },
    aiCardInner: {
      borderRadius: 18,
      padding: 14,
      backgroundColor: "#051018",
      borderWidth: 1,
      borderColor: "rgba(0,229,255,0.08)",
    },
    aiHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    aiHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    aiHeaderIconWrapper: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
      backgroundColor: "rgba(10,12,18,0.8)",
      borderWidth: 1,
      borderColor: "rgba(0,229,255,0.18)",
    },
    aiHeaderTitle: {
      fontSize: 15,
      fontWeight: "700",
      color: "#7EE9FF",
    },
    aiHeaderSubtitle: {
      fontSize: 11,
      color: "#9AA6BF",
    },
    aiHeaderBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "rgba(255,77,255,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,77,255,0.14)",
    },
    aiHeaderBadgeText: {
      fontSize: 11,
      fontWeight: "600",
      color: "#FF7AE2",
    },
    aiQuickRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      marginTop: 6,
      marginBottom: 6,
    },
    aiQuickButton: {
      marginRight: 6,
      marginBottom: 6,
      backgroundColor: "transparent",
      borderWidth: 1,
      borderColor: "rgba(124,58,237,0.12)",
      paddingHorizontal: 8,
    },
    aiMetaRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 4,
      marginBottom: 4,
    },
    aiMetaText: {
      fontSize: 10,
      color: "#6f7d8c",
    },
    aiAnswerContainer: {
      marginTop: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: "rgba(0,229,255,0.12)",
      padding: 8,
      backgroundColor: "rgba(2,6,12,0.6)",
      shadowColor: "#7C3AED",
      shadowOpacity: 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    aiAnswerHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    aiAnswerHeaderText: {
      fontSize: 12,
      fontWeight: "600",
      color: "#CFFAFE",
      marginLeft: 6,
    },
    aiChatScroll: {
      maxHeight: 240,
      borderRadius: 8,
      paddingHorizontal: 4,
    },
    bubbleRow: {
      flexDirection: "row",
      marginTop: 8,
    },
    bubbleUser: {
      marginLeft: "auto",
      maxWidth: "86%",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: "rgba(124,58,237,0.08)",
      borderWidth: 1,
      borderColor: "rgba(255,77,255,0.18)",
      shadowColor: "rgba(255,77,255,0.18)",
      shadowOpacity: 0.6,
      shadowRadius: 8,
    },
    bubbleAI: {
      marginRight: "auto",
      maxWidth: "86%",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: "rgba(0,229,255,0.03)",
      borderWidth: 1,
      borderColor: "rgba(0,229,255,0.18)",
      shadowColor: "rgba(0,229,255,0.14)",
      shadowOpacity: 0.6,
      shadowRadius: 8,
    },
    bubbleText: {
      fontSize: 13,
      lineHeight: 18,
      color: "#DFF9FF",
    },
    aiEmptyHint: {
      fontSize: 11,
      color: "#7f8a96",
      marginTop: 4,
    },
  });

  return (
    <View style={styles.aiCardOuter}>
      <View style={styles.aiCardInner}>
        <View style={styles.aiHeaderRow}>
          <View style={styles.aiHeaderLeft}>
            <View style={styles.aiHeaderIconWrapper}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={MODULE_COLOR}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiHeaderTitle}>AI Priority Assistant</Text>
              <Text style={styles.aiHeaderSubtitle}>
                Ask which tasks to tackle first. Uses your current tasks plus
                rules stored in ChromaDB.
              </Text>
            </View>
          </View>
          <View style={styles.aiHeaderBadge}>
            <Text style={styles.aiHeaderBadgeText}>{totalActive} active</Text>
          </View>
        </View>

        <View style={styles.aiQuickRow}>
          <Button
            text="What should I do today?"
            size="sm"
            style={styles.aiQuickButton}
            onPress={() =>
              onAskAI("What are the top 3 tasks I should do today?")
            }
          />
          <Button
            text="Plan my week"
            size="sm"
            style={styles.aiQuickButton}
            onPress={() =>
              onAskAI(
                "Help me plan which tasks to schedule over the next 7 days."
              )
            }
          />
          <Button
            text="Overdue first"
            size="sm"
            style={styles.aiQuickButton}
            onPress={() => onAskAI("Which overdue tasks should I clear first?")}
          />
          <Button
            text="Clear chat"
            size="sm"
            style={styles.aiQuickButton}
            color="danger"
            onPress={onClearChat}
          />
        </View>

        <TextInput
          containerStyle={{
            marginTop: 4,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.card,
          }}
          style={{ color: theme.colors.textPrimary, minHeight: 40 }}
          placeholder="Ask: Which tasks are most urgent before Friday?"
          placeholderTextColor={theme.colors.textSecondary}
          value={aiQuestion}
          onChangeText={setAiQuestion}
          multiline
        />

        <View style={styles.aiMetaRow}>
          <Ionicons
            name="shield-checkmark-outline"
            size={12}
            color={theme.colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={styles.aiMetaText}>
            Runs locally via your RAG backend – no tasks are sent to external
            cloud.
          </Text>
        </View>

        <Button
          text={aiLoading ? "Thinking..." : "Ask AI"}
          onPress={() => onAskAI()}
          disabled={aiLoading}
          style={{ marginTop: 6 }}
        />

        <View style={styles.aiAnswerContainer}>
          <View style={styles.aiAnswerHeaderRow}>
            <Ionicons
              name="chatbubbles-outline"
              size={16}
              color={MODULE_COLOR}
            />
            <Text style={styles.aiAnswerHeaderText}>AI chat</Text>
          </View>

          <ScrollView
            ref={aiScrollRef}
            style={styles.aiChatScroll}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() =>
              aiScrollRef.current?.scrollToEnd?.({ animated: true })
            }
          >
            {chatHistory.length === 0 && !aiAnswer ? (
              <Text style={styles.aiEmptyHint}>
                Ask a question above to see the AI's suggested plan here. It
                will reference your current tasks and their priority scores.
              </Text>
            ) : null}

            {chatHistory.map((m, idx) => (
              <View key={`${m.role}-${idx}`} style={styles.bubbleRow}>
                <View
                  style={
                    m.role === "user" ? styles.bubbleUser : styles.bubbleAI
                  }
                >
                  <Text style={styles.bubbleText}>{m.content}</Text>
                </View>
              </View>
            ))}

            {aiAnswer && chatHistory.length === 0 ? (
              <View style={styles.bubbleRow}>
                <View style={styles.bubbleAI}>
                  <Text style={styles.bubbleText}>{aiAnswer}</Text>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </View>
  );
};

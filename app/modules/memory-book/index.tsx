import React, { useEffect, useState } from "react";
<<<<<<< HEAD
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

=======
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

>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e
type Memory = {
  id: string;
  title: string;
  description: string;
  mood?: string;
  startDate?: number;
  imageURL?: string;
};
<<<<<<< HEAD

const MODULE_PURPLE = "#a855f7"; // main violet
const MODULE_PURPLE_SOFT = "#4c1d95";

export default function MemoryBookScreen() {
  const router = useRouter();
  const { theme, isDarkMode } = useTheme();

=======

export default function MemoryBookScreen() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e
  const [latestMemory, setLatestMemory] = useState<Memory | null>(null);
  const [totalMemories, setTotalMemories] = useState(0);

  useEffect(() => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts");

<<<<<<< HEAD
    // latest 1 memory
=======
    // Get latest 1 memory
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e
    const qLatest = query(postsRef, orderBy("startDate", "desc"), limit(1));
    const unsubLatest = onSnapshot(qLatest, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        setLatestMemory({ id: doc.id, ...(doc.data() as any) });
      } else {
        setLatestMemory(null);
      }
    });

<<<<<<< HEAD
    // total count
=======
    // Count all memories (simple way)
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e
    const qAll = query(postsRef, orderBy("startDate", "desc"));
    const unsubAll = onSnapshot(qAll, (snapshot) => {
      setTotalMemories(snapshot.size);
    });

    return () => {
      unsubLatest();
      unsubAll();
    };
  }, []);

<<<<<<< HEAD
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
    bg: isDarkMode ? "#020617" : "#0b1020",
    card: isDarkMode ? "#020617" : "#020617",
    headerBorder: MODULE_PURPLE,
    headerBg: "#020617",
    textMain: "#e5e7eb",
    textSoft: "#9ca3af",
    accent: MODULE_PURPLE,
    accentSoft: MODULE_PURPLE_SOFT,
    divider: "#1f2937",
    chipBg: "rgba(168, 85, 247, 0.16)",
    chipBorder: "rgba(216, 180, 254, 0.8)",
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Top header / module title */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />

          <View style={styles.headerCenter}>
            <Text style={[styles.moduleLabel, { color: colors.textSoft }]}>
              MEMORY BOOK
            </Text>
            <View style={styles.iconBlock}>
              <View
                style={[
                  styles.iconCircle,
                  {
                    borderColor: MODULE_PURPLE,
                    shadowColor: MODULE_PURPLE,
                  },
                ]}
              >
                <Ionicons name="book-outline" size={26} color={MODULE_PURPLE} />
              </View>
            </View>
            <Text style={[styles.moduleName, { color: colors.textMain }]}>
              Memory Book
            </Text>
            <Text style={[styles.moduleTagline, { color: colors.textSoft }]}>
              Save your moments, moods & reflections.
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={[styles.scrollView, { backgroundColor: "transparent" }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Overview / stats card */}
          <View
            style={[
              styles.overviewCard,
              {
                backgroundColor: colors.headerBg,
                borderColor: colors.headerBorder,
              },
            ]}
          >
            {/* Top row: stats + chips */}
            <View style={styles.overviewTopRow}>
              <View>
                <Text
                  style={[styles.overviewLabel, { color: colors.textSoft }]}
                >
                  Memories recorded
                </Text>
                <Text
                  style={[styles.overviewValue, { color: colors.textMain }]}
                >
                  {totalMemories}
                </Text>
              </View>

              <View style={styles.overviewChipRow}>
                {latestMemory && (
                  <View
                    style={[
                      styles.chip,
                      {
                        backgroundColor: colors.chipBg,
                        borderColor: colors.chipBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="sparkles-outline"
                      size={14}
                      color={colors.accent}
                    />
                    <Text
                      numberOfLines={1}
                      style={[styles.chipText, { color: colors.textMain }]}
                    >
                      Last: {latestMemory.title}
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() =>
                    router.push("/modules/memory-book/MemoryTimeline")
                  }
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor: MODULE_PURPLE,
                      shadowColor: MODULE_PURPLE,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color="#f9fafb"
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.chipButtonText}>Open timeline</Text>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color="#f9fafb"
                    style={{ marginLeft: 1 }}
                  />
                </TouchableOpacity>
              </View>
=======
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
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e
            </View>

            {/* Divider */}
            <View
              style={[styles.divider, { backgroundColor: colors.divider }]}
            />

            {/* Latest memory preview / empty state */}
            {latestMemory ? (
              <View style={styles.previewRow}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.sectionLabel, { color: colors.textSoft }]}
                  >
                    Today&apos;s reflection
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.previewTitle, { color: colors.textMain }]}
                  >
                    {latestMemory.title}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.previewDescription,
                      { color: colors.textSoft },
                    ]}
                  >
                    {latestMemory.description}
                  </Text>

                  <View style={styles.previewMetaRow}>
                    {latestMemory.mood && (
                      <View
                        style={[
                          styles.moodPill,
                          { backgroundColor: colors.accentSoft },
                        ]}
                      >
                        <Ionicons
                          name="happy-outline"
                          size={14}
                          color="#f9fafb"
                          style={{ marginRight: 4 }}
                        />
                        <Text style={styles.moodText}>{latestMemory.mood}</Text>
                      </View>
                    )}
                    {latestMemory.startDate && (
                      <Text
                        style={[styles.dateText, { color: colors.textSoft }]}
                      >
                        {formatShortDate(latestMemory.startDate)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="images-outline"
                  size={28}
                  color={colors.textSoft}
                />
                <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                  No memories yet
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textSoft }]}
                >
                  Start by creating your first memory with a photo and story.
                </Text>
              </View>
            )}
          </View>

<<<<<<< HEAD
          {/* Timeline section */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
                Timeline
              </Text>
              <Text
                style={[styles.sectionSubtitle, { color: colors.textSoft }]}
              >
                Browse everything you’ve saved, by year and date.
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => router.push("/modules/memory-book/MemoryTimeline")}
              style={[
                styles.primaryRow,
                {
                  borderColor: MODULE_PURPLE,
                  backgroundColor: "#020617",
                },
              ]}
            >
              <View style={styles.rowIconCircle}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={MODULE_PURPLE}
                />
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={[styles.rowTitle, { color: colors.textMain }]}>
                  View full timeline
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSoft }]}>
                  Scroll through memories in chronological order.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSoft}
              />
            </TouchableOpacity>
          </View>

          {/* Quick actions */}
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionTitle, { color: colors.textMain }]}>
              Quick actions
            </Text>

            {/* New Memory */}
            <TouchableOpacity
              onPress={() =>
                router.push("/modules/memory-book/MemoryPostCreate")
              }
              style={[
                styles.secondaryRow,
                { backgroundColor: "#020617", borderColor: "#4b5563" },
              ]}
            >
              <View
                style={[
                  styles.rowIconCircle,
                  { backgroundColor: "rgba(168,85,247,0.15)" },
                ]}
              >
                <Ionicons name="add" size={18} color={MODULE_PURPLE} />
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={[styles.rowTitle, { color: colors.textMain }]}>
                  New Memory
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSoft }]}>
                  Capture a new moment with photo, title, story and mood.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSoft}
              />
            </TouchableOpacity>

            {/* Timeline View (shortcut) */}
            <TouchableOpacity
              onPress={() => router.push("/modules/memory-book/MemoryTimeline")}
              style={[
                styles.secondaryRow,
                { backgroundColor: "#020617", borderColor: "#4b5563" },
              ]}
            >
              <View
                style={[
                  styles.rowIconCircle,
                  { backgroundColor: "rgba(129,140,248,0.15)" },
                ]}
              >
                <Ionicons name="time-outline" size={18} color="#818cf8" />
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={[styles.rowTitle, { color: colors.textMain }]}>
                  Timeline View
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSoft }]}>
                  See how your memories evolve over time.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSoft}
              />
            </TouchableOpacity>

            {/* Stories View */}
            <TouchableOpacity
              onPress={() => router.push("/modules/memory-book/memory-stories")}
              style={[
                styles.secondaryRow,
                { backgroundColor: "#020617", borderColor: "#4b5563" },
              ]}
            >
              <View
                style={[
                  styles.rowIconCircle,
                  { backgroundColor: "rgba(249,115,22,0.14)" },
                ]}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={18}
                  color="#fb923c"
                />
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={[styles.rowTitle, { color: colors.textMain }]}>
                  Stories View
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSoft }]}>
                  Relive memories in a full-screen, story-style experience.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSoft}
              />
            </TouchableOpacity>

            {/* Explore Users */}
            <TouchableOpacity
              onPress={() => router.push("/modules/memory-book/UserSearch")}
              style={[
                styles.secondaryRow,
                { backgroundColor: "#020617", borderColor: "#4b5563" },
              ]}
            >
              <View
                style={[
                  styles.rowIconCircle,
                  { backgroundColor: "rgba(56,189,248,0.16)" },
                ]}
              >
                <Ionicons name="people-outline" size={18} color="#38bdf8" />
              </View>
              <View style={styles.rowTextBlock}>
                <Text style={[styles.rowTitle, { color: colors.textMain }]}>
                  Explore Users
                </Text>
                <Text style={[styles.rowSubtitle, { color: colors.textSoft }]}>
                  Browse other users’ profiles and shared memories.
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textSoft}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Floating Add button (FAB) */}
        <TouchableOpacity
          onPress={() => router.push("/modules/memory-book/MemoryPostCreate")}
          style={[
            styles.fab,
            {
              backgroundColor: MODULE_PURPLE,
              shadowColor: MODULE_PURPLE,
            },
          ]}
        >
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
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
    alignItems: "center",
    flex: 1,
  },
  moduleLabel: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    opacity: 0.9,
  },
  iconBlock: {
    marginTop: 10,
    marginBottom: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.55,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  moduleName: {
    fontSize: 22,
    fontWeight: "700",
  },
  moduleTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 96,
  },
  overviewCard: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    marginBottom: 22,
  },
  overviewTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  overviewLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  overviewValue: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 6,
  },
  overviewChipRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
    maxWidth: 170,
  },
  chipText: {
    fontSize: 11,
    marginLeft: 4,
  },
  chipButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
  },
  chipButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#f9fafb",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 14,
    marginBottom: 14,
    opacity: 0.7,
  },
  previewRow: {
    flexDirection: "row",
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  previewDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  moodPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  moodText: {
    fontSize: 11,
    color: "#f9fafb",
  },
  dateText: {
    fontSize: 11,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 20,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionHeaderRow: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  primaryRow: {
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  secondaryRow: {
    borderWidth: 1,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 10,
  },
  rowIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  rowTextBlock: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 26,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOpacity: 0.7,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
  },
});
=======
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
>>>>>>> 851a76ba5c9a61789fc7c92a775fb143bf42899e

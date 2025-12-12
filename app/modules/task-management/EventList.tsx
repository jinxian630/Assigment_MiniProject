import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  TouchableOpacity,
  TouchableHighlight,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
// Conditionally import expo-sharing (not available on web)
let shareAsync: any = null;
if (Platform.OS !== "web") {
  try {
    const Sharing = require("expo-sharing");
    shareAsync = Sharing.shareAsync;
  } catch (e) {
    console.log("expo-sharing not available");
  }
}
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  deleteDoc,
  query,
} from "firebase/firestore";
import { SwipeListView } from "react-native-swipe-list-view";
import { getStorage, ref, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";
import * as Clipboard from "expo-clipboard";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

const MODULE_COLOR = "#38BDF8";

type FilterType = "all" | "upcoming" | "past";

/** 🔧 Neon card: border + glow only (NO background here) */
/** 🔧 Neon card: only border + glow, background comes from theme */
const createNeonCardShell = (
  accentColor: string,
  theme: any,
  extra: any = {}
) => {
  return {
    borderRadius: 24,

    // ❌ no backgroundColor here – let <Card> / theme handle it
    // backgroundColor: ...

    borderWidth: 1,
    borderColor: accentColor + "66",

    // glow
    shadowColor: accentColor,
    shadowOpacity: theme.isDark ? 0.9 : 0.5,
    shadowRadius: theme.isDark ? 30 : 20,
    shadowOffset: { width: 0, height: 0 },

    // Android elevation
    elevation: theme.isDark ? 18 : 8,

    ...extra,
  };
};

/** 🎨 Summary card – reuses shell, but we set background per theme here */
const summaryCardStyle = (theme: any, type: "total" | "upcoming" | "past") => {
  const colors = {
    total: {
      lightBorder: "#A855F7", // purple-ish like Memory Book
      darkBorder: "#A855F7",
    },
    upcoming: {
      lightBorder: "#22C55E", // green
      darkBorder: "#22C55E",
    },
    past: {
      lightBorder: "#F59E0B", // amber
      darkBorder: "#F59E0B",
    },
  } as const;

  const c = colors[type];
  const accent = theme.isDark ? c.darkBorder : c.lightBorder;

  return createNeonCardShell(accent, theme, {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.isDark ? "#020617" : "#F9FAFB",
  });
};

const isEventPast = (date?: number) => {
  if (typeof date !== "number") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today.getTime();
};

/** Only creator, assigned user and invited guest can see */
const canUserSeeItem = (item: any, user: any | null): boolean => {
  if (!user) return false;

  const uid = user.uid;
  const email = (user.email || "").toLowerCase();

  if (item?.createdBy?.id === uid) return true;

  if (item?.assignedToId && item.assignedToId === uid) return true;

  if (
    Array.isArray(item?.assignedUserIds) &&
    item.assignedUserIds.includes(uid)
  ) {
    return true;
  }

  if (Array.isArray(item?.guests) && email) {
    const guestEmails = item.guests
      .filter((g: any) => typeof g === "string")
      .map((g: string) => g.toLowerCase());
    if (guestEmails.includes(email)) return true;
  }

  return false;
};

/** Escape text before injecting into HTML */
const escapeHtml = (value: any) => {
  if (!value && value !== 0) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt/")
    .replace(/>/g, "&gt/")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

export default function EventListScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const [loading, setLoading] = useState<boolean>(true);
  const [EventArray, setEventArray] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  const [showAddMenu, setShowAddMenu] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "Events"));

    const subscriber = onSnapshot(q, (querySnapshot) => {
      const eventData: any[] = [];

      querySnapshot.forEach((docSnap) => {
        eventData.push({
          ...docSnap.data(),
          key: docSnap.id,
        });
      });

      eventData.sort(
        (a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0)
      );

      const user = auth.currentUser;

      const visibleEvents = user
        ? eventData.filter((evt) => canUserSeeItem(evt, user))
        : [];

      setEventArray(visibleEvents);
      setLoading(false);
    });

    return () => subscriber();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayMs = today.getTime();

  const styles = React.useMemo(
    () =>
      StyleSheet.create({
        rowFront: {
          flex: 1,
        },
        container: {
          flex: 1,
        },
        list: {
          flex: 1,
        },
        listContent: {
          paddingHorizontal: theme.spacing.screenPadding,
          paddingBottom: theme.spacing.xxl + 140,
        },
        headerRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.screenPadding,
          paddingTop: theme.spacing.md,
          paddingBottom: theme.spacing.sm,
        },
        headerTitle: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
        },
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
          columnGap: theme.spacing.xs,
        },
        chipButton: {
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: 999,
          alignItems: "center",
          justifyContent: "center",
        },
        chipButtonText: {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        iconSection: {
          alignItems: "center",
          marginBottom: theme.spacing.xl,
        },
        iconContainer: {
          width: 120,
          height: 120,
          borderRadius: 60,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: theme.spacing.md,
          backgroundColor: `${MODULE_COLOR}10`,
          shadowColor: MODULE_COLOR,
          shadowOpacity: theme.isDark ? 0.7 : 0.3,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        },
        moduleTitle: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          color: theme.colors.textPrimary,
          marginBottom: theme.spacing.xs,
        },
        moduleSubtitle: {
          fontSize: theme.typography.fontSizes.md,
          color: theme.colors.textSecondary,
        },
        section: {
          marginBottom: theme.spacing.lg,
        },

        /** neon card shell reused – we give background based on theme */
        neonShellCard: createNeonCardShell(MODULE_COLOR, theme, {
          padding: theme.spacing.md,
          backgroundColor: theme.isDark ? "#020617" : "#F9FAFB",
        }),
        neonBottomLine: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
        },

        calendarRibbon: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: theme.spacing.md,
        },
        calendarLeft: {
          flexDirection: "row",
          alignItems: "center",
        },
        calendarEmoji: {
          fontSize: 24,
          marginRight: theme.spacing.sm,
        },
        calendarText: {
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.textPrimary,
        },
        smallLinkButton: {
          borderRadius: 999,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.xs,
          backgroundColor: "#16a34a20",
          borderWidth: 1,
          borderColor: "#16A34A",
        },
        smallLinkButtonText: {
          fontSize: theme.typography.fontSizes.xs,
          fontWeight: theme.typography.fontWeights.semibold,
          color: "#16a34aff",
        },
        summaryRow: {
          flexDirection: "row",
          columnGap: theme.spacing.sm,
        },
        summaryCard: {
          flex: 1,
        },
        summaryLabel: {
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.textSecondary,
        },
        summaryValue: {
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: theme.typography.fontWeights.bold,
          marginTop: 4,
          color: theme.colors.textPrimary,
        },
        filterRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: theme.spacing.sm,
        },
        filterChip: {
          flex: 1,
          paddingVertical: theme.spacing.xs,
          marginHorizontal: 4,
          borderRadius: 999,
          borderWidth: 1,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          columnGap: 6,
        },
        filterChipText: {
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
        },

        // 🔶 Event card box – layout only
        eventCardContainer: {
          flexDirection: "row",
          marginBottom: theme.spacing.md,
        },
        eventLeftColumn: {
          alignItems: "center",
          marginRight: theme.spacing.md,
        },
        eventDateBubble: {
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 4,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
        },
        eventDateDay: {
          fontSize: 18,
          fontWeight: "700",
        },
        eventDateMonth: {
          fontSize: 10,
          letterSpacing: 1,
        },
        eventModeTag: {
          borderRadius: 999,
          paddingHorizontal: 8,
          paddingVertical: 3,
        },
        eventModeText: {
          fontSize: 10,
          fontWeight: "600",
        },
        eventMain: {
          flex: 1,
        },
        eventTitleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 4,
        },
        eventTitle: {
          flex: 1,
          marginRight: 8,
          fontSize: theme.typography.fontSizes.md,
          fontWeight: theme.typography.fontWeights.semibold,
        },
        statusTag: {
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 3,
        },
        statusText: {
          fontSize: 10,
          fontWeight: "700",
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          marginTop: 2,
        },
        metaLabel: {
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginRight: 4,
        },
        metaValue: {
          fontSize: 11,
          color: theme.colors.textPrimary,
        },
        createdByText: {
          fontSize: 10,
          color: theme.colors.textSecondary,
          marginTop: 6,
          fontStyle: "italic",
        },
        eventImageContainer: {
          marginTop: 6,
          marginBottom: 2,
        },
        eventImage: {
          width: 70,
          height: 70,
          borderRadius: 12,
          backgroundColor: theme.isDark ? "#020617" : "#E5E7EB",
        },
        noImageBox: {
          width: 70,
          height: 70,
          borderRadius: 12,
          backgroundColor: theme.isDark ? "#020617" : "#E5E7EB",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: theme.isDark ? "#1F2937" : "#E5E7EB",
        },

        // 🔵 Center floating + button (now attached to bottom bar)
        floatingAdd: {
          position: "absolute",
          top: -34,
          alignSelf: "center",
          zIndex: 10,
          elevation: 10,
        },
        floatingAddButton: {
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: MODULE_COLOR,
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 3,
          borderColor: MODULE_COLOR + "AA",
          shadowColor: MODULE_COLOR,
          shadowOpacity: 0.9,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 25,
          zIndex: 400,
        },

        // 🔻 Bottom nav “pill”
        bottomBar: {
          position: "absolute",
          left: theme.spacing.md,
          right: theme.spacing.md,
          bottom: Platform.OS === "ios" ? 16 : 12,
          flexDirection: "row",
          justifyContent: "space-around",
          alignItems: "center",
          paddingHorizontal: theme.spacing.lg,
          paddingVertical: 10,
          backgroundColor: theme.isDark
            ? "rgba(10,10,15,0.98)"
            : "rgba(15,23,42,0.95)",
          borderRadius: 26,
          borderWidth: 1,
          borderColor: theme.isDark ? "#1f2937" : "#111827",
          shadowColor: "#000",
          shadowOpacity: 0.5,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: -2 },
          zIndex: 1,
          elevation: 1,
        },
        bottomBarItem: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
        },
        bottomBarIconWrapper: {
          padding: 6,
          borderRadius: 999,
        },
        bottomBarLabel: {
          fontSize: 11,
          marginTop: 2,
        },
      }),
    [theme]
  );

  const closeRow = (rowMap: any, rowKey: any) => {
    if (rowMap[rowKey]) rowMap[rowKey].closeRow();
  };

  const deleteRow = (rowMap: any, rowKey: any, attachments: string[]) => {
    closeRow(rowMap, rowKey);

    try {
      deleteDoc(doc(db, "Events", rowKey))
        .then(() => {
          attachments?.map(async (fileURL) => {
            const fileRef = ref(storage, fileURL);
            deleteObject(fileRef).catch((error) => console.log(error));
          });
        })
        .catch((err) => alert(err.message));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCopyLocation = async (text: string) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Location copied to clipboard");
  };

  const formatDate = (ms: number) =>
    new Date(ms).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  /** 🔥 Advanced PDF layout - (unchanged except for truncation) */
  const handlePrintEvents = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayMs = today.getTime();

      const totalEvents = EventArray.length;
      const upcoming = EventArray.filter(
        (e: any) => typeof e.date === "number" && e.date >= todayMs
      ).sort((a: any, b: any) => (a.date || 0) - (b.date || 0));
      const past = EventArray.filter(
        (e: any) => typeof e.date === "number" && e.date < todayMs
      ).sort((a: any, b: any) => (a.date || 0) - (b.date || 0));

      const upcomingCount = upcoming.length;
      const pastCount = past.length;

      const formatFullDate = (ms?: number) => {
        if (!ms) return "—";
        return new Date(ms).toLocaleDateString("en-US", {
          weekday: "short",
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      };

      const nowLabel = new Date().toLocaleString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      const todayMsLocal = todayMs;

      const buildEventCards = (items: any[]) =>
        items
          .map((e) => {
            const isOnline = (e.mode || "").toLowerCase() === "online";
            const isPast = typeof e.date === "number" && e.date < todayMsLocal;

            const imageUrl = Array.isArray(e.attachments)
              ? e.attachments[0]
              : typeof e.attachments === "string" && e.attachments
              ? e.attachments
              : null;

            return `
          <div class="event-card ${isPast ? "event-past" : "event-upcoming"} ${
              isOnline ? "event-online" : "event-physical"
            }">
            <div class="event-header">
              <div class="event-title-block">
                <h3 class="event-title">
                  ${escapeHtml(e.title || "Untitled Event")}
                </h3>
                <div class="event-meta-line">
                  <span class="badge badge-date">
                    ${escapeHtml(formatFullDate(e.date))}
                  </span>
                  <span class="badge ${
                    isOnline ? "badge-online" : "badge-physical"
                  }">
                    ${isOnline ? "Online" : "Physical"}
                  </span>
                  <span class="badge ${
                    isPast ? "badge-status-past" : "badge-status-upcoming"
                  }">
                    ${isPast ? "PAST" : "UPCOMING"}
                  </span>
                </div>
              </div>
              ${
                imageUrl
                  ? `
              <div class="event-image-wrap">
                <img src="${escapeHtml(
                  imageUrl
                )}" class="event-image" alt="Event image" />
              </div>`
                  : ""
              }
            </div>

            <div class="event-body">
              <div class="field-row">
                <span class="field-label">${
                  isOnline ? "Online Link" : "Location"
                }:</span>
                <span class="field-value">
                  ${escapeHtml(e.location || "—")}
                </span>
              </div>

              <div class="field-row">
                <span class="field-label">Guest Email:</span>
                <span class="field-value">
                  ${
                    Array.isArray(e.guests)
                      ? escapeHtml(e.guests.join(", "))
                      : escapeHtml(e.guests || "—")
                  }
                </span>
              </div>

              ${
                e.description
                  ? `
              <div class="field-row">
                <span class="field-label">Details:</span>
                <span class="field-value">
                  ${escapeHtml(e.description)}
                </span>
              </div>`
                  : ""
              }

              <div class="created-by">
                Created by: ${escapeHtml(e.createdBy?.name || "Unknown")}
              </div>
            </div>
          </div>
        `;
          })
          .join("");

      const upcomingSection =
        upcoming.length > 0
          ? buildEventCards(upcoming)
          : `<p class="empty-text">No upcoming events.</p>`;

      const pastSection =
        past.length > 0
          ? buildEventCards(past)
          : `<p class="empty-text">No past events.</p>`;

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>My Event – Export</title>
  <style>
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
      background: #e5f0ff;
      color: #0f172a;
    }

    .page {
      max-width: 840px;
      margin: 0 auto;
      background: #f9fafb;
      border-radius: 20px;
      box-shadow: 0 18px 45px rgba(15, 23, 42, 0.32);
      padding: 24px 24px 32px 24px;
    }

    .header {
      text-align: center;
      margin-bottom: 24px;
      position: relative;
      padding-bottom: 16px;
    }

    .header-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 90px;
      height: 90px;
      border-radius: 50%;
      margin-bottom: 10px;
      background: radial-gradient(circle at 30% 30%, #e0f2fe, #38bdf8);
      box-shadow: 0 0 40px rgba(56, 189, 248, 0.85);
    }

    .header-pill span {
      font-size: 40px;
    }

    .title {
      font-size: 26px;
      font-weight: 700;
      margin: 0;
      color: #0f172a;
    }

    .subtitle {
      margin: 4px 0 4px;
      font-size: 13px;
      color: #6b7280;
    }

    .generated-at {
      font-size: 11px;
      color: #9ca3af;
    }

    .header-gradient {
      position: absolute;
      left: -24px;
      right: -24px;
      bottom: 0;
      height: 3px;
      border-radius: 999px;
      background: linear-gradient(90deg, #38bdf8, #22c55e, #f59e0b);
      box-shadow: 0 0 22px rgba(56, 189, 248, 0.8);
    }

    .summary-row {
      display: flex;
      gap: 12px;
      margin-bottom: 18px;
      flex-wrap: wrap;
    }

    .summary-card {
      flex: 1;
      min-width: 150px;
      background: #ffffff;
      border-radius: 16px;
      padding: 12px 14px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      position: relative;
      overflow: hidden;
    }

    .summary-card::after {
      content: "";
      position: absolute;
      left: -10%;
      right: -10%;
      bottom: 0;
      height: 3px;
      border-radius: 999px;
      opacity: 0.9;
    }

    .summary-card.total::after {
      background: linear-gradient(90deg, #a855f7, #38bdf8);
    }

    .summary-card.upcoming::after {
      background: linear-gradient(90deg, #22c55e, #a7f3d0);
    }

    .summary-card.past::after {
      background: linear-gradient(90deg, #f59e0b, #fed7aa);
    }

    .summary-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }

    .summary-caption {
      font-size: 11px;
      color: #9ca3af;
    }

    .section {
      margin-top: 18px;
    }

    .section-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .section-pill {
      width: 6px;
      height: 18px;
      border-radius: 999px;
      margin-right: 4px;
    }

    .section-pill.upcoming {
      background: linear-gradient(180deg, #22c55e, #16a34a);
      box-shadow: 0 0 10px rgba(34, 197, 94, 0.7);
    }

    .section-pill.past {
      background: linear-gradient(180deg, #f97316, #ea580c);
      box-shadow: 0 0 10px rgba(249, 115, 22, 0.7);
    }

    .section-count {
      font-size: 11px;
      color: #6b7280;
    }

    .event-card {
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid rgba(148, 163, 184, 0.35);
      padding: 12px 14px 10px;
      margin-bottom: 10px;
      box-shadow: 0 14px 28px rgba(15, 23, 42, 0.08);
    }

    .event-upcoming {
      border-color: rgba(34, 197, 94, 0.55);
    }

    .event-past {
      border-color: rgba(148, 163, 184, 0.65);
      opacity: 0.92;
    }

    .event-header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 8px;
    }

    .event-title-block {
      flex: 1;
      min-width: 0;
    }

    .event-title {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }

    .event-meta-line {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .badge {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 999px;
      border: 1px solid transparent;
      white-space: nowrap;
    }

    .badge-date {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: rgba(59, 130, 246, 0.35);
    }

    .badge-online {
      background: #e0f2fe;
      color: #0369a1;
      border-color: rgba(59, 130, 246, 0.4);
    }

    .badge-physical {
      background: #dcfce7;
      color: #166534;
      border-color: rgba(22, 163, 74, 0.4);
    }

    .badge-status-upcoming {
      background: #ecfdf3;
      color: #166534;
      border-color: rgba(34, 197, 94, 0.4);
    }

    .badge-status-past {
      background: #fef9c3;
      color: #854d0e;
      border-color: rgba(250, 204, 21, 0.4);
    }

    .event-image-wrap {
      flex-shrink: 0;
      width: 70px;
      height: 70px;
      border-radius: 12px;
      overflow: hidden;
      background: #e5e7eb;
    }

    .event-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .event-body {
      font-size: 11px;
      color: #111827;
    }

    .field-row {
      display: flex;
      align-items: flex-start;
      margin-bottom: 2px;
    }

    .field-label {
      font-weight: 600;
      margin-right: 4px;
      color: #6b7280;
      min-width: 70px;
    }

    .field-value {
      flex: 1;
      word-break: break-word;
    }

    .created-by {
      margin-top: 4px;
      font-size: 10px;
      color: #9ca3af;
      font-style: italic;
    }

    .empty-text {
      font-size: 11px;
      color: #9ca3af;
      font-style: italic;
      margin: 4px 0 10px;
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .page {
        box-shadow: none;
        border-radius: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="header-pill"><span>📅</span></div>
      <h1 class="title">My Event – Export</h1>
      <p class="subtitle">Keep track of important dates across your schedule.</p>
      <div class="generated-at">Generated on ${escapeHtml(nowLabel)}</div>
      <div class="header-gradient"></div>
    </div>

    <div class="summary-row">
      <div class="summary-card total">
        <div class="summary-label">Total Events</div>
        <div class="summary-value">${totalEvents}</div>
        <div class="summary-caption">All events in this export.</div>
      </div>
      <div class="summary-card upcoming">
        <div class="summary-label">Upcoming</div>
        <div class="summary-value">${upcomingCount}</div>
        <div class="summary-caption">Events from today onwards.</div>
      </div>
      <div class="summary-card past">
        <div class="summary-label">Past</div>
        <div class="summary-value">${pastCount}</div>
        <div class="summary-caption">Events that have already passed.</div>
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-pill upcoming"></span>
          Upcoming Events
        </div>
        <div class="section-count">${upcomingCount} item(s)</div>
      </div>
      ${upcomingSection}
    </div>

    <div class="section">
      <div class="section-header">
        <div class="section-title">
          <span class="section-pill past"></span>
          Past Events
        </div>
        <div class="section-count">${pastCount} item(s)</div>
      </div>
      ${pastSection}
    </div>
  </div>
</body>
</html>
    `;

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        if (shareAsync) {
          await shareAsync(uri, {
            UTI: ".pdf",
            mimeType: "application/pdf",
          });
        } else {
          Alert.alert("Error", "Sharing is not available on this platform.");
        }
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message ?? "Failed to generate PDF.");
    }
  };

  const totalEvents = EventArray.length;
  const upcomingEvents = EventArray.filter(
    (e: any) => typeof e.date === "number" && e.date >= todayMs
  ).length;
  const pastEvents = EventArray.filter(
    (e: any) => typeof e.date === "number" && e.date < todayMs
  ).length;

  const filteredEvents = React.useMemo(() => {
    if (filter === "upcoming") {
      return EventArray.filter(
        (e: any) => typeof e.date === "number" && e.date >= todayMs
      );
    }
    if (filter === "past") {
      return EventArray.filter(
        (e: any) => typeof e.date === "number" && e.date < todayMs
      );
    }
    return EventArray;
  }, [EventArray, filter, todayMs]);

  const renderItem = (data: any) => {
    const item = data.item;

    const isOnline = (item.mode || "").toLowerCase() === "online";
    const locationLabel = isOnline ? "Online Link" : "Location";
    const locationValue = item.location || "—";
    const guestLabel = Array.isArray(item.guests)
      ? item.guests.join(", ")
      : item.guests || "—";

    const past = isEventPast(item.date);
    const neonColor = past
      ? "rgba(148,163,184,0.45)" // grey neon for past events
      : MODULE_COLOR;
    const dateObj = item.date ? new Date(item.date) : null;
    const day = dateObj?.getDate().toString().padStart(2, "0") ?? "--";
    const month =
      dateObj?.toLocaleDateString("en-US", { month: "short" }).toUpperCase() ??
      "---";

    const accentForEvent = past ? "#4B5563" : MODULE_COLOR;

    const dateBubbleBg = theme.isDark ? "#020617" : "#DBEAFE";
    const dateBubbleDayColor = theme.isDark ? "#E0F2FE" : "#1D4ED8";

    const modeBg = isOnline
      ? theme.isDark
        ? "rgba(59,130,246,0.25)"
        : "rgba(59,130,246,0.15)"
      : theme.isDark
      ? "rgba(34,197,94,0.25)"
      : "rgba(34,197,94,0.15)";
    const modeColor = isOnline ? "#60A5FA" : "#4ADE80";

    const statusBg = past ? "rgba(250,204,21,0.18)" : "rgba(34,197,94,0.18)";
    const statusColor = past ? "#FACC15" : "#22C55E";
    const statusText = past ? "PAST" : "UPCOMING";

    let imageUrl: string | null = null;
    if (Array.isArray(item.attachments) && item.attachments.length > 0) {
      imageUrl = item.attachments[0];
    } else if (typeof item.attachments === "string" && item.attachments) {
      imageUrl = item.attachments;
    }

    return (
      <TouchableHighlight
        style={{ marginVertical: 4 }}
        underlayColor={
          theme.isDark ? "rgba(56,189,248,0.08)" : "rgba(191,219,254,0.25)"
        }
      >
        <Card
          style={[
            styles.eventCardContainer,
            createNeonCardShell(accentForEvent, theme, {
              padding: theme.spacing.sm,
              // 🔁 here is the actual card background for each event
            }),
            { backgroundColor: theme.colors.cardBackground },
          ]}
        >
          {/* LEFT: date + mode */}
          <View style={styles.eventLeftColumn}>
            <View
              style={[
                styles.eventDateBubble,
                { backgroundColor: dateBubbleBg },
              ]}
            >
              <Text
                style={[styles.eventDateDay, { color: dateBubbleDayColor }]}
              >
                {day}
              </Text>
              <Text
                style={[
                  styles.eventDateMonth,
                  { color: theme.isDark ? "#E5E7EB" : "#6B7280" },
                ]}
              >
                {month}
              </Text>
            </View>

            <View style={[styles.eventModeTag, { backgroundColor: modeBg }]}>
              <Text style={[styles.eventModeText, { color: modeColor }]}>
                {isOnline ? "Online" : "Physical"}
              </Text>
            </View>
          </View>

          {/* RIGHT: content */}
          <View style={styles.eventMain}>
            <View style={styles.eventTitleRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.eventTitle,
                  {
                    color: theme.colors.textPrimary,
                    textDecorationLine: past ? "line-through" : "none",
                  },
                ]}
              >
                {item.title || "Untitled Event"}
              </Text>

              <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>
                {item.date ? formatDate(item.date) : "—"}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{locationLabel}:</Text>
              <Text style={[styles.metaValue, { flexShrink: 1 }]}>
                {locationValue}
              </Text>
              {locationValue !== "—" && (
                <TouchableOpacity
                  onPress={() => handleCopyLocation(locationValue)}
                >
                  <Ionicons
                    name="copy-outline"
                    size={13}
                    color={MODULE_COLOR}
                    style={{ marginLeft: 6 }}
                  />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.eventImageContainer}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.eventImage} />
              ) : (
                <View style={styles.noImageBox}>
                  <Ionicons
                    name="image-outline"
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </View>
              )}
            </View>

            {item.description ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Details:</Text>
                <Text
                  style={[styles.metaValue, { flexShrink: 1 }]}
                  numberOfLines={2}
                >
                  {item.description}
                </Text>
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Guest Email:</Text>
              <Text
                style={[styles.metaValue, { flexShrink: 1 }]}
                numberOfLines={1}
              >
                {guestLabel}
              </Text>
            </View>

            <Text style={styles.createdByText}>
              Created By: {item.createdBy?.name || "Unknown"}
            </Text>
          </View>
          <View
            style={[
              styles.neonBottomLine,
              {
                backgroundColor: accentForEvent,
                shadowColor: accentForEvent,
                shadowOpacity: 1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
          <View
            style={[
              styles.neonBottomLine,
              {
                backgroundColor: neonColor,
                shadowColor: neonColor,
                shadowOpacity: 1,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          />
        </Card>
      </TouchableHighlight>
    );
  };

  const renderHiddenItem = (data: any, rowMap: any) => {
    const isOwner =
      auth.currentUser && data.item.createdBy?.id === auth.currentUser.uid;

    return (
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          marginVertical: 4,
          paddingLeft: 100,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            borderRadius: 24,
            overflow: "hidden",
            backgroundColor: "#020617",
          }}
        >
          <TouchableOpacity
            style={{
              backgroundColor: "#6B7280",
              justifyContent: "center",
              alignItems: "center",
              width: 75,
              height: 150,
            }}
            onPress={() => closeRow(rowMap, data.item.key)}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Close</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#22C55E",
              justifyContent: "center",
              alignItems: "center",
              width: 75,
              height: 150,
              opacity: isOwner ? 1 : 0.5,
            }}
            onPress={() => {
              if (!isOwner) {
                Alert.alert(
                  "Permission denied",
                  "You can only edit events that you created."
                );
                closeRow(rowMap, data.item.key);
                return;
              }
              router.push({
                pathname: "/modules/task-management/EventEdit",
                params: { id: data.item.key },
              });
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: "#EF4444",
              justifyContent: "center",
              alignItems: "center",
              width: 75,
              height: 150,
              opacity: isOwner ? 1 : 0.5,
            }}
            onPress={() => {
              if (!isOwner) {
                Alert.alert(
                  "Permission denied",
                  "You can only delete events that you created."
                );
                closeRow(rowMap, data.item.key);
                return;
              }
              deleteRow(rowMap, data.item.key, data.item.attachments);
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ---------- RENDER ----------
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>My Event</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon={theme.isDark ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        {/* MAIN CONTENT */}
        {loading ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color={MODULE_COLOR} />
          </View>
        ) : (
          <SwipeListView
            key={theme.isDark ? "dark" : "light"}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={filteredEvents}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-225}
            previewRowKey={"0"}
            previewOpenValue={-40}
            previewOpenDelay={3000}
            extraData={theme}
            ListHeaderComponent={
              <>
                {/* Icon + title */}
                <View style={styles.iconSection}>
                  <View style={styles.iconContainer}>
                    <Ionicons
                      name="calendar-outline"
                      size={64}
                      color={MODULE_COLOR}
                    />
                  </View>
                  <Text style={styles.moduleTitle}>Events</Text>
                  <Text style={styles.moduleSubtitle}>
                    Keep track of important dates
                  </Text>
                </View>

                {/* Date ribbon + Export button */}
                <View style={styles.section}>
                  <Card
                    style={[
                      styles.neonShellCard,
                      { backgroundColor: theme.colors.cardBackground },
                    ]}
                  >
                    <View style={styles.calendarRibbon}>
                      <View style={styles.calendarLeft}>
                        <Text style={styles.calendarEmoji}>📅</Text>
                        <Text style={styles.calendarText}>
                          {new Date().toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={handlePrintEvents}
                        style={styles.smallLinkButton}
                      >
                        <Text style={styles.smallLinkButtonText}>
                          Print Events
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View
                      style={[
                        styles.neonBottomLine,
                        {
                          backgroundColor: MODULE_COLOR,
                          shadowColor: MODULE_COLOR,
                          shadowOpacity: 0.9,
                          shadowRadius: 12,
                          shadowOffset: { width: 0, height: 0 },
                        },
                      ]}
                    />
                  </Card>
                </View>

                {/* Summary cards + filter chips */}
                <View style={[styles.section, { marginTop: -8 }]}>
                  <View style={styles.summaryRow}>
                    <Card
                      style={[
                        styles.summaryCard,
                        summaryCardStyle(theme, "total"),
                        { backgroundColor: theme.colors.cardBackground },
                      ]}
                    >
                      <Text style={styles.summaryLabel}>Total Events</Text>
                      <Text style={[styles.summaryValue]}>{totalEvents}</Text>

                      <View
                        style={[
                          styles.neonBottomLine,
                          {
                            backgroundColor: "#A855F7",
                            shadowColor: "#A855F7",
                            shadowOpacity: 0.9,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 0 },
                          },
                        ]}
                      />
                    </Card>
                    <Card
                      style={[
                        styles.summaryCard,
                        summaryCardStyle(theme, "upcoming"),
                        { backgroundColor: theme.colors.cardBackground },
                      ]}
                    >
                      <Text style={styles.summaryLabel}>Upcoming</Text>
                      <Text style={styles.summaryValue}>{upcomingEvents}</Text>
                      <View
                        style={[
                          styles.neonBottomLine,
                          {
                            backgroundColor: "#22C55E",
                            shadowColor: "#22C55E",
                            shadowOpacity: 0.9,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 0 },
                          },
                        ]}
                      />
                    </Card>

                    <Card
                      style={[
                        styles.summaryCard,
                        summaryCardStyle(theme, "past"),
                        { backgroundColor: theme.colors.cardBackground },
                      ]}
                    >
                      <Text style={styles.summaryLabel}>Past</Text>
                      <Text style={styles.summaryValue}>{pastEvents}</Text>
                      <View
                        style={[
                          styles.neonBottomLine,
                          {
                            backgroundColor: "#F59E0B",
                            shadowColor: "#F59E0B",
                            shadowOpacity: 0.9,
                            shadowRadius: 12,
                            shadowOffset: { width: 0, height: 0 },
                          },
                        ]}
                      />
                    </Card>
                  </View>

                  <View style={styles.filterRow}>
                    {(["all", "upcoming", "past"] as FilterType[]).map(
                      (key) => {
                        const selected = filter === key;
                        const label =
                          key === "all"
                            ? "All"
                            : key === "upcoming"
                            ? "Upcoming"
                            : "Past";

                        let accentColor = MODULE_COLOR;
                        let bgSelected = theme.isDark
                          ? "rgba(56,189,248,0.20)"
                          : "rgba(191,219,254,0.6)";
                        let iconName: any = "layers-outline";

                        if (key === "upcoming") {
                          accentColor = "#22C55E";
                          bgSelected = theme.isDark
                            ? "rgba(34,197,94,0.22)"
                            : "rgba(187,247,208,0.9)";
                          iconName = "trending-up-outline";
                        } else if (key === "past") {
                          accentColor = "#F59E0B";
                          bgSelected = theme.isDark
                            ? "rgba(249,115,22,0.22)"
                            : "rgba(254,215,170,0.9)";
                          iconName = "time-outline";
                        }

                        return (
                          <TouchableOpacity
                            key={key}
                            onPress={() => setFilter(key)}
                            style={[
                              styles.filterChip,
                              {
                                borderColor: selected
                                  ? accentColor
                                  : theme.colors.cardBorder,
                                backgroundColor: selected
                                  ? bgSelected
                                  : "transparent",
                              },
                            ]}
                          >
                            <Ionicons
                              name={iconName}
                              size={14}
                              color={
                                selected
                                  ? accentColor
                                  : theme.colors.textSecondary
                              }
                              style={{ marginRight: 6 }}
                            />
                            <Text
                              style={[
                                styles.filterChipText,
                                {
                                  color: selected
                                    ? accentColor
                                    : theme.colors.textSecondary,
                                },
                              ]}
                            >
                              {label}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>
              </>
            }
          />
        )}

        {/* ADD MENU */}
        <Modal
          visible={showAddMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddMenu(false)}
        >
          <TouchableOpacity
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.4)",
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={1}
            onPressOut={() => setShowAddMenu(false)}
          >
            <Card
              style={[
                styles.neonShellCard,
                {
                  width: "70%",
                },
              ]}
            >
              <View
                style={[
                  styles.neonBottomLine,
                  {
                    backgroundColor: MODULE_COLOR,
                    shadowColor: MODULE_COLOR,
                    shadowOpacity: 0.9,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 0 },
                  },
                ]}
              />
              <Text
                style={{
                  fontSize: theme.typography.fontSizes.md,
                  fontWeight: theme.typography.fontWeights.bold,
                  marginBottom: theme.spacing.sm,
                  color: theme.colors.textPrimary,
                }}
              >
                Add...
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/TaskAdd");
                }}
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: MODULE_COLOR,
                    marginBottom: theme.spacing.sm,
                  },
                ]}
              >
                <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                  Add Task
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setShowAddMenu(false);
                  router.push("/modules/task-management/EventAdd");
                }}
                style={[styles.chipButton, { backgroundColor: "#0256ffff" }]}
              >
                <Text
                  style={[
                    styles.chipButtonText,
                    { color: theme.colors.textPrimary },
                  ]}
                >
                  Add Event
                </Text>
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        </Modal>

        {/* 🔻 BOTTOM TASKBAR NAVIGATION */}
        <View style={styles.bottomBar}>
          {/* Center FAB attached to bar */}
          <View style={styles.floatingAdd}>
            <View
              style={{
                width: 65,
                height: 65,
                borderRadius: 32,
                borderColor: MODULE_COLOR,
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: "#000",
                shadowColor: MODULE_COLOR,
                shadowOpacity: 1,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 0 },
              }}
            >
              <TouchableOpacity
                style={styles.floatingAddButton}
                onPress={() => setShowAddMenu(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={34} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* My Task */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="checkmark-done-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Task
            </Text>
          </TouchableOpacity>

          {/* My Event (current) */}
          <TouchableOpacity style={styles.bottomBarItem} disabled>
            <View
              style={[
                styles.bottomBarIconWrapper,
                { backgroundColor: `${MODULE_COLOR}22` },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={MODULE_COLOR}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: MODULE_COLOR, fontWeight: "600" },
              ]}
            >
              Event
            </Text>
          </TouchableOpacity>

          {/* Productivity */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/Gamification")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="game-controller-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Productivity
            </Text>
          </TouchableOpacity>

          {/* Chart */}
          <TouchableOpacity
            style={styles.bottomBarItem}
            onPress={() => router.push("/modules/task-management/TaskChart")}
          >
            <View style={styles.bottomBarIconWrapper}>
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={theme.colors.textSecondary}
              />
            </View>
            <Text
              style={[
                styles.bottomBarLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              Chart
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  MODULE_COLOR,
  createNeonCardShell,
  NeonBottomLine,
} from "./utils/sharedUI";
import TaskBottomBar from "./components/TaskBottomBar";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { shareAsync } from "expo-sharing";
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  deleteDoc,
  query,
} from "firebase/firestore";
import { SwipeListView } from "react-native-swipe-list-view";
import { getStorage, deleteObject } from "firebase/storage";
import { getAuth } from "firebase/auth";
import * as Clipboard from "expo-clipboard";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

import {
  getTodayMs,
  formatDateGB,
  isEventPast,
  canUserSeeItem,
  escapeHtml,
  normalizeAttachments,
  normalizeGuests,
  resolveStorageRef,
} from "./utils/eventUtils";

type FilterType = "all" | "upcoming" | "past";

type EventItem = {
  key: string;
  title?: string;
  description?: string;
  date?: number;
  mode?: string;
  location?: string;
  guests?: string[] | string;
  attachments?: string[] | string;
  createdAt?: number;
  createdBy?: { id?: string; name?: string };
  assignedToId?: string;
  assignedUserIds?: string[];
};

const summaryCardStyle = (theme: any, type: "total" | "upcoming" | "past") => {
  const colors = {
    total: "#A855F7",
    upcoming: "#22C55E",
    past: "#F59E0B",
  } as const;

  const accent = colors[type];
  return createNeonCardShell(accent, theme, {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.isDark ? "#020617" : "#F9FAFB",
  });
};

export default function EventListScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const [loading, setLoading] = useState(true);
  const [EventArray, setEventArray] = useState<EventItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showAddMenu, setShowAddMenu] = useState(false);

  const todayMs = useMemo(() => getTodayMs(), []);
  const isDark = theme.isDark;

  useEffect(() => {
    const q = query(collection(db, "Events"));

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const eventData: EventItem[] = [];

        querySnapshot.forEach((docSnap) => {
          eventData.push({ ...(docSnap.data() as any), key: docSnap.id });
        });

        eventData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        const user = auth.currentUser;
        const visibleEvents = user
          ? eventData.filter((evt) => canUserSeeItem(evt, user))
          : [];

        setEventArray(visibleEvents);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        Alert.alert("Error", "Failed to load events.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  const totalEvents = EventArray.length;

  const upcomingEvents = useMemo(
    () =>
      EventArray.filter((e) => typeof e.date === "number" && e.date >= todayMs)
        .length,
    [EventArray, todayMs]
  );

  const pastEvents = useMemo(
    () =>
      EventArray.filter((e) => typeof e.date === "number" && e.date < todayMs)
        .length,
    [EventArray, todayMs]
  );

  const filteredEvents = useMemo(() => {
    if (filter === "upcoming") {
      return EventArray.filter(
        (e) => typeof e.date === "number" && e.date >= todayMs
      );
    }
    if (filter === "past") {
      return EventArray.filter(
        (e) => typeof e.date === "number" && e.date < todayMs
      );
    }
    return EventArray;
  }, [EventArray, filter, todayMs]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },
        list: { flex: 1 },
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
          shadowOpacity: isDark ? 0.7 : 0.3,
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
        section: { marginBottom: theme.spacing.lg },

        neonShellCard: createNeonCardShell(MODULE_COLOR, theme, {
          padding: theme.spacing.md,
          backgroundColor: isDark ? "#020617" : "#F9FAFB",
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

        summaryRow: { flexDirection: "row", columnGap: theme.spacing.sm },
        summaryCard: { flex: 1 },
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

        eventCardContainer: {
          flexDirection: "row",
          marginBottom: theme.spacing.md,
        },
        eventLeftColumn: {
          alignItems: "center",
          marginRight: 14,
        },
        eventDateBubble: {
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          minWidth: 64,
        },
        eventDateDay: {
          fontSize: 22,
          fontWeight: "700",
          letterSpacing: -0.5,
        },
        eventDateMonth: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.8,
          marginTop: 2,
        },
        eventModeTag: {
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        eventModeText: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.3,
        },
        eventMain: {
          flex: 1,
        },
        eventTitleRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        },
        eventTitle: {
          flex: 1,
          marginRight: 8,
          fontSize: 16,
          fontWeight: "700",
          letterSpacing: 0.2,
        },
        statusTag: {
          borderRadius: 12,
          paddingHorizontal: 10,
          paddingVertical: 5,
        },
        statusText: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.5,
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "flex-start",
          marginBottom: 6,
        },
        metaLabel: {
          fontSize: 12,
          fontWeight: "600",
          color: theme.colors.textSecondary,
          minWidth: 90,
          marginRight: 8,
        },
        metaValue: {
          fontSize: 12,
          fontWeight: "400",
          color: theme.colors.textPrimary,
          flex: 1,
          lineHeight: 18,
        },
        infoRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 8,
        },
        infoIcon: {
          marginRight: 8,
        },
        descriptionText: {
          fontSize: 13,
          fontWeight: "400",
          color: theme.colors.textPrimary,
          lineHeight: 20,
          marginTop: 4,
        },
        createdByText: {
          fontSize: 11,
          color: theme.colors.textSecondary,
          marginTop: 12,
          fontStyle: "italic",
        },
        eventImageContainer: {
          marginTop: 10,
          marginBottom: 10,
        },
        eventImage: {
          width: 80,
          height: 80,
          borderRadius: 12,
          backgroundColor: isDark ? "#020617" : "#E5E7EB",
        },
        noImageBox: {
          width: 80,
          height: 80,
          borderRadius: 12,
          backgroundColor: isDark ? "#020617" : "#E5E7EB",
          justifyContent: "center",
          alignItems: "center",
          borderWidth: 1,
          borderColor: isDark ? "#1F2937" : "#E5E7EB",
        },
        guestPill: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
          borderWidth: 1,
          alignSelf: "flex-start",
        },
        guestPillText: {
          fontSize: 11,
          fontWeight: "600",
        },
      }),
    [theme, isDark]
  );

  const closeRow = useCallback((rowMap: any, rowKey: string) => {
    if (rowMap?.[rowKey]) rowMap[rowKey].closeRow();
  }, []);

  const deleteRow = useCallback(
    async (rowMap: any, rowKey: string, attachmentsRaw: any) => {
      closeRow(rowMap, rowKey);

      try {
        await deleteDoc(doc(db, "Events", rowKey));

        const attachments = normalizeAttachments(attachmentsRaw);
        await Promise.all(
          attachments.map(async (fileURL) => {
            try {
              const fileRef = resolveStorageRef(storage, fileURL);
              if (fileRef) await deleteObject(fileRef);
            } catch (err) {
              console.log(err);
            }
          })
        );
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Delete failed");
      }
    },
    [closeRow, db, storage]
  );

  const handleCopyLocation = useCallback(async (text: string) => {
    if (!text || text === "—") return;
    await Clipboard.setStringAsync(text);
    Alert.alert("Copied", "Location copied to clipboard");
  }, []);

  const handlePrintEvents = useCallback(async () => {
    try {
      const todayMsLocal = getTodayMs();

      const totalEventsLocal = EventArray.length;
      const upcoming = EventArray.filter(
        (e) => typeof e.date === "number" && e.date >= todayMsLocal
      ).sort((a, b) => (a.date || 0) - (b.date || 0));

      const past = EventArray.filter(
        (e) => typeof e.date === "number" && e.date < todayMsLocal
      ).sort((a, b) => (a.date || 0) - (b.date || 0));

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

      const buildEventCards = (items: any[]) =>
        items
          .map((e) => {
            const isOnline = (e.mode || "").toLowerCase() === "online";
            const isPastLocal =
              typeof e.date === "number" && e.date < todayMsLocal;

            const imageUrl = Array.isArray(e.attachments)
              ? e.attachments[0]
              : typeof e.attachments === "string" && e.attachments
              ? e.attachments
              : null;

            return `
          <div class="event-card ${
            isPastLocal ? "event-past" : "event-upcoming"
          } ${isOnline ? "event-online" : "event-physical"}">
            <div class="event-header">
              <div class="event-title-block">
                <h3 class="event-title">${escapeHtml(
                  e.title || "Untitled Event"
                )}</h3>
                <div class="event-meta-line">
                  <span class="badge badge-date">${escapeHtml(
                    formatFullDate(e.date)
                  )}</span>
                  <span class="badge ${
                    isOnline ? "badge-online" : "badge-physical"
                  }">
                    ${isOnline ? "Online" : "Physical"}
                  </span>
                  <span class="badge ${
                    isPastLocal ? "badge-status-past" : "badge-status-upcoming"
                  }">
                    ${isPastLocal ? "PAST" : "UPCOMING"}
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
                <span class="field-value">${escapeHtml(
                  e.location || "—"
                )}</span>
              </div>

              <div class="field-row">
                <span class="field-label">Guest Email:</span>
                <span class="field-value">${
                  Array.isArray(e.guests)
                    ? escapeHtml(e.guests.join(", "))
                    : escapeHtml(e.guests || "—")
                }</span>
              </div>

              ${
                e.description
                  ? `
              <div class="field-row">
                <span class="field-label">Details:</span>
                <span class="field-value">${escapeHtml(e.description)}</span>
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

      const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<title>My Event – Export</title>
<style>
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;padding:16px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;background:#e5f0ff;color:#0f172a}
.page{max-width:840px;margin:0 auto;background:#f9fafb;border-radius:20px;box-shadow:0 18px 45px rgba(15,23,42,.32);padding:24px 24px 32px}
.header{text-align:center;margin-bottom:24px;position:relative;padding-bottom:16px}
.header-pill{display:inline-flex;align-items:center;justify-content:center;width:90px;height:90px;border-radius:50%;margin-bottom:10px;background:radial-gradient(circle at 30% 30%,#e0f2fe,#38bdf8);box-shadow:0 0 40px rgba(56,189,248,.85)}
.header-pill span{font-size:40px}
.title{font-size:26px;font-weight:700;margin:0;color:#0f172a}
.subtitle{margin:4px 0;font-size:13px;color:#6b7280}
.generated-at{font-size:11px;color:#9ca3af}
.header-gradient{position:absolute;left:-24px;right:-24px;bottom:0;height:3px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#22c55e,#f59e0b);box-shadow:0 0 22px rgba(56,189,248,.8)}
.summary-row{display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap}
.summary-card{flex:1;min-width:150px;background:#fff;border-radius:16px;padding:12px 14px;border:1px solid rgba(148,163,184,.35);position:relative;overflow:hidden}
.summary-card::after{content:"";position:absolute;left:-10%;right:-10%;bottom:0;height:3px;border-radius:999px;opacity:.9}
.summary-card.total::after{background:linear-gradient(90deg,#a855f7,#38bdf8)}
.summary-card.upcoming::after{background:linear-gradient(90deg,#22c55e,#a7f3d0)}
.summary-card.past::after{background:linear-gradient(90deg,#f59e0b,#fed7aa)}
.summary-label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;margin-bottom:4px}
.summary-value{font-size:22px;font-weight:700;color:#0f172a;margin-bottom:2px}
.summary-caption{font-size:11px;color:#9ca3af}
.section{margin-top:18px}
.section-header{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:8px}
.section-title{font-size:16px;font-weight:600;color:#0f172a;display:flex;align-items:center;gap:6px}
.section-pill{width:6px;height:18px;border-radius:999px;margin-right:4px}
.section-pill.upcoming{background:linear-gradient(180deg,#22c55e,#16a34a);box-shadow:0 0 10px rgba(34,197,94,.7)}
.section-pill.past{background:linear-gradient(180deg,#f97316,#ea580c);box-shadow:0 0 10px rgba(249,115,22,.7)}
.section-count{font-size:11px;color:#6b7280}
.event-card{background:#fff;border-radius:16px;border:1px solid rgba(148,163,184,.35);padding:12px 14px 10px;margin-bottom:10px;box-shadow:0 14px 28px rgba(15,23,42,.08)}
.event-upcoming{border-color:rgba(34,197,94,.55)}
.event-past{border-color:rgba(148,163,184,.65);opacity:.92}
.event-header{display:flex;justify-content:space-between;gap:10px;margin-bottom:8px}
.event-title-block{flex:1;min-width:0}
.event-title{margin:0 0 4px;font-size:14px;font-weight:600;color:#0f172a}
.event-meta-line{display:flex;flex-wrap:wrap;gap:4px}
.badge{font-size:10px;padding:2px 6px;border-radius:999px;border:1px solid transparent;white-space:nowrap}
.badge-date{background:#eff6ff;color:#1d4ed8;border-color:rgba(59,130,246,.35)}
.badge-online{background:#e0f2fe;color:#0369a1;border-color:rgba(59,130,246,.4)}
.badge-physical{background:#dcfce7;color:#166534;border-color:rgba(22,163,74,.4)}
.badge-status-upcoming{background:#ecfdf3;color:#166534;border-color:rgba(34,197,94,.4)}
.badge-status-past{background:#fef9c3;color:#854d0e;border-color:rgba(250,204,21,.4)}
.event-image-wrap{flex-shrink:0;width:70px;height:70px;border-radius:12px;overflow:hidden;background:#e5e7eb}
.event-image{width:100%;height:100%;object-fit:cover;display:block}
.event-body{font-size:11px;color:#111827}
.field-row{display:flex;align-items:flex-start;margin-bottom:2px}
.field-label{font-weight:600;margin-right:4px;color:#6b7280;min-width:70px}
.field-value{flex:1;word-break:break-word}
.created-by{margin-top:4px;font-size:10px;color:#9ca3af;font-style:italic}
.empty-text{font-size:11px;color:#9ca3af;font-style:italic;margin:4px 0 10px}
@media print{body{padding:0;background:#fff}.page{box-shadow:none;border-radius:0;max-width:100%}}
</style></head><body>
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
      <div class="summary-value">${totalEventsLocal}</div>
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
      <div class="section-title"><span class="section-pill upcoming"></span>Upcoming Events</div>
      <div class="section-count">${upcomingCount} item(s)</div>
    </div>
    ${upcomingSection}
  </div>

  <div class="section">
    <div class="section-header">
      <div class="section-title"><span class="section-pill past"></span>Past Events</div>
      <div class="section-count">${pastCount} item(s)</div>
    </div>
    ${pastSection}
  </div>
</div>
</body></html>`;

      if (Platform.OS === "web") {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
      }
    } catch (error: any) {
      console.error(error);
      Alert.alert("Error", error.message ?? "Failed to generate PDF.");
    }
  }, [EventArray]);

  const renderItem = useCallback(
    (data: any) => {
      const item: EventItem = data.item;

      const isOnline = (item.mode || "").toLowerCase() === "online";
      const locationLabel = isOnline ? "Online Link" : "Location";
      const locationValue = item.location || "—";

      // Calculate guest count
      const guestCount = Array.isArray(item.guests)
        ? item.guests.length
        : typeof item.guests === "string" && item.guests.trim()
        ? item.guests.split(",").filter((g: string) => g.trim()).length
        : 0;

      const past = isEventPast(item.date);
      const neonColor = past ? "rgba(148,163,184,0.45)" : MODULE_COLOR;

      const dateObj = item.date ? new Date(item.date) : null;
      const day = dateObj?.getDate().toString().padStart(2, "0") ?? "--";
      const month =
        dateObj
          ?.toLocaleDateString("en-US", { month: "short" })
          .toUpperCase() ?? "---";

      const accentForEvent = past ? "#4B5563" : MODULE_COLOR;

      const dateBubbleBg = isDark ? "#020617" : "#DBEAFE";
      const dateBubbleDayColor = isDark ? "#E0F2FE" : "#1D4ED8";

      const modeBg = isOnline
        ? isDark
          ? "rgba(59,130,246,0.25)"
          : "rgba(59,130,246,0.15)"
        : isDark
        ? "rgba(34,197,94,0.25)"
        : "rgba(34,197,94,0.15)";
      const modeColor = isOnline ? "#60A5FA" : "#4ADE80";

      const statusBg = past ? "rgba(250,204,21,0.18)" : "rgba(34,197,94,0.18)";
      const statusColor = past ? "#FACC15" : "#22C55E";
      const statusText = past ? "PAST" : "UPCOMING";

      const firstImage = normalizeAttachments(item.attachments)[0] ?? null;

      return (
        <TouchableHighlight
          style={{ marginVertical: 4 }}
          underlayColor={
            isDark ? "rgba(56,189,248,0.08)" : "rgba(191,219,254,0.25)"
          }
        >
          <Card
            style={[
              styles.eventCardContainer,
              createNeonCardShell(accentForEvent, theme, {
                padding: theme.spacing.sm,
              }),
              { backgroundColor: theme.colors.cardBackground },
            ]}
          >
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
                    { color: isDark ? "#E5E7EB" : "#6B7280" },
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

            <View style={styles.eventMain}>
              <View style={styles.eventTitleRow}>
                <Text
                  numberOfLines={2}
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

              {/* Date with icon */}
              <View style={styles.infoRow}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={MODULE_COLOR}
                  style={styles.infoIcon}
                />
                <Text style={styles.metaValue}>
                  {item.date ? formatDateGB(item.date) : "—"}
                </Text>
              </View>

              {/* Location with icon */}
              {locationValue !== "—" && (
                <View style={styles.infoRow}>
                  <Ionicons
                    name={isOnline ? "link-outline" : "location-outline"}
                    size={16}
                    color={MODULE_COLOR}
                    style={styles.infoIcon}
                  />
                  <Text
                    style={[styles.metaValue, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {locationValue}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleCopyLocation(locationValue)}
                    style={{ marginLeft: 6, padding: 4 }}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color={MODULE_COLOR}
                    />
                  </TouchableOpacity>
                </View>
              )}

              {/* Description */}
              {!!item.description && (
                <Text style={styles.descriptionText} numberOfLines={3}>
                  {item.description}
                </Text>
              )}

              {/* Image */}
              {firstImage && (
                <View style={styles.eventImageContainer}>
                  <Image
                    source={{ uri: firstImage }}
                    style={styles.eventImage}
                    resizeMode="cover"
                  />
                </View>
              )}

              {/* Guest pill */}
              {guestCount > 0 && (
                <View
                  style={[
                    styles.guestPill,
                    {
                      borderColor: `${MODULE_COLOR}55`,
                      backgroundColor: `${MODULE_COLOR}14`,
                      marginTop: 8,
                      alignSelf: "flex-start",
                    },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={12}
                    color={MODULE_COLOR}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.guestPillText, { color: MODULE_COLOR }]}>
                    {guestCount} guest{guestCount !== 1 ? "s" : ""}
                  </Text>
                </View>
              )}

              <Text style={styles.createdByText}>
                Created By: {item.createdBy?.name || "Unknown"}
              </Text>
            </View>

            <NeonBottomLine
              color={accentForEvent}
              style={styles.neonBottomLine}
            />
            <NeonBottomLine color={neonColor} style={styles.neonBottomLine} />
          </Card>
        </TouchableHighlight>
      );
    },
    [handleCopyLocation, isDark, styles, theme]
  );

  const renderHiddenItem = useCallback(
    (data: any, rowMap: any) => {
      const item: EventItem = data.item;
      const isOwner =
        auth.currentUser && item.createdBy?.id === auth.currentUser.uid;

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
              onPress={() => closeRow(rowMap, item.key)}
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
                  closeRow(rowMap, item.key);
                  return;
                }
                router.push({
                  pathname: "/modules/task-management/EventEdit",
                  params: { id: item.key },
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
                  closeRow(rowMap, item.key);
                  return;
                }
                deleteRow(rowMap, item.key, item.attachments);
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    },
    [auth.currentUser, closeRow, deleteRow, router]
  );

  const ListHeaderComponent = useMemo(() => {
    return (
      <>
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            <Ionicons name="calendar-outline" size={64} color={MODULE_COLOR} />
          </View>
          <Text style={styles.moduleTitle}>Events</Text>
          <Text style={styles.moduleSubtitle}>
            Keep track of important dates
          </Text>
        </View>

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
                <Text style={styles.smallLinkButtonText}>Print Events</Text>
              </TouchableOpacity>
            </View>

            <NeonBottomLine
              color={MODULE_COLOR}
              style={styles.neonBottomLine}
            />
          </Card>
        </View>

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
              <Text style={styles.summaryValue}>{totalEvents}</Text>
              <NeonBottomLine color="#A855F7" style={styles.neonBottomLine} />
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
              <NeonBottomLine color="#22C55E" style={styles.neonBottomLine} />
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
              <NeonBottomLine color="#F59E0B" style={styles.neonBottomLine} />
            </Card>
          </View>

          <View style={styles.filterRow}>
            {(["all", "upcoming", "past"] as FilterType[]).map((key) => {
              const selected = filter === key;
              const label =
                key === "all"
                  ? "All"
                  : key === "upcoming"
                  ? "Upcoming"
                  : "Past";

              let accentColor = MODULE_COLOR;
              let bgSelected = isDark
                ? "rgba(56,189,248,0.20)"
                : "rgba(191,219,254,0.6)";
              let iconName: any = "layers-outline";

              if (key === "upcoming") {
                accentColor = "#22C55E";
                bgSelected = isDark
                  ? "rgba(34,197,94,0.22)"
                  : "rgba(187,247,208,0.9)";
                iconName = "trending-up-outline";
              } else if (key === "past") {
                accentColor = "#F59E0B";
                bgSelected = isDark
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
                      backgroundColor: selected ? bgSelected : "transparent",
                    },
                  ]}
                >
                  <Ionicons
                    name={iconName}
                    size={14}
                    color={selected ? accentColor : theme.colors.textSecondary}
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
            })}
          </View>
        </View>
      </>
    );
  }, [
    filter,
    handlePrintEvents,
    isDark,
    pastEvents,
    styles,
    theme,
    totalEvents,
    upcomingEvents,
  ]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
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
              icon={isDark ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: "center" }}>
            <ActivityIndicator color={MODULE_COLOR} />
          </View>
        ) : (
          <SwipeListView
            key={isDark ? "dark" : "light"}
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
            ListHeaderComponent={ListHeaderComponent}
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
            <Card style={[styles.neonShellCard, { width: "70%" }]}>
              <NeonBottomLine
                color={MODULE_COLOR}
                style={styles.neonBottomLine}
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
                <Text style={[styles.chipButtonText, { color: "#fff" }]}>
                  Add Event
                </Text>
              </TouchableOpacity>
            </Card>
          </TouchableOpacity>
        </Modal>

        {/* ✅ REUSABLE BOTTOM BAR */}
        <TaskBottomBar active="Event" onAddPress={() => setShowAddMenu(true)} />
      </SafeAreaView>
    </GradientBackground>
  );
}

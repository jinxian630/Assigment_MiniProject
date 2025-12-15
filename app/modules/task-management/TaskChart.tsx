import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  View,
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Text } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";
import TaskBottomBar from "../task-management/TS FILE/TaskBottomBar";

import {
  getFirestore,
  collection,
  query,
  onSnapshot,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

const MODULE_COLOR = "#38BDF8";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const createNeonCardShell = (
  accentColor: string,
  theme: any,
  extra: any = {}
) => {
  return {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: accentColor + "66",
    shadowColor: accentColor,
    shadowOpacity: theme.isDark ? 0.9 : 0.5,
    shadowRadius: theme.isDark ? 30 : 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: theme.isDark ? 18 : 8,
    ...extra,
  };
};

type YearMap = Record<string, number[]>;

function belongsToCurrentUser(
  data: any,
  uid: string | null,
  email: string | null
): boolean {
  let seenAnyUserField = false;
  let matched = false;

  const creator =
    data?.CreatedUser ||
    data?.createdBy ||
    data?.owner ||
    data?.ownerUser ||
    null;

  if (creator && typeof creator === "object") {
    seenAnyUserField = true;
    const creatorId = creator.id ?? creator.uid ?? null;
    const creatorEmail = creator.email ?? null;

    if (uid && creatorId === uid) matched = true;
    if (email && creatorEmail === email) matched = true;
  }

  if (data?.assignedTo) {
    seenAnyUserField = true;
    const assigned = data.assignedTo;

    if (typeof assigned === "string") {
      if (email && assigned === email) matched = true;
      if (uid && assigned === uid) matched = true;
    } else if (Array.isArray(assigned)) {
      if (email && assigned.includes(email)) matched = true;
      if (uid && assigned.includes(uid)) matched = true;
    } else if (typeof assigned === "object") {
      const aId = assigned.id ?? assigned.uid ?? null;
      const aEmail = assigned.email ?? null;
      if (uid && aId === uid) matched = true;
      if (email && aEmail === email) matched = true;
    }
  }

  if (Array.isArray(data?.guests)) {
    seenAnyUserField = true;

    for (const g of data.guests) {
      if (typeof g === "string") {
        if (email && g === email) {
          matched = true;
          break;
        }
      } else if (g && typeof g === "object") {
        const gId = g.id ?? g.uid ?? null;
        const gEmail = g.email ?? null;
        if ((uid && gId === uid) || (email && gEmail === email)) {
          matched = true;
          break;
        }
      }
    }
  }

  if (!seenAnyUserField) return false;
  return matched;
}

export default function TaskChart() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const db = getFirestore();
  const auth = getAuth();

  const isDark = theme?.isDark === true;

  const [taskYearCounts, setTaskYearCounts] = useState<YearMap>({});
  const [eventYearCounts, setEventYearCounts] = useState<YearMap>({});
  const [isLoading, setIsLoading] = useState(true);

  const [tasksReady, setTasksReady] = useState(false);
  const [eventsReady, setEventsReady] = useState(false);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"combined" | "tasks" | "events">(
    "combined"
  );

  const primaryTextColor = isDark ? "#F9FAFB" : "#0f172a";
  const secondaryTextColor = isDark ? "#9CA3AF" : "#6B7280";

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1 },

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
        headerRight: { flexDirection: "row", alignItems: "center" },

        contentWrapper: {
          flex: 1,
          paddingHorizontal: theme.spacing.screenPadding,
          paddingTop: 10,
        },
        contentContainer: { paddingBottom: 140, flexGrow: 1 },

        centerWrapper: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        emptyText: {
          marginTop: 8,
          fontSize: 13,
          color: secondaryTextColor,
          textAlign: "center",
        },

        heroWrapper: { alignItems: "center", marginTop: 12, marginBottom: 18 },
        heroOrbOuter: {
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
        heroTitleText: {
          marginTop: 2,
          fontSize: theme.typography.fontSizes.xl,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        heroSubtitleText: {
          marginTop: 4,
          fontSize: 12,
          textAlign: "center",
          color: theme.colors.textSecondary,
        },

        yearRowLabel: {
          marginTop: 4,
          marginLeft: 4,
          marginBottom: 4,
          fontSize: 12,
          color: theme.colors.textPrimary,
        },
        yearFilterRow: {
          flexDirection: "row",
          flexWrap: "wrap",
          marginBottom: 8,
        },
        yearChip: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          marginRight: 8,
          marginTop: 6,
          backgroundColor: isDark ? "#020617" : "#F1F5F9",
          borderColor: isDark ? "#1F2937" : "#CBD5E1",
        },
        yearChipActive: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          marginRight: 8,
          marginTop: 6,
          backgroundColor: isDark ? "#082F49" : "#DBEAFE",
          borderColor: MODULE_COLOR,
        },
        yearChipText: {
          fontSize: 13,
          fontWeight: "500",
          color: secondaryTextColor,
        },
        yearChipTextActive: {
          fontSize: 13,
          fontWeight: "600",
          color: MODULE_COLOR,
        },

        summaryRow: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginTop: 4,
        },
        summaryBox: {
          flex: 1,
          marginHorizontal: 4,
          borderRadius: 14,
          paddingVertical: 8,
          paddingHorizontal: 10,
          backgroundColor: isDark ? "#020617" : "#E0F2FE",
          borderWidth: 1,
          borderColor: isDark ? "#1E3A8A" : "#93C5FD",
          position: "relative",
          overflow: "hidden",
        },
        summaryLabel: { fontSize: 11, color: secondaryTextColor },
        summaryValue: {
          marginTop: 2,
          fontSize: 18,
          fontWeight: "700",
          color: primaryTextColor,
        },
        summarySub: { marginTop: 2, fontSize: 11, color: secondaryTextColor },
        neonBottomLine: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 3,
          borderBottomLeftRadius: 14,
          borderBottomRightRadius: 14,
        },

        segmentRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          marginTop: 12,
        },
        segmentButton: {
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: isDark ? "#4B5563" : "#E5E7EB",
          backgroundColor: isDark ? "#020617" : "#FFFFFF",
          marginHorizontal: 4,
        },
        segmentButtonActive: {
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: MODULE_COLOR,
          backgroundColor: isDark ? "#0369A1" : "#DBEAFE",
          marginHorizontal: 4,
        },
        segmentButtonText: { fontSize: 12, color: secondaryTextColor },
        segmentButtonTextActive: {
          fontSize: 12,
          color: MODULE_COLOR,
          fontWeight: "600",
        },

        sectionHeaderRow: {
          flexDirection: "row",
          alignItems: "center",
          marginTop: 10,
          marginLeft: 4,
        },
        sectionHeaderIconWrapper: {
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          marginRight: 6,
          backgroundColor: isDark ? "#0B1120" : "#DBEAFE",
        },
        sectionHeaderText: {
          fontSize: 13,
          fontWeight: "600",
          color: theme.colors.textPrimary,
        },

        chartCard: {
          borderRadius: 20,
          paddingVertical: 14,
          paddingHorizontal: 12,
          marginTop: 10,
          backgroundColor: theme.colors.card,
          borderWidth: 1,
          borderColor: isDark ? "#1E3A8A" : MODULE_COLOR,
          shadowColor: MODULE_COLOR,
          shadowOpacity: isDark ? 0.45 : 0.35,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        },
        titleText: {
          textAlign: "center",
          marginBottom: 4,
          fontSize: 16,
          fontWeight: "700",
          color: theme.colors.textPrimary,
        },
        subtitleText: {
          textAlign: "center",
          marginBottom: 8,
          fontSize: 12,
          color: secondaryTextColor,
        },

        legendRow: {
          flexDirection: "row",
          justifyContent: "center",
          marginTop: 4,
        },
        legendItem: {
          flexDirection: "row",
          alignItems: "center",
          marginHorizontal: 8,
        },
        legendDotTasks: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: 4,
          backgroundColor: "rgba(56, 189, 248, 1)",
        },
        legendDotEvents: {
          width: 10,
          height: 10,
          borderRadius: 5,
          marginRight: 4,
          backgroundColor: "rgba(34, 197, 94, 1)",
        },
        legendLabel: { fontSize: 11, color: secondaryTextColor },

        insightsCard: {
          marginTop: 10,
          borderRadius: 18,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: isDark ? "#020617" : "#F9FAFB",
          borderWidth: 1,
          borderColor: isDark ? "#1F2937" : "#E5E7EB",
        },
        insightsTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          marginBottom: 6,
        },
        insightsTitleText: {
          marginLeft: 6,
          fontSize: 14,
          fontWeight: "600",
          color: primaryTextColor,
        },
        insightsHintText: {
          fontSize: 11,
          color: secondaryTextColor,
          marginBottom: 4,
        },
        bulletRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
        bulletDot: {
          width: 5,
          height: 5,
          borderRadius: 2.5,
          backgroundColor: MODULE_COLOR,
          marginRight: 6,
        },
        bulletText: { fontSize: 11, color: secondaryTextColor, flexShrink: 1 },
      }),
    [theme, isDark, primaryTextColor, secondaryTextColor]
  );

  useEffect(() => {
    const currentUser = auth.currentUser;
    const uid = currentUser?.uid ?? null;
    const email = currentUser?.email ?? null;

    setIsLoading(true);
    setTasksReady(false);
    setEventsReady(false);

    const qTasks = query(collection(db, "Tasks"));
    const qEvents = query(collection(db, "Events"));

    const unsubscribeTasks = onSnapshot(
      qTasks,
      (snapshot) => {
        const yearCounts: YearMap = {};

        snapshot.forEach((docSnap) => {
          const data: any = docSnap.data();
          if (!belongsToCurrentUser(data, uid, email)) return;

          const rawDate = data.startDate ?? data.dueDate ?? data.createdAt;
          if (!rawDate) return;

          let date: Date | null = null;
          if (typeof rawDate === "number") date = new Date(rawDate);
          else if (rawDate?.toDate) date = rawDate.toDate();
          else if (typeof rawDate === "string") date = new Date(rawDate);

          if (!date || isNaN(date.getTime())) return;

          const yearKey = String(date.getFullYear());
          const monthIndex = date.getMonth();
          if (monthIndex < 0 || monthIndex > 11) return;

          if (!yearCounts[yearKey]) yearCounts[yearKey] = new Array(12).fill(0);
          yearCounts[yearKey][monthIndex] += 1;
        });

        setTaskYearCounts(yearCounts);
        setTasksReady(true);
      },
      (error) => {
        console.error("TaskChart Firestore error (Tasks):", error);
        setTaskYearCounts({});
        setTasksReady(true);
      }
    );

    const unsubscribeEvents = onSnapshot(
      qEvents,
      (snapshot) => {
        const yearCounts: YearMap = {};

        snapshot.forEach((docSnap) => {
          const data: any = docSnap.data();
          if (!belongsToCurrentUser(data, uid, email)) return;

          const rawDate = data.date ?? data.createdAt;
          if (!rawDate) return;

          let date: Date | null = null;
          if (typeof rawDate === "number") date = new Date(rawDate);
          else if (rawDate?.toDate) date = rawDate.toDate();
          else if (typeof rawDate === "string") date = new Date(rawDate);

          if (!date || isNaN(date.getTime())) return;

          const yearKey = String(date.getFullYear());
          const monthIndex = date.getMonth();
          if (monthIndex < 0 || monthIndex > 11) return;

          if (!yearCounts[yearKey]) yearCounts[yearKey] = new Array(12).fill(0);
          yearCounts[yearKey][monthIndex] += 1;
        });

        setEventYearCounts(yearCounts);
        setEventsReady(true);
      },
      (error) => {
        console.error("TaskChart Firestore error (Events):", error);
        setEventYearCounts({});
        setEventsReady(true);
      }
    );

    return () => {
      unsubscribeTasks();
      unsubscribeEvents();
    };
  }, [db, auth]);

  //stop loading only when both are ready
  useEffect(() => {
    if (tasksReady && eventsReady) setIsLoading(false);
  }, [tasksReady, eventsReady]);

  const availableYears: string[] = useMemo(() => {
    const set = new Set<string>();
    Object.keys(taskYearCounts).forEach((y) => set.add(y));
    Object.keys(eventYearCounts).forEach((y) => set.add(y));
    const arr = Array.from(set);
    arr.sort((a, b) => Number(a) - Number(b));
    return arr;
  }, [taskYearCounts, eventYearCounts]);

  useEffect(() => {
    if (!selectedYear && availableYears.length > 0) {
      setSelectedYear(availableYears[availableYears.length - 1]);
    }
  }, [availableYears, selectedYear]);

  const activeYear = selectedYear ?? (availableYears[0] || null);

  const taskCounts = activeYear
    ? taskYearCounts[activeYear] || new Array(12).fill(0)
    : new Array(12).fill(0);
  const eventCounts = activeYear
    ? eventYearCounts[activeYear] || new Array(12).fill(0)
    : new Array(12).fill(0);

  const allZero =
    taskCounts.every((v) => v === 0) && eventCounts.every((v) => v === 0);

  const {
    totalTasks,
    totalEvents,
    busiestMonthLabel,
    busiestMonthTotal,
    tasksSharePercent,
    workloadBalanceLabel,
    avgTotalPerMonth,
  } = useMemo(() => {
    const tTotal = taskCounts.reduce((a, b) => a + b, 0);
    const eTotal = eventCounts.reduce((a, b) => a + b, 0);

    const combined = taskCounts.map((t, i) => t + eventCounts[i]);
    let maxVal = 0;
    let maxIdx = 0;
    combined.forEach((val, idx) => {
      if (val > maxVal) {
        maxVal = val;
        maxIdx = idx;
      }
    });

    const allTotal = tTotal + eTotal;
    const share =
      allTotal > 0 ? Math.round((tTotal / allTotal) * 100 + Number.EPSILON) : 0;

    let balanceLabel = "Balanced between tasks and events.";
    if (share >= 65) {
      balanceLabel =
        "Most of your activity is tasks. Remember to schedule events mindfully.";
    } else if (share <= 35 && allTotal > 0) {
      balanceLabel =
        "You have more events than tasks. Make sure key tasks are tracked clearly.";
    }

    const avgPerMonth = Math.round((allTotal / 12 + Number.EPSILON) * 10) / 10;

    return {
      totalTasks: tTotal,
      totalEvents: eTotal,
      busiestMonthLabel: maxVal > 0 ? MONTH_LABELS[maxIdx] : "-",
      busiestMonthTotal: maxVal,
      tasksSharePercent: share,
      workloadBalanceLabel: balanceLabel,
      avgTotalPerMonth: avgPerMonth,
    };
  }, [taskCounts, eventCounts]);

  let chartSubtitle = "Tasks by start/due date • Events by event date";
  if (viewMode === "tasks") chartSubtitle = "Tasks by start/due date";
  if (viewMode === "events") chartSubtitle = "Events by event date";

  const chartData =
    viewMode === "combined"
      ? {
          labels: MONTH_LABELS,
          datasets: [
            {
              data: taskCounts,
              strokeWidth: 2,
              color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
            },
            {
              data: eventCounts,
              strokeWidth: 2,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            },
          ],
          legend: ["Tasks", "Events"],
        }
      : viewMode === "tasks"
      ? {
          labels: MONTH_LABELS,
          datasets: [
            {
              data: taskCounts,
              strokeWidth: 2,
              color: (opacity = 1) => `rgba(56, 189, 248, ${opacity})`,
            },
          ],
          legend: ["Tasks"],
        }
      : {
          labels: MONTH_LABELS,
          datasets: [
            {
              data: eventCounts,
              strokeWidth: 2,
              color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
            },
          ],
          legend: ["Events"],
        };

  const screenWidth = Dimensions.get("window").width;
  const chartWidth = Math.max(280, screenWidth - 48);

  const chartConfig = {
    backgroundColor: isDark ? "#020617" : "#E0F2FE",
    backgroundGradientFrom: isDark ? "#020617" : "#EFF6FF",
    backgroundGradientTo: isDark ? "#020617" : "#E5E7EB",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      isDark
        ? `rgba(248, 250, 252, ${opacity})`
        : `rgba(15, 23, 42, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDark
        ? `rgba(148, 163, 184, ${opacity})`
        : `rgba(55, 65, 81, ${opacity})`,
    style: { borderRadius: 16 },
    propsForDots: { r: "3" },
  };

  // render chart
  const renderChart = useCallback(() => {
    try {
      return (
        <LineChart
          data={chartData as any}
          width={chartWidth}
          height={260}
          chartConfig={chartConfig as any}
          style={{
            marginVertical: 8,
            borderRadius: 16,
            alignSelf: "center",
          }}
          bezier
        />
      );
    } catch (e) {
      return (
        <Text style={styles.subtitleText}>
          Chart preview is not supported on this platform/build.
          {"\n"}Try Android/iOS emulator/device.
        </Text>
      );
    }
  }, [chartData, chartWidth, chartConfig, styles.subtitleText]);

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.push("/modules/task-management")}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>Task & Event Analytics</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon={isDark ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        <ScrollView
          style={styles.contentWrapper}
          contentContainerStyle={styles.contentContainer}
        >
          {isLoading ? (
            <View style={styles.centerWrapper}>
              <ActivityIndicator size="large" color={MODULE_COLOR} />
            </View>
          ) : !activeYear || availableYears.length === 0 ? (
            <View style={styles.centerWrapper}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={secondaryTextColor}
              />
              <Text style={styles.emptyText}>
                No tasks or events found yet.{"\n"}Create some items to see your
                yearly trends.
              </Text>
            </View>
          ) : allZero ? (
            <View style={styles.centerWrapper}>
              <Ionicons
                name="stats-chart-outline"
                size={32}
                color={secondaryTextColor}
              />
              <Text style={styles.emptyText}>
                No data recorded for {activeYear}.{"\n"}Try selecting another
                year.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.heroWrapper}>
                <View style={styles.heroOrbOuter}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={64}
                    color={MODULE_COLOR}
                  />
                </View>
                <Text style={styles.heroTitleText}>{activeYear} Overview</Text>
                <Text style={styles.heroSubtitleText}>
                  See how your tasks and events are spread across the year so
                  you can plan smarter.
                </Text>
              </View>

              <Text style={styles.yearRowLabel}>Year</Text>
              <View style={styles.yearFilterRow}>
                {availableYears.map((year) => {
                  const isActive = year === activeYear;
                  return (
                    <TouchableOpacity
                      key={year}
                      style={isActive ? styles.yearChipActive : styles.yearChip}
                      onPress={() => setSelectedYear(year)}
                    >
                      <Text
                        style={
                          isActive
                            ? styles.yearChipTextActive
                            : styles.yearChipText
                        }
                      >
                        {year}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.summaryRow}>
                <Card style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>
                    Total tasks ({activeYear})
                  </Text>
                  <Text style={styles.summaryValue}>{totalTasks}</Text>
                  <Text style={styles.summarySub}>
                    Avg / month:{" "}
                    {Math.round((totalTasks / 12 + Number.EPSILON) * 10) / 10}
                  </Text>
                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: MODULE_COLOR,
                        shadowColor: MODULE_COLOR,
                        shadowOpacity: 1,
                        shadowRadius: 12,
                      },
                    ]}
                  />
                </Card>

                <Card style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>
                    Total events ({activeYear})
                  </Text>
                  <Text style={styles.summaryValue}>{totalEvents}</Text>
                  <Text style={styles.summarySub}>
                    Avg / month:{" "}
                    {Math.round((totalEvents / 12 + Number.EPSILON) * 10) / 10}
                  </Text>
                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: "#22C55E",
                        shadowColor: "#22C55E",
                        shadowOpacity: 1,
                        shadowRadius: 12,
                      },
                    ]}
                  />
                </Card>

                <Card style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Busiest month</Text>
                  <Text style={styles.summaryValue}>{busiestMonthLabel}</Text>
                  <Text style={styles.summarySub}>
                    {busiestMonthTotal > 0 ? `${busiestMonthTotal} items` : "—"}
                  </Text>
                  <View
                    style={[
                      styles.neonBottomLine,
                      {
                        backgroundColor: "#A855F7",
                        shadowColor: "#A855F7",
                        shadowOpacity: 1,
                        shadowRadius: 12,
                      },
                    ]}
                  />
                </Card>
              </View>

              <View style={styles.segmentRow}>
                {(["combined", "tasks", "events"] as const).map((m) => {
                  const active = viewMode === m;
                  const label =
                    m === "combined"
                      ? "Combined"
                      : m === "tasks"
                      ? "Tasks"
                      : "Events";
                  return (
                    <TouchableOpacity
                      key={m}
                      style={
                        active
                          ? styles.segmentButtonActive
                          : styles.segmentButton
                      }
                      onPress={() => setViewMode(m)}
                    >
                      <Text
                        style={
                          active
                            ? styles.segmentButtonTextActive
                            : styles.segmentButtonText
                        }
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeaderIconWrapper}>
                  <Ionicons
                    name="analytics-outline"
                    size={14}
                    color={MODULE_COLOR}
                  />
                </View>
                <Text style={styles.sectionHeaderText}>
                  Monthly activity ({activeYear})
                </Text>
              </View>

              {/* CHART */}
              <Card style={styles.chartCard}>
                <Text style={styles.titleText}>Monthly Activity</Text>
                <Text style={styles.subtitleText}>{chartSubtitle}</Text>
                {renderChart()}

                <View style={styles.legendRow}>
                  {(viewMode === "combined" || viewMode === "tasks") && (
                    <View style={styles.legendItem}>
                      <View style={styles.legendDotTasks} />
                      <Text style={styles.legendLabel}>Tasks</Text>
                    </View>
                  )}
                  {(viewMode === "combined" || viewMode === "events") && (
                    <View style={styles.legendItem}>
                      <View style={styles.legendDotEvents} />
                      <Text style={styles.legendLabel}>Events</Text>
                    </View>
                  )}
                </View>
              </Card>

              {/* INSIGHTS */}
              <Card style={styles.insightsCard}>
                <View style={styles.insightsTitleRow}>
                  <Ionicons
                    name="bulb-outline"
                    size={18}
                    color={MODULE_COLOR}
                  />
                  <Text style={styles.insightsTitleText}>
                    Insights for {activeYear}
                  </Text>
                </View>

                <Text style={styles.insightsHintText}>
                  Hint: Identify your busiest months and plan earlier so you
                  don&apos;t overload a single period.
                </Text>

                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Busiest month:{" "}
                    <Text
                      style={{ fontWeight: "600", color: primaryTextColor }}
                    >
                      {busiestMonthLabel}
                    </Text>{" "}
                    with{" "}
                    <Text
                      style={{ fontWeight: "600", color: primaryTextColor }}
                    >
                      {busiestMonthTotal}
                    </Text>{" "}
                    items.
                  </Text>
                </View>

                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Task vs event balance:{" "}
                    <Text
                      style={{ fontWeight: "600", color: primaryTextColor }}
                    >
                      {tasksSharePercent}%
                    </Text>{" "}
                    of your activity is tasks. {workloadBalanceLabel}
                  </Text>
                </View>

                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    Average items per month:{" "}
                    <Text
                      style={{ fontWeight: "600", color: primaryTextColor }}
                    >
                      {avgTotalPerMonth}
                    </Text>
                    .
                  </Text>
                </View>
              </Card>
            </>
          )}
        </ScrollView>

        <TaskBottomBar
          active="Chart"
          onPressAdd={() => setShowAddMenu(true)} // only if you keep the add menu
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

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
import TaskBottomBar from "./components/TaskBottomBar";

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
import {
  MODULE_COLOR,
  createNeonCardShell,
  NeonBottomLine,
} from "./utils/sharedUI";
import { createChartStyles } from "./styles/chartStyles";
import { getSegmentButtonConfig, ViewMode } from "./utils/chartUtils";
import { belongsToCurrentUser } from "./utils/chartDataUtils";

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

type YearMap = Record<string, number[]>;

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
  const [viewMode, setViewMode] = useState<ViewMode>("combined");

  const primaryTextColor = isDark ? "#F9FAFB" : "#0f172a";
  const secondaryTextColor = isDark ? "#9CA3AF" : "#6B7280";

  const styles = useMemo(
    () =>
      createChartStyles(theme, isDark, primaryTextColor, secondaryTextColor),
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
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>My Chart</Text>
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
                color={MODULE_COLOR}
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
                color={MODULE_COLOR}
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
                {(["combined", "tasks", "events"] as ViewMode[]).map((m) => {
                  const active = viewMode === m;
                  const config = getSegmentButtonConfig(m);

                  return (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.segmentButton,
                        active && styles.segmentButtonActive,
                        active && {
                          backgroundColor: config.activeBgColor,
                          shadowColor: config.activeColor,
                          shadowOpacity: isDark ? 0.5 : 0.3,
                        },
                      ]}
                      onPress={() => setViewMode(m)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <Ionicons
                          name={config.iconName as any}
                          size={16}
                          color={
                            active ? "#0F172A" : isDark ? "#9CA3AF" : "#6B7280"
                          }
                        />
                        <Text
                          style={
                            active
                              ? styles.segmentButtonTextActive
                              : styles.segmentButtonText
                          }
                        >
                          {config.label}
                        </Text>
                      </View>
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
                  <Ionicons name="bulb" size={20} color={MODULE_COLOR} />
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
                    <Text style={{ fontWeight: "600", color: MODULE_COLOR }}>
                      Busiest month: {busiestMonthLabel}
                    </Text>
                    {" with "}
                    <Text style={{ fontWeight: "600", color: MODULE_COLOR }}>
                      {busiestMonthTotal} item
                      {busiestMonthTotal !== 1 ? "s" : ""}
                    </Text>
                    .
                  </Text>
                </View>

                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    <Text style={{ fontWeight: "600", color: MODULE_COLOR }}>
                      Task vs event balance: {tasksSharePercent}%
                    </Text>
                    {" of your activity is tasks. "}
                    {workloadBalanceLabel}
                  </Text>
                </View>

                <View style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <Text style={styles.bulletText}>
                    <Text style={{ fontWeight: "600", color: MODULE_COLOR }}>
                      Average items per month: {avgTotalPerMonth}
                    </Text>
                    .
                  </Text>
                </View>
              </Card>
            </>
          )}
        </ScrollView>

        <TaskBottomBar active="Chart" useAddMenu />
      </SafeAreaView>
    </GradientBackground>
  );
}

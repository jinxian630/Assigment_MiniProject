import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, PieChart } from "react-native-chart-kit";
import { Picker } from "react-native-rapi-ui";
import { useRouter } from "expo-router";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";
import { getMoneyColors, toggleThemeSafe } from "./MoneyUI";

import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type TxDetail = {
  account: string;
  note: string;
  amount: number;
  date: string;
  category?: string;
};

type LineMode = "both" | "income" | "expense";

type TooltipState = {
  x: number;
  y: number;
  visible: boolean;
  index: number | null;
  series: "income" | "expense" | null; // ✅ which line was clicked
};

const screenWidth = Dimensions.get("window").width;

function neonGlowStyle(opts: {
  isDarkmode: boolean;
  accent: string;
  backgroundColor: string;
  borderColor: string;
  heavy?: boolean;
}) {
  const { isDarkmode, accent, backgroundColor, borderColor, heavy } = opts;
  const bg = isDarkmode ? "rgba(2,6,23,0.92)" : backgroundColor;
  const glowA = isDarkmode ? 0.55 : 0.22;
  const glowB = isDarkmode ? 0.35 : 0.14;

  return {
    backgroundColor: bg,
    borderWidth: 1,
    borderColor: isDarkmode ? `${accent}AA` : borderColor,
    shadowColor: accent,
    shadowOpacity: heavy ? glowA : glowB,
    shadowRadius: heavy ? 16 : 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: heavy ? 10 : 6,
  } as const;
}

export default function ChartDisplayScreen({ navigation }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const themeCtx = useTheme() as any;
  const theme = themeCtx?.theme ?? themeCtx;
  const isDarkmode = !!themeCtx?.isDarkMode;

  const moneyThemeCtx = useMemo(
    () => ({
      ...themeCtx,
      theme: {
        ...(themeCtx?.theme ?? {}),
        isDarkmode,
        colors: theme?.colors ?? themeCtx?.theme?.colors,
      },
    }),
    [themeCtx, theme, isDarkmode]
  );

  const ui = getMoneyColors(moneyThemeCtx);
  const { textPrimary, textSecondary, textMuted, cardBorder, cardBg } = ui;
  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

  const auth = getAuth();
  const db = getFirestore();

  const [labels, setLabels] = useState<string[]>(MONTH_LABELS);
  const [expenseData, setExpenseData] = useState<number[]>(
    new Array(12).fill(0)
  );
  const [incomeData, setIncomeData] = useState<number[]>(new Array(12).fill(0));

  // ✅ store BOTH details
  const [expenseDetailsByMonth, setExpenseDetailsByMonth] = useState<
    TxDetail[][]
  >(Array.from({ length: 12 }, () => []));
  const [incomeDetailsByMonth, setIncomeDetailsByMonth] = useState<
    TxDetail[][]
  >(Array.from({ length: 12 }, () => []));

  const [loading, setLoading] = useState<boolean>(true);

  const [tooltip, setTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    visible: false,
    index: null,
    series: null,
  });

  const [lineMode, setLineMode] = useState<LineMode>("both");

  const [incomeCatByMonth, setIncomeCatByMonth] = useState<
    Record<string, number>[]
  >(Array.from({ length: 12 }, () => ({})));
  const [expenseCatByMonth, setExpenseCatByMonth] = useState<
    Record<string, number>[]
  >(Array.from({ length: 12 }, () => ({})));

  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(
    new Date().getMonth()
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "Expenses"),
      where("createdBy", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const monthlyExpenseTotals = new Array(12).fill(0) as number[];
        const monthlyIncomeTotals = new Array(12).fill(0) as number[];

        const expDetails: TxDetail[][] = Array.from({ length: 12 }, () => []);
        const incDetails: TxDetail[][] = Array.from({ length: 12 }, () => []);

        const now = new Date();
        const currentYear = now.getFullYear();

        const localIncomeCatByMonth: Record<string, number>[] = Array.from(
          { length: 12 },
          () => ({})
        );
        const localExpenseCatByMonth: Record<string, number>[] = Array.from(
          { length: 12 },
          () => ({})
        );

        snapshot.forEach((docSnap) => {
          const tx = docSnap.data() as any;
          if (!tx.dateTime) return;

          const dateObj = new Date(tx.dateTime);
          const monthIndex = dateObj.getMonth();
          const year = dateObj.getFullYear();
          if (monthIndex < 0 || monthIndex > 11) return;

          const amount =
            typeof tx.amount === "number" ? tx.amount : Number(tx.amount || 0);
          const txType = tx.type === "Income" ? "Income" : "Expense";
          const category = tx.category || "Others";

          const detailItem: TxDetail = {
            account: typeof tx.account === "string" ? tx.account : "",
            note: typeof tx.note === "string" ? tx.note : "",
            amount,
            date: dateObj.toLocaleDateString(),
            category,
          };

          if (txType === "Expense") {
            monthlyExpenseTotals[monthIndex] += amount;
            expDetails[monthIndex].push(detailItem);
          } else {
            monthlyIncomeTotals[monthIndex] += amount;
            incDetails[monthIndex].push(detailItem);
          }

          // category pie (current year only, same as your logic)
          if (year === currentYear) {
            if (txType === "Income") {
              const incomeCat = localIncomeCatByMonth[monthIndex];
              incomeCat[category] = (incomeCat[category] || 0) + amount;
            } else {
              const expenseCat = localExpenseCatByMonth[monthIndex];
              expenseCat[category] = (expenseCat[category] || 0) + amount;
            }
          }
        });

        setLabels(MONTH_LABELS);
        setExpenseData(monthlyExpenseTotals);
        setIncomeData(monthlyIncomeTotals);
        setExpenseDetailsByMonth(expDetails);
        setIncomeDetailsByMonth(incDetails);
        setIncomeCatByMonth(localIncomeCatByMonth);
        setExpenseCatByMonth(localExpenseCatByMonth);
        setLoading(false);

        // ✅ if current tooltip month was opened, keep it but ensure still valid
        setTooltip((prev) =>
          prev.visible && prev.index != null
            ? { ...prev, series: prev.series } // keep series
            : prev
        );
      },
      (err) => {
        console.log("ChartDisplay error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  const hasAnyData =
    expenseData.some((v) => v !== 0) || incomeData.some((v) => v !== 0);

  const makePieData = (obj: Record<string, number>) => {
    const entries = Object.entries(obj);
    if (!entries.length) return [];

    const palette = [
      "#38BDF8",
      "#22C55E",
      "#F97316",
      "#A855F7",
      "#FACC15",
      "#EC4899",
      "#06B6D4",
      "#F97373",
    ];

    return entries.map(([name, value], index) => ({
      name,
      population: value,
      color: palette[index % palette.length],
      legendFontColor: isDarkmode ? "#F9FAFB" : "#111827",
      legendFontSize: 12,
    }));
  };

  const incomePieData = makePieData(incomeCatByMonth[selectedMonthIndex] || {});
  const expensePieData = makePieData(
    expenseCatByMonth[selectedMonthIndex] || {}
  );

  const chartConfig = useMemo(() => {
    const bg = isDarkmode ? "#020617" : "#FFFFFF";
    const grid = isDarkmode ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.12)";
    return {
      backgroundColor: bg,
      backgroundGradientFrom: bg,
      backgroundGradientTo: bg,
      decimalPlaces: 2,
      color: (opacity = 1) =>
        isDarkmode
          ? `rgba(248,250,252,${opacity})`
          : `rgba(15,23,42,${opacity})`,
      labelColor: (opacity = 1) =>
        isDarkmode
          ? `rgba(248,250,252,${opacity})`
          : `rgba(15,23,42,${opacity})`,
      propsForLabels: { fontSize: 10 },
      propsForBackgroundLines: { stroke: grid, strokeDasharray: "4 6" },
    };
  }, [isDarkmode]);

  // ✅ always keep dataset order stable so we can infer series
  const EXPENSE_COLOR = (o = 1) => `rgba(248, 113, 113, ${o})`;
  const INCOME_COLOR = (o = 1) => `rgba(52, 211, 153, ${o})`;

  let lineDatasets: any[] = [];
  let lineLegend: string[] = [];

  if (lineMode === "expense") {
    lineDatasets = [
      { data: expenseData, strokeWidth: 2, color: EXPENSE_COLOR },
    ];
    lineLegend = ["Expense"];
  } else if (lineMode === "income") {
    lineDatasets = [{ data: incomeData, strokeWidth: 2, color: INCOME_COLOR }];
    lineLegend = ["Income"];
  } else {
    // both
    lineDatasets = [
      { data: expenseData, strokeWidth: 2, color: EXPENSE_COLOR },
      { data: incomeData, strokeWidth: 2, color: INCOME_COLOR },
    ];
    lineLegend = ["Expense", "Income"];
  }

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const renderThemeToggle = () => (
    <TouchableOpacity
      onPress={onToggleTheme}
      style={[
        styles.themeToggle,
        {
          borderColor: "#FFD93D",
          backgroundColor: isDarkmode
            ? "rgba(15,23,42,0.65)"
            : "rgba(255,255,255,0.75)",
        },
      ]}
      activeOpacity={0.8}
    >
      <Ionicons
        name={isDarkmode ? "sunny-outline" : "moon-outline"}
        size={20}
        color={isDarkmode ? "#FDE68A" : "#0F172A"}
      />
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => nav.goBack()}
      />
      <RNText style={[styles.headerTitle, { color: textPrimary }]}>
        Spending Insights
      </RNText>
      {renderThemeToggle()}
    </View>
  );

  // ✅ decide which series user clicked
  const inferSeriesFromClick = (dp: any) => {
    // when mode is forced, we know the answer
    if (lineMode === "income") return "income" as const;
    if (lineMode === "expense") return "expense" as const;

    // when "both", try to use dp.datasetIndex if exists (some versions include it)
    const idx = dp?.index ?? 0;

    const datasetIndex =
      typeof dp?.datasetIndex === "number"
        ? dp.datasetIndex
        : typeof dp?.dataset?.datasetIndex === "number"
        ? dp.dataset.datasetIndex
        : null;

    if (datasetIndex === 0) return "expense" as const;
    if (datasetIndex === 1) return "income" as const;

    // fallback: compare dp.value to each line at that month
    const v = Number(dp?.value ?? 0);
    const e = Number(expenseData[idx] ?? 0);
    const i = Number(incomeData[idx] ?? 0);

    const de = Math.abs(v - e);
    const di = Math.abs(v - i);

    // if equal, prefer the one that is visually closer can’t be known—default to expense
    return di < de ? ("income" as const) : ("expense" as const);
  };

  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <View style={styles.center}>
            <ActivityIndicator size="large" />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const activeIdx = tooltip.index ?? 0;
  const activeMonthLabel = labels[activeIdx];
  const activeIncome = incomeData[activeIdx] ?? 0;
  const activeExpense = expenseData[activeIdx] ?? 0;

  const activeSeries = tooltip.series; // "income" | "expense" | null
  const activeList =
    activeSeries === "income"
      ? incomeDetailsByMonth[activeIdx] || []
      : expenseDetailsByMonth[activeIdx] || [];

  const activeAccent = activeSeries === "income" ? "#22C55E" : "#F97316";
  const activeTitle =
    activeSeries === "income"
      ? `${activeMonthLabel} income`
      : `${activeMonthLabel} expenses`;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderHeader()}

          {/* Line Chart Card */}
          <Card
            style={[
              styles.chartCard,
              neonGlowStyle({
                isDarkmode,
                accent: "#38BDF8",
                backgroundColor: cardBg,
                borderColor: cardBorder,
                heavy: true,
              }),
            ]}
          >
            <View style={{ alignItems: "center" }}>
              <RNText style={[styles.sectionTitle, { color: textPrimary }]}>
                Monthly Income vs Expense
              </RNText>
            </View>

            <View style={styles.modeToggleRow}>
              <ModeButton
                label="Both"
                active={lineMode === "both"}
                onPress={() => setLineMode("both")}
                isDarkmode={isDarkmode}
              />
              <ModeButton
                label="Income"
                active={lineMode === "income"}
                onPress={() => setLineMode("income")}
                isDarkmode={isDarkmode}
              />
              <ModeButton
                label="Expense"
                active={lineMode === "expense"}
                onPress={() => setLineMode("expense")}
                isDarkmode={isDarkmode}
              />
            </View>

            {!hasAnyData ? (
              <View style={styles.centerBlock}>
                <RNText style={{ color: textSecondary }}>
                  No transaction data found
                </RNText>
              </View>
            ) : (
              <LineChart
                data={{ labels, datasets: lineDatasets, legend: lineLegend }}
                width={screenWidth - 16 - theme.spacing.screenPadding * 2}
                height={260}
                fromZero
                chartConfig={chartConfig as any}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                  backgroundColor: isDarkmode ? "#020617" : "#FFFFFF",
                }}
                bezier
                onDataPointClick={(dp) => {
                  const series = inferSeriesFromClick(dp);

                  const samePoint =
                    tooltip.visible &&
                    tooltip.index === dp.index &&
                    tooltip.x === dp.x &&
                    tooltip.y === dp.y &&
                    tooltip.series === series;

                  if (samePoint) {
                    setTooltip((prev) => ({
                      ...prev,
                      visible: false,
                      series: null,
                    }));
                  } else {
                    setTooltip({
                      x: dp.x,
                      y: dp.y,
                      visible: true,
                      index: dp.index,
                      series,
                    });
                  }
                }}
                decorator={() => {
                  if (!tooltip.visible || tooltip.index == null) return null;

                  const idx = tooltip.index;
                  const monthLabel = labels[idx];
                  const totalExpense = expenseData[idx] ?? 0;
                  const totalIncome = incomeData[idx] ?? 0;

                  const s = tooltip.series ?? "expense";
                  const first =
                    s === "income"
                      ? (incomeDetailsByMonth[idx] || [])[0]
                      : (expenseDetailsByMonth[idx] || [])[0];

                  return (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          left: tooltip.x - 90,
                          top: tooltip.y - 90,
                          backgroundColor: isDarkmode
                            ? "rgba(2,6,23,0.92)"
                            : "rgba(255,255,255,0.98)",
                          borderColor: isDarkmode ? "#38BDF8" : "#CBD5E1",
                        },
                      ]}
                    >
                      <RNText
                        style={[styles.tooltipTitle, { color: textPrimary }]}
                      >
                        {monthLabel}
                      </RNText>

                      <RNText
                        style={[styles.tooltipText, { color: textSecondary }]}
                      >
                        Income: {totalIncome.toFixed(2)}
                      </RNText>
                      <RNText
                        style={[styles.tooltipText, { color: textSecondary }]}
                      >
                        Expense: {totalExpense.toFixed(2)}
                      </RNText>

                      <RNText
                        style={[
                          styles.tooltipMore,
                          { color: textMuted, marginTop: 4 },
                        ]}
                      >
                        Selected: {s === "income" ? "Income" : "Expense"}
                      </RNText>

                      {first ? (
                        <RNText
                          style={[styles.tooltipText, { color: textSecondary }]}
                        >
                          1st {s}: {first.amount.toFixed(2)} (
                          {first.account || "-"})
                        </RNText>
                      ) : null}
                    </View>
                  );
                }}
              />
            )}

            {/* ✅ Detail card now follows selected series */}
            {tooltip.visible &&
              tooltip.index != null &&
              tooltip.series != null && (
                <View
                  style={[
                    styles.detailCard,
                    neonGlowStyle({
                      isDarkmode,
                      accent: activeAccent,
                      backgroundColor: cardBg,
                      borderColor: cardBorder,
                    }),
                  ]}
                >
                  <RNText style={[styles.detailTitle, { color: textPrimary }]}>
                    {activeTitle}
                  </RNText>

                  <RNText style={[styles.detailLine, { color: textSecondary }]}>
                    Total Income: {activeIncome.toFixed(2)} · Total Expense:{" "}
                    {activeExpense.toFixed(2)}
                  </RNText>

                  <View style={{ height: 10 }} />

                  {activeList.length === 0 ? (
                    <RNText
                      style={[styles.detailLine, { color: textSecondary }]}
                    >
                      No {tooltip.series} records.
                    </RNText>
                  ) : (
                    activeList.map((item, i) => (
                      <View key={i} style={styles.detailRow}>
                        <RNText
                          style={[styles.detailLine, { color: textSecondary }]}
                        >
                          {item.date} · {item.account || "Unknown account"} ·{" "}
                          {item.category || "Others"}
                        </RNText>
                        <RNText
                          style={[styles.detailLine, { color: textMuted }]}
                        >
                          Note: {item.note || "-"}
                        </RNText>
                        <RNText
                          style={[styles.detailAmount, { color: activeAccent }]}
                        >
                          Amount: {item.amount.toFixed(2)}
                        </RNText>
                      </View>
                    ))
                  )}
                </View>
              )}
          </Card>

          {/* Pie charts */}
          <Card
            style={[
              styles.pieWrapperCard,
              neonGlowStyle({
                isDarkmode,
                accent: "#A855F7",
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }),
            ]}
          >
            <RNText style={[styles.sectionTitle, { color: textPrimary }]}>
              Category Breakdown by Month
            </RNText>
            <RNText style={[styles.sectionSubtitle, { color: textMuted }]}>
              Select month for income/expense category charts
            </RNText>

            <View style={styles.monthPickerContainer}>
              <Picker
                items={MONTH_LABELS.map((m, i) => ({
                  label: m,
                  value: String(i),
                }))}
                value={String(selectedMonthIndex)}
                onValueChange={(val) =>
                  setSelectedMonthIndex(parseInt(String(val), 10))
                }
                placeholder=""
              />
            </View>

            <View style={styles.pieCard}>
              <RNText style={[styles.pieTitle, { color: "#22C55E" }]}>
                Income by Category
              </RNText>
              {incomePieData.length === 0 ? (
                <RNText style={[styles.noDataText, { color: textMuted }]}>
                  No income data for this month
                </RNText>
              ) : (
                <PieChart
                  data={incomePieData as any}
                  width={screenWidth - 16 - theme.spacing.screenPadding * 2}
                  height={220}
                  chartConfig={chartConfig as any}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"10"}
                  transparent={true}
                  absolute={false}
                />
              )}
            </View>

            <View style={styles.pieCard}>
              <RNText style={[styles.pieTitle, { color: "#F97316" }]}>
                Expense by Category
              </RNText>
              {expensePieData.length === 0 ? (
                <RNText style={[styles.noDataText, { color: textMuted }]}>
                  No expense data for this month
                </RNText>
              ) : (
                <PieChart
                  data={expensePieData as any}
                  width={screenWidth - 16 - theme.spacing.screenPadding * 2}
                  height={220}
                  chartConfig={chartConfig as any}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"10"}
                  transparent={true}
                  absolute={false}
                />
              )}
            </View>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function ModeButton({
  label,
  active,
  onPress,
  isDarkmode,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  isDarkmode: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        stylesStatic.modeButton,
        active
          ? { backgroundColor: "#38BDF8", borderColor: "#38BDF8" }
          : {
              borderColor: isDarkmode
                ? "rgba(148,163,184,0.35)"
                : "rgba(15,23,42,0.15)",
              backgroundColor: isDarkmode
                ? "rgba(2,6,23,0.75)"
                : "rgba(255,255,255,0.75)",
            },
      ]}
      activeOpacity={0.9}
    >
      <RNText
        style={[
          stylesStatic.modeButtonText,
          { color: active ? "#0F172A" : isDarkmode ? "#E5E7EB" : "#4B5563" },
        ]}
      >
        {label}
      </RNText>
    </TouchableOpacity>
  );
}

const stylesStatic = StyleSheet.create({
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  modeButtonText: { fontSize: 12, fontWeight: "600" },
});

function makeStyles(theme: any) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    centerBlock: {
      paddingVertical: 20,
      justifyContent: "center",
      alignItems: "center",
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerTitle: { fontSize: 18, fontWeight: "900" },
    themeToggle: {
      width: 36,
      height: 36,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },

    chartCard: { paddingBottom: theme.spacing.md },
    sectionTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginTop: 6,
      marginBottom: 4,
    },
    sectionSubtitle: { fontSize: 12, marginTop: 4 },

    modeToggleRow: { flexDirection: "row", marginTop: 8, marginBottom: 4 },

    tooltip: {
      position: "absolute",
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      maxWidth: 220,
    },
    tooltipTitle: { fontSize: 11, fontWeight: "900", marginBottom: 2 },
    tooltipText: { fontSize: 10 },
    tooltipMore: { fontSize: 9, marginTop: 2, fontStyle: "italic" },

    detailCard: {
      marginTop: 8,
      padding: 10,
      borderRadius: 14,
    },
    detailTitle: { fontWeight: "900", marginBottom: 6 },
    detailRow: { marginBottom: 8 },
    detailLine: { fontSize: 12 },
    detailAmount: { fontSize: 12, fontWeight: "800" },

    pieWrapperCard: { marginTop: theme.spacing.md },
    monthPickerContainer: { marginTop: 6, marginBottom: 4 },

    pieCard: { marginTop: 10 },
    pieTitle: {
      fontWeight: "900",
      marginBottom: 6,
      fontSize: 14,
      textAlign: "center",
    },
    noDataText: { textAlign: "center", fontSize: 12, marginTop: 12 },
  });
}

const styles = StyleSheet.create({}); // placeholder

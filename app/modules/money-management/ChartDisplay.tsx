import React, { useEffect, useState } from "react";
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
import { Theme } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

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

type ExpenseDetail = {
  account: string;
  note: string;
  amount: number;
  date: string;
};

type TooltipState = {
  x: number;
  y: number;
  visible: boolean;
  index: number | null;
};

type LineMode = "both" | "income" | "expense";

const screenWidth = Dimensions.get("window").width;

export default function ChartDisplayScreen({ navigation }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const theme = useTheme() as any;
  const isDarkmode: boolean = !!theme?.isDarkmode;

  const auth = getAuth();
  const db = getFirestore();

  const [labels, setLabels] = useState<string[]>(MONTH_LABELS);
  const [expenseData, setExpenseData] = useState<number[]>(
    new Array(12).fill(0)
  );
  const [incomeData, setIncomeData] = useState<number[]>(
    new Array(12).fill(0)
  );
  const [monthlyDetails, setMonthlyDetails] = useState<ExpenseDetail[][]>(
    Array.from({ length: 12 }, () => [])
  );
  const [loading, setLoading] = useState<boolean>(true);

  const [tooltip, setTooltip] = useState<TooltipState>({
    x: 0,
    y: 0,
    visible: false,
    index: null,
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

  // Dynamic text colors
  const textPrimary = isDarkmode ? "#F9FAFB" : Theme.colors.textPrimary;
  const textSecondary = isDarkmode ? "#CBD5E1" : "#4B5563";
  const mutedText = isDarkmode ? "#9CA3AF" : "#6B7280";
  const cardBorder = isDarkmode ? "#1F2937" : Theme.colors.border;

  const handleToggleTheme = () => {
    if (typeof theme?.toggleTheme === "function") {
      theme.toggleTheme();
    } else if (typeof theme?.setTheme === "function") {
      theme.setTheme(isDarkmode ? "light" : "dark");
    } else {
      console.warn("No theme toggle function found in useTheme()");
    }
  };

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
        const detailsPerMonth: ExpenseDetail[][] = Array.from(
          { length: 12 },
          () => []
        );

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
          const exp = docSnap.data() as any;
          if (!exp.dateTime) return;

          const dateObj = new Date(exp.dateTime);
          const monthIndex = dateObj.getMonth();
          const year = dateObj.getFullYear();
          if (monthIndex < 0 || monthIndex > 11) return;

          const amount =
            typeof exp.amount === "number"
              ? exp.amount
              : Number(exp.amount || 0);
          const txType = exp.type === "Income" ? "Income" : "Expense";
          const category = exp.category || "Others";

          if (txType === "Expense") {
            monthlyExpenseTotals[monthIndex] += amount;
            detailsPerMonth[monthIndex].push({
              account: typeof exp.account === "string" ? exp.account : "",
              note: typeof exp.note === "string" ? exp.note : "",
              amount,
              date: dateObj.toLocaleDateString(),
            });
          } else {
            monthlyIncomeTotals[monthIndex] += amount;
          }

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
        setMonthlyDetails(detailsPerMonth);
        setIncomeCatByMonth(localIncomeCatByMonth);
        setExpenseCatByMonth(localExpenseCatByMonth);
        setLoading(false);
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

  const incomePieData = makePieData(
    incomeCatByMonth[selectedMonthIndex] || {}
  );
  const expensePieData = makePieData(
    expenseCatByMonth[selectedMonthIndex] || {}
  );

  const chartConfig = {
    backgroundColor: isDarkmode ? "#020617" : "#ffffff",
    backgroundGradientFrom: isDarkmode ? "#020617" : "#eff3ff",
    backgroundGradientTo: isDarkmode ? "#111827" : "#efefef",
    decimalPlaces: 2,
    color: (opacity = 1) =>
      isDarkmode
        ? `rgba(248, 250, 252, ${opacity})`
        : `rgba(15, 23, 42, ${opacity})`,
    labelColor: (opacity = 1) =>
      isDarkmode
        ? `rgba(248, 250, 252, ${opacity})`
        : `rgba(15, 23, 42, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
    },
  };

  let lineDatasets: any[] = [];
  let lineLegend: string[] = [];

  if (lineMode === "expense") {
    lineDatasets = [
      {
        data: expenseData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(248, 113, 113, ${opacity})`,
      },
    ];
    lineLegend = ["Expense"];
  } else if (lineMode === "income") {
    lineDatasets = [
      {
        data: incomeData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
      },
    ];
    lineLegend = ["Income"];
  } else {
    lineDatasets = [
      {
        data: expenseData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(248, 113, 113, ${opacity})`,
      },
      {
        data: incomeData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(52, 211, 153, ${opacity})`,
      },
    ];
    lineLegend = ["Expense", "Income"];
  }

  const renderThemeToggle = () => (
    <TouchableOpacity
      onPress={handleToggleTheme}
      style={styles.themeToggle}
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
              {
                borderWidth: 1,
                borderColor: cardBorder,
              },
            ]}
          >
            <View style={{ alignItems: "center" }}>
              <RNText style={[styles.sectionTitle, { color: textPrimary }]}>
                Monthly Income vs Expense
              </RNText>
            </View>

            {/* Mode toggle */}
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
              <View style={styles.center}>
                <RNText style={{ color: textSecondary }}>
                  No transaction data found
                </RNText>
              </View>
            ) : (
              <LineChart
                data={{
                  labels,
                  datasets: lineDatasets,
                  legend: lineLegend,
                }}
                width={screenWidth - 16 - Theme.spacing.screenPadding * 2}
                height={260}
                fromZero
                chartConfig={chartConfig}
                style={{
                  marginVertical: 8,
                  borderRadius: 16,
                }}
                bezier
                onDataPointClick={(dp) => {
                  const samePoint =
                    tooltip.visible &&
                    tooltip.index === dp.index &&
                    tooltip.x === dp.x &&
                    tooltip.y === dp.y;

                  if (samePoint) {
                    setTooltip((prev) => ({ ...prev, visible: false }));
                  } else {
                    setTooltip({
                      x: dp.x,
                      y: dp.y,
                      visible: true,
                      index: dp.index,
                    });
                  }
                }}
                decorator={() => {
                  if (!tooltip.visible || tooltip.index == null) return null;

                  const idx = tooltip.index;
                  const monthLabel = labels[idx];
                  const totalExpense = expenseData[idx];
                  const totalIncome = incomeData[idx];
                  const items = monthlyDetails[idx] || [];
                  const first = items[0];

                  return (
                    <View
                      style={[
                        styles.tooltip,
                        {
                          left: tooltip.x - 90,
                          top: tooltip.y - 90,
                          backgroundColor: isDarkmode ? "#020617" : "#ffffff",
                          borderColor: isDarkmode ? "#38BDF8" : "#CBD5E1",
                        },
                      ]}
                    >
                      <RNText
                        style={[
                          styles.tooltipTitle,
                          { color: textPrimary },
                        ]}
                      >
                        {monthLabel}
                      </RNText>
                      <RNText
                        style={[
                          styles.tooltipText,
                          { color: textSecondary },
                        ]}
                      >
                        Income: {totalIncome.toFixed(2)}
                      </RNText>
                      <RNText
                        style={[
                          styles.tooltipText,
                          { color: textSecondary },
                        ]}
                      >
                        Expense: {totalExpense.toFixed(2)}
                      </RNText>
                      {first ? (
                        <>
                          <RNText
                            style={[
                              styles.tooltipText,
                              { color: textSecondary },
                            ]}
                          >
                            1st expense: {first.amount.toFixed(2)} (
                            {first.account || "-"})
                          </RNText>
                          {items.length > 1 && (
                            <RNText
                              style={[
                                styles.tooltipMore,
                                { color: mutedText },
                              ]}
                            >
                              + {items.length - 1} more expense(s)
                            </RNText>
                          )}
                        </>
                      ) : null}
                    </View>
                  );
                }}
              />
            )}

            {/* Detail list (expense-focused) */}
            {tooltip.visible && tooltip.index != null && (
              <View
                style={[
                  styles.detailCard,
                  {
                    borderColor: cardBorder,
                  },
                ]}
              >
                <RNText
                  style={[styles.detailTitle, { color: textPrimary }]}
                >
                  {labels[tooltip.index]} expenses
                </RNText>
                {monthlyDetails[tooltip.index].length === 0 ? (
                  <RNText style={[styles.detailLine, { color: textSecondary }]}>
                    No expense records.
                  </RNText>
                ) : (
                  monthlyDetails[tooltip.index].map((item, i) => (
                    <View key={i} style={styles.detailRow}>
                      <RNText
                        style={[styles.detailLine, { color: textSecondary }]}
                      >
                        {item.date} · {item.account || "Unknown account"}
                      </RNText>
                      <RNText
                        style={[styles.detailLine, { color: mutedText }]}
                      >
                        Note: {item.note || "-"}
                      </RNText>
                      <RNText
                        style={[
                          styles.detailAmount,
                          { color: "#F97316" },
                        ]}
                      >
                        Amount: {item.amount.toFixed(2)}
                      </RNText>
                    </View>
                  ))
                )}
              </View>
            )}
          </Card>

          {/* Pie charts with month filter */}
          <Card
            style={{
              marginTop: Theme.spacing.md,
              borderWidth: 1,
              borderColor: cardBorder,
            }}
          >
            <RNText style={[styles.sectionTitle, { color: textPrimary }]}>
              Category Breakdown by Month
            </RNText>
            <RNText style={[styles.sectionSubtitle, { color: mutedText }]}>
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

            {/* Income pie */}
            <View style={styles.pieCard}>
              <RNText
                style={[styles.pieTitle, { color: "#22C55E" }]}
              >
                Income by Category
              </RNText>
              {incomePieData.length === 0 ? (
                <RNText style={[styles.noDataText, { color: mutedText }]}>
                  No income data for this month
                </RNText>
              ) : (
                <PieChart
                  data={incomePieData}
                  width={
                    screenWidth - 16 - Theme.spacing.screenPadding * 2
                  }
                  height={220}
                  chartConfig={chartConfig}
                  accessor={"population"}
                  backgroundColor={"transparent"}
                  paddingLeft={"10"}
                  transparent={true}
                  absolute={false}
                />
              )}
            </View>

            {/* Expense pie */}
            <View style={styles.pieCard}>
              <RNText
                style={[styles.pieTitle, { color: "#F97316" }]}
              >
                Expense by Category
              </RNText>
              {expensePieData.length === 0 ? (
                <RNText style={[styles.noDataText, { color: mutedText }]}>
                  No expense data for this month
                </RNText>
              ) : (
                <PieChart
                  data={expensePieData}
                  width={
                    screenWidth - 16 - Theme.spacing.screenPadding * 2
                  }
                  height={220}
                  chartConfig={chartConfig}
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
        styles.modeButton,
        active
          ? {
              backgroundColor: "#38BDF8",
              borderColor: "#38BDF8",
            }
          : {
              borderColor: isDarkmode ? "#4B5563" : "#D1D5DB",
              backgroundColor: isDarkmode ? "#020617" : "#F3F4F6",
            },
      ]}
      activeOpacity={0.9}
    >
      <RNText
        style={[
          styles.modeButtonText,
          {
            color: active
              ? "#0F172A"
              : isDarkmode
              ? "#E5E7EB"
              : "#4B5563",
          },
        ]}
      >
        {label}
      </RNText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.lg,
  },
  headerTitle: {
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  themeToggle: {
    width: 34,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#38BDF8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  chartCard: {
    paddingBottom: Theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  modeToggleRow: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 6,
    marginHorizontal: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  tooltip: {
    position: "absolute",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 200,
  },
  tooltipTitle: {
    fontSize: 11,
    fontWeight: "bold",
    marginBottom: 2,
  },
  tooltipText: {
    fontSize: 10,
  },
  tooltipMore: {
    fontSize: 9,
    marginTop: 2,
    fontStyle: "italic",
  },
  detailCard: {
    marginTop: 4,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  detailTitle: {
    fontWeight: "bold",
    marginBottom: 6,
  },
  detailRow: {
    marginBottom: 6,
  },
  detailLine: {
    fontSize: 12,
  },
  detailAmount: {
    fontSize: 12,
    fontWeight: "600",
  },
  monthPickerContainer: {
    marginTop: 6,
    marginBottom: 4,
  },
  pieCard: {
    marginTop: 10,
  },
  pieTitle: {
    fontWeight: "600",
    marginBottom: 6,
    fontSize: 14,
    textAlign: "center",
  },
  noDataText: {
    textAlign: "center",
    fontSize: 12,
    marginTop: 12,
  },
});

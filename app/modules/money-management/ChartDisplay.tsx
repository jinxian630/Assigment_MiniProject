import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "src/types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { LineChart, PieChart } from "react-native-chart-kit";
import { Text, Picker } from "react-native-rapi-ui";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { Theme } from "@/constants/theme";

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

type Props = NativeStackScreenProps<MainStackParamList, "ChartDisplay">;

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

export default function ChartDisplayScreen({ navigation }: Props) {
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

  // Mode: both / income / expense
  const [lineMode, setLineMode] = useState<LineMode>("both");

  // Category breakdown per month
  const [incomeCatByMonth, setIncomeCatByMonth] = useState<
    Record<string, number>[]
  >(Array.from({ length: 12 }, () => ({})));
  const [expenseCatByMonth, setExpenseCatByMonth] = useState<
    Record<string, number>[]
  >(Array.from({ length: 12 }, () => ({})));

  // Month selection for pie charts
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

          // Category breakdown for current year
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
      "#ff7f50",
      "#4b7bec",
      "#20bf6b",
      "#a55eea",
      "#f7b731",
      "#eb3b5a",
      "#778ca3",
      "#fd9644",
    ];

    return entries.map(([name, value], index) => ({
      name,
      population: value,
      color: palette[index % palette.length],
      legendFontColor: "#333",
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
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#eff3ff",
    backgroundGradientTo: "#efefef",
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0,0,0,${opacity})`,
    labelColor: (opacity = 1) => `rgba(0,0,0,${opacity})`,
    style: {
      borderRadius: 16,
    },
  };

  // Build datasets & legend based on lineMode
  let lineDatasets: any[] = [];
  let lineLegend: string[] = [];

  if (lineMode === "expense") {
    lineDatasets = [
      {
        data: expenseData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
      },
    ];
    lineLegend = ["Expense"];
  } else if (lineMode === "income") {
    lineDatasets = [
      {
        data: incomeData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(46, 139, 87, ${opacity})`,
      },
    ];
    lineLegend = ["Income"];
  } else {
    lineDatasets = [
      {
        data: expenseData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(231, 76, 60, ${opacity})`,
      },
      {
        data: incomeData,
        strokeWidth: 2,
        color: (opacity = 1) => `rgba(46, 139, 87, ${opacity})`,
      },
    ];
    lineLegend = ["Expense", "Income"];
  }

  // Header
  const renderHeader = () => (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => navigation.goBack()}
      />
      <Text style={styles.headerTitle}>Spending Insights</Text>
      <View style={{ width: 48 }} />
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
          <Card style={styles.chartCard}>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.sectionTitle}>
                Monthly Income vs Expense
              </Text>
            </View>

            {/* Mode toggle */}
            <View style={styles.modeToggleRow}>
              <ModeButton
                label="Both"
                active={lineMode === "both"}
                onPress={() => setLineMode("both")}
              />
              <ModeButton
                label="Income"
                active={lineMode === "income"}
                onPress={() => setLineMode("income")}
              />
              <ModeButton
                label="Expense"
                active={lineMode === "expense"}
                onPress={() => setLineMode("expense")}
              />
            </View>

            {!hasAnyData ? (
              <View style={styles.center}>
                <Text>No transaction data found</Text>
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
                          backgroundColor: "#fff",
                        },
                      ]}
                    >
                      <Text style={styles.tooltipTitle}>{monthLabel}</Text>
                      <Text style={styles.tooltipText}>
                        Income: {totalIncome.toFixed(2)}
                      </Text>
                      <Text style={styles.tooltipText}>
                        Expense: {totalExpense.toFixed(2)}
                      </Text>
                      {first ? (
                        <>
                          <Text style={styles.tooltipText}>
                            1st expense: {first.amount.toFixed(2)} (
                            {first.account || "-"})
                          </Text>
                          {items.length > 1 && (
                            <Text style={styles.tooltipMore}>
                              + {items.length - 1} more expense(s)
                            </Text>
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
              <View style={styles.detailCard}>
                <Text style={styles.detailTitle}>
                  {labels[tooltip.index]} expenses
                </Text>
                {monthlyDetails[tooltip.index].length === 0 ? (
                  <Text style={styles.detailLine}>No expense records.</Text>
                ) : (
                  monthlyDetails[tooltip.index].map((item, i) => (
                    <View key={i} style={styles.detailRow}>
                      <Text style={styles.detailLine}>
                        {item.date} · {item.account || "Unknown account"}
                      </Text>
                      <Text style={styles.detailLine}>
                        Note: {item.note || "-"}
                      </Text>
                      <Text style={styles.detailAmount}>
                        Amount: {item.amount.toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </Card>

          {/* Pie charts with month filter */}
          <Card style={{ marginTop: Theme.spacing.md }}>
            <Text style={styles.sectionTitle}>Category Breakdown by Month</Text>
            <Text style={styles.sectionSubtitle}>
              Select month for income/expense category charts
            </Text>

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
              <Text style={[styles.pieTitle, { color: "#2e8b57" }]}>
                Income by Category
              </Text>
              {incomePieData.length === 0 ? (
                <Text style={styles.noDataText}>
                  No income data for this month
                </Text>
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
                  absolute={false}
                />
              )}
            </View>

            {/* Expense pie */}
            <View style={styles.pieCard}>
              <Text style={[styles.pieTitle, { color: "#e74c3c" }]}>
                Expense by Category
              </Text>
              {expensePieData.length === 0 ? (
                <Text style={styles.noDataText}>
                  No expense data for this month
                </Text>
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

// Toggle button
function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.modeButton,
        active ? styles.modeButtonActive : null,
      ]}
      activeOpacity={0.9}
    >
      <Text
        style={[
          styles.modeButtonText,
          { color: active ? "#fff" : "#555" },
        ]}
      >
        {label}
      </Text>
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
    color: Theme.colors.textPrimary,
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
    opacity: 0.8,
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
    borderColor: "#ccc",
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#4b7bec",
    borderColor: "#4b7bec",
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
    borderColor: "#ccc",
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
    borderColor: "#ddd",
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
    opacity: 0.7,
    marginTop: 12,
  },
});

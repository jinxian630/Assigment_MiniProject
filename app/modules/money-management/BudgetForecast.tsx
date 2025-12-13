import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Text as RNText,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useRouter } from "expo-router";

import { GradientBackground } from "@/components/common/GradientBackground";
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
  orderBy,
} from "firebase/firestore";

import { MoneyHeader, getMoneyColors, toggleThemeSafe } from "./MoneyUI";

type Tx = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  dateTime?: number;
};

const screenWidth = Dimensions.get("window").width;

const MONTHS = [
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

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function linearForecast(lastN: number[]) {
  const n = lastN.length;
  if (n === 0) return 0;
  if (n === 1) return lastN[0];

  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += lastN[i];
    sumXY += i * lastN[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  const pred = a + b * n;
  return Number.isFinite(pred) ? Math.max(0, pred) : 0;
}

export default function BudgetForecastScreen({ navigation }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const theme = useTheme() as any;
  const isDarkmode = !!theme?.isDarkmode;
  const {
    textPrimary,
    textSecondary,
    mutedText,
    cardBorder,
    cardBg,
    success,
    danger,
  } = getMoneyColors(isDarkmode);
  const onToggleTheme = () => toggleThemeSafe(theme, isDarkmode);

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Tx[]>([]);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "Expenses"),
      where("createdBy", "==", user.uid),
      orderBy("dateTime", "asc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Tx[] = [];
        snap.forEach((d) => {
          const x = d.data() as any;
          list.push({
            id: d.id,
            type: x.type === "Income" ? "Income" : "Expense",
            amount: Number(x.amount || 0),
            dateTime: x.dateTime,
          });
        });
        setItems(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [auth, db]);

  const model = useMemo(() => {
    const monthly: Record<
      string,
      { income: number; expense: number; label: string; ts: number }
    > = {};

    for (const t of items) {
      if (!t.dateTime) continue;
      const d = new Date(t.dateTime);
      const key = ymKey(d);
      if (!monthly[key]) {
        monthly[key] = {
          income: 0,
          expense: 0,
          label: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
          ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        };
      }
      if (t.type === "Income") monthly[key].income += t.amount;
      else monthly[key].expense += t.amount;
    }

    const sorted = Object.entries(monthly)
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => a.ts - b.ts);

    const last3 = sorted.slice(Math.max(0, sorted.length - 3));
    const lastIncome = last3.map((x) => x.income);
    const lastExpense = last3.map((x) => x.expense);

    const nextIncome = linearForecast(lastIncome);
    const nextExpense = linearForecast(lastExpense);

    const incomePreds: number[] = [];
    const expensePreds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const incBase = lastIncome.concat(incomePreds).slice(-3);
      const expBase = lastExpense.concat(expensePreds).slice(-3);
      incomePreds.push(linearForecast(incBase));
      expensePreds.push(linearForecast(expBase));
    }

    const chartLabels = [
      ...last3.map((x) => x.label),
      "Next+1",
      "Next+2",
      "Next+3",
    ];
    const incomeSeries = [...last3.map((x) => x.income), ...incomePreds];
    const expenseSeries = [...last3.map((x) => x.expense), ...expensePreds];
    const savingsSeries = incomeSeries.map((v, i) => v - expenseSeries[i]);

    return {
      last3,
      nextIncome,
      nextExpense,
      chartLabels,
      incomeSeries,
      expenseSeries,
      savingsSeries,
    };
  }, [items]);

  const notEnoughData = model.last3.length < 2;

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    decimalPlaces: 0,
    color: (opacity = 1) =>
      isDarkmode ? `rgba(248,250,252,${opacity})` : `rgba(15,23,42,${opacity})`,
    labelColor: (opacity = 1) =>
      isDarkmode ? `rgba(248,250,252,${opacity})` : `rgba(15,23,42,${opacity})`,
    propsForLabels: { fontSize: 10 },
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

  const predictedSavings = model.nextIncome - model.nextExpense;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <MoneyHeader
            title="Budget Forecast"
            onBack={() => nav.goBack()}
            isDarkmode={isDarkmode}
            onToggleTheme={onToggleTheme}
            textPrimary={textPrimary}
          />

          <Card
            style={[
              styles.card,
              { borderColor: cardBorder, backgroundColor: cardBg },
            ]}
          >
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>
              Prediction (Next Month)
            </RNText>
            {notEnoughData ? (
              <RNText style={{ color: mutedText, marginTop: 8 }}>
                Add at least 2 months of transactions to generate a meaningful
                forecast.
              </RNText>
            ) : (
              <>
                <RNText style={{ color: textSecondary, marginTop: 10 }}>
                  Predicted Income: RM {model.nextIncome.toFixed(2)}
                </RNText>
                <RNText style={{ color: textSecondary, marginTop: 6 }}>
                  Predicted Expense: RM {model.nextExpense.toFixed(2)}
                </RNText>
                <RNText
                  style={{
                    marginTop: 10,
                    fontWeight: "900",
                    color: predictedSavings >= 0 ? success : danger,
                  }}
                >
                  Predicted Savings: RM {predictedSavings.toFixed(2)}
                </RNText>
              </>
            )}
          </Card>

          <Card
            style={[
              styles.card,
              { borderColor: cardBorder, backgroundColor: cardBg },
            ]}
          >
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>
              Trend (Last + Next 3)
            </RNText>
            <RNText style={{ color: mutedText, marginTop: 6, fontSize: 12 }}>
              Shows Income / Expense / Savings trend based on your recent
              months.
            </RNText>

            {!notEnoughData ? (
              <LineChart
                data={{
                  labels: model.chartLabels,
                  datasets: [
                    {
                      data: model.incomeSeries,
                      color: (o = 1) => `rgba(34,197,94,${o})`,
                      strokeWidth: 2,
                    },
                    {
                      data: model.expenseSeries,
                      color: (o = 1) => `rgba(249,115,22,${o})`,
                      strokeWidth: 2,
                    },
                    {
                      data: model.savingsSeries,
                      color: (o = 1) => `rgba(56,189,248,${o})`,
                      strokeWidth: 2,
                    },
                  ],
                  legend: ["Income", "Expense", "Savings"],
                }}
                width={screenWidth - Theme.spacing.screenPadding * 2}
                height={280}
                fromZero
                chartConfig={chartConfig as any}
                style={{ marginTop: 10, borderRadius: 16 }}
                bezier
              />
            ) : (
              <RNText style={{ color: mutedText, marginTop: 12 }}>
                Not enough historical data to draw forecast chart.
              </RNText>
            )}
          </Card>

          <RNText style={{ color: mutedText, fontSize: 12 }}>
            Forecast uses a simple trend model. Add transactions consistently to
            improve accuracy.
          </RNText>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: { borderWidth: 1, marginBottom: Theme.spacing.md },
  cardTitle: { fontSize: Theme.typography.fontSizes.lg, fontWeight: "900" },
});

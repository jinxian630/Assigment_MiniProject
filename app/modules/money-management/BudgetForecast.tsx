import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Text as RNText,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { GradientBackground } from "@/components/common/GradientBackground";
import { Card } from "@/components/common/Card";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  getDocs,
} from "firebase/firestore";

import { getMoneyColors, toggleThemeSafe } from "./MoneyUI";

type Tx = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  dateTime?: number;
  account?: string; // ✅ matches TransactionAdd payload
};

type Option = { key: string; label: string };

const screenWidth = Dimensions.get("window").width;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function ymKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ymLabelFromKey(key: string) {
  const [y, m] = key.split("-").map(Number);
  const mm = Math.max(1, Math.min(12, m || 1));
  return `${MONTHS[mm - 1]} ${String(y).slice(-2)}`;
}

function safeNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

/** Simple linear trend */
function linearForecast(values: number[]) {
  const n = values.length;
  if (n === 0) return 0;
  if (n === 1) return Math.max(0, values[0]);

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  const b = denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;

  const pred = a + b * n;
  return Number.isFinite(pred) ? Math.max(0, pred) : 0;
}

/** slope helper for AI insights */
function slope(values: number[]) {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  return denom === 0 ? 0 : (n * sumXY - sumX * sumY) / denom;
}

/** icon mapping (safe + consistent idea with your add screen) */
function iconForAccount(name: string): keyof typeof Ionicons.glyphMap {
  const s = (name || "").toLowerCase();
  if (s.includes("cash")) return "cash-outline";
  if (s.includes("wallet") || s.includes("ewallet") || s.includes("e-wallet") || s.includes("tng"))
    return "phone-portrait-outline";
  if (s.includes("bank") || s.includes("maybank") || s.includes("cimb") || s.includes("rhb"))
    return "card-outline";
  if (s.includes("card") || s.includes("visa") || s.includes("master"))
    return "card-outline";
  return "wallet-outline";
}

/** neon card shell */
function neonGlow({
  isDark,
  accent,
  bg,
  border,
  heavy,
}: {
  isDark: boolean;
  accent: string;
  bg: string;
  border: string;
  heavy?: boolean;
}) {
  const glowA = isDark ? 0.55 : 0.22;
  const glowB = isDark ? 0.35 : 0.14;
  return {
    backgroundColor: isDark ? "rgba(2,6,23,0.92)" : bg,
    borderWidth: 1,
    borderColor: isDark ? `${accent}AA` : border,
    shadowColor: accent,
    shadowOpacity: heavy ? glowA : glowB,
    shadowRadius: heavy ? 18 : 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: heavy ? 10 : 6,
    borderRadius: 24,
  } as const;
}

function chipStyle(isDark: boolean, selected: boolean, accent: string) {
  return {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: selected
      ? `${accent}CC`
      : isDark
      ? "rgba(148,163,184,0.28)"
      : "rgba(15,23,42,0.12)",
    backgroundColor: selected
      ? isDark
        ? "rgba(2,6,23,0.92)"
        : "rgba(255,255,255,0.96)"
      : isDark
      ? "rgba(2,6,23,0.55)"
      : "rgba(255,255,255,0.70)",
  } as const;
}

export default function BudgetForecastScreen({ navigation }: any) {
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
        spacing: theme?.spacing ?? themeCtx?.theme?.spacing,
      },
    }),
    [themeCtx, theme, isDarkmode]
  );

  const ui = getMoneyColors(moneyThemeCtx);
  const { textPrimary, textSecondary, textMuted, cardBorder, cardBg, success, danger } = ui;

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Tx[]>([]);

  const [accountOptions, setAccountOptions] = useState<Option[]>([
    { key: "ALL", label: "All Accounts" },
  ]);
  const [selectedAccount, setSelectedAccount] = useState<string>("ALL");
  const [selectedBaseMonthKey, setSelectedBaseMonthKey] = useState<string>("");

  // Load accounts like TransactionAdd (users/{uid}/accounts)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const snap = await getDocs(
          query(collection(db, "users", user.uid, "accounts"), orderBy("createdAt", "asc"))
        );
        const names = snap.docs
          .map((d) => String((d.data() as any)?.name ?? "").trim())
          .filter(Boolean);
        const uniq = Array.from(new Set(names));
        setAccountOptions([{ key: "ALL", label: "All Accounts" }, ...uniq.map((x) => ({ key: x, label: x }))]);

        if (selectedAccount !== "ALL" && !uniq.includes(selectedAccount)) {
          setSelectedAccount("ALL");
        }
      } catch (e) {
        console.log("load accounts error", e);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, auth]);

  // Subscribe expenses
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
            amount: safeNum(x.amount),
            dateTime: safeNum(x.dateTime) || undefined,
            account: typeof x.account === "string" ? x.account : undefined,
          });
        });
        setItems(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [auth, db]);

  const filteredItems = useMemo(() => {
    if (selectedAccount === "ALL") return items;
    return items.filter((t) => (t.account || "") === selectedAccount);
  }, [items, selectedAccount]);

  const months = useMemo(() => {
    const monthly: Record<string, { income: number; expense: number; label: string; ts: number }> = {};

    for (const t of filteredItems) {
      if (!t.dateTime) continue;
      const d = new Date(t.dateTime);
      const key = ymKey(d);
      if (!monthly[key]) {
        monthly[key] = {
          income: 0,
          expense: 0,
          label: ymLabelFromKey(key),
          ts: new Date(d.getFullYear(), d.getMonth(), 1).getTime(),
        };
      }
      if (t.type === "Income") monthly[key].income += t.amount;
      else monthly[key].expense += t.amount;
    }

    return Object.entries(monthly)
      .map(([k, v]) => ({ key: k, ...v }))
      .sort((a, b) => a.ts - b.ts);
  }, [filteredItems]);

  const monthOptions = useMemo(
    () => months.map((m) => ({ key: m.key, label: m.label, ts: m.ts })),
    [months]
  );

  // auto base month = latest
  useEffect(() => {
    if (!monthOptions.length) return;
    const latest = monthOptions[monthOptions.length - 1]?.key;
    if (!selectedBaseMonthKey) setSelectedBaseMonthKey(latest);
    if (selectedBaseMonthKey && !monthOptions.some((m) => m.key === selectedBaseMonthKey)) {
      setSelectedBaseMonthKey(latest);
    }
  }, [monthOptions, selectedBaseMonthKey]);

  const model = useMemo(() => {
    if (!months.length) {
      return {
        ok: false,
        last3: [] as any[],
        labels: [] as string[],
        incomeSeries: [] as number[],
        expenseSeries: [] as number[],
        savingsSeries: [] as number[],
        nextIncome: 0,
        nextExpense: 0,
        ai: ["No transactions yet for this selection."],
      };
    }

    let baseIdx = months.length - 1;
    if (selectedBaseMonthKey) {
      const idx = months.findIndex((m) => m.key === selectedBaseMonthKey);
      if (idx >= 0) baseIdx = idx;
    }

    const start = Math.max(0, baseIdx - 2);
    const last3 = months.slice(start, baseIdx + 1);

    const lastIncome = last3.map((x) => x.income);
    const lastExpense = last3.map((x) => x.expense);
    const enough = last3.length >= 2;

    const nextIncome = enough ? linearForecast(lastIncome) : (lastIncome[lastIncome.length - 1] ?? 0);
    const nextExpense = enough ? linearForecast(lastExpense) : (lastExpense[lastExpense.length - 1] ?? 0);

    const incomePreds: number[] = [];
    const expensePreds: number[] = [];
    for (let i = 0; i < 3; i++) {
      const incBase = lastIncome.concat(incomePreds).slice(-3);
      const expBase = lastExpense.concat(expensePreds).slice(-3);
      incomePreds.push(enough ? linearForecast(incBase) : (incBase[incBase.length - 1] ?? 0));
      expensePreds.push(enough ? linearForecast(expBase) : (expBase[expBase.length - 1] ?? 0));
    }

    const labels = [...last3.map((x) => x.label), "Next+1", "Next+2", "Next+3"];
    const incomeSeries = [...lastIncome, ...incomePreds];
    const expenseSeries = [...lastExpense, ...expensePreds];
    const savingsSeries = incomeSeries.map((v, i) => v - expenseSeries[i]);

    // AI insights
    const predictedSavings = nextIncome - nextExpense;
    const lastSavings = (lastIncome[lastIncome.length - 1] ?? 0) - (lastExpense[lastExpense.length - 1] ?? 0);

    const historyWindow = months.slice(Math.max(0, baseIdx - 5), baseIdx + 1);
    const histIncome = historyWindow.map((m) => m.income);
    const histExpense = historyWindow.map((m) => m.expense);

    const incSlope = slope(histIncome);
    const expSlope = slope(histExpense);

    const ai: string[] = [];
    if (!enough) {
      ai.push("Not enough monthly history yet — add at least 2 months for better forecasting.");
    } else {
      if (expSlope > incSlope && expSlope > 0) ai.push("Expenses are rising faster than income — watch spending growth.");
      else if (incSlope > expSlope && incSlope > 0) ai.push("Income trend is improving faster than expenses — good savings momentum.");

      if (predictedSavings < 0) ai.push("Forecast suggests a possible deficit next month. Consider cutting non-essential categories.");
      else if (predictedSavings > 0 && predictedSavings >= lastSavings) ai.push("Savings outlook is positive and improving.");
      else if (predictedSavings > 0 && predictedSavings < lastSavings) ai.push("Savings stays positive but may weaken slightly.");
    }

    return {
      ok: true,
      last3,
      labels,
      incomeSeries,
      expenseSeries,
      savingsSeries,
      nextIncome,
      nextExpense,
      ai,
    };
  }, [months, selectedBaseMonthKey]);

  const notEnoughData = model.last3.length < 2;
  const predictedSavings = model.nextIncome - model.nextExpense;

  const chartConfig = useMemo(
    () => ({
      backgroundColor: "transparent",
      backgroundGradientFrom: "transparent",
      backgroundGradientTo: "transparent",
      decimalPlaces: 0,
      color: (opacity = 1) =>
        isDarkmode ? `rgba(248,250,252,${opacity})` : `rgba(15,23,42,${opacity})`,
      labelColor: (opacity = 1) =>
        isDarkmode ? `rgba(248,250,252,${opacity})` : `rgba(15,23,42,${opacity})`,
      propsForLabels: { fontSize: 10 },
    }),
    [isDarkmode]
  );

  const sp = theme?.spacing ?? themeCtx?.theme?.spacing ?? { screenPadding: 16, md: 12, xxl: 26 };
  const styles = useMemo(() => makeStyles(sp), [sp]);

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
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <IconButton icon="arrow-back" variant="secondary" size="medium" onPress={() => nav.goBack()} />
            <RNText style={[styles.headerTitle, { color: textPrimary }]}>Budget Forecast</RNText>

            <TouchableOpacity
              onPress={() => toggleThemeSafe(moneyThemeCtx)}
              activeOpacity={0.85}
              style={[
                styles.themeToggle,
                {
                  borderColor: "#FFD93D",
                  backgroundColor: isDarkmode ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.75)",
                },
              ]}
            >
              <Ionicons
                name={isDarkmode ? "sunny-outline" : "moon-outline"}
                size={18}
                color={isDarkmode ? "#FDE68A" : "#0F172A"}
              />
            </TouchableOpacity>
          </View>

          {/* Controls */}
          <Card style={[styles.card, neonGlow({ isDark: isDarkmode, accent: "#A855F7", bg: cardBg, border: cardBorder })]}>
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Forecast Controls</RNText>

            <RNText style={[styles.sectionLabel, { color: textSecondary }]}>Account</RNText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {accountOptions.map((a, index) => {
                const active = selectedAccount === a.key;
                const icon = a.key === "ALL" ? ("layers-outline" as const) : iconForAccount(a.label);

                return (
                  <TouchableOpacity
                    key={`${a.key}-${index}`}   // ✅ index is defined here, so no crash
                    activeOpacity={0.9}
                    onPress={() => setSelectedAccount(a.key)}
                    style={[
                      chipStyle(isDarkmode, active, "#A855F7"),
                      active
                        ? {
                            shadowColor: "#A855F7",
                            shadowOpacity: isDarkmode ? 0.45 : 0.18,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 0 },
                            elevation: 6,
                          }
                        : null,
                    ]}
                  >
                    <Ionicons name={icon} size={16} color={active ? "#A855F7" : textMuted} />
                    <RNText
                      numberOfLines={1}
                      style={{
                        color: active ? textPrimary : textSecondary,
                        fontWeight: active ? "900" : "700",
                        fontSize: 12,
                        maxWidth: 160,
                      }}
                    >
                      {a.label}
                    </RNText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <RNText style={[styles.sectionLabel, { color: textSecondary, marginTop: 6 }]}>Base Month</RNText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {monthOptions.map((m, index) => {
                const active = selectedBaseMonthKey === m.key;
                return (
                  <TouchableOpacity
                    key={`${m.key}-${index}`}   // ✅ index defined
                    activeOpacity={0.9}
                    onPress={() => setSelectedBaseMonthKey(m.key)}
                    style={[
                      chipStyle(isDarkmode, active, "#38BDF8"),
                      active
                        ? {
                            shadowColor: "#38BDF8",
                            shadowOpacity: isDarkmode ? 0.45 : 0.18,
                            shadowRadius: 10,
                            shadowOffset: { width: 0, height: 0 },
                            elevation: 6,
                          }
                        : null,
                    ]}
                  >
                    <Ionicons name="calendar-outline" size={16} color={active ? "#38BDF8" : textMuted} />
                    <RNText
                      numberOfLines={1}
                      style={{
                        color: active ? textPrimary : textSecondary,
                        fontWeight: active ? "900" : "700",
                        fontSize: 12,
                      }}
                    >
                      {m.label}
                    </RNText>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {!monthOptions.length ? (
              <RNText style={{ color: textMuted, fontSize: 12, marginTop: 8 }}>
                No monthly data found for this selection yet.
              </RNText>
            ) : null}
          </Card>

          {/* Prediction + AI */}
          <Card style={[styles.card, neonGlow({ isDark: isDarkmode, accent: "#FFD93D", bg: cardBg, border: cardBorder, heavy: true })]}>
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Next Month Prediction</RNText>

            {notEnoughData ? (
              <RNText style={{ color: textMuted, marginTop: 10 }}>
                Add at least 2 months of transactions (for this account) to generate a meaningful forecast.
              </RNText>
            ) : (
              <>
                <RNText style={{ color: textSecondary, marginTop: 12 }}>
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

                <View style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons
                      name="sparkles-outline"
                      size={16}
                      color={isDarkmode ? "rgba(253,230,138,1)" : "rgba(15,23,42,0.8)"}
                    />
                    <RNText style={{ color: textPrimary, fontWeight: "900" }}>AI Insights</RNText>
                  </View>

                  <View style={{ marginTop: 8, gap: 6 }}>
                    {model.ai.map((line, index) => (
                      <View key={`${index}-${line}`} style={{ flexDirection: "row", gap: 8 }}>
                        <RNText style={{ color: textMuted, fontWeight: "900" }}>•</RNText>
                        <RNText style={{ color: textSecondary, flex: 1 }}>{line}</RNText>
                      </View>
                    ))}
                  </View>

                  <RNText style={{ color: textMuted, fontSize: 11, marginTop: 10 }}>
                    Trend-based forecast using your recent monthly history.
                  </RNText>
                </View>
              </>
            )}
          </Card>

          {/* Chart */}
          <Card style={[styles.card, neonGlow({ isDark: isDarkmode, accent: "#38BDF8", bg: cardBg, border: cardBorder })]}>
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Trend (Base + Next 3)</RNText>
            <RNText style={{ color: textMuted, marginTop: 6, fontSize: 12 }}>
              Income / Expense / Savings based on the selected base month window.
            </RNText>

            {!notEnoughData ? (
              <LineChart
                data={{
                  labels: model.labels,
                  datasets: [
                    { data: model.incomeSeries, color: (o = 1) => `rgba(34,197,94,${o})`, strokeWidth: 2 },
                    { data: model.expenseSeries, color: (o = 1) => `rgba(249,115,22,${o})`, strokeWidth: 2 },
                    { data: model.savingsSeries, color: (o = 1) => `rgba(56,189,248,${o})`, strokeWidth: 2 },
                  ],
                  legend: ["Income", "Expense", "Savings"],
                }}
                width={screenWidth - (sp.screenPadding ?? 16) * 2}
                height={280}
                fromZero
                chartConfig={chartConfig as any}
                style={{ marginTop: 10, borderRadius: 16 }}
                bezier
              />
            ) : (
              <RNText style={{ color: textMuted, marginTop: 12 }}>
                Not enough historical data to draw forecast chart.
              </RNText>
            )}
          </Card>

          <RNText style={{ color: textMuted, fontSize: 12 }}>
            Add transactions consistently to improve forecast accuracy.
          </RNText>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function makeStyles(sp: any) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: sp?.screenPadding ?? 16,
      paddingTop: sp?.md ?? 12,
      paddingBottom: sp?.xxl ?? 26,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: sp?.md ?? 12,
      gap: 10,
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
    card: { marginBottom: sp?.md ?? 12 },
    cardTitle: { fontSize: 15, fontWeight: "900" },
    sectionLabel: { marginTop: 10, fontSize: 12, fontWeight: "900" },
    chipRow: {
      paddingVertical: 6,
      gap: 10,
      paddingRight: 10,
      paddingLeft: 2,
      flexDirection: "row",
      alignItems: "center",
    },
  });
}

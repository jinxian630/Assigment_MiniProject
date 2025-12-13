import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { Badge } from "@/components/common/Badge";
import { Theme } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

import { getMoneyColors, toggleThemeSafe } from "./MoneyUI";

import {
  getFirestore,
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const MODULE_COLOR = "#FFD93D";

/**
 * =========================
 * FIELD MAPPING (edit here if needed)
 * =========================
 * Expected doc example:
 * {
 *   userId: string,
 *   amount: number,
 *   type: "income" | "expense",
 *   createdAt: number | Timestamp | Date,
 *   category?: string
 * }
 */
const TX_COLLECTION = "Transactions";
const FIELD_USER_ID = "userId";
const FIELD_AMOUNT = "amount";
const FIELD_TYPE = "type";
const FIELD_CREATED_AT = "createdAt";

type TxType = {
  id: string;
  userId?: string;
  amount?: number;
  type?: string;
  createdAt?: any;
  category?: string;
};

function toMillis(v: any): number {
  if (!v) return 0;
  if (typeof v === "number") return v;
  if (v instanceof Date) return v.getTime();
  if (v instanceof Timestamp) return v.toMillis?.() ?? 0;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  return 0;
}

function formatRM(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  const sign = safe < 0 ? "-" : "";
  return `${sign}RM ${Math.abs(safe).toLocaleString("en-MY")}`;
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

function prevMonthKey(d: Date) {
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m === 0) return `${y - 1}-11`;
  return `${y}-${m - 1}`;
}

function pctChange(current: number, prev: number) {
  if (!Number.isFinite(current) || !Number.isFinite(prev)) return 0;
  if (prev === 0) return current === 0 ? 0 : 100; // "new activity"
  return ((current - prev) / Math.abs(prev)) * 100;
}

export default function MoneyManagementScreen() {
  const router = useRouter();

  // ✅ Your useTheme() returns ThemeContext object (contains { theme, toggleTheme })
  const themeCtx = useTheme() as any;
  const theme = themeCtx.theme;

  // ✅ Money UI tokens (cardBg becomes dark in dark mode)
  const ui = getMoneyColors(themeCtx);
  const {
    isDarkmode,
    cardBg,
    cardBorder,
    chipBg,
    textPrimary,
    textSecondary,
    textMuted,
  } = ui;

  const onToggleTheme = () => toggleThemeSafe(themeCtx);

  // -------------------------
  // Totals
  // -------------------------
  const [balance, setBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);

  // Trend baseline (previous month)
  const [prevIncome, setPrevIncome] = useState(0);
  const [prevExpense, setPrevExpense] = useState(0);

  const [topCategories, setTopCategories] = useState<string[]>([
    "Food",
    "Transport",
    "Shopping",
    "Bills",
    "Entertainment",
    "Health",
    "Education",
    "Others",
  ]);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = getAuth().currentUser?.uid;
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const db = getFirestore();
    const q = query(
      collection(db, TX_COLLECTION),
      where(FIELD_USER_ID as any, "==", uid),
      orderBy(FIELD_CREATED_AT as any, "desc"),
      limit(500)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: TxType[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        let bal = 0;
        let curIncome = 0;
        let curExpense = 0;

        let lastIncome = 0;
        let lastExpense = 0;

        const now = new Date();
        const curKey = monthKey(now);
        const lastKey = prevMonthKey(now);

        const catCount = new Map<string, number>();

        for (const r of rows) {
          const amount = Number((r as any)?.[FIELD_AMOUNT]);
          if (!Number.isFinite(amount)) continue;

          const type = String((r as any)?.[FIELD_TYPE] ?? "").toLowerCase();
          const createdAt = (r as any)?.[FIELD_CREATED_AT];
          const t = toMillis(createdAt);
          const d = t ? new Date(t) : null;

          const isIncomeTx = type === "income";
          const isExpenseTx = type === "expense";

          // balance (overall)
          if (isIncomeTx) bal += amount;
          else if (isExpenseTx) bal -= amount;
          else bal += amount;

          if (!d) continue;
          const mk = monthKey(d);

          if (mk === curKey) {
            if (isIncomeTx) curIncome += amount;
            else if (isExpenseTx) curExpense += amount;
          } else if (mk === lastKey) {
            if (isIncomeTx) lastIncome += amount;
            else if (isExpenseTx) lastExpense += amount;
          }

          // categories this month (expense only)
          if (mk === curKey && (isExpenseTx || (!isIncomeTx && amount < 0))) {
            const rawCat = String((r as any)?.category ?? "Others");
            const cat = rawCat.trim().length ? rawCat.trim() : "Others";
            catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
          }
        }

        setBalance(bal);
        setMonthIncome(curIncome);
        setMonthExpense(curExpense);
        setPrevIncome(lastIncome);
        setPrevExpense(lastExpense);

        const sortedCats = [...catCount.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([name]) => name);

        if (sortedCats.length >= 3) setTopCategories(sortedCats);

        setIsLoading(false);
      },
      () => setIsLoading(false)
    );

    return () => unsub();
  }, []);

  const monthNet = useMemo(
    () => monthIncome - monthExpense,
    [monthIncome, monthExpense]
  );

  // -------------------------
  // Count-up animation (premium feel)
  // -------------------------
  const animBalance = useRef(new Animated.Value(0)).current;
  const animIncome = useRef(new Animated.Value(0)).current;
  const animExpense = useRef(new Animated.Value(0)).current;
  const animNet = useRef(new Animated.Value(0)).current;

  const [balanceText, setBalanceText] = useState("RM 0");
  const [incomeText, setIncomeText] = useState("RM 0");
  const [expenseText, setExpenseText] = useState("RM 0");
  const [netText, setNetText] = useState("RM 0");

  useEffect(() => {
    const s1 = animBalance.addListener(({ value }) =>
      setBalanceText(formatRM(value))
    );
    const s2 = animIncome.addListener(({ value }) =>
      setIncomeText(formatRM(value))
    );
    const s3 = animExpense.addListener(({ value }) =>
      setExpenseText(formatRM(value))
    );
    const s4 = animNet.addListener(({ value }) => setNetText(formatRM(value)));

    return () => {
      animBalance.removeListener(s1);
      animIncome.removeListener(s2);
      animExpense.removeListener(s3);
      animNet.removeListener(s4);
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animBalance, {
        toValue: balance,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animIncome, {
        toValue: monthIncome,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animExpense, {
        toValue: monthExpense,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(animNet, {
        toValue: monthNet,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [balance, monthIncome, monthExpense, monthNet]);

  // -------------------------
  // Smart tip
  // -------------------------
  const smartTip = useMemo(() => {
    if (isLoading) return "Loading your snapshot…";
    if (monthExpense <= 0 && monthIncome <= 0)
      return "Add your first transaction to unlock insights and forecasts.";
    if (monthExpense > monthIncome)
      return "Your spending is higher than income this month. Consider setting a tighter budget.";
    if (monthExpense > 0 && monthExpense / Math.max(monthIncome, 1) > 0.7)
      return "You’re using >70% of your income. Try tracking essentials vs. lifestyle spending.";
    return "Great control. Keep logging daily for more accurate advice and forecasts.";
  }, [isLoading, monthExpense, monthIncome]);

  // -------------------------
  // Trends (this month vs last month)
  // -------------------------
  const incomeDelta = useMemo(
    () => pctChange(monthIncome, prevIncome),
    [monthIncome, prevIncome]
  );
  const expenseDelta = useMemo(
    () => pctChange(monthExpense, prevExpense),
    [monthExpense, prevExpense]
  );

  // net “delta” (derived)
  const prevNet = useMemo(
    () => prevIncome - prevExpense,
    [prevIncome, prevExpense]
  );
  const netDelta = useMemo(
    () => pctChange(monthNet, prevNet),
    [monthNet, prevNet]
  );

  // Routes (keep yours)
  const goToAddTransaction = () =>
    router.push("/modules/money-management/TransactionAdd");
  const goToTransactionList = () =>
    router.push("/modules/money-management/TransactionList");
  const goToChartDisplay = () =>
    router.push("/modules/money-management/ChartDisplay");
  const goToFinancialAdvice = () =>
    router.push("/modules/money-management/FinancialAdvice");
  const goToBudgetForecast = () =>
    router.push("/modules/money-management/BudgetForecast");
  const goToPrint = () =>
    router.push("/modules/money-management/PrintTransactionList");

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.pageContainer}>
            {/* Header */}
            <View style={styles.header}>
              <IconButton
                icon="arrow-back"
                onPress={() => router.back()}
                variant="secondary"
                size="medium"
              />

              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={[styles.title, { color: textPrimary }]}>
                  Money Management
                </Text>
                <Text style={[styles.subtitle, { color: textSecondary }]}>
                  Control • Insight • Growth
                </Text>
              </View>

              <TouchableOpacity
                onPress={onToggleTheme}
                activeOpacity={0.85}
                style={[
                  styles.themeToggle,
                  {
                    borderColor: MODULE_COLOR,
                    backgroundColor: isDarkmode
                      ? "rgba(15,23,42,0.65)"
                      : "rgba(255,255,255,0.75)",
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

            {/* Snapshot */}
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                Financial Snapshot
              </Text>

              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Ionicons
                  name="pulse-outline"
                  size={14}
                  color={textSecondary}
                />
                <Text style={[styles.miniHint, { color: textSecondary }]}>
                  {isLoading ? "Syncing…" : "Updated"}
                </Text>
              </View>
            </View>

            <View style={styles.snapshotGrid}>
              <StatCard
                label="Balance"
                valueText={balanceText}
                icon="wallet-outline"
                accent="#38BDF8"
                onPress={goToTransactionList}
                trendText={"—"}
                trendTone="neutral"
                {...{
                  cardBg,
                  cardBorder,
                  textPrimary,
                  textSecondary,
                  isDarkmode,
                }}
              />

              <StatCard
                label="Income (Month)"
                valueText={incomeText}
                icon="trending-up-outline"
                accent="#22c55e"
                onPress={goToChartDisplay}
                trendText={formatTrend(incomeDelta)}
                trendTone={incomeDelta >= 0 ? "good" : "bad"}
                {...{
                  cardBg,
                  cardBorder,
                  textPrimary,
                  textSecondary,
                  isDarkmode,
                }}
              />

              <StatCard
                label="Expense (Month)"
                valueText={expenseText}
                icon="trending-down-outline"
                accent="#ef4444"
                onPress={goToChartDisplay}
                // For expenses: higher is “bad”, lower is “good”
                trendText={formatTrend(expenseDelta)}
                trendTone={expenseDelta <= 0 ? "good" : "bad"}
                {...{
                  cardBg,
                  cardBorder,
                  textPrimary,
                  textSecondary,
                  isDarkmode,
                }}
              />

              <StatCard
                label={monthNet >= 0 ? "Net Saving" : "Net Spend"}
                valueText={netText}
                icon="analytics-outline"
                accent={monthNet >= 0 ? "#22c55e" : "#ef4444"}
                onPress={goToBudgetForecast}
                trendText={formatTrend(netDelta)}
                trendTone={netDelta >= 0 ? "good" : "bad"}
                {...{
                  cardBg,
                  cardBorder,
                  textPrimary,
                  textSecondary,
                  isDarkmode,
                }}
              />
            </View>

            {/* Smart Tip */}
            <Card
              style={[
                styles.highlightCard,
                neonGlowStyle({
                  isDarkmode,
                  accent: MODULE_COLOR,
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                }),
              ]}
            >
              <View style={styles.highlightRow}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <View style={styles.dot} />
                  <Text style={[styles.highlightTitle, { color: textPrimary }]}>
                    Smart Tip
                  </Text>
                </View>
                <Text
                  style={{
                    color: MODULE_COLOR,
                    fontWeight: "900",
                    letterSpacing: 0.5,
                  }}
                >
                  LIVE
                </Text>
              </View>
              <Text style={[styles.highlightText, { color: textSecondary }]}>
                {smartTip}
              </Text>
            </Card>

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              Quick Actions
            </Text>

            <View style={styles.row}>
              <ActionCard
                icon="add-circle-outline"
                iconColor="#ff7f50"
                title="Add Transaction"
                subtitle="Log income or expense"
                onPress={goToAddTransaction}
                {...{
                  textPrimary,
                  textSecondary,
                  textMuted,
                  cardBorder,
                  cardBg,
                  chipBg,
                  isDarkmode,
                }}
              />
              <ActionCard
                icon="list-outline"
                iconColor="#4b7bec"
                title="Transaction History"
                subtitle="View & manage records"
                onPress={goToTransactionList}
                {...{
                  textPrimary,
                  textSecondary,
                  textMuted,
                  cardBorder,
                  cardBg,
                  chipBg,
                  isDarkmode,
                }}
              />
            </View>

            <View style={styles.row}>
              <ActionCard
                icon="pie-chart-outline"
                iconColor="#20bf6b"
                title="Spending Insights"
                subtitle="Trends & breakdown"
                onPress={goToChartDisplay}
                {...{
                  textPrimary,
                  textSecondary,
                  textMuted,
                  cardBorder,
                  cardBg,
                  chipBg,
                  isDarkmode,
                }}
              />
              <ActionCard
                icon="bulb-outline"
                iconColor="#FFD93D"
                title="AI Financial Advice"
                subtitle="Personalized tips"
                onPress={goToFinancialAdvice}
                {...{
                  textPrimary,
                  textSecondary,
                  textMuted,
                  cardBorder,
                  cardBg,
                  chipBg,
                  isDarkmode,
                }}
              />
            </View>

            <View style={styles.row}>
              <ActionCard
                icon="trending-up-outline"
                iconColor="#38BDF8"
                title="Budget Forecast"
                subtitle="Predict savings"
                onPress={goToBudgetForecast}
                {...{
                  textPrimary,
                  textSecondary,
                  textMuted,
                  cardBorder,
                  cardBg,
                  chipBg,
                  isDarkmode,
                }}
              />
              <ActionCard
                icon="print-outline"
                iconColor="#A855F7"
                title="Reports & Export"
                subtitle="Generate PDF report"
                onPress={goToPrint}
                {...{
                  textPrimary,
                  textSecondary,
                  textMuted,
                  cardBorder,
                  cardBg,
                  chipBg,
                  isDarkmode,
                }}
              />
            </View>

            {/* Categories */}
            <View style={styles.sectionHeaderRow}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: textPrimary, marginTop: Theme.spacing.lg },
                ]}
              >
                Categories (This Month)
              </Text>
              <TouchableOpacity
                onPress={goToChartDisplay}
                activeOpacity={0.85}
                style={[
                  styles.linkPill,
                  {
                    borderColor: cardBorder,
                    backgroundColor: isDarkmode
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(2,6,23,0.05)",
                  },
                ]}
              >
                <Text
                  style={{
                    color: textSecondary,
                    fontSize: 12,
                    fontWeight: "800",
                  }}
                >
                  View Insights
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={14}
                  color={textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.badges}>
              {topCategories.map((c) => (
                <Badge key={c} variant="primary" style={{ marginRight: 0 }}>
                  {c}
                </Badge>
              ))}
            </View>

            {/* Floating Add */}
            <View
              style={{ alignItems: "flex-end", marginTop: Theme.spacing.xl }}
            >
              <IconButton
                icon="add"
                onPress={goToAddTransaction}
                variant="primary"
                size="large"
              />
            </View>

            <View style={{ height: Platform.OS === "ios" ? 10 : 0 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ---------------- Helpers for trend ---------------- */

function formatTrend(pct: number) {
  if (!Number.isFinite(pct)) return "—";
  const abs = Math.abs(pct);
  if (abs < 0.05) return "0%";
  const rounded = abs >= 100 ? Math.round(abs) : Math.round(abs * 10) / 10;
  return `${pct >= 0 ? "+" : "-"}${rounded}%`;
}

/* ---------------- Neon style ---------------- */

function neonGlowStyle(args: {
  isDarkmode: boolean;
  accent: string;
  borderColor: string;
  backgroundColor: string;
}) {
  const { isDarkmode, accent, borderColor, backgroundColor } = args;

  return {
    backgroundColor,
    borderColor: isDarkmode ? accent : borderColor,
    borderWidth: 1,
    shadowColor: accent,
    shadowOpacity: isDarkmode ? 0.22 : 0.08,
    shadowRadius: isDarkmode ? 14 : 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: isDarkmode ? 10 : 4,
  } as any;
}

/* ---------------- Components ---------------- */

function StatCard(props: {
  label: string;
  valueText: string;
  icon: any;
  accent: string;
  trendText: string;
  trendTone: "good" | "bad" | "neutral";
  onPress: () => void;

  cardBorder: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  isDarkmode: boolean;
}) {
  const toneColor =
    props.trendTone === "good"
      ? "#22c55e"
      : props.trendTone === "bad"
      ? "#ef4444"
      : "rgba(148,163,184,0.9)";

  const trendIcon =
    props.trendTone === "good"
      ? "arrow-up-outline"
      : props.trendTone === "bad"
      ? "arrow-down-outline"
      : "remove-outline";

  return (
    <TouchableOpacity
      onPress={props.onPress}
      activeOpacity={0.9}
      style={{ width: "48%" }}
    >
      <Card
        style={[
          styles.statCard,
          neonGlowStyle({
            isDarkmode: props.isDarkmode,
            accent: props.accent,
            borderColor: props.cardBorder,
            backgroundColor: props.cardBg,
          }),
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={[
              styles.iconChipSmall,
              {
                backgroundColor: props.isDarkmode
                  ? "rgba(255,255,255,0.10)"
                  : "rgba(15,23,42,0.06)",
              },
            ]}
          >
            <Ionicons name={props.icon} size={18} color={props.accent} />
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={[styles.accentDot, { backgroundColor: props.accent }]}
            />
            <View
              style={[
                styles.trendPill,
                {
                  backgroundColor: props.isDarkmode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(2,6,23,0.06)",
                },
              ]}
            >
              <Ionicons name={trendIcon as any} size={14} color={toneColor} />
              <Text
                style={{ color: toneColor, fontSize: 11, fontWeight: "900" }}
              >
                {props.trendText}
              </Text>
            </View>
          </View>
        </View>

        <Text
          style={[styles.statValue, { color: props.textPrimary }]}
          numberOfLines={1}
        >
          {props.valueText}
        </Text>

        <Text
          style={[styles.statLabel, { color: props.textSecondary }]}
          numberOfLines={1}
        >
          {props.label}
        </Text>

        <View style={{ alignItems: "flex-end", marginTop: 10 }}>
          <Text
            style={{
              color: props.isDarkmode
                ? "rgba(226,232,240,0.75)"
                : "rgba(15,23,42,0.55)",
              fontSize: 11,
              fontWeight: "800",
            }}
          >
            Tap to open
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function ActionCard(props: {
  icon: any;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBorder: string;
  cardBg: string;
  chipBg: string;
  isDarkmode: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.975,
      duration: 110,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.timing(scale, {
      toValue: 1,
      duration: 130,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();

  return (
    <TouchableOpacity
      onPress={props.onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
      activeOpacity={0.92}
      style={{ flex: 1 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Card
          style={[
            styles.actionCard,
            neonGlowStyle({
              isDarkmode: props.isDarkmode,
              accent: props.iconColor,
              borderColor: props.cardBorder,
              backgroundColor: props.cardBg,
            }),
          ]}
        >
          <View style={[styles.iconChip, { backgroundColor: props.chipBg }]}>
            <Ionicons name={props.icon} size={26} color={props.iconColor} />
          </View>

          <Text
            style={[styles.cardTitle, { color: props.textPrimary }]}
            numberOfLines={1}
          >
            {props.title}
          </Text>

          <Text
            style={[styles.cardSub, { color: props.textSecondary }]}
            numberOfLines={2}
          >
            {props.subtitle}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <Text style={[styles.tapHint, { color: props.textMuted }]}>
              Tap to open
            </Text>
            <Ionicons name="arrow-forward" size={18} color={props.iconColor} />
          </View>
        </Card>
      </Animated.View>
    </TouchableOpacity>
  );
}

/* ---------------- Styles ---------------- */

const RADIUS_LG = (Theme as any)?.radius?.lg ?? 18;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Theme.spacing.screenPadding,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.xxl,
  },

  pageContainer: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  title: { fontSize: 18, fontWeight: "900" },
  subtitle: { fontSize: 12, marginTop: 2, opacity: 0.95 },

  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },

  miniHint: { fontSize: 12, fontWeight: "800", opacity: 0.9 },

  snapshotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  statCard: {
    padding: Theme.spacing.md,
    borderRadius: RADIUS_LG, // ✅ fixed
  },

  iconChipSmall: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },

  accentDot: { width: 10, height: 10, borderRadius: 999 },

  trendPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },

  statValue: { fontSize: 18, fontWeight: "900", marginTop: 12 },
  statLabel: { fontSize: 12, marginTop: 4, opacity: 0.95 },

  highlightCard: { borderRadius: RADIUS_LG }, // ✅ fixed
  highlightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Theme.spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: MODULE_COLOR,
  },
  highlightTitle: { fontSize: 15, fontWeight: "900" },
  highlightText: { fontSize: 13, lineHeight: 18 },

  row: {
    flexDirection: "row",
    gap: Theme.spacing.md,
    marginBottom: Theme.spacing.md,
  },

  actionCard: {
    borderRadius: RADIUS_LG, // ✅ fixed
    padding: Theme.spacing.md,
  },

  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Theme.spacing.sm,
  },

  cardTitle: { fontSize: 14, fontWeight: "900" },
  cardSub: { fontSize: 12, marginTop: 4, opacity: 0.95 },

  tapHint: { fontSize: 11, fontWeight: "800", opacity: 0.85 },

  badges: { flexDirection: "row", flexWrap: "wrap", gap: Theme.spacing.sm },

  linkPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});

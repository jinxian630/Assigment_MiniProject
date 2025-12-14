// app/modules/money-management/index.tsx
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

export default function MoneyManagementScreen() {
  const router = useRouter();

  // ✅ Your app theme context (ThemeContext.tsx)
  const themeCtx = useTheme() as any;
  const theme = themeCtx?.theme ?? themeCtx;

  // ✅ Your ThemeContext uses isDarkMode (camel case)
  const isDarkmode = !!themeCtx?.isDarkMode;

  // ✅ Map into MoneyUI expected shape (it expects theme.isDarkmode)
  const moneyThemeCtx = useMemo(
    () => ({
      ...themeCtx,
      theme: {
        ...(themeCtx?.theme ?? {}),
        // important mapping:
        isDarkmode,
        colors: theme?.colors ?? themeCtx?.theme?.colors,
      },
    }),
    [themeCtx, theme, isDarkmode]
  );

  const ui = getMoneyColors(moneyThemeCtx);
  const {
    textPrimary,
    textSecondary,
    textMuted,
    cardBorder,
    cardBg,
    chipBg,
  } = ui;

  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

  // -------------------------
  // Firestore: totals
  // -------------------------
  const [balance, setBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
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
      limit(300)
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows: TxType[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        let bal = 0;
        let mIncome = 0;
        let mExpense = 0;

        const now = new Date();
        const currentMonth = monthKey(now);

        const catCount = new Map<string, number>();

        for (const r of rows) {
          const amount = Number((r as any)?.[FIELD_AMOUNT]);
          const type = String((r as any)?.[FIELD_TYPE] ?? "").toLowerCase();
          const createdAt = (r as any)?.[FIELD_CREATED_AT];
          const t = toMillis(createdAt);
          const d = t ? new Date(t) : null;

          const isIncome = type === "income";
          const isExpense = type === "expense";

          if (!Number.isFinite(amount)) continue;

          if (isIncome) bal += amount;
          else if (isExpense) bal -= amount;
          else bal += amount;

          if (d && monthKey(d) === currentMonth) {
            if (isIncome) mIncome += amount;
            else if (isExpense) mExpense += amount;
            else {
              if (amount >= 0) mIncome += amount;
              else mExpense += Math.abs(amount);
            }
          }

          // top categories for this month (expense)
          if (
            d &&
            monthKey(d) === currentMonth &&
            (isExpense || (!isIncome && amount < 0))
          ) {
            const rawCat = String((r as any)?.category ?? "Others");
            const cat = rawCat.trim().length ? rawCat.trim() : "Others";
            catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
          }
        }

        setBalance(bal);
        setMonthIncome(mIncome);
        setMonthExpense(mExpense);

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

  // -------------------------
  // Animated counters
  // -------------------------
  const animBalance = useRef(new Animated.Value(0)).current;
  const animIncome = useRef(new Animated.Value(0)).current;
  const animExpense = useRef(new Animated.Value(0)).current;

  const [balanceText, setBalanceText] = useState("RM 0");
  const [incomeText, setIncomeText] = useState("RM 0");
  const [expenseText, setExpenseText] = useState("RM 0");

  useEffect(() => {
    const sub1 = animBalance.addListener(({ value }) =>
      setBalanceText(formatRM(value))
    );
    const sub2 = animIncome.addListener(({ value }) =>
      setIncomeText(formatRM(value))
    );
    const sub3 = animExpense.addListener(({ value }) =>
      setExpenseText(formatRM(value))
    );

    return () => {
      animBalance.removeListener(sub1);
      animIncome.removeListener(sub2);
      animExpense.removeListener(sub3);
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
    ]).start();
  }, [balance, monthIncome, monthExpense]);

  const monthNet = useMemo(
    () => monthIncome - monthExpense,
    [monthIncome, monthExpense]
  );
  const monthNetLabel = monthNet >= 0 ? "Net Saving" : "Net Spend";
  const monthNetColor = monthNet >= 0 ? "#22c55e" : "#ef4444";

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

  // Routes (unchanged)
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

  // ✅ styles based on theme (fixes “Theme.spacing.lg undefined” crash)
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
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

            {/* theme toggle (kept) */}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="pulse-outline" size={14} color={textSecondary} />
              <Text style={[styles.miniHint, { color: textSecondary }]}>
                {isLoading ? "Syncing…" : "Updated"}
              </Text>
            </View>
          </View>

          <View style={styles.snapshotGrid}>
            <SnapshotCard
              label="Balance"
              valueText={balanceText}
              icon="wallet-outline"
              accent="#38BDF8"
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <SnapshotCard
              label="Income (Month)"
              valueText={incomeText}
              icon="trending-up-outline"
              accent="#22c55e"
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <SnapshotCard
              label="Expense (Month)"
              valueText={expenseText}
              icon="trending-down-outline"
              accent="#ef4444"
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <SnapshotCard
              label={monthNetLabel}
              valueText={formatRM(monthNet)}
              icon="analytics-outline"
              accent={monthNetColor}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          </View>

          {/* Smart Tip */}
          <Card
            style={[
              styles.highlightCard,
              neonGlowStyle({
                isDarkmode,
                accent: MODULE_COLOR,
                backgroundColor: cardBg,
                borderColor: cardBorder,
                heavy: true,
              }),
            ]}
          >
            <View style={styles.highlightRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={styles.dot} />
                <Text style={[styles.highlightTitle, { color: textPrimary }]}>
                  Smart Tip
                </Text>
              </View>
              <Text style={{ color: MODULE_COLOR, fontWeight: "900", letterSpacing: 0.5 }}>
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
            <QuickCard
              icon="add-circle-outline"
              iconColor="#ff7f50"
              title="Add Transaction"
              subtitle="Log income or expense"
              onPress={goToAddTransaction}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
            <QuickCard
              icon="list-outline"
              iconColor="#4b7bec"
              title="Transaction History"
              subtitle="View & manage records"
              onPress={goToTransactionList}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
          </View>

          <View style={styles.row}>
            <QuickCard
              icon="pie-chart-outline"
              iconColor="#20bf6b"
              title="Spending Insights"
              subtitle="Trends & breakdown"
              onPress={goToChartDisplay}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
            <QuickCard
              icon="bulb-outline"
              iconColor="#FFD93D"
              title="AI Financial Advice"
              subtitle="Personalized tips"
              onPress={goToFinancialAdvice}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
          </View>

          <View style={styles.row}>
            <QuickCard
              icon="trending-up-outline"
              iconColor="#38BDF8"
              title="Budget Forecast"
              subtitle="Predict savings"
              onPress={goToBudgetForecast}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
            <QuickCard
              icon="print-outline"
              iconColor="#A855F7"
              title="Reports & Export"
              subtitle="Generate PDF report"
              onPress={goToPrint}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
              textMuted={textMuted}
            />
          </View>

          {/* Categories */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
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
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(2,6,23,0.03)",
                },
              ]}
            >
              <Text style={{ color: textSecondary, fontSize: 12, fontWeight: "800" }}>
                View Insights
              </Text>
              <Ionicons name="arrow-forward" size={14} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.badges}>
            {topCategories.map((c) => (
              <Badge key={c} variant="primary" style={{ marginRight: 0 }}>
                {c}
              </Badge>
            ))}
          </View>

          {/* Floating Add (kept) */}
          <View style={{ alignItems: "flex-end", marginTop: theme.spacing.xl }}>
            <IconButton
              icon="add"
              onPress={goToAddTransaction}
              variant="primary"
              size="large"
            />
          </View>

          <View style={{ height: Platform.OS === "ios" ? 10 : 0 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

/* ---------------- Neon Card Helpers (Task-style) ---------------- */

function neonGlowStyle(opts: {
  isDarkmode: boolean;
  accent: string;
  backgroundColor: string;
  borderColor: string;
  heavy?: boolean;
}) {
  const { isDarkmode, accent, backgroundColor, borderColor, heavy } = opts;

  // ✅ make sure dark mode becomes BLACK-ish (your request)
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
  };
}

/* ---------------- Sub Components ---------------- */

function SnapshotCard(props: {
  label: string;
  valueText: string;
  icon: any;
  accent: string;
  isDarkmode: boolean;
  textPrimary: string;
  textSecondary: string;
  cardBorder: string;
  cardBg: string;
  chipBg: string;
}) {
  return (
    <Card
      style={[
        snapshotStyles.snapshotCard,
        neonGlowStyle({
          isDarkmode: props.isDarkmode,
          accent: props.accent,
          backgroundColor: props.cardBg,
          borderColor: props.cardBorder,
        }),
      ]}
    >
      <View style={snapshotStyles.topRow}>
        <View
          style={[
            snapshotStyles.iconChipSmall,
            { backgroundColor: props.chipBg },
          ]}
        >
          <Ionicons name={props.icon} size={18} color={props.accent} />
        </View>
        <View style={[snapshotStyles.accentDot, { backgroundColor: props.accent }]} />
      </View>

      <Text style={[snapshotStyles.value, { color: props.textPrimary }]} numberOfLines={1}>
        {props.valueText}
      </Text>
      <Text style={[snapshotStyles.label, { color: props.textSecondary }]} numberOfLines={1}>
        {props.label}
      </Text>
    </Card>
  );
}

function QuickCard(props: {
  icon: any;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress: () => void;
  isDarkmode: boolean;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBorder: string;
  cardBg: string;
  chipBg: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.timing(scale, {
      toValue: 0.97,
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
            quickStyles.card,
            neonGlowStyle({
              isDarkmode: props.isDarkmode,
              accent: props.iconColor,
              backgroundColor: props.cardBg,
              borderColor: props.cardBorder,
            }),
          ]}
        >
          <View style={[quickStyles.iconChip, { backgroundColor: props.chipBg }]}>
            <Ionicons name={props.icon} size={26} color={props.iconColor} />
          </View>

          <Text style={[quickStyles.title, { color: props.textPrimary }]} numberOfLines={1}>
            {props.title}
          </Text>
          <Text style={[quickStyles.sub, { color: props.textSecondary }]} numberOfLines={2}>
            {props.subtitle}
          </Text>

          <View style={quickStyles.bottomRow}>
            <Text style={[quickStyles.tapHint, { color: props.textMuted }]}>
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

function makeStyles(theme: any) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },

    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
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
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },

    miniHint: { fontSize: 12, fontWeight: "800", opacity: 0.9 },

    snapshotGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },

    highlightCard: {
      borderRadius: theme.borderRadius?.lg ?? 12,
      marginTop: theme.spacing.sm,
    },
    highlightRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.sm,
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
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },

    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },

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
}

const snapshotStyles = StyleSheet.create({
  snapshotCard: {
    width: "48%",
    padding: 14,
    borderRadius: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconChipSmall: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  accentDot: { width: 10, height: 10, borderRadius: 999 },

  value: {
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.95,
  },
});

const quickStyles = StyleSheet.create({
  card: {
    borderRadius: 18,
  },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: "900" },
  sub: { fontSize: 12, marginTop: 4, opacity: 0.95 },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  tapHint: { fontSize: 11, fontWeight: "800", opacity: 0.85 },
});

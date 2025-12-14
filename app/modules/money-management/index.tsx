// app/modules/money-management/index.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  StyleProp,
  ViewStyle,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

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
} from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const MODULE_COLOR = "#FFD93D";

const TX_COLLECTION = "Expenses";
const FIELD_USER_ID = "createdBy";
const FIELD_AMOUNT = "amount";
const FIELD_TYPE = "type"; // "Income" | "Expense"
const FIELD_DATE_TIME = "dateTime"; // number(ms)

type TxType = {
  id: string;
  type?: string;
  amount?: number;
  dateTime?: number;
  category?: string;
  account?: string;
};

function formatRM(n: number) {
  const safe = Number.isFinite(n) ? n : 0;
  const sign = safe < 0 ? "-" : "";
  return `${sign}RM ${Math.abs(safe).toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}
function flatStyle(...styles: Array<StyleProp<ViewStyle> | undefined>) {
  return StyleSheet.flatten(styles.filter(Boolean) as any);
}
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
      style={flatStyle(
        snapshotStyles.snapshotCard,
        neonGlowStyle({
          isDarkmode: props.isDarkmode,
          accent: props.accent,
          backgroundColor: props.cardBg,
          borderColor: props.cardBorder,
        })
      )}
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
        <View
          style={[
            snapshotStyles.accentDot,
            { backgroundColor: props.accent },
          ]}
        />
      </View>

      <Text
        style={[snapshotStyles.value, { color: props.textPrimary }]}
        numberOfLines={1}
      >
        {props.valueText}
      </Text>
      <Text
        style={[snapshotStyles.label, { color: props.textSecondary }]}
        numberOfLines={1}
      >
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
  textMuted: string;
  cardBorder: string;
  cardBg: string;
  chipBg: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={props.onPress}
      style={{ flex: 1 }}
    >
      <Card
        style={flatStyle(
          quickStyles.quickCard,
          neonGlowStyle({
            isDarkmode: props.isDarkmode,
            accent: props.iconColor,
            backgroundColor: props.cardBg,
            borderColor: props.cardBorder,
          })
        )}
      >
        <View style={[quickStyles.iconChip, { backgroundColor: props.chipBg }]}>
          <Ionicons name={props.icon} size={18} color={props.iconColor} />
        </View>

        <Text style={[quickStyles.title, { color: props.textPrimary }]}>
          {props.title}
        </Text>
        <Text style={[quickStyles.sub, { color: props.textMuted }]}>
          {props.subtitle}
        </Text>
      </Card>
    </TouchableOpacity>
  );
}

export default function MoneyManagementScreen() {
  const router = useRouter();

  const themeCtx = useTheme() as any;
  const theme = themeCtx?.theme ?? themeCtx;

  // keep your existing logic
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
  const { textPrimary, textSecondary, textMuted, cardBorder, cardBg, chipBg } =
    ui;

  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

  const [balance, setBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [topCategories, setTopCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ✅ keep one realtime listener
  const snapUnsubRef = useRef<null | (() => void)>(null);
  const authUnsubRef = useRef<null | (() => void)>(null);

  const detachAll = useCallback(() => {
    if (snapUnsubRef.current) {
      snapUnsubRef.current();
      snapUnsubRef.current = null;
    }
    if (authUnsubRef.current) {
      authUnsubRef.current();
      authUnsubRef.current = null;
    }
  }, []);

  const attachListener = useCallback(() => {
    const auth = getAuth();
    const db = getFirestore();

    // prevent duplicates
    detachAll();

    authUnsubRef.current = onAuthStateChanged(auth, (user) => {
      if (snapUnsubRef.current) {
        snapUnsubRef.current();
        snapUnsubRef.current = null;
      }

      if (!user) {
        setBalance(0);
        setMonthIncome(0);
        setMonthExpense(0);
        setTopCategories([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const q = query(
        collection(db, TX_COLLECTION),
        where(FIELD_USER_ID as any, "==", user.uid),
        orderBy(FIELD_DATE_TIME as any, "desc"),
        limit(800)
      );

      snapUnsubRef.current = onSnapshot(
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
          const catTotal = new Map<string, number>();

          for (const r of rows) {
            const amount = Number((r as any)?.[FIELD_AMOUNT] ?? 0);
            const type = String((r as any)?.[FIELD_TYPE] ?? "");
            const ts = Number((r as any)?.[FIELD_DATE_TIME] ?? 0);

            if (!Number.isFinite(amount)) continue;

            if (type === "Income") bal += amount;
            else if (type === "Expense") bal -= amount;

            if (ts) {
              const d = new Date(ts);
              if (monthKey(d) === currentMonth) {
                if (type === "Income") mIncome += amount;
                else if (type === "Expense") mExpense += amount;

                if (type === "Expense") {
                  const rawCat = String((r as any)?.category ?? "Others");
                  const cat = rawCat.trim() ? rawCat.trim() : "Others";
                  catTotal.set(cat, (catTotal.get(cat) ?? 0) + Math.abs(amount));
                }
              }
            }
          }

          setBalance(bal);
          setMonthIncome(mIncome);
          setMonthExpense(mExpense);

          const sortedCats = Array.from(catTotal.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([name]) => name);

          setTopCategories(sortedCats);
          setIsLoading(false);
        },
        (err) => {
          console.log("Money index onSnapshot error:", err);
          setIsLoading(false);

          const msg =
            (err as any)?.message?.includes("index") ||
            (err as any)?.message?.includes("FAILED_PRECONDITION")
              ? "Firestore index required for this query.\nOpen the console link shown in your logs and create the index."
              : "Failed to load transactions. Check Firestore rules / internet.";
          Alert.alert("Load failed", msg);
        }
      );
    });
  }, [detachAll]);

  /**
   * ✅ KEY FIX:
   * UseEffect runs on mount no matter what.
   * This ensures index page ALWAYS starts syncing immediately.
   */
  useEffect(() => {
    attachListener();
    return () => detachAll();
  }, [attachListener, detachAll]);

  /**
   * Optional: keep focus refresh too (extra safety).
   * If focus events work, it will reattach cleanly.
   */
  useFocusEffect(
    useCallback(() => {
      attachListener();
      return () => {
        // you can comment this out if you want it to keep listening in background
        detachAll();
      };
    }, [attachListener, detachAll])
  );

  // ---------- Animated numbers ----------
  const animBalance = useRef(new Animated.Value(0)).current;
  const animIncome = useRef(new Animated.Value(0)).current;
  const animExpense = useRef(new Animated.Value(0)).current;

  const [balanceText, setBalanceText] = useState(formatRM(0));
  const [incomeText, setIncomeText] = useState(formatRM(0));
  const [expenseText, setExpenseText] = useState(formatRM(0));

  useEffect(() => {
    const id1 = animBalance.addListener(({ value }) =>
      setBalanceText(formatRM(value))
    );
    const id2 = animIncome.addListener(({ value }) =>
      setIncomeText(formatRM(value))
    );
    const id3 = animExpense.addListener(({ value }) =>
      setExpenseText(formatRM(value))
    );
    return () => {
      animBalance.removeListener(id1);
      animIncome.removeListener(id2);
      animExpense.removeListener(id3);
    };
  }, [animBalance, animIncome, animExpense]);

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
  }, [balance, monthIncome, monthExpense, animBalance, animIncome, animExpense]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

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
              style={flatStyle(styles.themeToggle, {
                borderColor: MODULE_COLOR,
                backgroundColor: isDarkmode
                  ? "rgba(15,23,42,0.65)"
                  : "rgba(255,255,255,0.75)",
              })}
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
              label="Income (This Month)"
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
          </View>

          <View style={[styles.snapshotGrid, { marginTop: 10 }]}>
            <SnapshotCard
              label="Expense (This Month)"
              valueText={expenseText}
              icon="trending-down-outline"
              accent="#f97316"
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
            <SnapshotCard
              label="Net (This Month)"
              valueText={formatRM(monthIncome - monthExpense)}
              icon="analytics-outline"
              accent={monthIncome - monthExpense >= 0 ? "#22c55e" : "#ef4444"}
              isDarkmode={isDarkmode}
              cardBg={cardBg}
              cardBorder={cardBorder}
              chipBg={chipBg}
              textPrimary={textPrimary}
              textSecondary={textSecondary}
            />
          </View>

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
              textMuted={textMuted}
            />
          </View>

          {/* Categories (this month) */}
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              Categories (This Month)
            </Text>

            <TouchableOpacity
              onPress={goToChartDisplay}
              activeOpacity={0.85}
              style={flatStyle(styles.linkPill, {
                borderColor: cardBorder,
                backgroundColor: isDarkmode
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(2,6,23,0.03)",
              })}
            >
              <Text
                style={{ color: textSecondary, fontSize: 12, fontWeight: "800" }}
              >
                View Insights
              </Text>
              <Ionicons name="arrow-forward" size={14} color={textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.badges}>
            {topCategories.length === 0 ? (
              <Text style={{ color: textMuted, fontWeight: "700" }}>
                No expense records this month yet.
              </Text>
            ) : (
              topCategories.map((c) => (
                <Badge key={c} variant="primary" style={{ marginRight: 0 }}>
                  {c}
                </Badge>
              ))
            )}
          </View>

          {/* Floating add */}
          <View
            style={{
              alignItems: "flex-end",
              marginTop: theme?.spacing?.xl ?? 24,
            }}
          >
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

const snapshotStyles = StyleSheet.create({
  snapshotCard: {
    flex: 1,
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconChipSmall: {
    width: 36,
    height: 36,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  accentDot: {
    width: 8,
    height: 8,
    borderRadius: 99,
    opacity: 0.95,
  },
  value: { fontSize: 16, fontWeight: "900" },
  label: { marginTop: 4, fontSize: 12, fontWeight: "700", opacity: 0.92 },
});

const quickStyles = StyleSheet.create({
  quickCard: {
    borderRadius: 20,
    padding: 14,
    overflow: "hidden",
    minHeight: 104,
    justifyContent: "center",
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  title: { fontSize: 14, fontWeight: "900" },
  sub: { marginTop: 4, fontSize: 11.5, fontWeight: "700" },
});

function makeStyles(theme: any) {
  const pad = theme?.spacing?.md ?? 16;
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: pad,
      paddingBottom: theme?.spacing?.xl ?? 24,
      paddingTop: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    title: { fontSize: 18, fontWeight: "900", letterSpacing: 0.2 },
    subtitle: { marginTop: 2, fontSize: 12, fontWeight: "700", opacity: 0.9 },

    themeToggle: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },

    sectionTitle: {
      fontSize: 14,
      fontWeight: "900",
      marginTop: 14,
      marginBottom: 10,
    },
    sectionHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 10,
      marginBottom: 10,
    },
    miniHint: { fontSize: 11, fontWeight: "800", opacity: 0.9 },

    snapshotGrid: { flexDirection: "row", gap: 10 },
    row: { flexDirection: "row", gap: 10, marginBottom: 10 },

    linkPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },

    badges: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 6,
    },
  });
}

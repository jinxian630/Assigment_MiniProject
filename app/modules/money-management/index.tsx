// app/modules/money-management/index.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
const FIELD_NOTE = "note";
const FIELD_CATEGORY = "category";
const FIELD_ACCOUNT = "account";

type TxType = {
  id: string;
  type?: "Income" | "Expense" | string;
  amount?: number;
  dateTime?: number;
  category?: string;
  account?: string;
  note?: string;
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
    shadowRadius: heavy ? 18 : 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: heavy ? 12 : 6,
  } as const;
}

function clamp01(x: number) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function fmtDate(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  return d.toLocaleDateString("en-MY", { day: "2-digit", month: "short" });
}

/**
 * ✅ Bigger + higher contrast money icon (especially in light theme)
 * ✅ Pulses + glows only while syncing
 */
function MoneyPulseIcon({
  syncing,
  isDarkmode,
  chipBg,
}: {
  syncing: boolean;
  isDarkmode: boolean;
  chipBg: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (syncing) {
      loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(scale, {
              toValue: 1.12,
              duration: 520,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: 520,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.78,
              duration: 520,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 1,
              duration: 520,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loop.start();
    } else {
      // Reset instantly
      scale.setValue(1);
      opacity.setValue(1);
    }

    return () => {
      loop?.stop();
    };
  }, [syncing, scale, opacity]);

  // ✅ Fix: light theme icon hard to see -> use dark icon + strong border
  const iconColor = isDarkmode ? MODULE_COLOR : "#0F172A";
  const bgColor = isDarkmode ? chipBg : "rgba(255,255,255,0.96)";
  const borderColor = isDarkmode ? `${MODULE_COLOR}AA` : "rgba(15,23,42,0.35)";

  return (
    <Animated.View
      style={[
        stylesStatic.moneyIconWrap,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity,
          transform: [{ scale }],
          shadowColor: MODULE_COLOR,
          shadowOpacity: syncing ? 0.65 : isDarkmode ? 0.28 : 0.18,
          shadowRadius: syncing ? 20 : 10,
          shadowOffset: { width: 0, height: 0 },
          elevation: syncing ? 12 : 4,
        },
      ]}
    >
      <Ionicons name="wallet-outline" size={30} color={iconColor} />
    </Animated.View>
  );
}

function ActionPill(props: {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  onPress: () => void;
  isDarkmode: boolean;
  textPrimary: string;
  textMuted: string;
  chipBg: string;
  border: string;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={props.onPress}
      style={[
        stylesStatic.actionPill,
        {
          borderColor: props.border,
          backgroundColor: props.isDarkmode
            ? "rgba(2,6,23,0.75)"
            : "rgba(255,255,255,0.75)",
        },
      ]}
    >
      <View style={[stylesStatic.pillIcon, { backgroundColor: props.chipBg }]}>
        <Ionicons name={props.icon} size={18} color={props.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[stylesStatic.pillTitle, { color: props.textPrimary }]}>
          {props.title}
        </Text>
        <Text style={[stylesStatic.pillSub, { color: props.textMuted }]}>
          {props.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={props.textMuted} />
    </TouchableOpacity>
  );
}

export default function MoneyManagementScreen() {
  const router = useRouter();

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
  const { textPrimary, textSecondary, textMuted, cardBorder, cardBg, chipBg } =
    ui;

  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

  const [balance, setBalance] = useState(0);
  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpense, setMonthExpense] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [recentTx, setRecentTx] = useState<TxType[]>([]);

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
        setRecentTx([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const q = query(
        collection(db, TX_COLLECTION),
        where(FIELD_USER_ID as any, "==", user.uid),
        limit(200)
      );

      snapUnsubRef.current = onSnapshot(
        q,
        (snap) => {
          const rows: TxType[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));

          // ✅ Local sort by dateTime (desc) — replaces Firestore orderBy
          rows.sort((a, b) => {
            const ta = Number((a as any)?.[FIELD_DATE_TIME] ?? 0);
            const tb = Number((b as any)?.[FIELD_DATE_TIME] ?? 0);
            return tb - ta;
          });

          let bal = 0;
          let mIncome = 0;
          let mExpense = 0;

          const now = new Date();
          const currentMonth = monthKey(now);

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
              }
            }
          }

          setBalance(bal);
          setMonthIncome(mIncome);
          setMonthExpense(mExpense);

          setRecentTx(rows.slice(0, 6));
          setIsLoading(false);
        },
        (err) => {
          console.log("Money index onSnapshot error:", err);
          setIsLoading(false);
          // ❌ no Alert, fail silently (UI already shows Syncing / Live)
        }
      );
    });
  }, [detachAll]);

  useEffect(() => {
    attachListener();
    return () => detachAll();
  }, [attachListener, detachAll]);

  useFocusEffect(
    useCallback(() => {
      attachListener();
      return () => detachAll();
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
  }, [
    balance,
    monthIncome,
    monthExpense,
    animBalance,
    animIncome,
    animExpense,
  ]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // ✅ keep your existing routing exactly (don’t break)
  const goToAddTransaction = () =>
    router.push("../modules/money-management/TransactionAdd");
  const goToTransactionList = () =>
    router.push("../modules/money-management/TransactionList");
  const goToChartDisplay = () =>
    router.push("../modules/money-management/ChartDisplay");
  const goToFinancialAdvice = () =>
    router.push("../modules/money-management/FinancialAdvice");
  const goToBudgetForecast = () =>
    router.push("../modules/money-management/BudgetForecast");
  const goToPrint = () =>
    router.push("../modules/money-management/PrintTransactionList");

  // ====== extra UX logic ======
  const netThisMonth = monthIncome - monthExpense;

  // “Spending meter”: expense vs income (if no income yet, fall back)
  const spendRatio =
    monthIncome > 0
      ? clamp01(monthExpense / monthIncome)
      : clamp01(monthExpense / 1000);

  const meterText =
    monthIncome > 0
      ? `${Math.round(spendRatio * 100)}% spent of income`
      : "No income yet — add Income to improve insights";

  const meterColor =
    spendRatio < 0.6 ? "#22c55e" : spendRatio < 0.9 ? "#f59e0b" : "#ef4444";

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
              <MoneyPulseIcon
                syncing={isLoading}
                isDarkmode={isDarkmode}
                chipBg={chipBg}
              />

              <Text style={[styles.title, { color: textPrimary }]}>
                Money Dashboard
              </Text>
              <Text style={[styles.subtitle, { color: textSecondary }]}>
                Balance • Insights • Control
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

          {/* HERO SUMMARY */}
          <Card
            style={flatStyle(
              styles.heroCard,
              neonGlowStyle({
                isDarkmode,
                accent: "#38BDF8",
                backgroundColor: cardBg,
                borderColor: cardBorder,
                heavy: true,
              })
            )}
          >
            <View style={styles.heroTop}>
              <View style={[styles.heroChip, { backgroundColor: chipBg }]}>
                <Ionicons name="wallet-outline" size={18} color="#38BDF8" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.heroLabel, { color: textSecondary }]}>
                  Current Balance
                </Text>
                <Text style={[styles.heroValue, { color: textPrimary }]}>
                  {balanceText}
                </Text>
              </View>

              <View style={styles.heroStatus}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: isLoading ? "#f59e0b" : "#22c55e" },
                  ]}
                />
                <Text style={[styles.syncText, { color: textMuted }]}>
                  {isLoading ? "Syncing" : "Live"}
                </Text>
              </View>
            </View>

            {/* Small stats row */}
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={[styles.statLabel, { color: textMuted }]}>
                  Income (Month)
                </Text>
                <Text style={[styles.statValue, { color: "#22c55e" }]}>
                  {incomeText}
                </Text>
              </View>

              <View style={styles.dividerV} />

              <View style={styles.heroStat}>
                <Text style={[styles.statLabel, { color: textMuted }]}>
                  Expense (Month)
                </Text>
                <Text style={[styles.statValue, { color: "#f97316" }]}>
                  {expenseText}
                </Text>
              </View>

              <View style={styles.dividerV} />

              <View style={styles.heroStat}>
                <Text style={[styles.statLabel, { color: textMuted }]}>
                  Net (Month)
                </Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: netThisMonth >= 0 ? "#22c55e" : "#ef4444" },
                  ]}
                >
                  {formatRM(netThisMonth)}
                </Text>
              </View>
            </View>

            {/* Spending meter */}
            <View style={{ marginTop: 12 }}>
              <View style={styles.meterTop}>
                <Text style={[styles.meterTitle, { color: textPrimary }]}>
                  Spending meter
                </Text>
                <Text style={[styles.meterHint, { color: textMuted }]}>
                  {meterText}
                </Text>
              </View>

              <View
                style={[
                  styles.meterTrack,
                  {
                    backgroundColor: isDarkmode
                      ? "rgba(255,255,255,0.08)"
                      : "rgba(2,6,23,0.08)",
                    borderColor: cardBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.meterFill,
                    {
                      width: `${Math.max(6, Math.round(spendRatio * 100))}%`,
                      backgroundColor: meterColor,
                    },
                  ]}
                />
              </View>
            </View>
          </Card>

          {/* INSIGHTS ROW */}
          <View style={styles.insightsRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={goToChartDisplay}
              style={{ flex: 1 }}
            >
              <Card
                style={flatStyle(
                  styles.miniInsight,
                  neonGlowStyle({
                    isDarkmode,
                    accent: "#A855F7",
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  })
                )}
              >
                <View style={[styles.miniIcon, { backgroundColor: chipBg }]}>
                  <Ionicons
                    name="analytics-outline"
                    size={16}
                    color="#A855F7"
                  />
                </View>
                <Text style={[styles.miniTitle, { color: textPrimary }]}>
                  Insights
                </Text>
                <Text style={[styles.miniSub, { color: textMuted }]}>
                  Trends & breakdown
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={goToFinancialAdvice}
              style={{ flex: 1 }}
            >
              <Card
                style={flatStyle(
                  styles.miniInsight,
                  neonGlowStyle({
                    isDarkmode,
                    accent: "#FFD93D",
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  })
                )}
              >
                <View style={[styles.miniIcon, { backgroundColor: chipBg }]}>
                  <Ionicons name="bulb-outline" size={16} color="#FFD93D" />
                </View>
                <Text style={[styles.miniTitle, { color: textPrimary }]}>
                  Advice
                </Text>
                <Text style={[styles.miniSub, { color: textMuted }]}>
                  Personalized tips
                </Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={goToBudgetForecast}
              style={{ flex: 1 }}
            >
              <Card
                style={flatStyle(
                  styles.miniInsight,
                  neonGlowStyle({
                    isDarkmode,
                    accent: "#38BDF8",
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  })
                )}
              >
                <View style={[styles.miniIcon, { backgroundColor: chipBg }]}>
                  <Ionicons
                    name="trending-up-outline"
                    size={16}
                    color="#38BDF8"
                  />
                </View>
                <Text style={[styles.miniTitle, { color: textPrimary }]}>
                  Forecast
                </Text>
                <Text style={[styles.miniSub, { color: textMuted }]}>
                  Predict savings
                </Text>
              </Card>
            </TouchableOpacity>
          </View>

          <Text
            style={[
              styles.sectionTitle,
              { color: textPrimary, marginTop: 25, marginBottom: 15 },
            ]}
          >
            Quick Actions
          </Text>

          <ActionPill
            title="Add Transaction"
            subtitle="Log income or expense"
            icon="add-circle-outline"
            color="#ff7f50"
            onPress={goToAddTransaction}
            isDarkmode={isDarkmode}
            textPrimary={textPrimary}
            textMuted={textMuted}
            chipBg={chipBg}
            border={cardBorder}
          />
          <ActionPill
            title="Transaction History"
            subtitle="View, edit and manage"
            icon="list-outline"
            color="#4b7bec"
            onPress={goToTransactionList}
            isDarkmode={isDarkmode}
            textPrimary={textPrimary}
            textMuted={textMuted}
            chipBg={chipBg}
            border={cardBorder}
          />
          <ActionPill
            title="Reports & Export"
            subtitle="Generate PDF report"
            icon="print-outline"
            color="#A855F7"
            onPress={goToPrint}
            isDarkmode={isDarkmode}
            textPrimary={textPrimary}
            textMuted={textMuted}
            chipBg={chipBg}
            border={cardBorder}
          />

          {/* RECENT TRANSACTIONS PREVIEW */}
          <View style={[styles.sectionRow, { marginTop: 14 }]}>
            <Text style={[styles.sectionTitle, { color: textPrimary }]}>
              Recent Activity
            </Text>
            <TouchableOpacity
              onPress={goToTransactionList}
              activeOpacity={0.85}
              style={[
                styles.smallLink,
                {
                  borderColor: cardBorder,
                  backgroundColor: isDarkmode
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(2,6,23,0.03)",
                },
              ]}
            >
              <Text
                style={{
                  color: textSecondary,
                  fontWeight: "800",
                  fontSize: 12,
                }}
              >
                Details
              </Text>
              <Ionicons
                name="chevron-forward"
                size={14}
                color={textSecondary}
              />
            </TouchableOpacity>
          </View>

          <Card
            style={flatStyle(
              styles.recentCard,
              neonGlowStyle({
                isDarkmode,
                accent: "#F97316",
                backgroundColor: cardBg,
                borderColor: cardBorder,
              })
            )}
          >
            {recentTx.length === 0 ? (
              <View style={{ paddingVertical: 6 }}>
                <Text style={{ color: textMuted, fontWeight: "700" }}>
                  No transactions yet. Add your first one to start insights.
                </Text>
              </View>
            ) : (
              recentTx.map((t, idx) => {
                const type = String((t as any)?.[FIELD_TYPE] ?? "");
                const amt = Number((t as any)?.[FIELD_AMOUNT] ?? 0);
                const ts = Number((t as any)?.[FIELD_DATE_TIME] ?? 0);
                const note = String((t as any)?.[FIELD_NOTE] ?? "");
                const cat = String((t as any)?.[FIELD_CATEGORY] ?? "Others");
                const acc = String((t as any)?.[FIELD_ACCOUNT] ?? "");
                const isIncome = type === "Income";

                return (
                  <View
                    key={t.id ?? String(idx)}
                    style={[
                      styles.txRow,
                      idx !== recentTx.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: isDarkmode
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(2,6,23,0.06)",
                        paddingBottom: 10,
                        marginBottom: 10,
                      },
                    ]}
                  >
                    <View style={[styles.txIcon, { backgroundColor: chipBg }]}>
                      <Ionicons
                        name={
                          isIncome ? "arrow-up-outline" : "arrow-down-outline"
                        }
                        size={16}
                        color={isIncome ? "#22c55e" : "#f97316"}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.txTitle, { color: textPrimary }]}
                        numberOfLines={1}
                      >
                        {note?.trim() ? note : cat}
                      </Text>
                      <Text
                        style={[styles.txSub, { color: textMuted }]}
                        numberOfLines={1}
                      >
                        {fmtDate(ts)}
                        {acc ? ` · ${acc}` : ""}
                        {cat ? ` · ${cat}` : ""}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.txAmount,
                        { color: isIncome ? "#22c55e" : "#f97316" },
                      ]}
                      numberOfLines={1}
                    >
                      {isIncome ? "+" : "-"}
                      {formatRM(Math.abs(amt))}
                    </Text>
                  </View>
                );
              })
            )}
          </Card>

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

const stylesStatic = StyleSheet.create({
  // ✅ Bigger header icon
  moneyIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1.5,
  },

  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 10,
  },
  pillIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  pillTitle: { fontSize: 14, fontWeight: "900" },
  pillSub: { marginTop: 2, fontSize: 11.5, fontWeight: "700" },
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
      marginBottom: 12,
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

    // HERO
    heroCard: {
      borderRadius: 22,
      padding: 14,
      overflow: "hidden",
    },
    heroTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    heroChip: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    heroLabel: { fontSize: 12, fontWeight: "800" },
    heroValue: { marginTop: 2, fontSize: 22, fontWeight: "900" },

    heroStatus: { alignItems: "flex-end", gap: 4 },
    dot: { width: 8, height: 8, borderRadius: 99 },
    syncText: { fontSize: 11, fontWeight: "800" },

    heroStatsRow: {
      marginTop: 12,
      borderRadius: 16,
      paddingVertical: 10,
      paddingHorizontal: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(255,255,255,0.02)",
    },
    heroStat: { flex: 1, alignItems: "center" },
    statLabel: { fontSize: 11, fontWeight: "800" },
    statValue: { marginTop: 4, fontSize: 12.5, fontWeight: "900" },
    dividerV: {
      width: 1,
      height: 30,
      backgroundColor: "rgba(148,163,184,0.25)",
    },

    meterTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    meterTitle: { fontSize: 12.5, fontWeight: "900" },
    meterHint: { fontSize: 11, fontWeight: "700" },
    meterTrack: {
      height: 10,
      borderRadius: 999,
      borderWidth: 1,
      overflow: "hidden",
    },
    meterFill: {
      height: "100%",
      borderRadius: 999,
    },

    // INSIGHTS
    insightsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    miniInsight: {
      borderRadius: 18,
      padding: 12,
      overflow: "hidden",
      minHeight: 86,
      justifyContent: "center",
    },
    miniIcon: {
      width: 34,
      height: 34,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    miniTitle: { fontSize: 13, fontWeight: "900" },
    miniSub: { marginTop: 2, fontSize: 11.5, fontWeight: "700" },

    // SECTION
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 14,
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 14, fontWeight: "900" },
    smallLink: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },

    // RECENT
    recentCard: {
      borderRadius: 18,
      padding: 12,
      overflow: "hidden",
    },
    txRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    txIcon: {
      width: 36,
      height: 36,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
    },
    txTitle: { fontSize: 13, fontWeight: "900" },
    txSub: { marginTop: 2, fontSize: 11.5, fontWeight: "700" },
    txAmount: { fontSize: 12.5, fontWeight: "900" },
  });
}

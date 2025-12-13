import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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
  orderBy,
} from "firebase/firestore";

type Tx = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category?: string;
  account?: string;
  note?: string;
  dateTime?: number;
};

const MODULE_ACCENT = "#FFD93D";

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

export default function FinancialAdviceScreen({ navigation }: any) {
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
  const { textPrimary, textMuted, textSecondary, cardBorder, cardBg, chipBg } = ui;
  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

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
      orderBy("dateTime", "desc")
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
            category: x.category,
            account: x.account,
            note: x.note,
            dateTime: x.dateTime,
          });
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.log("Advice error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [auth, db]);

  const analysis = useMemo(() => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const last30 = items.filter((t) => (t.dateTime || 0) >= now - 30 * DAY);

    const income30 = last30.filter((t) => t.type === "Income").reduce((s, t) => s + t.amount, 0);
    const expense30 = last30.filter((t) => t.type === "Expense").reduce((s, t) => s + t.amount, 0);

    const byCat: Record<string, number> = {};
    for (const t of last30) {
      if (t.type !== "Expense") continue;
      const c = t.category || "Others";
      byCat[c] = (byCat[c] || 0) + t.amount;
    }

    const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    const topCat = catEntries[0]?.[0] || null;
    const topCatValue = catEntries[0]?.[1] || 0;

    const cashflow = income30 - expense30;

    return {
      last30Count: last30.length,
      income30,
      expense30,
      cashflow,
      topCat,
      topCatValue,
      byCatSorted: catEntries,
    };
  }, [items]);

  const adviceList = useMemo(() => {
    const tips: { title: string; desc: string; icon: any }[] = [];

    if (analysis.cashflow < 0) {
      tips.push({
        title: "You are overspending this month",
        desc: `Your last 30 days expenses exceed income by RM ${Math.abs(analysis.cashflow).toFixed(
          2
        )}. Try reducing non-essentials or set a spending cap.`,
        icon: "warning-outline",
      });
    } else {
      tips.push({
        title: "Positive cashflow detected",
        desc: `Great! You saved RM ${analysis.cashflow.toFixed(
          2
        )} over the last 30 days. Consider setting an automatic savings target.`,
        icon: "checkmark-circle-outline",
      });
    }

    if (analysis.topCat) {
      tips.push({
        title: `Top spending category: ${analysis.topCat}`,
        desc: `You spent RM ${analysis.topCatValue.toFixed(
          2
        )} on ${analysis.topCat} (last 30 days). Try setting a category budget to control it.`,
        icon: "pie-chart-outline",
      });
    }

    const smallExpenseCount = items.filter(
      (t) => t.type === "Expense" && t.amount > 0 && t.amount <= 10
    ).length;

    if (smallExpenseCount >= 10) {
      tips.push({
        title: "Many small purchases detected",
        desc: `You have ${smallExpenseCount} expenses ≤ RM10. Small items add up—consider tracking snacks/subscriptions carefully.`,
        icon: "sparkles-outline",
      });
    }

    const hasIncome = items.some((t) => t.type === "Income");
    if (!hasIncome) {
      tips.push({
        title: "No income records found",
        desc: "Add your allowance/salary as Income to make your savings & forecast more accurate.",
        icon: "add-circle-outline",
      });
    }

    return tips;
  }, [analysis.cashflow, analysis.topCat, analysis.topCatValue, items]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const header = (
    <View style={styles.header}>
      <IconButton icon="arrow-back" variant="secondary" size="medium" onPress={() => nav.goBack()} />
      <RNText style={[styles.headerTitle, { color: textPrimary }]}>Financial Advice</RNText>

      <TouchableOpacity
        onPress={onToggleTheme}
        style={[
          styles.themeToggle,
          {
            borderColor: MODULE_ACCENT,
            backgroundColor: isDarkmode ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.75)",
          },
        ]}
        activeOpacity={0.85}
      >
        <Ionicons
          name={isDarkmode ? "sunny-outline" : "moon-outline"}
          size={18}
          color={isDarkmode ? "#FDE68A" : "#0F172A"}
        />
      </TouchableOpacity>
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
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {header}

          <Card
            style={[
              neonGlowStyle({
                isDarkmode,
                accent: "#38BDF8",
                backgroundColor: cardBg,
                borderColor: cardBorder,
                heavy: true,
              }),
            ]}
          >
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>Last 30 Days Summary</RNText>
            <RNText style={{ color: textMuted, marginTop: 4 }}>
              Income: RM {analysis.income30.toFixed(2)}
            </RNText>
            <RNText style={{ color: textMuted, marginTop: 4 }}>
              Expenses: RM {analysis.expense30.toFixed(2)}
            </RNText>
            <RNText
              style={{
                marginTop: 10,
                fontWeight: "900",
                color: analysis.cashflow >= 0 ? "#22C55E" : "#F97316",
              }}
            >
              Cashflow: RM {analysis.cashflow.toFixed(2)}
            </RNText>
          </Card>

          <View style={{ marginTop: theme.spacing.md }}>
            <RNText style={[styles.sectionTitle, { color: textPrimary }]}>Personalized Tips</RNText>

            {adviceList.map((a, idx) => (
              <Card
                key={idx}
                style={[
                  neonGlowStyle({
                    isDarkmode,
                    accent: MODULE_ACCENT,
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                  }),
                ]}
              >
                <View style={styles.tipRow}>
                  <View style={[styles.tipIcon, { backgroundColor: chipBg }]}>
                    <Ionicons name={a.icon} size={18} color={MODULE_ACCENT} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <RNText style={[styles.tipTitle, { color: textPrimary }]}>{a.title}</RNText>
                    <RNText style={[styles.tipDesc, { color: textMuted }]}>{a.desc}</RNText>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          <Card
            style={[
              neonGlowStyle({
                isDarkmode,
                accent: "#A855F7",
                backgroundColor: cardBg,
                borderColor: cardBorder,
              }),
            ]}
          >
            <RNText style={{ color: textMuted, fontSize: 12 }}>
              These insights are generated from your transaction history using simple rule-based analysis.
              Add more records to improve accuracy.
            </RNText>
          </Card>

          <View style={{ height: 8 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xxl,
    },
    center: { flex: 1, justifyContent: "center", alignItems: "center" },
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
    cardTitle: { fontSize: 15, fontWeight: "900" },
    sectionTitle: { fontSize: 15, fontWeight: "900", marginBottom: theme.spacing.sm },
    tipRow: { flexDirection: "row", alignItems: "flex-start" },
    tipIcon: {
      width: 30,
      height: 30,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    tipTitle: { fontSize: 14, fontWeight: "800" },
    tipDesc: { marginTop: 4, fontSize: 12, lineHeight: 16 },
  });
}

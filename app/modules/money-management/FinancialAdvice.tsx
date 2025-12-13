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

type Tx = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category?: string;
  account?: string;
  note?: string;
  dateTime?: number;
};

const MODULE_ACCENT = "#FFD93D"; // match Money Management vibe in index.tsx :contentReference[oaicite:4]{index=4}

export default function FinancialAdviceScreen({ navigation }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const theme = useTheme() as any;
  const isDarkmode: boolean = !!theme?.isDarkmode;

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Tx[]>([]);

  const textPrimary = isDarkmode ? "#F9FAFB" : Theme.colors.textPrimary;
  const mutedText = isDarkmode ? "#9CA3AF" : "#6B7280";
  const cardBorder = isDarkmode ? "#1F2937" : Theme.colors.border;

  const handleToggleTheme = () => {
    if (typeof theme?.toggleTheme === "function") theme.toggleTheme();
    else if (typeof theme?.setTheme === "function")
      theme.setTheme(isDarkmode ? "light" : "dark");
  };

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

    const last30 = items.filter(
      (t) => (t.dateTime || 0) >= now - 30 * DAY
    );

    const income30 = last30
      .filter((t) => t.type === "Income")
      .reduce((s, t) => s + t.amount, 0);

    const expense30 = last30
      .filter((t) => t.type === "Expense")
      .reduce((s, t) => s + t.amount, 0);

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

    // Rule 1: cashflow
    if (analysis.cashflow < 0) {
      tips.push({
        title: "You are overspending this month",
        desc: `Your last 30 days expenses exceed income by RM ${Math.abs(
          analysis.cashflow
        ).toFixed(2)}. Try reducing non-essentials or set a spending cap.`,
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

    // Rule 2: top category
    if (analysis.topCat) {
      tips.push({
        title: `Top spending category: ${analysis.topCat}`,
        desc: `You spent RM ${analysis.topCatValue.toFixed(
          2
        )} on ${analysis.topCat} (last 30 days). Try setting a category budget to control it.`,
        icon: "pie-chart-outline",
      });
    }

    // Rule 3: too many small transactions (simple behavior insight)
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

    // Rule 4: missing income record (common student scenario)
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

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => nav.goBack()}
      />
      <RNText style={[styles.headerTitle, { color: textPrimary }]}>
        Financial Advice
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
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          {header}

          <Card style={[styles.summaryCard, { borderColor: cardBorder }]}>
            <RNText style={[styles.cardTitle, { color: textPrimary }]}>
              Last 30 Days Summary
            </RNText>
            <RNText style={{ color: mutedText, marginTop: 4 }}>
              Income: RM {analysis.income30.toFixed(2)}
            </RNText>
            <RNText style={{ color: mutedText, marginTop: 4 }}>
              Expenses: RM {analysis.expense30.toFixed(2)}
            </RNText>
            <RNText
              style={{
                marginTop: 10,
                fontWeight: "800",
                color: analysis.cashflow >= 0 ? "#22C55E" : "#F97316",
              }}
            >
              Cashflow: RM {analysis.cashflow.toFixed(2)}
            </RNText>
          </Card>

          <View style={{ marginTop: Theme.spacing.md }}>
            <RNText style={[styles.sectionTitle, { color: textPrimary }]}>
              Personalized Tips
            </RNText>

            {adviceList.map((a, idx) => (
              <Card
                key={idx}
                style={[
                  styles.tipCard,
                  { borderColor: cardBorder, borderWidth: 1 },
                ]}
              >
                <View style={styles.tipRow}>
                  <View style={styles.tipIcon}>
                    <Ionicons
                      name={a.icon}
                      size={18}
                      color={MODULE_ACCENT}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <RNText style={[styles.tipTitle, { color: textPrimary }]}>
                      {a.title}
                    </RNText>
                    <RNText style={[styles.tipDesc, { color: mutedText }]}>
                      {a.desc}
                    </RNText>
                  </View>
                </View>
              </Card>
            ))}
          </View>

          <Card
            style={[
              styles.bottomNote,
              { borderColor: cardBorder, borderWidth: 1 },
            ]}
          >
            <RNText style={{ color: mutedText, fontSize: 12 }}>
              These insights are generated from your transaction history using
              simple rule-based analysis. Add more records to improve accuracy.
            </RNText>
          </Card>
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
  summaryCard: {
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: "800",
    marginBottom: Theme.spacing.sm,
  },
  tipCard: {
    marginBottom: 10,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  tipIcon: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(255,217,61,0.14)",
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  tipDesc: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 16,
  },
  bottomNote: {
    marginTop: Theme.spacing.md,
  },
});

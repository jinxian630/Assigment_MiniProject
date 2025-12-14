import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SwipeListView } from "react-native-swipe-list-view";
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
  deleteDoc,
  doc,
} from "firebase/firestore";

type TransactionItem = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category?: string;
  account?: string;
  note?: string;
  dateTime?: number;
};

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

export default function TransactionListScreen({ navigation }: any) {
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
  const { textPrimary, textSecondary, textMuted, cardBorder, cardBg } = ui;
  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransactionItem[]>([]);

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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: TransactionItem[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          list.push({
            id: docSnap.id,
            type: d.type === "Income" ? "Income" : "Expense",
            amount: Number(d.amount || 0),
            category: d.category,
            account: d.account,
            note: d.note,
            dateTime: d.dateTime,
          });
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.log("TransactionList error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth, db]);

  const handleDelete = useCallback(
    async (rowId: string) => {
      try {
        await deleteDoc(doc(db, "Expenses", rowId));
      } catch (err) {
        console.log("Delete error:", err);
      }
    },
    [db]
  );

  const totalIncome = items.filter((i) => i.type === "Income").reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = items.filter((i) => i.type === "Expense").reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpense;

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const renderThemeToggle = () => (
    <TouchableOpacity
      onPress={onToggleTheme}
      style={[
        styles.themeToggle,
        {
          borderColor: "#FFD93D",
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
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <IconButton icon="arrow-back" variant="secondary" size="medium" onPress={() => nav.goBack()} />
      <RNText style={[styles.headerTitle, { color: textPrimary }]}>Transaction List</RNText>
      {renderThemeToggle()}
    </View>
  );

  const renderSummaryCard = () => (
    <Card
      style={[
        neonGlowStyle({
          isDarkmode,
          accent: "#38BDF8",
          backgroundColor: cardBg,
          borderColor: cardBorder,
          heavy: true,
        }),
        styles.summaryCard,
      ]}
    >
      <RNText style={[styles.cardTitle, { color: textPrimary }]}>Financial Summary</RNText>

      <View style={styles.summaryContent}>
        <View style={styles.summaryItem}>
          <RNText style={[styles.summaryLabel, { color: textMuted }]}>Income</RNText>
          <RNText style={[styles.summaryValue, { color: "#22C55E" }]}>
            RM {totalIncome.toFixed(2)}
          </RNText>
        </View>

        <View style={[styles.summaryDivider, { backgroundColor: isDarkmode ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.10)" }]} />

        <View style={styles.summaryItem}>
          <RNText style={[styles.summaryLabel, { color: textMuted }]}>Expenses</RNText>
          <RNText style={[styles.summaryValue, { color: "#F97316" }]}>
            RM {totalExpense.toFixed(2)}
          </RNText>
        </View>
      </View>

      <View style={styles.balanceRow}>
        <RNText style={[styles.balanceLabel, { color: textMuted }]}>Balance</RNText>
        <RNText style={[styles.balanceValue, { color: balance >= 0 ? "#22C55E" : "#F97316" }]}>
          RM {balance.toFixed(2)}
        </RNText>
      </View>
    </Card>
  );

  const renderItem = (data: { item: TransactionItem }) => {
    const item = data.item;
    const isIncome = item.type === "Income";
    const colorBar = isIncome ? "#22C55E" : "#F97316";
    const dateText = item.dateTime ? new Date(item.dateTime).toLocaleDateString() : "";

    return (
      <Card
        style={[
          neonGlowStyle({
            isDarkmode,
            accent: colorBar,
            backgroundColor: cardBg,
            borderColor: cardBorder,
          }),
          styles.rowCard,
        ]}
      >
        <View style={[styles.rowColorBar, { backgroundColor: colorBar }]} />
        <View style={styles.rowContent}>
          <View style={styles.rowMain}>
            <RNText style={[styles.rowCategory, { color: textPrimary }]}>
              {item.category || item.type}
            </RNText>
            <RNText style={[styles.rowAmount, { color: colorBar }]}>
              {isIncome ? "+" : "-"} RM {item.amount.toFixed(2)}
            </RNText>
          </View>

          <View style={styles.rowSub}>
            <RNText style={[styles.rowSubText, { color: textMuted }]}>
              {dateText} · {item.account || "Unknown account"}
            </RNText>
            {item.note ? (
              <RNText style={[styles.rowNote, { color: textMuted }]} numberOfLines={1}>
                {item.note}
              </RNText>
            ) : null}
          </View>
        </View>
      </Card>
    );
  };

  const renderHiddenItem = (data: { item: TransactionItem }) => (
    <View style={styles.hiddenRow}>
      <TouchableOpacity
        style={[styles.hiddenButton, { backgroundColor: "#DC2626" }]}
        onPress={() => handleDelete(data.item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <RNText style={styles.hiddenText}>Delete</RNText>
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
        <View style={styles.container}>
          {renderHeader()}
          {renderSummaryCard()}

          <SwipeListView
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-80}
            disableRightSwipe
            contentContainerStyle={{ paddingBottom: 40 }}
          />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
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

    summaryCard: { marginBottom: theme.spacing.md },
    cardTitle: { fontSize: 15, fontWeight: "900", marginBottom: theme.spacing.sm },

    summaryContent: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
    },
    summaryItem: { alignItems: "center", flex: 1 },
    summaryLabel: { fontSize: 12, marginBottom: theme.spacing.xs },
    summaryValue: { fontSize: 16, fontWeight: "900" },
    summaryDivider: { width: 1, alignSelf: "stretch" },

    balanceRow: {
      marginTop: theme.spacing.sm,
      flexDirection: "row",
      justifyContent: "space-between",
    },
    balanceLabel: { fontSize: 12 },
    balanceValue: { fontSize: 14, fontWeight: "900" },

    rowCard: {
      flexDirection: "row",
      alignItems: "stretch",
      marginBottom: 8,
      borderRadius: 16,
      overflow: "hidden",
    },
    rowColorBar: { width: 4 },
    rowContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
    rowMain: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    rowCategory: { fontSize: 14, fontWeight: "800" },
    rowAmount: { fontSize: 14, fontWeight: "900" },
    rowSub: { marginTop: 3 },
    rowSubText: { fontSize: 11 },
    rowNote: { fontSize: 11 },

    hiddenRow: {
      alignItems: "flex-end",
      justifyContent: "center",
      flex: 1,
      paddingRight: 16,
      marginBottom: 8,
    },
    hiddenButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
    },
    hiddenText: { color: "#fff", marginLeft: 6, fontSize: 12, fontWeight: "800" },
  });
}

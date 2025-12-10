import React, { useEffect, useState, useCallback } from "react";
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

export default function TransactionListScreen({ navigation }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  // ---- THEME HOOK (SAFE) ----
  const theme = useTheme() as any;
  const isDarkmode: boolean = !!theme?.isDarkmode;

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TransactionItem[]>([]);

  // Dynamic colors for better readability
  const textPrimary = isDarkmode ? "#F9FAFB" : Theme.colors.textPrimary;
  const textSecondary = isDarkmode ? "#CBD5E1" : Theme.colors.textSecondary;
  const mutedText = isDarkmode ? "#9CA3AF" : "#6B7280";
  const cardBorder = isDarkmode ? "#1F2937" : Theme.colors.border;

  const handleToggleTheme = () => {
    if (typeof theme?.toggleTheme === "function") {
      theme.toggleTheme();
    } else if (typeof theme?.setTheme === "function") {
      theme.setTheme(isDarkmode ? "light" : "dark");
    } else {
      console.warn("No theme toggle function found in useTheme()");
    }
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

  const totalIncome = items
    .filter((i) => i.type === "Income")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = items
    .filter((i) => i.type === "Expense")
    .reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpense;

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

  const renderHeader = () => (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => nav.goBack()}
      />
      <RNText style={[styles.headerTitle, { color: textPrimary }]}>
        Transaction List
      </RNText>
      {renderThemeToggle()}
    </View>
  );

  const renderSummaryCard = () => (
    <Card style={[styles.summaryCard, { borderColor: cardBorder }]}>
      <RNText style={[styles.cardTitle, { color: textPrimary }]}>
        Financial Summary
      </RNText>
      <View style={styles.summaryContent}>
        <View style={styles.summaryItem}>
          <RNText style={[styles.summaryLabel, { color: mutedText }]}>
            Income
          </RNText>
          <RNText style={[styles.summaryValue, { color: "#22C55E" }]}>
            RM {totalIncome.toFixed(2)}
          </RNText>
        </View>
        <View
          style={[
            styles.summaryDivider,
            { backgroundColor: isDarkmode ? "#1F2937" : Theme.colors.border },
          ]}
        />
        <View style={styles.summaryItem}>
          <RNText style={[styles.summaryLabel, { color: mutedText }]}>
            Expenses
          </RNText>
          <RNText style={[styles.summaryValue, { color: "#F97316" }]}>
            RM {totalExpense.toFixed(2)}
          </RNText>
        </View>
      </View>
      <View style={styles.balanceRow}>
        <RNText style={[styles.balanceLabel, { color: mutedText }]}>
          Balance
        </RNText>
        <RNText
          style={[
            styles.balanceValue,
            { color: balance >= 0 ? "#22C55E" : "#F97316" },
          ]}
        >
          RM {balance.toFixed(2)}
        </RNText>
      </View>
    </Card>
  );

  const renderItem = (data: { item: TransactionItem }) => {
    const item = data.item;
    const isIncome = item.type === "Income";
    const colorBar = isIncome ? "#22C55E" : "#F97316";
    const dateText = item.dateTime
      ? new Date(item.dateTime).toLocaleDateString()
      : "";

    return (
      <Card
        style={[
          styles.rowCard,
          {
            borderColor: cardBorder,
          },
        ]}
      >
        <View style={[styles.rowColorBar, { backgroundColor: colorBar }]} />
        <View style={styles.rowContent}>
          <View style={styles.rowMain}>
            <RNText style={[styles.rowCategory, { color: textPrimary }]}>
              {item.category || item.type}
            </RNText>
            <RNText
              style={[
                styles.rowAmount,
                { color: isIncome ? "#22C55E" : "#F97316" },
              ]}
            >
              {isIncome ? "+" : "-"} RM {item.amount.toFixed(2)}
            </RNText>
          </View>
          <View style={styles.rowSub}>
            <RNText style={[styles.rowSubText, { color: mutedText }]}>
              {dateText} · {item.account || "Unknown account"}
            </RNText>
            {item.note ? (
              <RNText
                style={[
                  styles.rowNote,
                  { color: isDarkmode ? "#9CA3AF" : "#9CA3AF" },
                ]}
                numberOfLines={1}
              >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginBottom: Theme.spacing.md,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: "bold",
    marginBottom: Theme.spacing.sm,
  },
  summaryContent: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: Theme.spacing.sm,
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryLabel: {
    fontSize: Theme.typography.fontSizes.sm,
    marginBottom: Theme.spacing.xs,
  },
  summaryValue: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: "bold",
  },
  summaryDivider: {
    width: 1,
    alignSelf: "stretch",
  },
  balanceRow: {
    marginTop: Theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceLabel: {
    fontSize: Theme.typography.fontSizes.sm,
  },
  balanceValue: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: "700",
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 8,
    borderWidth: 1,
  },
  rowColorBar: {
    width: 4,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  rowContent: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  rowMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowCategory: {
    fontSize: 14,
    fontWeight: "600",
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: "700",
  },
  rowSub: {
    marginTop: 3,
  },
  rowSubText: {
    fontSize: 11,
  },
  rowNote: {
    fontSize: 11,
  },
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
  hiddenText: {
    color: "#fff",
    marginLeft: 6,
    fontSize: 12,
  },
});

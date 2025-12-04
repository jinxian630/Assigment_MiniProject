import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "src/types/navigation";
import { Ionicons } from "@expo/vector-icons";
import { SwipeListView } from "react-native-swipe-list-view";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { Theme } from "@/constants/theme";

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
import { Text } from "react-native-rapi-ui";

type Props = NativeStackScreenProps<MainStackParamList, "TransactionList">;

type TransactionItem = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category?: string;
  account?: string;
  note?: string;
  dateTime?: number;
};

export default function TransactionListScreen({ navigation }: Props) {
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

  const totalIncome = items
    .filter((i) => i.type === "Income")
    .reduce((sum, i) => sum + i.amount, 0);
  const totalExpense = items
    .filter((i) => i.type === "Expense")
    .reduce((sum, i) => sum + i.amount, 0);
  const balance = totalIncome - totalExpense;

  const renderHeader = () => (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => navigation.goBack()}
      />
      <Text style={styles.headerTitle}>Transaction List</Text>
      <View style={{ width: 48 }} />
    </View>
  );

  const renderSummaryCard = () => (
    <Card style={styles.summaryCard}>
      <Text style={styles.cardTitle}>Financial Summary</Text>
      <View style={styles.summaryContent}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: "#2e8b57" }]}>
            RM {totalIncome.toFixed(2)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: "#e74c3c" }]}>
            RM {totalExpense.toFixed(2)}
          </Text>
        </View>
      </View>
      <View style={styles.balanceRow}>
        <Text style={styles.balanceLabel}>Balance</Text>
        <Text
          style={[
            styles.balanceValue,
            { color: balance >= 0 ? "#2e8b57" : "#e74c3c" },
          ]}
        >
          RM {balance.toFixed(2)}
        </Text>
      </View>
    </Card>
  );

  const renderItem = (data: { item: TransactionItem }) => {
    const item = data.item;
    const isIncome = item.type === "Income";
    const colorBar = isIncome ? "#2e8b57" : "#e74c3c";
    const dateText = item.dateTime
      ? new Date(item.dateTime).toLocaleDateString()
      : "";

    return (
      <Card style={styles.rowCard}>
        <View style={[styles.rowColorBar, { backgroundColor: colorBar }]} />
        <View style={styles.rowContent}>
          <View style={styles.rowMain}>
            <Text style={styles.rowCategory}>{item.category || item.type}</Text>
            <Text
              style={[
                styles.rowAmount,
                { color: isIncome ? "#2e8b57" : "#e74c3c" },
              ]}
            >
              {isIncome ? "+" : "-"} RM {item.amount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.rowSub}>
            <Text style={styles.rowSubText}>
              {dateText} · {item.account || "Unknown account"}
            </Text>
            {item.note ? (
              <Text style={styles.rowNote} numberOfLines={1}>
                {item.note}
              </Text>
            ) : null}
          </View>
        </View>
      </Card>
    );
  };

  const renderHiddenItem = (data: { item: TransactionItem }) => (
    <View style={styles.hiddenRow}>
      <TouchableOpacity
        style={[styles.hiddenButton, { backgroundColor: "#e74c3c" }]}
        onPress={() => handleDelete(data.item.id)}
      >
        <Ionicons name="trash-outline" size={20} color="#fff" />
        <Text style={styles.hiddenText}>Delete</Text>
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
    color: Theme.colors.textPrimary,
  },
  summaryCard: {
    marginBottom: Theme.spacing.md,
  },
  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
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
    color: Theme.colors.textSecondary,
    marginBottom: Theme.spacing.xs,
  },
  summaryValue: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Theme.colors.border,
    marginHorizontal: Theme.spacing.md,
    alignSelf: "stretch",
  },
  balanceRow: {
    marginTop: Theme.spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  balanceLabel: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.textSecondary,
  },
  balanceValue: {
    fontSize: Theme.typography.fontSizes.md,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 8,
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
    color: "#6b7280",
  },
  rowNote: {
    fontSize: 11,
    color: "#9ca3af",
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

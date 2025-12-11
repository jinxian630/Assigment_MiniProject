import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import { useRouter } from "expo-router";

import { Button } from "react-native-rapi-ui";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { Theme } from "@/constants/theme";

import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
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

export default function PrintTransactionListScreen({ navigation }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(false);
  const [txs, setTxs] = useState<Tx[]>([]);

  useEffect(() => {
    const load = async () => {
      const user = auth.currentUser;
      if (!user) return;

      setLoading(true);
      try {
        const q = query(
          collection(db, "Expenses"),
          where("createdBy", "==", user.uid),
          orderBy("dateTime", "desc")
        );
        const snap = await getDocs(q);
        const list: Tx[] = [];
        snap.forEach((docSnap) => {
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
        setTxs(list);
      } catch (err) {
        console.log("Print load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [auth, db]);

  const handlePrint = async () => {
    if (!txs.length) return;

    const rowsHtml = txs
      .map((t) => {
        const dateStr = t.dateTime ? new Date(t.dateTime).toLocaleString() : "";
        return `
          <tr>
            <td>${dateStr}</td>
            <td>${t.type}</td>
            <td>${t.category || ""}</td>
            <td>${t.account || ""}</td>
            <td>${t.note || ""}</td>
            <td style="text-align:right;">
              ${t.type === "Income" ? "+" : "-"} RM ${t.amount.toFixed(2)}
            </td>
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ccc; padding: 6px; }
            th { background-color: #f3f4f6; text-align: left; }
          </style>
        </head>
        <body>
          <h1>Income & Expense Transactions</h1>
          <p>Total records: ${txs.length}</p>
          <table>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Category</th>
                <th>Account</th>
                <th>Note</th>
                <th>Amount (RM)</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (err) {
      console.log("Print error:", err);
    }
  };

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => nav.goBack()}
      />
      <RNText style={styles.headerTitle}>Print Transactions</RNText>
      <View style={{ width: 48 }} />
    </View>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            {header}

            <Card>
              <RNText style={styles.cardTitle}>Export to PDF</RNText>
              <RNText style={styles.infoText}>
                This will generate a PDF containing all your income and expense
                records, including type, category, account, note and amount.
              </RNText>

              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />
                  <RNText style={{ marginLeft: 8 }}>
                    Loading transactions...
                  </RNText>
                </View>
              ) : (
                <RNText style={styles.infoText}>
                  Total records: {txs.length}
                </RNText>
              )}

              <Button
                text="Print PDF"
                disabled={!txs.length || loading}
                leftContent={
                  <Ionicons name="print-outline" size={18} color="#fff" />
                }
                style={{ marginTop: 16 }}
                onPress={handlePrint}
              />
            </Card>
          </View>
        </KeyboardAvoidingView>
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
  cardTitle: {
    fontSize: Theme.typography.fontSizes.lg,
    fontWeight: Theme.typography.fontWeights.bold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },
  infoText: {
    fontSize: 13,
    marginTop: 4,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
});

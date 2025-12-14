import React, {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text as RNText,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useRouter } from "expo-router";
import { Button } from "react-native-rapi-ui";
import { useFocusEffect } from "@react-navigation/native";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";
import { getMoneyColors, toggleThemeSafe } from "./MoneyUI";

import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

type Tx = {
  id: string;
  type: "Income" | "Expense";
  amount: number;
  category?: string;
  account?: string;
  note?: string;
  dateTime?: number;
  imageURL?: string;
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

function money(n: number) {
  const v = Number.isFinite(n) ? n : 0;
  return v.toFixed(2);
}

function escapeHtml(str: string) {
  return (str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function monthKeyFromMs(ms?: number) {
  if (!ms) return "";
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function monthLabel(ym: string) {
  if (!ym) return "All months";
  const [y, m] = ym.split("-");
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const idx = Math.max(1, Math.min(12, Number(m))) - 1;
  return `${monthNames[idx]} ${y}`;
}

type PickerMode = "month" | "type" | "category" | "account";

export default function PrintTransactionListScreen({ navigation }: any) {
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
  const [txs, setTxs] = useState<Tx[]>([]);
  const [exporting, setExporting] = useState(false);

  // ✅ Filters
  const [filterMonth, setFilterMonth] = useState<string>(""); // "" = All
  const [filterType, setFilterType] = useState<"" | "Income" | "Expense">("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterAccount, setFilterAccount] = useState<string>("");

  // ✅ picker modal
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("month");

  const snapUnsubRef = useRef<null | (() => void)>(null);
  const authUnsubRef = useRef<null | (() => void)>(null);

  useFocusEffect(
    useCallback(() => {
      if (snapUnsubRef.current) snapUnsubRef.current();
      if (authUnsubRef.current) authUnsubRef.current();

      setLoading(true);

      authUnsubRef.current = onAuthStateChanged(auth, (user) => {
        if (snapUnsubRef.current) snapUnsubRef.current();

        if (!user) {
          setTxs([]);
          setLoading(false);
          return;
        }

        const q = query(
          collection(db, "Expenses"),
          where("createdBy", "==", user.uid),
          orderBy("dateTime", "desc")
        );

        snapUnsubRef.current = onSnapshot(
          q,
          (snap) => {
            const list: Tx[] = snap.docs.map((d) => {
              const x = d.data() as any;
              return {
                id: d.id,
                type: x.type === "Income" ? "Income" : "Expense",
                amount: Number(x.amount || 0),
                category: x.category,
                account: x.account,
                note: x.note,
                dateTime: x.dateTime,
                imageURL: x.imageURL || null,
              };
            });

            setTxs(list);
            setLoading(false);
          },
          (err) => {
            console.log("Print onSnapshot error:", err);
            setLoading(false);

            const msg =
              (err as any)?.message?.includes("index") ||
              (err as any)?.message?.includes("FAILED_PRECONDITION")
                ? "Firestore index required for this query. Open the console link shown in logs and create the index."
                : "Failed to load transactions. Check Firestore rules / internet.";

            Alert.alert("Load failed", msg);
          }
        );
      });

      return () => {
        if (snapUnsubRef.current) snapUnsubRef.current();
        if (authUnsubRef.current) authUnsubRef.current();
      };
    }, [auth, db])
  );

  // ✅ Build filter options from data
  const monthOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of txs) {
      const k = monthKeyFromMs(t.dateTime);
      if (k) set.add(k);
    }
    return ["", ...Array.from(set).sort((a, b) => (a < b ? 1 : -1))];
  }, [txs]);

  // ✅ Category options depends on selected Type (Income/Expense/All)
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();

    for (const t of txs) {
      // filter categories by selected type
      if (filterType && t.type !== filterType) continue;
      if (t.category) set.add(String(t.category));
    }

    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [txs, filterType]);

  // ✅ if user changed type, reset category if not valid anymore
  useEffect(() => {
    if (filterCategory && !categoryOptions.includes(filterCategory)) {
      setFilterCategory("");
    }
  }, [filterType, categoryOptions, filterCategory]);

  const categoryChipLabel = useMemo(() => {
    if (filterCategory) return filterCategory;
    if (filterType === "Income") return "Income categories";
    if (filterType === "Expense") return "Expense categories";
    return "Category";
  }, [filterCategory, filterType]);

  const accountOptions = useMemo(() => {
    const set = new Set<string>();
    for (const t of txs) if (t.account) set.add(String(t.account));
    return ["", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [txs]);

  const typeOptions = useMemo(() => ["", "Income", "Expense"] as const, []);

  // ✅ Filtered data (this is what we print)
  const filteredTxs = useMemo(() => {
    return txs.filter((t) => {
      if (filterType && t.type !== filterType) return false;
      if (filterCategory && (t.category || "") !== filterCategory) return false;
      if (filterAccount && (t.account || "") !== filterAccount) return false;
      if (filterMonth) {
        const mk = monthKeyFromMs(t.dateTime);
        if (mk !== filterMonth) return false;
      }
      return true;
    });
  }, [txs, filterType, filterCategory, filterAccount, filterMonth]);

  // ✅ totals use filteredTxs
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const t of filteredTxs) {
      const amt = Number(t.amount || 0);
      if (t.type === "Income") income += amt;
      else expense += amt;
    }
    return { income, expense, net: income - expense };
  }, [filteredTxs]);

  const filterBadgeText = useMemo(() => {
    const parts: string[] = [];
    parts.push(filterMonth ? monthLabel(filterMonth) : "All months");
    parts.push(filterType ? filterType : "All types");
    parts.push(filterCategory ? filterCategory : "All categories");
    parts.push(filterAccount ? filterAccount : "All accounts");
    return parts.join(" • ");
  }, [filterMonth, filterType, filterCategory, filterAccount]);

  const openPicker = (mode: PickerMode) => {
    setPickerMode(mode);
    setPickerOpen(true);
  };

  const applyPickerValue = (value: string) => {
    if (pickerMode === "month") setFilterMonth(value);
    if (pickerMode === "type") setFilterType(value as any);
    if (pickerMode === "category") setFilterCategory(value);
    if (pickerMode === "account") setFilterAccount(value);
    setPickerOpen(false);
  };

  const resetFilters = () => {
    setFilterMonth("");
    setFilterType("");
    setFilterCategory("");
    setFilterAccount("");
  };

  const buildHtml = () => {
    const rowsHtml = filteredTxs
      .map((t) => {
        const dateStr = t.dateTime ? new Date(t.dateTime).toLocaleString() : "";
        const sign = t.type === "Income" ? "+" : "-";

        const imageHtml = t.imageURL
          ? `
            <div style="margin-top:6px;">
              <img
                src="${t.imageURL}"
                style="
                  max-width: 140px;
                  max-height: 140px;
                  border-radius: 6px;
                  border: 1px solid #e5e7eb;
                "
              />
            </div>
          `
          : `<span style="color:#9ca3af;">No image</span>`;

        return `
          <tr>
            <td>${escapeHtml(dateStr)}</td>
            <td>${escapeHtml(t.type)}</td>
            <td>${escapeHtml(t.category || "")}</td>
            <td>${escapeHtml(t.account || "")}</td>
            <td>
              <div>${escapeHtml(t.note || "")}</div>
              ${imageHtml}
            </td>
            <td style="text-align:right; white-space:nowrap;">
              ${sign} RM ${money(t.amount)}
            </td>
          </tr>
        `;
      })
      .join("");

    const generatedAt = new Date().toLocaleString();

    return `
      <html>
        <head>
          <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" />
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 16px; color: #111827; }
            h1 { font-size: 20px; margin: 0 0 6px 0; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 10px; }

            .filtersBox { border: 1px dashed #d1d5db; border-radius: 10px; padding: 10px 12px; margin: 10px 0 14px 0; background: #ffffff; }
            .filtersTitle { font-weight: 700; font-size: 12px; margin-bottom: 6px; color:#374151; }
            .filtersText { font-size: 12px; color:#111827; }

            .summary { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; margin: 10px 0 14px 0; background: #f9fafb; }
            .summaryRow { display:flex; justify-content:space-between; margin:4px 0; font-size:13px; }
            .summaryLabel { color:#374151; }
            .summaryVal { font-weight:700; }
            .pos { color:#059669; }
            .neg { color:#dc2626; }

            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #d1d5db; padding: 6px; vertical-align: top; }
            th { background-color: #f3f4f6; text-align: left; }

            .foot { margin-top: 10px; font-size: 11px; color: #6b7280; }
          </style>
        </head>
        <body>
          <h1>Income & Expense Transactions</h1>
          <div class="meta">Generated at: ${escapeHtml(
            generatedAt
          )} • Total records: ${filteredTxs.length}</div>

          <div class="filtersBox">
            <div class="filtersTitle">Applied Filters</div>
            <div class="filtersText">${escapeHtml(filterBadgeText)}</div>
          </div>

          <div class="summary">
            <div class="summaryRow">
              <div class="summaryLabel">Total Income</div>
              <div class="summaryVal pos">RM ${money(totals.income)}</div>
            </div>
            <div class="summaryRow">
              <div class="summaryLabel">Total Expense</div>
              <div class="summaryVal neg">RM ${money(totals.expense)}</div>
            </div>
            <div class="summaryRow" style="margin-top:8px; padding-top:8px; border-top:1px solid #e5e7eb;">
              <div class="summaryLabel">Net Balance</div>
              <div class="summaryVal ${
                totals.net >= 0 ? "pos" : "neg"
              }">RM ${money(totals.net)}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 18%;">Date & Time</th>
                <th style="width: 10%;">Type</th>
                <th style="width: 16%;">Category</th>
                <th style="width: 16%;">Account</th>
                <th>Note & Receipt</th>
                <th style="width: 14%;">Amount (RM)</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="foot">This report contains your recorded income and expense transactions.</div>
        </body>
      </html>
    `;
  };

  // ✅ Web: browser print (Save as PDF)
  const openWebPrintWindow = (html: string) => {
    try {
      const w = window.open("", "_blank");
      if (!w) {
        Alert.alert("Popup blocked", "Please allow popups to print/export.");
        return;
      }
      w.document.open();
      w.document.write(html);
      w.document.close();

      setTimeout(() => {
        w.focus();
        w.print();
      }, 250);
    } catch (e) {
      console.log("Web print error:", e);
      Alert.alert("Web print failed", "Unable to open print window.");
    }
  };

  const handlePrint = async () => {
    if (loading) return;
    if (!filteredTxs.length) {
      Alert.alert("No data", "No records match your filters.");
      return;
    }

    const html = buildHtml();

    if (Platform.OS === "web") {
      openWebPrintWindow(html);
      return;
    }

    try {
      await Print.printAsync({ html });
    } catch (err) {
      console.log("Print error:", err);
      Alert.alert("Print failed", "Unable to open printer / PDF preview.");
    }
  };

  const handleSharePdf = async () => {
    if (loading) return;
    if (!filteredTxs.length) {
      Alert.alert("No data", "No records match your filters.");
      return;
    }

    const html = buildHtml();

    if (Platform.OS === "web") {
      Alert.alert(
        "Web export",
        "Browser will open print preview. Choose 'Save as PDF' to export."
      );
      openWebPrintWindow(html);
      return;
    }

    setExporting(true);
    try {
      const file = await Print.printToFileAsync({ html, base64: false });

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert(
          "Sharing not available",
          "Sharing is not available on this device."
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        UTI: "com.adobe.pdf",
      });
    } catch (err) {
      console.log("Share PDF error:", err);
      Alert.alert("Export failed", "Unable to generate/share the PDF file.");
    } finally {
      setExporting(false);
    }
  };

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const header = (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={() => nav.goBack()}
      />
      <RNText style={[styles.headerTitle, { color: textPrimary }]}>
        Print Transactions
      </RNText>

      <TouchableOpacity
        onPress={onToggleTheme}
        style={[
          styles.themeToggle,
          {
            borderColor: "#FFD93D",
            backgroundColor: isDarkmode
              ? "rgba(15,23,42,0.65)"
              : "rgba(255,255,255,0.75)",
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

  const pickerTitle = useMemo(() => {
    if (pickerMode === "month") return "Select Month";
    if (pickerMode === "type") return "Select Type";
    if (pickerMode === "category") return "Select Category";
    return "Select Account";
  }, [pickerMode]);

  const pickerData = useMemo(() => {
    if (pickerMode === "month") return monthOptions;
    if (pickerMode === "type") return (["", "Income", "Expense"] as string[]);
    if (pickerMode === "category") return categoryOptions;
    return accountOptions;
  }, [pickerMode, monthOptions, categoryOptions, accountOptions]);

  const renderPickerItem = ({ item }: { item: string }) => {
    const label =
      pickerMode === "month"
        ? monthLabel(item)
        : item || `All ${pickerMode === "type" ? "types" : pickerMode + "s"}`;

    const selected =
      (pickerMode === "month" && item === filterMonth) ||
      (pickerMode === "type" && item === filterType) ||
      (pickerMode === "category" && item === filterCategory) ||
      (pickerMode === "account" && item === filterAccount);

    return (
      <Pressable
        onPress={() => applyPickerValue(item)}
        style={[
          styles.pickerRow,
          { borderColor: selected ? "#A855F7" : "rgba(148,163,184,0.35)" },
        ]}
      >
        <RNText style={[styles.pickerRowText, { color: textPrimary }]}>
          {label}
        </RNText>
        {selected && (
          <Ionicons name="checkmark-circle" size={18} color="#A855F7" />
        )}
      </Pressable>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.container}>
            {header}

            {/* Filters Modal */}
            <Modal
              transparent
              visible={pickerOpen}
              animationType="fade"
              onRequestClose={() => setPickerOpen(false)}
            >
              <Pressable
                style={styles.modalOverlay}
                onPress={() => setPickerOpen(false)}
              />
              <View
                style={[
                  styles.modalCard,
                  neonGlowStyle({
                    isDarkmode,
                    accent: "#38BDF8",
                    backgroundColor: cardBg,
                    borderColor: cardBorder,
                    heavy: true,
                  }),
                ]}
              >
                <View style={styles.modalHeader}>
                  <RNText style={[styles.modalTitle, { color: textPrimary }]}>
                    {pickerTitle}
                  </RNText>
                  <TouchableOpacity
                    onPress={() => setPickerOpen(false)}
                    style={styles.modalClose}
                  >
                    <Ionicons name="close" size={18} color={textPrimary} />
                  </TouchableOpacity>
                </View>

                <FlatList
                  data={pickerData}
                  keyExtractor={(it, idx) => `${it}_${idx}`}
                  renderItem={renderPickerItem}
                  style={{ maxHeight: 380 }}
                />
              </View>
            </Modal>

            <Card
              style={[
                neonGlowStyle({
                  isDarkmode,
                  accent: "#A855F7",
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  heavy: true,
                }),
              ]}
            >
              <RNText style={[styles.cardTitle, { color: textPrimary }]}>
                Export to PDF
              </RNText>

              <RNText style={[styles.infoText, { color: textSecondary }]}>
                Select what you want to include (month / category / account /
                type), then print or share the PDF.
              </RNText>

              <View style={styles.filterSummary}>
                <Ionicons name="funnel-outline" size={16} color={textMuted} />
                <RNText
                  style={[styles.filterSummaryText, { color: textMuted }]}
                >
                  {filterBadgeText}
                </RNText>
              </View>

              <View style={styles.filterGrid}>
                <TouchableOpacity
                  onPress={() => openPicker("month")}
                  style={[
                    styles.filterChip,
                    { borderColor: "rgba(168,85,247,0.6)" },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={textPrimary}
                  />
                  <RNText
                    style={[styles.filterChipText, { color: textPrimary }]}
                  >
                    {filterMonth ? monthLabel(filterMonth) : "Month"}
                  </RNText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openPicker("type")}
                  style={[
                    styles.filterChip,
                    { borderColor: "rgba(56,189,248,0.6)" },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="swap-vertical-outline"
                    size={16}
                    color={textPrimary}
                  />
                  <RNText
                    style={[styles.filterChipText, { color: textPrimary }]}
                  >
                    {filterType || "Type"}
                  </RNText>
                </TouchableOpacity>

                {/* ✅ Category chip now shows Income/Expense categories label */}
                <TouchableOpacity
                  onPress={() => openPicker("category")}
                  style={[
                    styles.filterChip,
                    { borderColor: "rgba(34,197,94,0.6)" },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="pricetags-outline"
                    size={16}
                    color={textPrimary}
                  />
                  <RNText
                    style={[styles.filterChipText, { color: textPrimary }]}
                  >
                    {categoryChipLabel}
                  </RNText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openPicker("account")}
                  style={[
                    styles.filterChip,
                    { borderColor: "rgba(250,204,21,0.6)" },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="card-outline" size={16} color={textPrimary} />
                  <RNText
                    style={[styles.filterChipText, { color: textPrimary }]}
                  >
                    {filterAccount || "Account"}
                  </RNText>
                </TouchableOpacity>
              </View>

              <View style={styles.resetRow}>
                <TouchableOpacity
                  onPress={resetFilters}
                  activeOpacity={0.85}
                  style={styles.resetBtn}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={16}
                    color={textPrimary}
                  />
                  <RNText style={[styles.resetText, { color: textPrimary }]}>
                    Reset
                  </RNText>
                </TouchableOpacity>
              </View>

              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator />
                  <RNText style={{ marginLeft: 8, color: textSecondary }}>
                    Loading transactions...
                  </RNText>
                </View>
              ) : (
                <View style={{ marginTop: 10 }}>
                  <RNText style={[styles.infoText, { color: textMuted }]}>
                    Total records (filtered): {filteredTxs.length}
                  </RNText>
                  {!!filteredTxs.length && (
                    <RNText style={[styles.infoText, { color: textMuted }]}>
                      Income: RM {money(totals.income)} • Expense: RM{" "}
                      {money(totals.expense)} • Net: RM {money(totals.net)}
                    </RNText>
                  )}
                </View>
              )}

              <Button
                text={exporting ? "Please wait..." : "Print PDF"}
                disabled={!filteredTxs.length || loading || exporting}
                leftContent={
                  <Ionicons name="print-outline" size={18} color="#fff" />
                }
                style={{ marginTop: 16 }}
                onPress={handlePrint}
              />

              <Button
                text={exporting ? "Generating PDF..." : "Share PDF"}
                disabled={!filteredTxs.length || loading || exporting}
                leftContent={
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color="#fff"
                  />
                }
                style={{ marginTop: 10 }}
                onPress={handleSharePdf}
              />
            </Card>
          </View>
        </KeyboardAvoidingView>
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
    cardTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginBottom: theme.spacing.sm,
    },
    infoText: { fontSize: 13, marginTop: 4 },

    filterSummary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 10,
      paddingVertical: 8,
    },
    filterSummaryText: { fontSize: 12, flex: 1 },

    filterGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 6,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      backgroundColor: "rgba(15,23,42,0.18)",
      minWidth: "48%",
    },
    filterChipText: { fontSize: 12, fontWeight: "700" },

    resetRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
    },
    resetBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.35)",
      backgroundColor: "rgba(2,6,23,0.20)",
    },
    resetText: { fontSize: 12, fontWeight: "800" },

    loadingRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },

    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
    },
    modalCard: {
      position: "absolute",
      left: 16,
      right: 16,
      top: 120,
      borderRadius: 18,
      padding: 14,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    modalTitle: { fontSize: 14, fontWeight: "900" },
    modalClose: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.35)",
      backgroundColor: "rgba(2,6,23,0.20)",
    },
    pickerRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: "rgba(2,6,23,0.20)",
    },
    pickerRowText: { fontSize: 13, fontWeight: "800" },
  });
}

import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Text as RNText,
  Modal,
  Image,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SwipeListView } from "react-native-swipe-list-view";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";
import { getMoneyColors, toggleThemeSafe } from "./MoneyUI";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { getAuth, onAuthStateChanged } from "firebase/auth";
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
  imageURL?: string | null;
};

type FilterType = "All" | "Income" | "Expense";
type AccountScope = "All" | string;

type MonthHeaderRow = { id: string; kind: "monthHeader"; title: string };
type DisplayRow = TransactionItem | MonthHeaderRow;

const SWIPE_HINT_KEY = "mm_tx_swipe_hint_seen_v1";

const formatMonth = (ts?: number) => {
  if (!ts) return "Unknown";
  return new Date(ts).toLocaleDateString("en-MY", {
    month: "long",
    year: "numeric",
  });
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  // search / filter
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("All");
  const [accountScope, setAccountScope] = useState<AccountScope>("All");
  const [refreshing, setRefreshing] = useState(false);

  // toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<any>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastOpen(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastOpen(false), 900);
  }, []);

  // swipe hint
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const swipeHintAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(SWIPE_HINT_KEY);
        if (!seen) setShowSwipeHint(true);
      } catch {
        setShowSwipeHint(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!showSwipeHint) return;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(swipeHintAnim, {
          toValue: 1,
          duration: 550,
          useNativeDriver: true,
        }),
        Animated.timing(swipeHintAnim, {
          toValue: 0,
          duration: 550,
          useNativeDriver: true,
        }),
      ])
    );

    loop.start();

    const t = setTimeout(async () => {
      setShowSwipeHint(false);
      try {
        await AsyncStorage.setItem(SWIPE_HINT_KEY, "1");
      } catch {}
    }, 2600);

    return () => {
      loop.stop();
      clearTimeout(t);
    };
  }, [showSwipeHint, swipeHintAnim]);

  // ✅ realtime listener (focus-aware)
  const snapUnsubRef = useRef<null | (() => void)>(null);
  const authUnsubRef = useRef<null | (() => void)>(null);

  useFocusEffect(
    useCallback(() => {
      if (snapUnsubRef.current) {
        snapUnsubRef.current();
        snapUnsubRef.current = null;
      }
      if (authUnsubRef.current) {
        authUnsubRef.current();
        authUnsubRef.current = null;
      }

      setLoading(true);

      authUnsubRef.current = onAuthStateChanged(auth, (user) => {
        if (snapUnsubRef.current) {
          snapUnsubRef.current();
          snapUnsubRef.current = null;
        }

        if (!user) {
          setItems([]);
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
          (snapshot) => {
            const list: TransactionItem[] = [];
            snapshot.forEach((d) => {
              const x = d.data() as any;
              list.push({
                id: d.id,
                type: x.type === "Income" ? "Income" : "Expense",
                amount: Number(x.amount || 0),
                category: x.category,
                account: x.account,
                note: x.note,
                dateTime: x.dateTime,
                imageURL: x.imageURL ?? null,
              });
            });

            setItems(list);
            setLoading(false);
          },
          () => setLoading(false)
        );
      });

      return () => {
        if (snapUnsubRef.current) snapUnsubRef.current();
        if (authUnsubRef.current) authUnsubRef.current();
        snapUnsubRef.current = null;
        authUnsubRef.current = null;
      };
    }, [auth, db])
  );

  // ✅ delete (optimistic, prevents blank, closes modal)
  const handleDelete = useCallback(
    async (rowId: string) => {
      // optimistic remove
      setItems((prev) => prev.filter((x) => x.id !== rowId));

      // close modal if deleting selected
      if (selectedTx?.id === rowId) {
        setDetailOpen(false);
        setSelectedTx(null);
      }

      try {
        await deleteDoc(doc(db, "Expenses", rowId));
        showToast("Deleted ✅");
      } catch (err) {
        console.log("Delete error:", err);
        showToast("Delete failed ❌");
      }
    },
    [db, showToast, selectedTx]
  );

  const confirmDelete = useCallback(
    (rowId: string) => {
      if (Platform.OS === "web" && typeof window !== "undefined") {
        const ok = window.confirm(
          "Delete transaction?\nThis action cannot be undone."
        );
        if (ok) handleDelete(rowId);
        return;
      }

      Alert.alert("Delete transaction?", "This action cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDelete(rowId),
        },
      ]);
    },
    [handleDelete]
  );

  // ✅ Accounts list for chips
  const accounts = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      const a = (it.account ?? "").trim();
      set.add(a.length ? a : "Unknown");
    }
    return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [items]);

  // ✅ Scope items by account for summary + list consistency
  const scopedItems = useMemo(() => {
    if (accountScope === "All") return items;
    return items.filter(
      (it) => ((it.account ?? "Unknown").trim() || "Unknown") === accountScope
    );
  }, [items, accountScope]);

  // ✅ Summary totals are by account
  const totalIncome = useMemo(
    () =>
      scopedItems
        .filter((i) => i.type === "Income")
        .reduce((sum, i) => sum + i.amount, 0),
    [scopedItems]
  );

  const totalExpense = useMemo(
    () =>
      scopedItems
        .filter((i) => i.type === "Expense")
        .reduce((sum, i) => sum + i.amount, 0),
    [scopedItems]
  );

  const balance = totalIncome - totalExpense;

  // ✅ Filter list uses scopedItems (so summary == list)
  const filteredItems = useMemo(() => {
    const s = search.trim().toLowerCase();

    return scopedItems.filter((it) => {
      if (filter !== "All" && it.type !== filter) return false;
      if (!s) return true;

      const hay = [
        it.type,
        it.category ?? "",
        it.account ?? "",
        it.note ?? "",
        String(it.amount ?? ""),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(s);
    });
  }, [scopedItems, search, filter]);

  // month grouping
  const groupedItems = useMemo<DisplayRow[]>(() => {
    const out: DisplayRow[] = [];
    let last = "";
    for (const it of filteredItems) {
      const month = formatMonth(it.dateTime);
      if (month !== last) {
        out.push({ id: `mh-${month}`, kind: "monthHeader", title: month });
        last = month;
      }
      out.push(it);
    }
    return out;
  }, [filteredItems]);

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const openDetail = useCallback((tx: TransactionItem) => {
    setSelectedTx(tx);
    setDetailOpen(true);
  }, []);

  const goEdit = useCallback(
    (txId: string) => {
      router.push({
        pathname: "/modules/money-management/EditTransaction",
        params: { txId },
      });
    },
    [router]
  );

  const renderThemeToggle = () => (
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

  // ✅ Summary card (now includes account chips)
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
      <View style={styles.summaryTitleRow}>
        <RNText style={[styles.cardTitle, { color: textPrimary }]}>
          Financial Summary
        </RNText>

        <View style={styles.scopePill}>
          <Ionicons name="wallet-outline" size={14} color={textMuted} />
          <RNText style={[styles.scopeText, { color: textMuted }]}>
            {accountScope}
          </RNText>
        </View>
      </View>

      {/* Account chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.accountChipsWrap}
      >
        {accounts.map((acc) => {
          const active = accountScope === acc;
          const accent = "#38BDF8";

          return (
            <TouchableOpacity
              key={acc}
              activeOpacity={0.88}
              onPress={() => setAccountScope(acc)}
              style={[
                styles.accountChip,
                {
                  borderColor: active
                    ? isDarkmode
                      ? `${accent}DD`
                      : accent
                    : isDarkmode
                    ? "rgba(148,163,184,0.25)"
                    : "rgba(15,23,42,0.10)",
                  backgroundColor: active
                    ? isDarkmode
                      ? "rgba(56,189,248,0.12)"
                      : "rgba(56,189,248,0.10)"
                    : isDarkmode
                    ? "rgba(148,163,184,0.06)"
                    : "rgba(2,6,23,0.03)",
                },
              ]}
            >
              <RNText
                style={[
                  styles.accountChipText,
                  { color: active ? accent : textSecondary },
                ]}
              >
                {acc}
              </RNText>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.summaryContent}>
        <View style={styles.summaryItem}>
          <RNText style={[styles.summaryLabel, { color: textMuted }]}>
            Income
          </RNText>
          <RNText style={[styles.summaryValue, { color: "#22C55E" }]}>
            RM {totalIncome.toFixed(2)}
          </RNText>
        </View>

        <View
          style={[
            styles.summaryDivider,
            {
              backgroundColor: isDarkmode
                ? "rgba(148,163,184,0.25)"
                : "rgba(15,23,42,0.10)",
            },
          ]}
        />

        <View style={styles.summaryItem}>
          <RNText style={[styles.summaryLabel, { color: textMuted }]}>
            Expenses
          </RNText>
          <RNText style={[styles.summaryValue, { color: "#F97316" }]}>
            RM {totalExpense.toFixed(2)}
          </RNText>
        </View>
      </View>

      <View style={styles.balanceRow}>
        <RNText style={[styles.balanceLabel, { color: textMuted }]}>
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

  const renderSearchAndFilters = () => (
    <View style={styles.controlsWrap}>
      <View
        style={[
          styles.searchBox,
          neonGlowStyle({
            isDarkmode,
            accent: "#38BDF8",
            backgroundColor: cardBg,
            borderColor: cardBorder,
          }),
        ]}
      >
        <Ionicons
          name="search-outline"
          size={16}
          color={textMuted}
          style={{ marginRight: 8 }}
        />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search (category, note, account...)"
          placeholderTextColor={
            isDarkmode ? "rgba(226,232,240,0.55)" : "rgba(15,23,42,0.45)"
          }
          style={[styles.searchInput, { color: textPrimary }]}
          autoCorrect={false}
          returnKeyType="search"
        />
        {!!search && (
          <TouchableOpacity
            onPress={() => setSearch("")}
            style={styles.clearBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="close-circle" size={18} color={textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        {(["All", "Income", "Expense"] as FilterType[]).map((f) => {
          const active = filter === f;
          const accent =
            f === "Income"
              ? "#22C55E"
              : f === "Expense"
              ? "#F97316"
              : "#38BDF8";

          return (
            <TouchableOpacity
              key={f}
              activeOpacity={0.88}
              onPress={() => setFilter(f)}
              style={[
                styles.filterPill,
                neonGlowStyle({
                  isDarkmode,
                  accent,
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                }),
                active
                  ? { borderColor: isDarkmode ? `${accent}DD` : accent }
                  : null,
              ]}
            >
              <RNText
                style={[
                  styles.filterText,
                  { color: active ? accent : textSecondary },
                ]}
              >
                {f}
              </RNText>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  // ✅ List header (summary + hint + controls) — scrolls away naturally
  const renderListHeader = () => {
    const translateX = swipeHintAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-6, 6],
    });

    return (
      <View style={{ paddingTop: 6, paddingBottom: 8 }}>
        {renderSummaryCard()}

        {showSwipeHint ? (
          <Animated.View
            style={[styles.swipeHint, { transform: [{ translateX }] }]}
          >
            <Ionicons name="swap-horizontal" size={16} color={textMuted} />
            <RNText style={[styles.swipeHintText, { color: textMuted }]}>
              Swipe left to reveal Edit / Delete
            </RNText>
          </Animated.View>
        ) : null}

        {renderSearchAndFilters()}
      </View>
    );
  };

  const renderItem = (data: { item: DisplayRow }) => {
    const item = data.item;

    if ((item as any).kind === "monthHeader") {
      return (
        <RNText style={[styles.monthHeader, { color: textMuted }]}>
          {(item as any).title}
        </RNText>
      );
    }

    const tx = item as TransactionItem;
    const isIncome = tx.type === "Income";
    const colorBar = isIncome ? "#22C55E" : "#F97316";
    const dateText = tx.dateTime
      ? new Date(tx.dateTime).toLocaleDateString()
      : "";

    return (
      <Pressable
        onPress={() => openDetail(tx)}
        onLongPress={() => goEdit(tx.id)}
        delayLongPress={350}
      >
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
                {tx.category || tx.type}
              </RNText>
              <RNText style={[styles.rowAmount, { color: colorBar }]}>
                {isIncome ? "+" : "-"} RM {tx.amount.toFixed(2)}
              </RNText>
            </View>

            <View style={styles.rowSub}>
              <RNText style={[styles.rowSubText, { color: textMuted }]}>
                {dateText} · {tx.account || "Unknown account"}
              </RNText>
              {tx.note ? (
                <RNText
                  style={[styles.rowNote, { color: textMuted }]}
                  numberOfLines={1}
                >
                  {tx.note}
                </RNText>
              ) : null}
            </View>
          </View>
        </Card>
      </Pressable>
    );
  };

  // ✅ Swipe actions (close row first)
  const renderHiddenItem = (data: { item: DisplayRow }, rowMap: any) => {
    if ((data.item as any).kind === "monthHeader") return null;
    const tx = data.item as TransactionItem;

    const closeRow = () => {
      try {
        rowMap?.[tx.id]?.closeRow?.();
      } catch {}
    };

    return (
      <View style={styles.hiddenRow}>
        <TouchableOpacity
          style={[styles.hiddenButton, { backgroundColor: "#2563EB" }]}
          onPress={() => {
            closeRow();
            goEdit(tx.id);
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <RNText style={styles.hiddenText}>Edit</RNText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.hiddenButton,
            { backgroundColor: "#DC2626", marginLeft: 8 },
          ]}
          onPress={() => {
            closeRow();
            confirmDelete(tx.id);
          }}
          activeOpacity={0.9}
        >
          <Ionicons name="trash-outline" size={18} color="#fff" />
          <RNText style={styles.hiddenText}>Delete</RNText>
        </TouchableOpacity>
      </View>
    );
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 650);
  }, []);

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <Ionicons
        name="receipt-outline"
        size={34}
        color={isDarkmode ? "rgba(226,232,240,0.55)" : "rgba(15,23,42,0.35)"}
      />
      <RNText style={[styles.emptyTitle, { color: textPrimary }]}>
        No transactions found
      </RNText>
      <RNText style={[styles.emptySub, { color: textMuted }]}>
        Try clearing search/filter, or add a new transaction.
      </RNText>
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

          <SwipeListView
            data={groupedItems}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderHiddenItem={renderHiddenItem}
            rightOpenValue={-176}
            disableRightSwipe
            ListHeaderComponent={renderListHeader}
            contentContainerStyle={{
              paddingBottom: 64,
              paddingRight: Platform.OS === "web" ? 12 : 0,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={isDarkmode ? "#E5E7EB" : "#0F172A"}
              />
            }
            ListEmptyComponent={ListEmpty}
            scrollEventThrottle={16}
            onScroll={() => {
              if (showSwipeHint) setShowSwipeHint(false);
            }}
          />
        </View>

        {/* Detail modal */}
        <Modal
          visible={detailOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setDetailOpen(false)}
        >
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setDetailOpen(false)}
          >
            <Pressable
              style={[
                styles.detailCard,
                neonGlowStyle({
                  isDarkmode,
                  accent: selectedTx?.type === "Income" ? "#22C55E" : "#F97316",
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  heavy: true,
                }),
              ]}
              onPress={() => {}}
            >
              {selectedTx && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={styles.detailTopRow}>
                    <View style={{ flex: 1 }}>
                      <RNText
                        style={[styles.detailTitle, { color: textPrimary }]}
                      >
                        {selectedTx.category || "Uncategorized"}
                      </RNText>
                      <RNText style={[styles.detailMeta, { color: textMuted }]}>
                        {selectedTx.type} · {selectedTx.account || "Unknown"}
                      </RNText>
                    </View>

                    <TouchableOpacity
                      onPress={() => setDetailOpen(false)}
                      style={styles.detailClose}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="close"
                        size={18}
                        color={isDarkmode ? "#E5E7EB" : "#0F172A"}
                      />
                    </TouchableOpacity>
                  </View>

                  <RNText
                    style={[
                      styles.detailAmount,
                      {
                        color:
                          selectedTx.type === "Income" ? "#22C55E" : "#F97316",
                      },
                    ]}
                  >
                    RM {Number(selectedTx.amount || 0).toFixed(2)}
                  </RNText>

                  <View style={styles.detailInfoRow}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={textMuted}
                      style={{ marginRight: 8 }}
                    />
                    <RNText
                      style={[styles.detailInfoText, { color: textSecondary }]}
                    >
                      {selectedTx.dateTime
                        ? new Date(selectedTx.dateTime).toLocaleString()
                        : "-"}
                    </RNText>
                  </View>

                  {selectedTx.note ? (
                    <View style={styles.detailNoteBox}>
                      <RNText
                        style={[styles.detailNote, { color: textSecondary }]}
                      >
                        {selectedTx.note}
                      </RNText>
                    </View>
                  ) : null}

                  {selectedTx.imageURL ? (
                    <View style={{ marginTop: 12 }}>
                      <RNText
                        style={[styles.detailSection, { color: textPrimary }]}
                      >
                        Receipt
                      </RNText>
                      <Image
                        source={{ uri: selectedTx.imageURL }}
                        style={styles.detailImage}
                        resizeMode="cover"
                      />
                    </View>
                  ) : null}

                  <View style={styles.detailActionsRow}>
                    <TouchableOpacity
                      style={[
                        styles.detailActionBtn,
                        { backgroundColor: "#2563EB" },
                      ]}
                      onPress={() => {
                        setDetailOpen(false);
                        goEdit(selectedTx.id);
                      }}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="create-outline" size={18} color="#fff" />
                      <RNText style={styles.detailActionText}>Edit</RNText>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.detailActionBtn,
                        { backgroundColor: "#DC2626" },
                      ]}
                      onPress={() => confirmDelete(selectedTx.id)}
                      activeOpacity={0.9}
                    >
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <RNText style={styles.detailActionText}>Delete</RNText>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Toast */}
        <Modal visible={toastOpen} transparent animationType="fade">
          <View style={styles.toastWrapper} pointerEvents="none">
            <View
              style={[
                styles.toastContainer,
                neonGlowStyle({
                  isDarkmode,
                  accent: "#38BDF8",
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  heavy: true,
                }),
              ]}
            >
              <RNText style={[styles.toastText, { color: textPrimary }]}>
                {toastMsg}
              </RNText>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

function makeStyles(theme: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      position: "relative",
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

    summaryCard: {
      marginBottom: theme.spacing.md,
      marginTop: 6,
    },
    summaryTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 8,
    },
    scopePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.25)",
      backgroundColor: "rgba(148,163,184,0.06)",
    },
    scopeText: { fontSize: 11, fontWeight: "900" },

    cardTitle: {
      fontSize: 15,
      fontWeight: "900",
    },

    accountChipsWrap: {
      paddingVertical: 6,
      paddingRight: 6,
      gap: 10,
    },
    accountChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
    },
    accountChipText: { fontSize: 12, fontWeight: "900" },

    summaryContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: theme.spacing.xs,
      marginTop: 6,
    },
    summaryItem: { alignItems: "center", flex: 1 },
    summaryLabel: { fontSize: 12, marginBottom: theme.spacing.xs },
    summaryValue: { fontSize: 16, fontWeight: "900" },
    summaryDivider: { width: 1, height: 28, marginHorizontal: 14 },

    balanceRow: {
      marginTop: 6,
      paddingTop: 6,
      borderTopWidth: 1,
      borderColor: "rgba(148,163,184,0.25)",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    balanceLabel: { fontSize: 12 },
    balanceValue: { fontSize: 14, fontWeight: "900" },

    swipeHint: {
      marginTop: -6,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      opacity: 0.85,
    },
    swipeHintText: { fontSize: 11, fontWeight: "800" },

    monthHeader: {
      marginTop: 14,
      marginBottom: 6,
      fontSize: 13,
      fontWeight: "900",
      letterSpacing: 0.3,
      paddingLeft: 6,
    },

    controlsWrap: { marginBottom: theme.spacing.md, gap: 10 },
    searchBox: {
      flexDirection: "row",
      alignItems: "center",
      borderRadius: 18,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 10 : 8,
    },
    searchInput: { flex: 1, fontSize: 13, fontWeight: "700" },
    clearBtn: { paddingLeft: 8, paddingVertical: 2 },

    filterRow: { flexDirection: "row", gap: 10 },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      minWidth: 78,
      alignItems: "center",
      justifyContent: "center",
    },
    filterText: { fontSize: 12, fontWeight: "900" },

    rowCard: {
      flexDirection: "row",
      alignItems: "stretch",
      marginBottom: 8,
      borderRadius: 16,
      overflow: "hidden",
    },
    rowColorBar: { width: 4 },
    rowContent: { flex: 1, paddingHorizontal: 10, paddingVertical: 6 },
    rowMain: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    rowCategory: { fontSize: 14, fontWeight: "800" },
    rowAmount: { fontSize: 14, fontWeight: "900" },
    rowSub: { marginTop: 3 },
    rowSubText: { fontSize: 10.5 },
    rowNote: { fontSize: 11 },

    hiddenRow: {
      position: "absolute",
      right: 0,
      top: 0,
      bottom: 8,
      left: 0,
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      paddingRight: 12,
    },
    hiddenButton: {
      height: "72%",
      minHeight: 42,
      paddingHorizontal: 14,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    hiddenText: {
      color: "#fff",
      marginLeft: 6,
      fontSize: 12,
      fontWeight: "800",
    },

    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 18,
      paddingBottom: 40,
      gap: 8,
    },
    emptyTitle: { fontSize: 15, fontWeight: "900" },
    emptySub: {
      fontSize: 12,
      fontWeight: "700",
      textAlign: "center",
      maxWidth: 280,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.60)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    detailCard: {
      width: "100%",
      maxWidth: 520,
      borderRadius: 22,
      padding: 14,
      maxHeight: "78%",
    },
    detailTopRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 8,
      gap: 10,
    },
    detailClose: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(148,163,184,0.15)",
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.25)",
    },
    detailTitle: { fontSize: 16, fontWeight: "900" },
    detailMeta: { fontSize: 12, fontWeight: "800", marginTop: 2 },
    detailAmount: { fontSize: 20, fontWeight: "900", marginTop: 8 },
    detailInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },
    detailInfoText: { fontSize: 13, fontWeight: "800" },
    detailNoteBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.25)",
      backgroundColor: "rgba(148,163,184,0.06)",
    },
    detailNote: { fontSize: 13, fontWeight: "800", lineHeight: 18 },
    detailSection: { fontSize: 13, fontWeight: "900", marginBottom: 8 },
    detailImage: {
      width: "100%",
      height: 240,
      borderRadius: 16,
    },
    detailActionsRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 14,
    },
    detailActionBtn: {
      flex: 1,
      height: 46,
      borderRadius: 999,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    detailActionText: { color: "#fff", fontSize: 13, fontWeight: "900" },

    toastWrapper: {
      flex: 1,
      justifyContent: "flex-end",
      alignItems: "center",
      paddingBottom: 40,
    },
    toastContainer: {
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 999,
      minWidth: "70%",
      alignItems: "center",
    },
    toastText: { fontSize: 13, fontWeight: "900", textAlign: "center" },
  });
}

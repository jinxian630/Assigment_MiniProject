import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Text as RNText,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import AsyncStorage from "@react-native-async-storage/async-storage";

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

// ✅ Since you're running WEB, localhost is safest (still editable via settings)
const DEFAULT_RAG_HOST = "http://localhost:8000";

const RAG_HOST_STORAGE_KEY = "@money_rag_host_v1";

// ✅ Your installed Ollama model
const DEFAULT_LLM_MODEL = "gemma3:1b";

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

function rm(n: number) {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function safeText(s?: string) {
  const x = (s ?? "").toString().trim();
  return x.length ? x : "-";
}

function normalizeHost(input: string) {
  const raw = (input || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (!/^https?:\/\//i.test(raw)) return `http://${raw}`;
  return raw;
}

async function fetchWithTimeout(url: string, options: any, timeoutMs = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    return resp;
  } finally {
    clearTimeout(id);
  }
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
  const { textPrimary, textMuted, textSecondary, cardBorder, cardBg, chipBg } =
    ui;

  const onToggleTheme = () => toggleThemeSafe(moneyThemeCtx);

  const auth = getAuth();
  const db = getFirestore();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Tx[]>([]);

  // AI coach
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>("");
  const [aiError, setAiError] = useState<string>("");
  const [aiDebug, setAiDebug] = useState<any[] | null>(null);
  const lastPromptHashRef = useRef<string>("");
  const hasAutoRunRef = useRef(false);

  // Server Settings (Option C)
  const [ragHost, setRagHost] = useState<string>(DEFAULT_RAG_HOST);
  const [ragHostDraft, setRagHostDraft] = useState<string>(DEFAULT_RAG_HOST);
  const [ragTestLoading, setRagTestLoading] = useState(false);
  const [ragTestMsg, setRagTestMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(RAG_HOST_STORAGE_KEY);
        const h = normalizeHost(saved || DEFAULT_RAG_HOST);
        setRagHost(h);
        setRagHostDraft(h);
      } catch {
        const h = normalizeHost(DEFAULT_RAG_HOST);
        setRagHost(h);
        setRagHostDraft(h);
      }
    })();
  }, []);

  const saveRagHost = useCallback(async () => {
    const h = normalizeHost(ragHostDraft);
    if (!h) {
      setRagTestMsg("Invalid host. Example: localhost:8000");
      return;
    }
    try {
      await AsyncStorage.setItem(RAG_HOST_STORAGE_KEY, h);
      setRagHost(h);
      setRagTestMsg("Saved ✅");
    } catch {
      setRagTestMsg("Save failed ❌ (storage error)");
    }
  }, [ragHostDraft]);

  const testRagHost = useCallback(async () => {
    const h = normalizeHost(ragHostDraft);
    if (!h) {
      setRagTestMsg("Invalid host. Example: localhost:8000");
      return;
    }
    setRagTestLoading(true);
    setRagTestMsg("");
    try {
      const r = await fetchWithTimeout(`${h}/`, { method: "GET" }, 8000);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json().catch(() => null);
      const msg = data?.message
        ? `Connected ✅ (${data.message})`
        : "Connected ✅";
      setRagTestMsg(msg);
    } catch (e: any) {
      setRagTestMsg(
        `Failed ❌. Ensure backend is running: uvicorn api:app --host 0.0.0.0 --port 8000 (${
          e?.message || "error"
        })`
      );
    } finally {
      setRagTestLoading(false);
    }
  }, [ragHostDraft]);

  // Firestore load
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

    const savingsRate =
      income30 > 0 ? ((income30 - expense30) / income30) * 100 : null;

    const smallExpenseCount = items.filter(
      (t) => t.type === "Expense" && t.amount > 0 && t.amount <= 10
    ).length;

    const byAcc: Record<string, number> = {};
    for (const t of last30) {
      const a = (t.account || "Unknown").toString();
      byAcc[a] = (byAcc[a] || 0) + 1;
    }
    const topAcc =
      Object.entries(byAcc).sort((a, b) => b[1] - a[1])[0]?.[0] || "Unknown";

    return {
      last30Count: last30.length,
      income30,
      expense30,
      cashflow,
      topCat,
      topCatValue,
      byCatSorted: catEntries,
      savingsRate,
      smallExpenseCount,
      topAcc,
    };
  }, [items]);

  const adviceList = useMemo(() => {
    const tips: { title: string; desc: string; icon: any }[] = [];

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

    if (analysis.topCat) {
      tips.push({
        title: `Top spending category: ${analysis.topCat}`,
        desc: `You spent RM ${analysis.topCatValue.toFixed(2)} on ${
          analysis.topCat
        } (last 30 days). Try setting a category budget to control it.`,
        icon: "pie-chart-outline",
      });
    }

    if (analysis.smallExpenseCount >= 10) {
      tips.push({
        title: "Many small purchases detected",
        desc: `You have ${analysis.smallExpenseCount} expenses ≤ RM10. Small items add up—consider tracking snacks/subscriptions carefully.`,
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
  }, [
    analysis.cashflow,
    analysis.topCat,
    analysis.topCatValue,
    analysis.smallExpenseCount,
    items,
  ]);

  const buildAiPrompt = useCallback(() => {
    const top3Cats = analysis.byCatSorted
      .slice(0, 3)
      .map(([c, v], i) => `${i + 1}) ${c}: RM ${rm(v)}`)
      .join("\n");

    const savingsRateLine =
      analysis.savingsRate === null
        ? "SavingsRate: (income not recorded / not enough data)"
        : `SavingsRate: ${analysis.savingsRate.toFixed(1)}%`;

    return `MONEY MODULE (personal finance coaching). Ignore any task-management rules.

Use ONLY the numbers below. Do NOT invent transactions or amounts.

User summary (Last 30 days):
- TransactionsCount: ${analysis.last30Count}
- Income: RM ${rm(analysis.income30)}
- Expenses: RM ${rm(analysis.expense30)}
- Cashflow: RM ${rm(analysis.cashflow)}
- ${savingsRateLine}
- TopAccount: ${safeText(analysis.topAcc)}
- TopCategory: ${safeText(analysis.topCat)} (RM ${rm(analysis.topCatValue)})
- Top3Categories:
${top3Cats || "(no category breakdown)"}
- SmallPurchasesCount (<= RM10, all time): ${analysis.smallExpenseCount}

What the user wants:
- Advice to manage money and increase money.

Output format (strict):
1) What's happening (1-2 sentences)
2) What to do this week (3-5 bullet steps, each with RM target)
3) Longer-term plan (2-3 bullets)

Keep it <= 180 words.`;
  }, [analysis]);

  const runAiCoach = useCallback(async () => {
    setAiError("");
    setAiAnswer("");
    setAiDebug(null);

    const host = normalizeHost(ragHost);
    const prompt = buildAiPrompt();

    const hash = `${host}|${prompt.length}|${analysis.income30}|${analysis.expense30}|${analysis.cashflow}|${analysis.topCat}|${analysis.topCatValue}`;
    if (lastPromptHashRef.current === hash && aiAnswer) return;
    lastPromptHashRef.current = hash;

    setAiLoading(true);
    try {
      const resp = await fetchWithTimeout(
        `${host}/search_rag_model`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: prompt,
            n_results: 3,
            model: DEFAULT_LLM_MODEL, // ✅ force installed model
          }),
        },
        60000 // ✅ 60s timeout (1B model can be slow)
      );

      if (!resp.ok) {
        const t = await resp.text().catch(() => "");
        throw new Error(`HTTP ${resp.status} ${resp.statusText} ${t}`.trim());
      }

      const data = await resp.json();
      const answer = (data?.model_answer || "").toString().trim();
      const results = Array.isArray(data?.results) ? data.results : null;
      const ollamaError = (data?.ollama_error || "").toString().trim();

      if (ollamaError) {
        throw new Error(`Ollama error: ${ollamaError}`);
      }

      if (!answer) {
        throw new Error(
          "AI returned empty answer. Check Ollama model and server logs."
        );
      }

      setAiAnswer(answer);
      setAiDebug(results);
    } catch (e: any) {
      const msg =
        e?.name === "AbortError"
          ? "AI request timed out. Backend/Ollama is slow. Try again or reduce load."
          : e?.message || "Failed to fetch AI advice.";
      setAiError(msg);
    } finally {
      setAiLoading(false);
    }
  }, [ragHost, buildAiPrompt, analysis, aiAnswer]);

  useEffect(() => {
    if (loading) return;
    if (!items.length) return;
    if (hasAutoRunRef.current) return; // ✅ stop second run

    hasAutoRunRef.current = true;
    const id = setTimeout(() => runAiCoach(), 350);
    return () => clearTimeout(id);
  }, [loading, items.length, runAiCoach]);

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
        Financial Advice
      </RNText>

      <TouchableOpacity
        onPress={onToggleTheme}
        style={[
          styles.themeToggle,
          {
            borderColor: MODULE_ACCENT,
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
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {header}

            {/* Summary */}
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
              <RNText style={[styles.cardTitle, { color: textPrimary }]}>
                Last 30 Days Summary
              </RNText>
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

            {/* Server Settings */}
            <Card
              style={[
                { marginTop: theme.spacing.md },
                neonGlowStyle({
                  isDarkmode,
                  accent: "#38BDF8",
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                }),
              ]}
            >
              <RNText style={[styles.cardTitle, { color: textPrimary }]}>
                Server Settings
              </RNText>
              <RNText
                style={{ color: textSecondary, marginTop: 6, fontSize: 12 }}
              >
                For WEB, use{" "}
                <RNText style={{ fontWeight: "900" }}>localhost:8000</RNText>.
              </RNText>

              <RNText style={[styles.inputLabel, { color: textMuted }]}>
                RAG Host
              </RNText>

              <View style={styles.inputShell}>
                <Ionicons
                  name="server-outline"
                  size={16}
                  color={textSecondary}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  value={ragHostDraft}
                  onChangeText={(t) => {
                    setRagHostDraft(t);
                    setRagTestMsg("");
                  }}
                  placeholder="localhost:8000"
                  placeholderTextColor={textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.input, { color: textPrimary }]}
                />
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <TouchableOpacity
                  onPress={saveRagHost}
                  style={[
                    styles.aiBtn,
                    {
                      borderColor: MODULE_ACCENT,
                      backgroundColor: isDarkmode
                        ? "rgba(2,6,23,0.35)"
                        : "rgba(255,255,255,0.65)",
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="save-outline"
                    size={16}
                    color={MODULE_ACCENT}
                  />
                  <RNText
                    style={{
                      color: textPrimary,
                      fontWeight: "900",
                      marginLeft: 8,
                    }}
                  >
                    Save
                  </RNText>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={testRagHost}
                  disabled={ragTestLoading}
                  style={[
                    styles.aiBtn,
                    {
                      borderColor: "#38BDF8",
                      backgroundColor: isDarkmode
                        ? "rgba(2,6,23,0.35)"
                        : "rgba(255,255,255,0.65)",
                      opacity: ragTestLoading ? 0.7 : 1,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  {ragTestLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <>
                      <Ionicons
                        name="pulse-outline"
                        size={16}
                        color="#38BDF8"
                      />
                      <RNText
                        style={{
                          color: textPrimary,
                          fontWeight: "900",
                          marginLeft: 8,
                        }}
                      >
                        Test
                      </RNText>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {!!ragTestMsg && (
                <RNText
                  style={{ color: textMuted, marginTop: 10, fontSize: 12 }}
                >
                  {ragTestMsg}
                </RNText>
              )}

              <RNText
                style={{ color: textSecondary, marginTop: 8, fontSize: 12 }}
              >
                In use:{" "}
                <RNText style={{ color: textPrimary, fontWeight: "900" }}>
                  {normalizeHost(ragHost)}
                </RNText>
              </RNText>
            </Card>

            {/* AI Coach */}
            <Card
              style={[
                { marginTop: theme.spacing.md },
                neonGlowStyle({
                  isDarkmode,
                  accent: MODULE_ACCENT,
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  heavy: true,
                }),
              ]}
            >
              <View style={styles.aiHeaderRow}>
                <View style={{ flex: 1 }}>
                  <RNText style={[styles.cardTitle, { color: textPrimary }]}>
                    AI Money Coach
                  </RNText>
                  <RNText
                    style={{ color: textSecondary, marginTop: 4, fontSize: 12 }}
                  >
                    Model:{" "}
                    <RNText style={{ fontWeight: "900" }}>
                      {DEFAULT_LLM_MODEL}
                    </RNText>
                  </RNText>
                </View>

                <TouchableOpacity
                  onPress={runAiCoach}
                  disabled={aiLoading}
                  style={[
                    styles.aiBtn,
                    {
                      borderColor: MODULE_ACCENT,
                      backgroundColor: isDarkmode
                        ? "rgba(2,6,23,0.35)"
                        : "rgba(255,255,255,0.65)",
                      opacity: aiLoading ? 0.6 : 1,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  {aiLoading ? (
                    <ActivityIndicator />
                  ) : (
                    <>
                      <Ionicons
                        name="sparkles-outline"
                        size={16}
                        color={MODULE_ACCENT}
                      />
                      <RNText
                        style={{
                          color: textPrimary,
                          fontWeight: "900",
                          marginLeft: 8,
                        }}
                      >
                        Refresh
                      </RNText>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {aiError ? (
                <View style={styles.aiBox}>
                  <RNText style={{ color: "#F97316", fontWeight: "900" }}>
                    AI Error
                  </RNText>
                  <RNText style={{ color: textMuted, marginTop: 6 }}>
                    {aiError}
                  </RNText>
                </View>
              ) : aiAnswer ? (
                <View style={styles.aiBox}>
                  <RNText style={{ color: textPrimary, lineHeight: 18 }}>
                    {aiAnswer}
                  </RNText>
                </View>
              ) : (
                <View style={styles.aiBox}>
                  <RNText style={{ color: textMuted }}>
                    No AI advice yet. Tap “Refresh”.
                  </RNText>
                </View>
              )}
            </Card>

            {/* Tips */}
            <View style={{ marginTop: theme.spacing.md }}>
              <RNText style={[styles.sectionTitle, { color: textPrimary }]}>
                Personalized Tips
              </RNText>

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
                      <RNText style={[styles.tipTitle, { color: textPrimary }]}>
                        {a.title}
                      </RNText>
                      <RNText style={[styles.tipDesc, { color: textMuted }]}>
                        {a.desc}
                      </RNText>
                    </View>
                  </View>
                </Card>
              ))}
            </View>

            {/* Bigger readable note */}
            <Card
              style={[
                { marginTop: theme.spacing.md },
                neonGlowStyle({
                  isDarkmode,
                  accent: "#A855F7",
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                }),
              ]}
            >
              <View style={styles.noteRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={textSecondary}
                  style={{ marginRight: 8, marginTop: 1 }}
                />
                <RNText style={[styles.noteText, { color: textPrimary }]}>
                  These insights are generated from your transaction history
                  using simple rule-based analysis. Add more records to improve
                  accuracy.
                </RNText>
              </View>
            </Card>

            <View style={{ height: 8 }} />
          </ScrollView>
        </KeyboardAvoidingView>
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
    sectionTitle: {
      fontSize: 15,
      fontWeight: "900",
      marginBottom: theme.spacing.sm,
    },

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

    aiHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    aiBtn: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 14,
      borderWidth: 1,
    },
    aiBox: {
      marginTop: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.22)",
      padding: 12,
      backgroundColor: "rgba(255,255,255,0.06)",
    },

    inputLabel: {
      marginTop: 10,
      fontSize: 12,
      fontWeight: "800",
    },
    inputShell: {
      marginTop: 6,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.25)",
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: Platform.OS === "ios" ? 12 : 8,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.06)",
    },
    input: {
      flex: 1,
      fontSize: 13,
      fontWeight: "800",
      padding: 0,
    },

    noteRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },
    noteText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      fontWeight: "700",
    },
  });
}

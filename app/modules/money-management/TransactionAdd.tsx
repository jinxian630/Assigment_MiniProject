import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  TextInput as RNTextInput,
  Text as RNText,
  Modal,
  Pressable,
  Animated,
  Easing,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

import { getAuth, User, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

/* -------------------------------- Utils -------------------------------- */

type ExpenseAddRouteParams = {
  editId?: string;
  account?: string;
  note?: string;
  amount?: number;
  category?: string;
  dateTime?: number;
  imageURL?: string;
  type?: "Income" | "Expense";
};

const isWeb = Platform.OS === "web";

function formatTime(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function combineDateAndTime(date: Date, time: Date) {
  const combined = new Date(date);
  combined.setHours(time.getHours());
  combined.setMinutes(time.getMinutes());
  combined.setSeconds(0);
  combined.setMilliseconds(0);
  return combined;
}

function isValidMoneyInput(value: string) {
  if (value.trim() === "") return { ok: true, msg: "" };
  if (!/^[0-9.]+$/.test(value))
    return { ok: false, msg: "Amount must be a number." };
  const dots = (value.match(/\./g) || []).length;
  if (dots > 1) return { ok: false, msg: "Invalid number format." };
  const parts = value.split(".");
  if (parts.length === 2 && parts[1].length > 2)
    return { ok: false, msg: "Max 2 decimal places." };
  if (value === ".") return { ok: false, msg: "Amount must be a number." };
  return { ok: true, msg: "" };
}

function uniqByValue(items: { label: string; value: string }[]) {
  const seen = new Set<string>();
  const out: { label: string; value: string }[] = [];
  for (const it of items) {
    const key = String(it.value).trim().toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ label: it.label, value: it.value });
  }
  return out;
}

/** ✅ Web date parse: YYYY-MM-DD */
function parseYYYYMMDD(s: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d)
    return null;
  return dt;
}

/** ✅ Web time parse: HH:MM */
function parseHHMM(s: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return { hh, mm };
}

function iconForCategory(
  name: string,
  isIncome: boolean
): keyof typeof Ionicons.glyphMap {
  const s = (name || "").toLowerCase();

  if (isIncome) {
    if (s.includes("salary") || s.includes("wage")) return "cash-outline";
    if (s.includes("bonus")) return "trophy-outline";
    if (s.includes("gift")) return "gift-outline";
    if (s.includes("invest")) return "trending-up-outline";
    if (s.includes("refund")) return "return-up-back-outline";
    if (s.includes("allow")) return "wallet-outline";
    if (s.includes("free")) return "briefcase-outline";
    return "add-circle-outline";
  }

  if (s.includes("food") || s.includes("meal")) return "fast-food-outline";
  if (
    s.includes("transport") ||
    s.includes("grab") ||
    s.includes("bus") ||
    s.includes("train")
  )
    return "bus-outline";
  if (s.includes("shopping")) return "bag-handle-outline";
  if (
    s.includes("bill") ||
    s.includes("utility") ||
    s.includes("electric") ||
    s.includes("water")
  )
    return "receipt-outline";
  if (s.includes("enter") || s.includes("movie") || s.includes("game"))
    return "game-controller-outline";
  if (s.includes("health") || s.includes("clinic") || s.includes("medical"))
    return "medkit-outline";
  if (s.includes("edu") || s.includes("course") || s.includes("book"))
    return "school-outline";
  if (s.includes("rent") || s.includes("house")) return "home-outline";
  return "pricetag-outline";
}

function iconForAccount(name: string): keyof typeof Ionicons.glyphMap {
  const s = (name || "").toLowerCase();
  if (s.includes("cash")) return "cash-outline";
  if (
    s.includes("wallet") ||
    s.includes("ewallet") ||
    s.includes("e-wallet") ||
    s.includes("tng")
  )
    return "phone-portrait-outline";
  if (
    s.includes("bank") ||
    s.includes("maybank") ||
    s.includes("cimb") ||
    s.includes("rhb")
  )
    return "card-outline";
  if (s.includes("card") || s.includes("visa") || s.includes("master"))
    return "card-outline";
  return "wallet-outline";
}

/** ✅ Web-safe: flatten array styles into object for components that don't support style arrays (e.g. rapi Button on web) */
function flatStyle(s: any) {
  return RNStyleSheet.flatten(s);
}

/* ------------------------------ Main Screen ------------------------------ */

export default function TransactionAddScreen({ navigation, route, forcedEditId }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const themeCtx = useTheme() as any;
  const theme = themeCtx?.theme ?? themeCtx;
  const isDarkmode = !!themeCtx?.isDarkMode;

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

    const paramsRaw = (((route as any)?.params ?? {}) as ExpenseAddRouteParams);
  // ✅ Supports BOTH navigation route params (editId) and expo-router wrapper prop (forcedEditId)
  const resolvedEditId = forcedEditId ?? paramsRaw.editId;
  const params = { ...paramsRaw, editId: resolvedEditId } as ExpenseAddRouteParams;
  const isEditMode = !!resolvedEditId;

  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<"Income" | "Expense">(
    params.type ?? "Expense"
  );

  const [amount, setAmount] = useState(
    params.amount != null ? String(params.amount) : ""
  );
  const [amountError, setAmountError] = useState<string>("");

  const [category, setCategory] = useState(params.category ?? "");
  const [account, setAccount] = useState(params.account ?? "");
  const [note, setNote] = useState(params.note ?? "");

  const initialDT = params.dateTime ? new Date(params.dateTime) : new Date();
  const [date, setDate] = useState<Date>(initialDT);
  const [time, setTime] = useState<Date>(initialDT);

  // Mobile date/time modal
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);

  const [image, setImage] = useState<string | null>(params.imageURL ?? null);

  // ✅ Toast for save / add category / add account
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    Animated.timing(toastAnim, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    setTimeout(() => {
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setToastVisible(false);
      });
    }, 1100);
  };

  const toastTranslateY = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [90, 0],
  });
  const toastOpacity = toastAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // ✅ Web date/time modal
  const [webDTModalOpen, setWebDTModalOpen] = useState(false);
  const [webDTError, setWebDTError] = useState("");
  const [webDateStr, setWebDateStr] = useState(() => {
    const d = initialDT;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [webTimeStr, setWebTimeStr] = useState(() => formatTime(initialDT));

  const DEFAULT_EXPENSE_CATEGORIES = useMemo(
    () => [
      { label: "Food", value: "Food" },
      { label: "Transport", value: "Transport" },
      { label: "Shopping", value: "Shopping" },
      { label: "Bills", value: "Bills" },
      { label: "Entertainment", value: "Entertainment" },
      { label: "Health", value: "Health" },
      { label: "Education", value: "Education" },
      { label: "Others", value: "Others" },
    ],
    []
  );

  const DEFAULT_INCOME_CATEGORIES = useMemo(
    () => [
      { label: "Salary", value: "Salary" },
      { label: "Allowance", value: "Allowance" },
      { label: "Bonus", value: "Bonus" },
      { label: "Investment", value: "Investment" },
      { label: "Gift", value: "Gift" },
      { label: "Freelance", value: "Freelance" },
      { label: "Refund", value: "Refund" },
      { label: "Others", value: "Others" },
    ],
    []
  );

  const DEFAULT_ACCOUNTS = useMemo(
    () => [
      { label: "Cash", value: "Cash" },
      { label: "E-Wallet", value: "E-Wallet" },
      { label: "Bank Account", value: "Bank Account" },
    ],
    []
  );

  const [expenseCategories, setExpenseCategories] = useState(
    DEFAULT_EXPENSE_CATEGORIES
  );
  const [incomeCategories, setIncomeCategories] = useState(
    DEFAULT_INCOME_CATEGORIES
  );
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);

  // add modals
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [addAccOpen, setAddAccOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newAccName, setNewAccName] = useState("");

  const isIncome = type === "Income";
  const accentColor = isIncome ? "#22C55E" : "#F97316";

  const labelColor = isDarkmode ? "#E5E7EB" : "#0F172A";
  const subtleTextColor = isDarkmode ? "#9CA3AF" : "#6B7280";
  const inputBg = isDarkmode ? "rgba(15,23,42,0.95)" : "#F9FAFB";
  const inputBorder = isDarkmode ? "#38BDF8" : "#CBD5E1";
  const cardBg = isDarkmode ? "rgba(2,6,23,0.92)" : "rgba(255,255,255,0.97)";
  const cardBorder = isDarkmode
    ? "rgba(148,163,184,0.28)"
    : "rgba(15,23,42,0.10)";

  const styles = useMemo(() => makeStyles(theme), [theme]);

  // keep web input synced
  useEffect(() => {
    const d = date;
    setWebDateStr(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
      ).padStart(2, "0")}`
    );
  }, [date]);

  useEffect(() => {
    setWebTimeStr(formatTime(time));
  }, [time]);

  // Load edit data
  useEffect(() => {
    const loadEdit = async () => {
      if (!isEditMode || !params.editId) return;
      try {
        const snap = await getDoc(doc(db, "Expenses", params.editId));
        if (!snap.exists()) return;
        const d = snap.data() as any;

        setType(d.type === "Income" ? "Income" : "Expense");
        setAmount(d.amount != null ? String(d.amount) : "");
        setCategory(d.category ?? "");
        setAccount(d.account ?? "");
        setNote(d.note ?? "");
        if (d.dateTime) {
          const dt = new Date(d.dateTime);
          setDate(dt);
          setTime(dt);
        }
        setImage(d.imageURL ?? null);
      } catch (err) {
        console.log("load edit error:", err);
      }
    };
    loadEdit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, params.editId]);

  // ✅ If edit record has a custom category/account not in current lists,
  // keep it visible & selectable so the user can SEE the current value.
  useEffect(() => {
    if (!isEditMode) return;

    if (category) {
      const item = { label: category, value: category };
      // Add to BOTH lists safely (does not remove anything)
      setExpenseCategories((prev) => uniqByValue([...prev, item]));
      setIncomeCategories((prev) => uniqByValue([...prev, item]));
    }

    if (account) {
      const item = { label: account, value: account };
      setAccounts((prev) => uniqByValue([...prev, item]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, category, account]);



  // Load user lists
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const expSnap = await getDocs(
          query(
            collection(db, "users", user.uid, "expenseCategories"),
            orderBy("createdAt", "asc")
          )
        );
        const incSnap = await getDocs(
          query(
            collection(db, "users", user.uid, "incomeCategories"),
            orderBy("createdAt", "asc")
          )
        );
        const accSnap = await getDocs(
          query(
            collection(db, "users", user.uid, "accounts"),
            orderBy("createdAt", "asc")
          )
        );

        const exp = expSnap.docs.map((d) => ({
          label: d.data().name,
          value: d.data().name,
        }));
        const inc = incSnap.docs.map((d) => ({
          label: d.data().name,
          value: d.data().name,
        }));
        const acc = accSnap.docs.map((d) => ({
          label: d.data().name,
          value: d.data().name,
        }));

        setExpenseCategories(uniqByValue([...DEFAULT_EXPENSE_CATEGORIES, ...exp]));
        setIncomeCategories(uniqByValue([...DEFAULT_INCOME_CATEGORIES, ...inc]));
        setAccounts(uniqByValue([...DEFAULT_ACCOUNTS, ...acc]));
      } catch (e) {
        console.log("load list error", e);
      }
    });

    return () => unsub();
  }, [
    auth,
    db,
    DEFAULT_ACCOUNTS,
    DEFAULT_EXPENSE_CATEGORIES,
    DEFAULT_INCOME_CATEGORIES,
  ]);

  // if switching type, keep category valid
  useEffect(() => {
    const list = isIncome ? incomeCategories : expenseCategories;
    if (category && !list.some((x) => x.value === category)) setCategory("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const onAmountChange = (v: string) => {
    let s = v.replace(/[^0-9.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts[0] + "." + parts.slice(1).join("");
    const [intP, decP] = s.split(".");
    const dec = decP != null ? decP.slice(0, 2) : "";
    s = decP != null ? `${intP}.${dec}` : intP;

    setAmount(s);
    const res = isValidMoneyInput(s);
    setAmountError(res.ok ? "" : res.msg);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.75,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets?.length)
        setImage(result.assets[0].uri);
    } catch (err) {
      console.log("pick image error:", err);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ quality: 0.75 });
      if (!result.canceled && result.assets?.length)
        setImage(result.assets[0].uri);
    } catch (err) {
      console.log("camera error:", err);
    }
  };

  const uploadImageIfNeeded = async (uid: string) => {
    if (!image || image.startsWith("https://")) return image;
    const resp = await fetch(image);
    const blob = await resp.blob();
    const fileRef = ref(storage, `MoneyReceipts/${uid}/${Date.now()}-receipt.jpg`);
    await uploadBytes(fileRef, blob);
    return await getDownloadURL(fileRef);
  };

  const openAddCategory = () => {
    setNewCatName("");
    setAddCatOpen(true);
  };

  const openAddAccount = () => {
    setNewAccName("");
    setAddAccOpen(true);
  };

  const addCategory = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = newCatName.trim();
    if (!name) return;

    const list = isIncome ? incomeCategories : expenseCategories;
    if (list.some((x) => x.value.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Already exists", "This category already exists.");
      return;
    }

    try {
      const colName = isIncome ? "incomeCategories" : "expenseCategories";

      await addDoc(collection(db, "users", user.uid, colName), {
        name,
        createdAt: Date.now(),
      });

      const item = { label: name, value: name };
      if (isIncome) setIncomeCategories((prev) => uniqByValue([...prev, item]));
      else setExpenseCategories((prev) => uniqByValue([...prev, item]));

      setCategory(name);
      setAddCatOpen(false);

      // ✅ toast for add category
      showToast("Category added successfully ✅");
    } catch (err) {
      console.log("Add category error:", err);
      Alert.alert("Error", "Failed to save category.");
    }
  };

  const addAccount = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const name = newAccName.trim();
    if (!name) return;

    if (accounts.some((x) => x.value.toLowerCase() === name.toLowerCase())) {
      Alert.alert("Already exists", "This account already exists.");
      return;
    }

    try {
      await addDoc(collection(db, "users", user.uid, "accounts"), {
        name,
        createdAt: Date.now(),
      });

      const item = { label: name, value: name };
      setAccounts((prev) => uniqByValue([...prev, item]));
      setAccount(name);
      setAddAccOpen(false);

      // ✅ toast for add account
      showToast("Account added successfully ✅");
    } catch (err) {
      console.log("Add account error:", err);
      Alert.alert("Error", "Failed to save account.");
    }
  };

  const handleSave = async () => {
    const user: User | null = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please login first.");
      return;
    }

    // Web date/time validation
    if (isWeb) {
      const d = parseYYYYMMDD(webDateStr);
      const t = parseHHMM(webTimeStr);
      if (!d || !t) {
        const msg = "Please enter a valid Date (YYYY-MM-DD) and Time (HH:MM).";
        setWebDTError(msg);
        Alert.alert("Invalid Date/Time", msg);
        return;
      }
      const nt = new Date(d);
      nt.setHours(t.hh, t.mm, 0, 0);
      setDate(nt);
      setTime(nt);
    }

    const amountCheck = isValidMoneyInput(amount);
    if (!amountCheck.ok) {
      setAmountError(amountCheck.msg || "Amount must be a number.");
      Alert.alert("Invalid amount", "Please enter a valid number amount.");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      const msg = "Amount must be a positive number.";
      setAmountError(msg);
      Alert.alert("Invalid amount", "Please enter a valid amount.");
      return;
    }

    if (!category) {
      Alert.alert("Missing category", "Please select a category.");
      return;
    }

    if (!account) {
      Alert.alert("Missing account", "Please select an account.");
      return;
    }

    setLoading(true);
    try {
      const combined = combineDateAndTime(date, time);
      const imageURL = await uploadImageIfNeeded(user.uid);

      const payload = {
        createdBy: user.uid,
        type,
        amount: amountNum,
        category,
        account,
        note,
        dateTime: combined.getTime(),
        imageURL: imageURL ?? null,
      };

      if (isEditMode && params.editId) {
        await updateDoc(doc(db, "Expenses", params.editId), payload as any);
      } else {
        await addDoc(collection(db, "Expenses"), payload as any);
      }

      // ✅ toast for save/update
      showToast(isEditMode ? "Updated successfully ✅" : "Saved successfully ✅");

      setTimeout(() => nav.goBack(), 900);
    } catch (err: any) {
      console.log("save error:", err);
      Alert.alert(
        "Save failed",
        err?.message ||
          "Failed to save. Check internet or Firestore rules, then try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const canSave =
    !loading && !!amount && !amountError && !!category && !!account;

  const inputBaseStyle = [
    styles.inputField,
    { backgroundColor: inputBg, borderColor: inputBorder, color: labelColor },
  ] as any;

  const currentCategoryList = isIncome ? incomeCategories : expenseCategories;

  const IconChip = ({
    selected,
    icon,
    label,
    onPress,
  }: {
    selected: boolean;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected
            ? `${accentColor}CC`
            : isDarkmode
            ? "rgba(148,163,184,0.28)"
            : "rgba(15,23,42,0.12)",
          backgroundColor: selected
            ? isDarkmode
              ? "rgba(2,6,23,0.92)"
              : "rgba(255,255,255,0.96)"
            : isDarkmode
            ? "rgba(2,6,23,0.55)"
            : "rgba(255,255,255,0.70)",
        },
        selected
          ? {
              shadowColor: accentColor,
              shadowOpacity: isDarkmode ? 0.45 : 0.18,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }
          : null,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={selected ? accentColor : subtleTextColor}
      />
      <RNText
        numberOfLines={1}
        style={{
          color: selected ? labelColor : subtleTextColor,
          fontWeight: selected ? "900" : "700",
          fontSize: 12,
          maxWidth: 140,
        }}
      >
        {label}
      </RNText>
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <IconButton
                icon="arrow-back"
                onPress={() => nav.goBack()}
                variant="secondary"
                size="medium"
              />
              <RNText style={[styles.headerTitle, { color: labelColor }]}>
                {isEditMode ? "Edit Transaction" : "Add Transaction"}
              </RNText>
              <View style={{ width: 48 }} />
            </View>

            <Card
              style={[
                styles.formCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: 1,
                  shadowColor: accentColor,
                  shadowOpacity: isDarkmode ? 0.35 : 0.16,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 0 },
                  elevation: 8,
                },
              ]}
            >
              {/* Type */}
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        type === "Income"
                          ? "#22C55E"
                          : isDarkmode
                          ? "rgba(2,6,23,0.75)"
                          : "rgba(255,255,255,0.85)",
                      borderColor:
                        type === "Income"
                          ? "#22C55E"
                          : isDarkmode
                          ? "rgba(148,163,184,0.35)"
                          : "rgba(15,23,42,0.12)",
                    },
                  ]}
                  onPress={() => setType("Income")}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name="trending-up-outline"
                    size={16}
                    color={type === "Income" ? "#0F172A" : labelColor}
                  />
                  <RNText
                    style={{
                      color: type === "Income" ? "#0F172A" : labelColor,
                      fontWeight: "900",
                      marginLeft: 8,
                    }}
                  >
                    Income
                  </RNText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    {
                      backgroundColor:
                        type === "Expense"
                          ? "#F97316"
                          : isDarkmode
                          ? "rgba(2,6,23,0.75)"
                          : "rgba(255,255,255,0.85)",
                      borderColor:
                        type === "Expense"
                          ? "#F97316"
                          : isDarkmode
                          ? "rgba(148,163,184,0.35)"
                          : "rgba(15,23,42,0.12)",
                    },
                  ]}
                  onPress={() => setType("Expense")}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={16}
                    color={type === "Expense" ? "#0F172A" : labelColor}
                  />
                  <RNText
                    style={{
                      color: type === "Expense" ? "#0F172A" : labelColor,
                      fontWeight: "900",
                      marginLeft: 8,
                    }}
                  >
                    Expense
                  </RNText>
                </TouchableOpacity>
              </View>

              {/* Date */}
              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Date
              </RNText>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  if (isWeb) {
                    setWebDTError("");
                    setWebDTModalOpen(true);
                  } else setDateModalOpen(true);
                }}
              >
                <RNTextInput
                  value={date.toLocaleDateString()}
                  editable={false}
                  pointerEvents="none"
                  style={inputBaseStyle}
                />
              </TouchableOpacity>

              {/* Time */}
              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Time
              </RNText>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  if (isWeb) {
                    setWebDTError("");
                    setWebDTModalOpen(true);
                  } else setTimeModalOpen(true);
                }}
              >
                <RNTextInput
                  value={formatTime(time)}
                  editable={false}
                  pointerEvents="none"
                  style={inputBaseStyle}
                />
              </TouchableOpacity>

              {/* Amount */}
              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Amount (RM)
              </RNText>
              <RNTextInput
                value={amount}
                onChangeText={onAmountChange}
                placeholder="e.g. 12.50"
                placeholderTextColor={subtleTextColor}
                keyboardType="numeric"
                style={[
                  inputBaseStyle,
                  amountError ? { borderColor: "#EF4444" } : null,
                ]}
              />
              {amountError ? (
                <RNText style={styles.inlineError}>{amountError}</RNText>
              ) : null}

              {/* Category chips */}
              <View style={styles.rowBetween}>
                <RNText style={[styles.label, { color: subtleTextColor }]}>
                  Category
                </RNText>
                <TouchableOpacity onPress={openAddCategory} activeOpacity={0.9}>
                  <RNText style={[styles.linkText, { color: accentColor }]}>
                    + Add
                  </RNText>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {currentCategoryList.map((it) => (
                  <IconChip
                    key={it.value}
                    selected={category === it.value}
                    icon={iconForCategory(it.value, isIncome)}
                    label={it.value}
                    onPress={() => setCategory(it.value)}
                  />
                ))}
              </ScrollView>

              {/* Account chips */}
              <View style={styles.rowBetween}>
                <RNText style={[styles.label, { color: subtleTextColor }]}>
                  Account
                </RNText>
                <TouchableOpacity onPress={openAddAccount} activeOpacity={0.9}>
                  <RNText style={[styles.linkText, { color: accentColor }]}>
                    + Add
                  </RNText>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {accounts.map((it) => (
                  <IconChip
                    key={it.value}
                    selected={account === it.value}
                    icon={iconForAccount(it.value)}
                    label={it.value}
                    onPress={() => setAccount(it.value)}
                  />
                ))}
              </ScrollView>

              {/* Note */}
              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Note
              </RNText>
              <RNTextInput
                value={note}
                onChangeText={setNote}
                placeholder="Optional note"
                placeholderTextColor={subtleTextColor}
                style={[...inputBaseStyle, styles.inputMultiline]}
                multiline
              />

              {/* Receipt */}
              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Receipt (Optional)
              </RNText>

              <View style={styles.receiptRow}>
                {/* ✅ IMPORTANT: Button style must be object (flattened) on web */}
                <Button
                  text="Pick Image"
                  onPress={pickImage}
                  style={flatStyle({ flex: 1, marginRight: 8 })}
                />
                <Button
                  text="Camera"
                  onPress={takePhoto}
                  style={flatStyle({ flex: 1 })}
                />
              </View>

              {image ? (
                <Image source={{ uri: image }} style={styles.receiptImage} />
              ) : null}

              <Button
                text={loading ? "Saving..." : isEditMode ? "Update" : "Save"}
                onPress={handleSave}
                disabled={!canSave}
                // ✅ IMPORTANT: flatten object style for rapi Button
                style={flatStyle({
                  marginTop: 10,
                  opacity: !canSave ? 0.55 : 1,
                })}
              />
            </Card>
          </ScrollView>

          {/* ✅ Bottom toast */}
          {toastVisible ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.toastWrapperBottom,
                {
                  opacity: toastOpacity,
                  transform: [{ translateY: toastTranslateY }],
                },
              ]}
            >
              <View
                style={[
                  styles.toastContainer,
                  {
                    backgroundColor: cardBg,
                    borderColor: `${accentColor}AA`,
                    borderWidth: 1,
                    shadowColor: accentColor,
                    shadowOpacity: isDarkmode ? 0.35 : 0.16,
                    shadowRadius: 14,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 8,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={accentColor}
                />
                <RNText style={[styles.toastText, { color: labelColor }]}>
                  {toastMsg}
                </RNText>
              </View>
            </Animated.View>
          ) : null}
        </KeyboardAvoidingView>

        {/* Mobile Date Modal */}
        <Modal visible={dateModalOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <RNText style={[styles.modalTitle, { color: labelColor }]}>
                Select Date
              </RNText>

              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selected) => {
                  if (Platform.OS !== "ios") setDateModalOpen(false);
                  if ((event as any)?.type === "dismissed") return;
                  if (selected) setDate(selected);
                }}
              />

              <View style={styles.modalActions}>
                <Pressable onPress={() => setDateModalOpen(false)}>
                  <RNText style={[styles.modalBtnText, { color: subtleTextColor }]}>
                    Close
                  </RNText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Mobile Time Modal */}
        <Modal visible={timeModalOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <RNText style={[styles.modalTitle, { color: labelColor }]}>
                Select Time
              </RNText>

              <DateTimePicker
                value={time}
                mode="time"
                is24Hour
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(event, selected) => {
                  if (Platform.OS !== "ios") setTimeModalOpen(false);
                  if ((event as any)?.type === "dismissed") return;
                  if (selected) setTime(selected);
                }}
              />

              <View style={styles.modalActions}>
                <Pressable onPress={() => setTimeModalOpen(false)}>
                  <RNText style={[styles.modalBtnText, { color: subtleTextColor }]}>
                    Close
                  </RNText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Web Date & Time Modal */}
        <Modal visible={webDTModalOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <RNText style={[styles.modalTitle, { color: labelColor }]}>
                Select Date & Time
              </RNText>

              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Date (YYYY-MM-DD)
              </RNText>
              <RNTextInput
                value={webDateStr}
                onChangeText={(t) => {
                  setWebDateStr(t);
                  setWebDTError("");
                }}
                placeholder="2025-12-14"
                placeholderTextColor={subtleTextColor}
                style={[...inputBaseStyle, webDTError ? { borderColor: "#EF4444" } : null]}
              />

              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Time (HH:MM)
              </RNText>
              <RNTextInput
                value={webTimeStr}
                onChangeText={(t) => {
                  setWebTimeStr(t);
                  setWebDTError("");
                }}
                placeholder="14:30"
                placeholderTextColor={subtleTextColor}
                style={[...inputBaseStyle, webDTError ? { borderColor: "#EF4444" } : null]}
              />

              {webDTError ? (
                <RNText style={styles.inlineError}>{webDTError}</RNText>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable onPress={() => setWebDTModalOpen(false)}>
                  <RNText style={[styles.modalBtnText, { color: subtleTextColor }]}>
                    Cancel
                  </RNText>
                </Pressable>

                <Pressable
                  onPress={() => {
                    const d = parseYYYYMMDD(webDateStr);
                    const t = parseHHMM(webTimeStr);
                    if (!d || !t) {
                      setWebDTError("Invalid date/time. Use YYYY-MM-DD and HH:MM.");
                      return;
                    }
                    const nt = new Date(d);
                    nt.setHours(t.hh, t.mm, 0, 0);
                    setDate(nt);
                    setTime(nt);
                    setWebDTModalOpen(false);
                  }}
                >
                  <RNText style={[styles.modalBtnText, { color: accentColor }]}>
                    Apply
                  </RNText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Category Modal */}
        <Modal visible={addCatOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <RNText style={[styles.modalTitle, { color: labelColor }]}>
                Add {isIncome ? "Income" : "Expense"} Category
              </RNText>

              <RNTextInput
                value={newCatName}
                onChangeText={setNewCatName}
                placeholder="e.g. Parking / Part-time"
                placeholderTextColor={subtleTextColor}
                style={inputBaseStyle}
              />

              <View style={styles.modalActions}>
                <Pressable onPress={() => setAddCatOpen(false)}>
                  <RNText style={[styles.modalBtnText, { color: subtleTextColor }]}>
                    Cancel
                  </RNText>
                </Pressable>

                <Pressable onPress={addCategory}>
                  <RNText style={[styles.modalBtnText, { color: accentColor }]}>
                    Add
                  </RNText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* Add Account Modal */}
        <Modal visible={addAccOpen} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: cardBg }]}>
              <RNText style={[styles.modalTitle, { color: labelColor }]}>
                Add Account
              </RNText>

              <RNTextInput
                value={newAccName}
                onChangeText={setNewAccName}
                placeholder="e.g. Maybank / Touch 'n Go"
                placeholderTextColor={subtleTextColor}
                style={inputBaseStyle}
              />

              <View style={styles.modalActions}>
                <Pressable onPress={() => setAddAccOpen(false)}>
                  <RNText style={[styles.modalBtnText, { color: subtleTextColor }]}>
                    Cancel
                  </RNText>
                </Pressable>

                <Pressable onPress={addAccount}>
                  <RNText style={[styles.modalBtnText, { color: accentColor }]}>
                    Add
                  </RNText>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

function makeStyles(theme: any) {
  const sp = theme?.spacing ?? {
    screenPadding: 16,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 26,
  };
  const ty = theme?.typography ?? {
    fontSizes: { xl: 18 },
    fontWeights: { bold: "800" },
  };

  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: sp.screenPadding,
      paddingTop: sp.md,
      paddingBottom: sp.xxl + 90,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: sp.lg,
    },
    headerTitle: {
      fontSize: ty?.fontSizes?.xl ?? 18,
      fontWeight: ty?.fontWeights?.bold ?? "800",
    },
    formCard: {
      paddingBottom: sp.md,
    },
    label: {
      fontSize: 13,
      marginBottom: 4,
    },
    inputField: {
      width: "100%",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 10,
    },
    inputMultiline: {
      height: 90,
      textAlignVertical: "top",
    },
    typeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    typeButton: {
      flex: 1,
      paddingVertical: 10,
      marginHorizontal: 4,
      borderRadius: 999,
      borderWidth: 1,
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    receiptRow: {
      flexDirection: "row",
      marginTop: 6,
      marginBottom: 8,
    },
    receiptImage: {
      marginTop: 8,
      width: "100%",
      height: 180,
      borderRadius: 12,
    },
    inlineError: {
      marginTop: 6,
      marginBottom: 10,
      fontSize: 12,
      color: "#EF4444",
      fontWeight: "700",
    },
    rowBetween: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 2,
    },
    linkText: {
      fontSize: 13,
      fontWeight: "800",
      marginBottom: 0,
    },

    chipRow: {
      paddingVertical: 6,
      gap: 10,
      paddingRight: 10,
      paddingLeft: 2,
      marginBottom: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
    },

    toastWrapperBottom: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 14,
      alignItems: "center",
    },
    toastContainer: {
      width: "100%",
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    toastText: {
      fontSize: 13,
      fontWeight: "900",
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      alignItems: "center",
      justifyContent: "center",
      padding: 18,
    },
    modalCard: {
      width: "100%",
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: "rgba(148,163,184,0.25)",
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "900",
      marginBottom: 10,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      gap: 16,
      marginTop: 10,
    },
    modalBtnText: {
      fontSize: 14,
      fontWeight: "900",
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
  });
}

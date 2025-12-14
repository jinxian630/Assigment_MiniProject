import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { Button, Picker } from "react-native-rapi-ui";

import {
  getFirestore,
  addDoc,
  collection,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { Card } from "@/components/common/Card";
import { useTheme } from "@/hooks/useTheme";

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

export default function TransactionAddScreen({ navigation, route }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const themeCtx = useTheme() as any;
  const theme = themeCtx?.theme ?? themeCtx;
  const isDarkmode = !!themeCtx?.isDarkMode;

  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const params = ((route as any)?.params ?? {}) as ExpenseAddRouteParams;
  const isEditMode = !!params.editId;

  const [loading, setLoading] = useState(false);

  const [type, setType] = useState<"Income" | "Expense">(
    params.type ?? "Expense"
  );
  const [amount, setAmount] = useState(
    params.amount != null ? String(params.amount) : ""
  );
  const [category, setCategory] = useState(params.category ?? "");
  const [account, setAccount] = useState(params.account ?? "");
  const [note, setNote] = useState(params.note ?? "");
  const [date, setDate] = useState<Date>(
    params.dateTime ? new Date(params.dateTime) : new Date()
  );
  const [time, setTime] = useState<Date>(
    params.dateTime ? new Date(params.dateTime) : new Date()
  );
  const [image, setImage] = useState<string | null>(params.imageURL ?? null);

  const categoryList = [
    { label: "Food", value: "Food" },
    { label: "Transport", value: "Transport" },
    { label: "Shopping", value: "Shopping" },
    { label: "Bills", value: "Bills" },
    { label: "Entertainment", value: "Entertainment" },
    { label: "Health", value: "Health" },
    { label: "Education", value: "Education" },
    { label: "Others", value: "Others" },
  ];

  const accountList = [
    { label: "Cash", value: "Cash" },
    { label: "E-Wallet", value: "E-Wallet" },
    { label: "Bank Account", value: "Bank Account" },
  ];

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

  const headerTitle = isEditMode ? "Edit Transaction" : "Add Transaction";
  const headerTitleColor = isDarkmode
    ? "#F9FAFB"
    : theme?.colors?.textPrimary ?? "#0F172A";

  // Load existing record if edit mode (keep logic same)
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

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.75,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.log("pick image error:", err);
    }
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.75,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.log("camera error:", err);
    }
  };

  const uploadImageIfNeeded = async (uid: string) => {
    if (!image || image.startsWith("https://")) return image;

    const resp = await fetch(image);
    const blob = await resp.blob();

    const fileRef = ref(
      storage,
      `MoneyReceipts/${uid}/${Date.now()}-receipt.jpg`
    );

    await uploadBytes(fileRef, blob);
    const url = await getDownloadURL(fileRef);
    return url;
  };

  const handleSave = async () => {
    const user: User | null = auth.currentUser;
    if (!user) {
      Alert.alert("Not logged in", "Please login first.");
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
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
      // Combine date + time into one timestamp
      const combined = new Date(date);
      combined.setHours(time.getHours());
      combined.setMinutes(time.getMinutes());
      combined.setSeconds(0);
      combined.setMilliseconds(0);

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

      Alert.alert("Success", isEditMode ? "Updated!" : "Saved!");
      nav.goBack();
    } catch (err) {
      console.log("save error:", err);
      Alert.alert("Error", "Something went wrong while saving.");
    } finally {
      setLoading(false);
    }
  };

  const inputBaseStyle = [
    styles.inputField,
    {
      backgroundColor: inputBg,
      borderColor: inputBorder,
      color: labelColor,
    },
  ] as any;

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
            {/* Header */}
            <View style={styles.header}>
              <IconButton
                icon="arrow-back"
                onPress={() => nav.goBack()}
                variant="secondary"
                size="medium"
              />
              <RNText style={[styles.headerTitle, { color: headerTitleColor }]}>
                {headerTitle}
              </RNText>
              <View style={{ width: 48 }} />
            </View>

            {/* Form Card (UPDATED: neon shell like task index) */}
            <Card
              style={[
                styles.formCard,
                neonGlowStyle({
                  isDarkmode,
                  accent: accentColor,
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  heavy: true,
                }),
              ]}
            >
              {/* Type selector */}
              <RNText style={[styles.label, { color: subtleTextColor }]}>
                Type
              </RNText>

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
                  <RNText
                    style={{
                      color:
                        type === "Income"
                          ? "#0F172A"
                          : isDarkmode
                          ? "#E5E7EB"
                          : "#334155",
                      fontWeight: "800",
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
                  <RNText
                    style={{
                      color:
                        type === "Expense"
                          ? "#0F172A"
                          : isDarkmode
                          ? "#E5E7EB"
                          : "#334155",
                      fontWeight: "800",
                    }}
                  >
                    Expense
                  </RNText>
                </TouchableOpacity>
              </View>

              {/* Date */}
              <RNText style={[styles.label, { color: labelColor }]}>
                Date
              </RNText>
              <RNTextInput
                value={date.toLocaleDateString()}
                editable={false}
                style={inputBaseStyle}
              />

              {/* Time */}
              <RNText style={[styles.label, { color: labelColor }]}>
                Time
              </RNText>
              <RNTextInput
                value={`${String(time.getHours()).padStart(2, "0")}:${String(
                  time.getMinutes()
                ).padStart(2, "0")}`}
                editable={false}
                style={inputBaseStyle}
              />

              {/* Amount */}
              <RNText style={[styles.label, { color: labelColor }]}>
                Amount (RM)
              </RNText>
              <RNTextInput
                value={amount}
                onChangeText={setAmount}
                placeholder="e.g. 12.50"
                placeholderTextColor={subtleTextColor}
                keyboardType="numeric"
                style={inputBaseStyle}
              />

              {/* Category */}
              <RNText style={[styles.label, { color: labelColor }]}>
                Category
              </RNText>
              <Picker
                items={categoryList}
                value={category}
                onValueChange={(val) => setCategory(String(val))}
                placeholder="Select category"
                style={styles.pickerStyle}
              />

              {/* Account */}
              <RNText style={[styles.label, { color: labelColor }]}>
                Account
              </RNText>
              <Picker
                items={accountList}
                value={account}
                onValueChange={(val) => setAccount(String(val))}
                placeholder="Select account"
                style={styles.pickerStyle}
              />

              {/* Note */}
              <RNText style={[styles.label, { color: labelColor }]}>
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
              <RNText style={[styles.label, { color: labelColor }]}>
                Receipt (Optional)
              </RNText>

              <View style={styles.receiptRow}>
                <Button
                  text="Pick Image"
                  onPress={pickImage}
                  style={{ flex: 1, marginRight: 8 }}
                />
                <Button text="Camera" onPress={takePhoto} style={{ flex: 1 }} />
              </View>

              {image ? (
                <Image source={{ uri: image }} style={styles.receiptImage} />
              ) : null}

              {/* Save */}
              <Button
                text={loading ? "Saving..." : isEditMode ? "Update" : "Save"}
                onPress={handleSave}
                disabled={loading}
                style={{ marginTop: 10 }}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
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
      paddingBottom: sp.xxl,
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
    pickerStyle: {
      width: "100%",
      marginBottom: 10,
      borderRadius: 12,
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
  });
}

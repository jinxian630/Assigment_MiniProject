import React, { useState, useEffect } from "react";
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
import { Theme } from "@/constants/theme";

type ExpenseAddRouteParams = {
  editId?: string;
  amount?: number;
  category?: string;
  account?: string;
  note?: string;
  dateTime?: number;
  imageURL?: string;
  type?: "Income" | "Expense";
};

export default function TransactionAddScreen({ navigation, route }: any) {
  const router = useRouter();
  const nav = navigation ?? { goBack: () => router.back() };

  const { isDarkmode } = useTheme();
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const params = ((route as any)?.params ?? {}) as ExpenseAddRouteParams;
  const isEditMode = !!params.editId;

  const [type, setType] = useState<"Income" | "Expense">(
    params.type || "Expense"
  );

  const initialDate = params.dateTime ? new Date(params.dateTime) : new Date();
  const [date, setDate] = useState<Date>(initialDate);
  const [time, setTime] = useState<Date>(initialDate);

  const [amount, setAmount] = useState(
    params.amount ? String(params.amount) : ""
  );
  const [category, setCategory] = useState(params.category || "");
  const [account, setAccount] = useState(params.account || "");
  const [note, setNote] = useState(params.note || "");
  const [image, setImage] = useState<string | null>(params.imageURL || null);

  const [loading, setLoading] = useState(false);

  const expenseDefaultCategories = [
    "Food & Drinks",
    "Transport",
    "Bill & Utilities",
    "Shopping",
    "Health",
    "Entertainment",
    "Others",
  ];

  const incomeDefaultCategories = [
    "Salary",
    "Bonus",
    "Allowance",
    "Freelance",
    "Investment",
    "Gift",
    "Others",
  ];

  const [expenseCategories] = useState<string[]>(expenseDefaultCategories);
  const [incomeCategories] = useState<string[]>(incomeDefaultCategories);

  const currentCategoryList =
    type === "Income" ? incomeCategories : expenseCategories;

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
  const cardBg = isDarkmode ? "rgba(15,23,42,0.92)" : "rgba(255,255,255,0.97)";
  const cardBorder = isDarkmode
    ? "rgba(148,163,184,0.4)"
    : "rgba(15,23,42,0.06)";
  const headerTitleColor = isDarkmode
    ? "#F9FAFB"
    : Theme.colors.textPrimary ?? "#0F172A";

  useEffect(() => {
    const fetchExisting = async () => {
      if (!params.editId) return;
      try {
        const refDoc = doc(db, "Expenses", params.editId);
        const snap = await getDoc(refDoc);
        if (snap.exists()) {
          const data = snap.data() as any;
          setType(data.type === "Income" ? "Income" : "Expense");
          setAmount(String(data.amount ?? ""));
          setCategory(data.category ?? "");
          setAccount(data.account ?? "");
          setNote(data.note ?? "");
          if (data.dateTime) {
            const dt = new Date(data.dateTime);
            setDate(dt);
            setTime(dt);
          }
          if (data.imageURL) {
            setImage(data.imageURL);
          }
        }
      } catch (err) {
        console.log("Load existing error:", err);
      }
    };
    fetchExisting();
  }, [params.editId, db]);

  useEffect(() => {
    setCategory("");
  }, [type]);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const libStatus =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        const camStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (!libStatus.granted || !camStatus.granted) {
          Alert.alert(
            "Permission needed",
            "Please allow gallery and camera access to attach receipts."
          );
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75,
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

  const mergeDateTime = () => {
    const merged = new Date(date);
    merged.setHours(time.getHours());
    merged.setMinutes(time.getMinutes());
    merged.setSeconds(0);
    merged.setMilliseconds(0);
    return merged;
  };

  const saveTransaction = async () => {
    if (!amount || isNaN(Number(amount))) {
      Alert.alert("Validation", "Please enter a valid amount.");
      return;
    }
    if (!category) {
      Alert.alert("Validation", "Please select a category.");
      return;
    }
    if (!account) {
      Alert.alert("Validation", "Please select an account.");
      return;
    }

    setLoading(true);
    try {
      const user = auth.currentUser as User | null;
      if (!user) {
        Alert.alert("Error", "User not logged in.");
        return;
      }

      const mergedDate = mergeDateTime();

      let imageURL: string | null = params.imageURL || null;
      if (image && image !== params.imageURL) {
        const response = await fetch(image);
        const blob = await response.blob();

        const filename = `receipts/${user.uid}/${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);
        await uploadBytes(storageRef, blob);
        imageURL = await getDownloadURL(storageRef);
      }

      const payload: any = {
        type,
        dateTime: mergedDate.getTime(),
        amount: parseFloat(amount),
        category,
        account,
        note,
        createdBy: user.uid,
      };
      if (imageURL) payload.imageURL = imageURL;

      if (isEditMode && params.editId) {
        await updateDoc(doc(db, "Expenses", params.editId), payload);
        Alert.alert("Success", "Record updated.");
      } else {
        await addDoc(collection(db, "Expenses"), payload);
        Alert.alert("Success", "Record added.");
      }

      nav.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderTypeButton = (label: "Income" | "Expense") => {
    const active = type === label;
    const buttonAccent = label === "Income" ? "#22C55E" : "#F97316";
    return (
      <TouchableOpacity
        style={[
          styles.typeButton,
          {
            borderColor: buttonAccent,
            backgroundColor: active
              ? buttonAccent
              : isDarkmode
              ? "rgba(15,23,42,0.9)"
              : "transparent",
          },
        ]}
        onPress={() => setType(label)}
      >
        <RNText
          style={{
            color: active ? "#0B1120" : buttonAccent,
            fontWeight: active ? "700" : "500",
          }}
        >
          {label}
        </RNText>
      </TouchableOpacity>
    );
  };

  const headerTitle = isEditMode ? "Edit Record" : "Add Record";

  const inputBaseStyle = [
    styles.inputField,
    {
      backgroundColor: inputBg,
      borderColor: inputBorder,
      color: labelColor,
    },
  ] as const;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.header}>
              <IconButton
                icon="arrow-back"
                variant="secondary"
                size="medium"
                onPress={() => nav.goBack()}
              />

              <RNText
                style={[
                  styles.headerTitle,
                  { color: headerTitleColor },
                ]}
              >
                {headerTitle}
              </RNText>
              <View style={{ width: 48 }} />
            </View>

            {/* Form Card */}
            <Card
              style={[
                styles.formCard,
                {
                  backgroundColor: cardBg,
                  borderColor: cardBorder,
                  borderWidth: 1,
                },
              ]}
            >
              {/* Type selector */}
              <RNText
                style={[
                  styles.label,
                  { color: subtleTextColor },
                ]}
              >
                Transaction Type
              </RNText>
              <View style={styles.typeRow}>
                {renderTypeButton("Income")}
                {renderTypeButton("Expense")}
              </View>

              {/* Date */}
              <RNText
                style={[
                  styles.label,
                  { color: labelColor },
                ]}
              >
                Date
              </RNText>
              <RNTextInput
                value={date.toLocaleDateString()}
                editable={false}
                style={inputBaseStyle}
              />

              {/* Time */}
              <RNText
                style={[
                  styles.label,
                  { color: labelColor },
                ]}
              >
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
              <RNText
                style={[
                  styles.label,
                  {
                    marginTop: 15,
                    color: accentColor,
                    fontWeight: "600",
                  },
                ]}
              >
                Amount (RM) – {isIncome ? "Income" : "Expense"}
              </RNText>
              <RNTextInput
                placeholder="0.00"
                placeholderTextColor={isDarkmode ? "#6B7280" : "#9CA3AF"}
                value={amount}
                keyboardType="numeric"
                onChangeText={setAmount}
                style={inputBaseStyle}
              />

              {/* Category */}
              <RNText
                style={[
                  styles.label,
                  { color: labelColor },
                ]}
              >
                Category
              </RNText>
              <Picker
                items={currentCategoryList.map((c) => ({
                  label: c,
                  value: c,
                }))}
                value={category}
                onValueChange={(val) => setCategory(String(val))}
                placeholder="Select category"
                style={styles.pickerStyle}
              />

              {/* Account */}
              <RNText
                style={[
                  styles.label,
                  { color: labelColor },
                ]}
              >
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
              <RNText
                style={[
                  styles.label,
                  { color: labelColor },
                ]}
              >
                Note
              </RNText>
              <RNTextInput
                placeholder="Optional note"
                placeholderTextColor={isDarkmode ? "#6B7280" : "#9CA3AF"}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                style={[...inputBaseStyle, styles.inputMultiline]}
              />

              {/* Receipt section */}
              <View style={{ marginTop: 15 }}>
                <RNText
                  style={[
                    styles.label,
                    { color: labelColor },
                  ]}
                >
                  Receipt (optional)
                </RNText>
                <View style={styles.receiptRow}>
                  <Button
                    text="Gallery"
                    size="sm"
                    onPress={pickImage}
                    style={{ marginRight: 10 }}
                  />
                  <Button text="Camera" size="sm" onPress={takePhoto} />
                </View>

                {image ? (
                  <Image
                    source={{ uri: image }}
                    style={styles.receiptImage}
                    resizeMode="cover"
                  />
                ) : null}
              </View>

              {/* Submit */}
              <Button
                text={loading ? "Saving..." : isEditMode ? "Update" : "Save"}
                onPress={saveTransaction}
                style={{ marginTop: 25 }}
                disabled={loading}
                status={isIncome ? "success" : "danger"}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
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
  },
  formCard: {
    paddingBottom: Theme.spacing.md,
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

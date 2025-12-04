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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

import {
  Text,
  useTheme,
  themeColor,
  TextInput,
  Button,
  Picker,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";

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
import { Theme } from "@/constants/theme";

// Route params used when editing
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

export default function TransactionAddScreen({ navigation, route }: Props) {
  const { isDarkmode } = useTheme();
  const auth = getAuth();
  const db = getFirestore();
  const storage = getStorage();

  const params = (route.params ?? {}) as ExpenseAddRouteParams;
  const isEditMode = !!params.editId;

  // Type
  const [type, setType] = useState<"Income" | "Expense">(
    params.type || "Expense"
  );

  // Date & Time
  const initialDate = params.dateTime ? new Date(params.dateTime) : new Date();
  const [date, setDate] = useState<Date>(initialDate);
  const [time, setTime] = useState<Date>(initialDate);

  // Form inputs
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
  const accentColor = isIncome ? "#2e8b57" : "#ff7f50";

  // Load latest data if editing (in case route only has editId)
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

  // Reset category when switching type
  useEffect(() => {
    setCategory("");
  }, [type]);

  // Ask media & camera permission
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
        // Upload new image to Firebase Storage
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
        // Update
        await updateDoc(doc(db, "Expenses", params.editId), payload);
        Alert.alert("Success", "Record updated.");
      } else {
        // Add
        await addDoc(collection(db, "Expenses"), payload);
        Alert.alert("Success", "Record added.");
      }

      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const renderTypeButton = (label: "Income" | "Expense") => {
    const active = type === label;
    const buttonAccent = label === "Income" ? "#2e8b57" : "#ff7f50";
    return (
      <TouchableOpacity
        style={[
          styles.typeButton,
          {
            borderColor: buttonAccent,
            backgroundColor: active ? buttonAccent : "transparent",
          },
        ]}
        onPress={() => setType(label)}
      >
        <Text
          style={{
            color: active ? "#fff" : buttonAccent,
            fontWeight: active ? "bold" : "normal",
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const headerTitle = isEditMode ? "Edit Record" : "Add Record";

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
                onPress={() => navigation.goBack()}
              />
              <Text style={styles.headerTitle}>{headerTitle}</Text>
              <View style={{ width: 48 }} />
            </View>

            {/* Form Card */}
            <Card style={styles.formCard}>
              {/* Type selector */}
              <Text style={styles.label}>Transaction Type</Text>
              <View style={styles.typeRow}>
                {renderTypeButton("Income")}
                {renderTypeButton("Expense")}
              </View>

              {/* Date */}
              <Text style={styles.label}>Date</Text>
              <TextInput
                value={date.toLocaleDateString()}
                editable={false}
                containerStyle={styles.input}
              />

              {/* Time */}
              <Text style={styles.label}>Time</Text>
              {Platform.OS === "web" ? (
                <input
                  type="time"
                  value={`${String(time.getHours()).padStart(2, "0")}:${String(
                    time.getMinutes()
                  ).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [h, m] = e.target.value.split(":");
                    const newTime = new Date(date);
                    newTime.setHours(Number(h), Number(m), 0, 0);
                    setTime(newTime);
                  }}
                  style={styles.inputWeb}
                />
              ) : (
                <TextInput
                  value={`${String(time.getHours()).padStart(2, "0")}:${String(
                    time.getMinutes()
                  ).padStart(2, "0")}`}
                  editable={false}
                  containerStyle={styles.input}
                />
              )}

              {/* Amount */}
              <Text style={[styles.label, { marginTop: 15 }]}>
                Amount (RM) – {isIncome ? "Income" : "Expense"}
              </Text>
              <TextInput
                placeholder="0.00"
                value={amount}
                keyboardType="numeric"
                onChangeText={setAmount}
                containerStyle={styles.input}
              />

              {/* Category */}
              <Text style={styles.label}>Category</Text>
              <Picker
                items={currentCategoryList.map((c) => ({
                  label: c,
                  value: c,
                }))}
                value={category}
                onValueChange={(val) => setCategory(String(val))}
                placeholder="Select category"
                style={styles.input}
              />

              {/* Account */}
              <Text style={styles.label}>Account</Text>
              <Picker
                items={accountList}
                value={account}
                onValueChange={(val) => setAccount(String(val))}
                placeholder="Select account"
                style={styles.input}
              />

              {/* Note */}
              <Text style={styles.label}>Note</Text>
              <TextInput
                placeholder="Optional note"
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                containerStyle={styles.input}
              />

              {/* Receipt section */}
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>Receipt (optional)</Text>
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
    color: Theme.colors.textPrimary,
  },
  formCard: {
    paddingBottom: Theme.spacing.md,
  },
  label: {
    fontSize: 13,
    marginBottom: 4,
  },
  input: {
    marginBottom: 10,
  },
  inputWeb: {
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ccc",
    marginBottom: 10,
  },
  typeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
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

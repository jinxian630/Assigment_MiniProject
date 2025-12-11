// src/screens/Task/AddEvent.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Text, TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import * as ImagePicker from "expo-image-picker";

import { getAuth, User } from "firebase/auth";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

const MODULE_COLOR = "#38BDF8";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

/* ------------------------------------------------------------------ */
/*  Reusable Date Picker Modal (same style family as AddTask)         */
/* ------------------------------------------------------------------ */

type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  theme: any;
  title?: string;
};

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  theme,
  title,
}) => {
  const initial = selectedDate || new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1); // 1–12
  const [calendarCurrent, setCalendarCurrent] = useState(
    `${year}-${pad2(month)}-01`
  );

  // Reset when opened (follow last selected or today)
  useEffect(() => {
    if (visible) {
      const base = selectedDate || new Date();
      const y = base.getFullYear();
      const m = base.getMonth() + 1;
      setYear(y);
      setMonth(m);
      setCalendarCurrent(`${y}-${pad2(m)}-01`);
    }
  }, [visible, selectedDate]);

  // Update current string when year/month changes
  useEffect(() => {
    setCalendarCurrent(`${year}-${pad2(month)}-01`);
  }, [year, month]);

  const goToPrevMonth = () => {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  };

  const goToNextMonth = () => {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  };

  const goToPrevYear = () => setYear((y) => y - 1);
  const goToNextYear = () => setYear((y) => y + 1);

  const handleDayPress = (day: any) => {
    const d = new Date(day.dateString);
    onSelectDate(d);
    onClose();
  };

  const selectedKey =
    selectedDate != null ? selectedDate.toISOString().split("T")[0] : undefined;

  const markedDates =
    selectedKey != null
      ? {
          [selectedKey]: {
            selected: true,
            selectedColor: MODULE_COLOR,
            selectedTextColor: "#0f172a",
          },
        }
      : {};

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.95)", // darker for visibility
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 16,
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: 420,
            borderRadius: 20,
            padding: 20,
            backgroundColor: theme.colors.card,
            borderWidth: 1,
            borderColor: theme.isDark ? "#1f2937" : "#d1d5db",
            shadowColor: MODULE_COLOR,
            shadowOpacity: theme.isDark ? 0.55 : 0.35,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 10 },
            elevation: 16,
          }}
        >
          {title && (
            <Text
              style={{
                fontSize: 17,
                fontWeight: "700",
                marginBottom: 12,
                textAlign: "center",
                color: theme.colors.textPrimary,
              }}
            >
              {title}
            </Text>
          )}

          {/* HEADER (month/year + arrows) */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: "#0f172a",
              borderWidth: 1,
              borderColor: theme.isDark ? "#1e293b" : "#cbd5e1",
            }}
          >
            {/* Left Controls */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={goToPrevYear} style={{ padding: 4 }}>
                <Ionicons
                  name="play-back"
                  size={19}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={goToPrevMonth} style={{ padding: 4 }}>
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: theme.colors.textPrimary,
              }}
            >
              {MONTH_NAMES[month - 1]} {year}
            </Text>

            {/* Right Controls */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity onPress={goToNextMonth} style={{ padding: 4 }}>
                <Ionicons
                  name="chevron-forward"
                  size={22}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>

              <TouchableOpacity onPress={goToNextYear} style={{ padding: 4 }}>
                <Ionicons
                  name="play-forward"
                  size={19}
                  color={theme.colors.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* CALENDAR */}
          <Calendar
            current={calendarCurrent}
            hideArrows
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: theme.colors.card,
              calendarBackground: theme.colors.card,
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: MODULE_COLOR,
              selectedDayTextColor: "#0f172a",
              todayTextColor: MODULE_COLOR,
              dayTextColor: theme.colors.textPrimary,
              textDisabledColor: "#6b7280",
              monthTextColor: theme.colors.textPrimary,
            }}
          />

          {/* CLOSE BUTTON */}
          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              padding: 12,
              backgroundColor: MODULE_COLOR,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: "#0f172a",
                fontSize: 14,
                fontWeight: "700",
              }}
            >
              Close
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/* ------------------------------------------------------------------ */
/*  Add Event Screen                                                  */
/* ------------------------------------------------------------------ */

export default function AddEventScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();

  // Event fields
  const [title, setTitle] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guestList, setGuestList] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState<"physical" | "online">("physical");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  // Calendar
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const handleAddGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;
    if (!gmailPattern.test(trimmed)) {
      alert("Please enter a valid Gmail address");
      return;
    }
    const exists = guestList.some(
      (g) => g.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      alert("Guest already added");
      return;
    }
    setGuestList((prev) => [...prev, trimmed]);
    setGuestInput("");
  };

  const handleRemoveGuest = (index: number) => {
    setGuestList((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  // Image Picker permission
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Media library permission is required!");
        }
      }
    })();
  }, []);

  const pickAttachment = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newFiles = result.assets.map((x) => x.uri);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const handleAddEvent = async () => {
    if (!title.trim()) return alert("Event title is required");
    if (!dueDate) return alert("Please select a date");

    const auth = getAuth();
    const db = getFirestore();
    const storage = getStorage();

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    const createdAt = Date.now();
    const uploadedURLs: string[] = [];

    // Upload attachments
    for (const file of attachments) {
      const response = await fetch(file);
      const blob = await response.blob();

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const storageRef = ref(storage, `EventAttachments/${id}`);

      const snap = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snap.ref);
      uploadedURLs.push(url);
    }

    try {
      await addDoc(collection(db, "Events"), {
        title,
        guests: guestList,
        location,
        mode,
        description,
        date: dueDate.getTime(),
        attachments: uploadedURLs,
        createdAt,
        createdBy: {
          id: user.uid,
          name: user.displayName,
          photo: user.photoURL,
          email: user.email || "",
        },
      });

      alert("Event added successfully!");
      setGuestList([]);
      setGuestInput("");
      setTitle("");
      setLocation("");
      setDescription("");
      setAttachments([]);
      setDueDate(null);
      router.back();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const isDark = theme.isDark;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          {/* HEADER */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 6,
            }}
          >
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="secondary"
              size="medium"
            />
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: theme.colors.textPrimary,
              }}
            >
              Add Event
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconButton
                icon={isDark ? "moon" : "sunny"}
                onPress={() => toggleTheme && toggleTheme()}
                variant="secondary"
                size="small"
              />
            </View>
          </View>

          {/* CONTENT */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* TITLE */}
            <Text
              style={{
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Event Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Meeting, Birthday, Workshop..."
              containerStyle={{
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: isDark ? 0.55 : 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 5, height: 5 },
                elevation: 10,
              }}
            />

            {/* GUESTS */}
            <Text
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Guests (Gmail)
            </Text>

            {/* Guest chips */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 4,
                gap: 8,
              }}
            >
              {guestList.map((guest, index) => (
                <View
                  key={`${guest}-${index}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: isDark ? "#0f172a" : "#E5F3FF",
                    borderWidth: 1,
                    borderColor: isDark ? "#1f2937" : "#BFDBFE",
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={14}
                    color={MODULE_COLOR}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      color: theme.colors.textColor,
                    }}
                  >
                    {guest}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveGuest(index)}
                    style={{ marginLeft: 6 }}
                  >
                    <Ionicons name="close" size={14} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Guest input row */}
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1 }}>
                <TextInput
                  value={guestInput}
                  onChangeText={setGuestInput}
                  placeholder="guest@example.com"
                  containerStyle={{
                    borderRadius: 10,
                    shadowColor: MODULE_COLOR,
                    shadowOpacity: isDark ? 0.55 : 0.35,
                    shadowRadius: 18,
                    shadowOffset: { width: 5, height: 5 },
                    elevation: 10,
                  }}
                />
              </View>
              <Button
                text="Add"
                status="info"
                onPress={handleAddGuest}
                style={{ alignSelf: "stretch", paddingHorizontal: 8 }}
              />
            </View>

            {/* LOCATION */}
            <Text
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Location
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location / Online link"
              containerStyle={{
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: isDark ? 0.55 : 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 5, height: 5 },
                elevation: 10,
              }}
            />

            {/* MODE */}
            <Text
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Mode
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginVertical: 10,
              }}
            >
              <Button
                text="Physical"
                status={mode === "physical" ? "primary" : "info"}
                onPress={() => setMode("physical")}
              />
              <Button
                text="Online"
                status={mode === "online" ? "primary" : "info"}
                onPress={() => setMode("online")}
              />
            </View>

            {/* DESCRIPTION */}
            <Text
              style={{
                marginTop: 4,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Event details..."
              multiline
              numberOfLines={3}
              containerStyle={{
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: isDark ? 0.55 : 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 5, height: 5 },
                elevation: 10,
              }}
            />

            {/* DATE */}
            <Text
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              style={{
                padding: 12,
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 10,
                marginTop: 2,
                backgroundColor: theme.colors.card,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                shadowColor: MODULE_COLOR,
                shadowOpacity: isDark ? 0.55 : 0.35,
                shadowRadius: 18,
                shadowOffset: { width: 5, height: 5 },
                elevation: 10,
              }}
            >
              <Text
                style={{
                  color: dueDate
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                  fontSize: 13,
                }}
              >
                {dueDate ? formatDate(dueDate) : "Select date"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={MODULE_COLOR}
              />
            </TouchableOpacity>

            {/* DATE PICKER MODAL */}
            <DatePickerModal
              visible={showCalendar}
              onClose={() => setShowCalendar(false)}
              selectedDate={dueDate}
              onSelectDate={setDueDate}
              theme={theme}
              title="Select Event Date"
            />

            {/* ATTACHMENTS */}
            <Text
              style={{
                marginTop: 22,
                marginBottom: 6,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Attachments (optional)
            </Text>
            <Button text="Add Attachment" onPress={pickAttachment} />

            <View
              style={{
                marginTop: 10,
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              {attachments.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 10,
                  }}
                />
              ))}
            </View>

            {/* SUBMIT */}
            <Button
              text="Create Event"
              status="primary"
              onPress={handleAddEvent}
              style={{ marginTop: 30 }}
            />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

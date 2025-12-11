// src/screens/Task/AddTask.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import { Text, TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { Calendar } from "react-native-calendars";
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
/*  Reusable Date Picker Modal                                        */
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

            // Enhanced shadow for visibility
            shadowColor: MODULE_COLOR,
            shadowOpacity: theme.isDark ? 0.4 : 0.25,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 8 },
            elevation: 10,
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

          {/* HEADER */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: theme.isDark ? "#0f172a" : "#0f172a",
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
/*  Add Task Screen                                                   */
/* ------------------------------------------------------------------ */

export default function AddTaskScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme(); // ✅ same as other Task screens

  const [taskName, setTaskName] = useState<string>("");
  const [details, setDetails] = useState<string>("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);

  const [assignedInput, setAssignedInput] = useState<string>("");
  const [assignedList, setAssignedList] = useState<string[]>([]);

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const handleAddAssignee = () => {
    const trimmed = assignedInput.trim();
    if (!trimmed) return;
    if (!gmailPattern.test(trimmed)) {
      alert("Please enter a valid Gmail address");
      return;
    }
    const exists = assignedList.some(
      (email) => email.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      alert("This Gmail is already added");
      return;
    }
    setAssignedList((prev) => [...prev, trimmed]);
    setAssignedInput("");
  };

  const handleRemoveAssignee = (index: number) => {
    setAssignedList((prev) => prev.filter((_, i) => i !== index));
  };

  const formatDate = (date: Date): string =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const emptyState = () => {
    setTaskName("");
    setDetails("");
    setDueDate(null);
    setStartDate(null);
    setAssignedInput("");
    setAssignedList([]);
  };

  const handleAddTask = async () => {
    if (!taskName.trim()) return alert("Task name is required");
    if (!dueDate) return alert("Please select a due date");
    if (assignedList.length === 0)
      return alert("Please add at least one user's Gmail");

    setLoading(true);
    const auth = getAuth();
    const db = getFirestore();

    if (auth.currentUser) {
      const currentUser: User = auth.currentUser;
      const createdAt = new Date().getTime();

      try {
        await addDoc(collection(db, "Tasks"), {
          taskName,
          details,
          assignedTo: assignedList,
          startDate: startDate ? startDate.getTime() : null,
          dueDate: dueDate.getTime(),
          completed: false,
          createdAt,
          updatedAt: createdAt,
          reminderSet: true,
          CreatedUser: {
            id: currentUser.uid,
            name: currentUser.displayName,
            photo: currentUser.photoURL,
            email: currentUser.email || "",
          },
          reminderIds: [],
        });

        emptyState();
        setLoading(false);
        alert("Task added!");
        router.back();
      } catch (err: any) {
        setLoading(false);
        alert("Error adding task: " + err.message);
      }
    } else {
      setLoading(false);
      alert("You must be logged in to add a task.");
    }
  };

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
              Add Task
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <IconButton
                icon={theme.isDark ? "moon" : "sunny"} // ✅ uses theme.isDark directly
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
            {/* TASK NAME */}
            <Text
              style={{
                marginTop: 10,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Task Name
            </Text>
            <TextInput
              placeholder="Enter task name..."
              value={taskName}
              onChangeText={setTaskName}
              containerStyle={{
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: theme.isDark ? 0.4 : 0.25,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            />

            {/* DETAILS */}
            <Text
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Details (optional)
            </Text>
            <TextInput
              placeholder="Enter task details..."
              value={details}
              multiline
              onChangeText={setDetails}
              containerStyle={{
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: theme.isDark ? 0.4 : 0.25,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            />

            {/* ASSIGN TO */}
            <Text
              style={{
                marginTop: 18,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Assign To (User Gmail)
            </Text>

            {/* Chips */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 4,
                gap: 8,
              }}
            >
              {assignedList.map((email, index) => (
                <View
                  key={`${email}-${index}`}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: theme.isDark ? "#0f172a" : "#E5F3FF",
                    borderWidth: 1,
                    borderColor: theme.isDark ? "#1f2937" : "#BFDBFE",
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
                    {email}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveAssignee(index)}
                    style={{ marginLeft: 6 }}
                  >
                    <Ionicons name="close" size={14} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Assignee input row */}
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
                  placeholder="Enter user's Gmail..."
                  value={assignedInput}
                  onChangeText={setAssignedInput}
                  containerStyle={{
                    borderRadius: 10,
                    shadowColor: MODULE_COLOR,
                    shadowOpacity: theme.isDark ? 0.4 : 0.25,
                    shadowRadius: 20,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 10,
                  }}
                />
              </View>
              <Button
                text="Add"
                status="info"
                onPress={handleAddAssignee}
                style={{ alignSelf: "stretch", paddingHorizontal: 8 }}
              />
            </View>

            {/* Start Date */}
            <Text
              style={{
                marginTop: 20,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Start Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowStartCalendar(true)}
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
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: theme.isDark ? 0.4 : 0.25,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
                elevation: 10,
              }}
            >
              <Text
                style={{
                  color: startDate
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,

                  fontSize: 13,
                }}
              >
                {startDate ? formatDate(startDate) : "Select start date"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={MODULE_COLOR}
              />
            </TouchableOpacity>

            {/* Due Date */}
            <Text
              style={{
                marginTop: 20,
                marginBottom: 4,
                fontSize: 13,
                color: theme.colors.textSecondary,
              }}
            >
              Due Date
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
                borderRadius: 10,
                shadowColor: MODULE_COLOR,
                shadowOpacity: theme.isDark ? 0.4 : 0.25,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 8 },
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
                {dueDate ? formatDate(dueDate) : "Select due date"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={MODULE_COLOR}
              />
            </TouchableOpacity>

            {/* Add button */}
            <Button
              text={loading ? "Saving..." : "Add Task"}
              onPress={handleAddTask}
              style={{ marginTop: 30 }}
              disabled={loading}
            />
          </ScrollView>

          {/* Start Date Picker */}
          <DatePickerModal
            visible={showStartCalendar}
            onClose={() => setShowStartCalendar(false)}
            selectedDate={startDate}
            onSelectDate={setStartDate}
            theme={theme}
            title="Select Start Date"
          />

          {/* Due Date Picker */}
          <DatePickerModal
            visible={showCalendar}
            onClose={() => setShowCalendar(false)}
            selectedDate={dueDate}
            onSelectDate={setDueDate}
            theme={theme}
            title="Select Due Date"
          />
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

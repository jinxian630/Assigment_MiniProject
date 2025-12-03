import React, { useState, useEffect } from "react";
import { View, KeyboardAvoidingView, Modal, ScrollView } from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import { useRouter } from "expo-router";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  TextInput,
  Button,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  addDoc,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { Calendar } from "react-native-calendars";

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

// ------- Reusable Date Picker Modal --------
type DatePickerModalProps = {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  isDarkmode: boolean;
  themeColor: typeof themeColor;
  title?: string;
};

const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  selectedDate,
  onSelectDate,
  isDarkmode,
  themeColor,
  title,
}) => {
  const initial = selectedDate || new Date();
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth() + 1); // 1-12
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

  const markedDates =
    selectedDate != null
      ? {
          [selectedDate.toISOString().split("T")[0]]: {
            selected: true,
            selectedColor: themeColor.primary,
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
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <View
          style={{
            backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
            borderRadius: 16,
            padding: 20,
            width: "90%",
            maxWidth: 420,
          }}
        >
          {title && (
            <Text
              style={{
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 8,
                textAlign: "center",
              }}
            >
              {title}
            </Text>
          )}

          {/* Header */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              paddingHorizontal: 8,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: isDarkmode ? themeColor.dark200 : "#f3f4f6",
            }}
          >
            {/* Left controls */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={goToPrevYear}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Ionicons
                  name="play-back"
                  size={18}
                  color={isDarkmode ? "#e5e7eb" : "#374151"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToPrevMonth}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginLeft: 4,
                }}
              >
                <Ionicons
                  name="chevron-back"
                  size={18}
                  color={isDarkmode ? "#e5e7eb" : "#374151"}
                />
              </TouchableOpacity>
            </View>

            {/* Month / Year label */}
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
              }}
            >
              {MONTH_NAMES[month - 1]} {year}
            </Text>

            {/* Right controls */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TouchableOpacity
                onPress={goToNextMonth}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  borderRadius: 999,
                  marginRight: 4,
                }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDarkmode ? "#e5e7eb" : "#374151"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={goToNextYear}
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 4,
                  borderRadius: 999,
                }}
              >
                <Ionicons
                  name="play-forward"
                  size={18}
                  color={isDarkmode ? "#e5e7eb" : "#374151"}
                />
              </TouchableOpacity>
            </View>
          </View>

          <Calendar
            current={calendarCurrent}
            hideArrows
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
              calendarBackground: isDarkmode
                ? themeColor.dark
                : themeColor.white,
              textSectionTitleColor: isDarkmode
                ? themeColor.white
                : themeColor.dark,
              selectedDayBackgroundColor: themeColor.primary,
              selectedDayTextColor: themeColor.white,
              todayTextColor: themeColor.primary,
              dayTextColor: isDarkmode ? themeColor.white : themeColor.dark,
              textDisabledColor: "#888",
              monthTextColor: isDarkmode ? themeColor.white : themeColor.dark,
              arrowColor: themeColor.primary,
            }}
          />

          <TouchableOpacity
            onPress={onClose}
            style={{
              marginTop: 16,
              padding: 10,
              backgroundColor: themeColor.primary,
              borderRadius: 999,
              alignItems: "center",
            }}
          >
            <Text
              style={{
                color: themeColor.white,
                fontWeight: "bold",
                fontSize: 14,
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
// ------- End Reusable Date Picker Modal --------

export default function () {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
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
        // 1) Create task in Firestore
        const docRef = await addDoc(collection(db, "Tasks"), {
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
          // placeholder, will be updated
          reminderIds: [],
        });

        emptyState();
        setLoading(false);
        alert("Task added! Document ID: " + docRef.id);
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
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <Layout>
        <TopNav
          middleContent="Add Task"
          leftContent={
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => router.back()}
          rightContent={
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ marginTop: 20 }}>Task Name</Text>
          <TextInput
            placeholder="Enter task name..."
            value={taskName}
            onChangeText={setTaskName}
          />

          <Text style={{ marginTop: 20 }}>Details (optional)</Text>
          <TextInput
            placeholder="Enter task details..."
            value={details}
            onChangeText={setDetails}
          />

          <Text style={{ marginTop: 20 }}>Assign To (User Gmail)</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: 10,
              gap: 8,
            }}
          >
            {assignedList.map((email, index) => (
              <View
                key={`${email}-${index}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#e5e7eb",
                }}
              >
                <Text style={{ fontSize: 12 }}>{email}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveAssignee(index)}
                  style={{ marginLeft: 6 }}
                >
                  <Ionicons name="close" size={14} color="#555" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TextInput
              placeholder="Enter user's Gmail..."
              value={assignedInput}
              onChangeText={setAssignedInput}
              style={{ flex: 1 }}
            />
            <Button
              text="Add"
              status="info"
              onPress={handleAddAssignee}
              style={{ alignSelf: "center" }}
            />
          </View>

          {/* Start Date */}
          <Text style={{ marginTop: 20 }}>Start Date</Text>
          <TouchableOpacity
            onPress={() => setShowStartCalendar(true)}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginTop: 5,
            }}
          >
            <Text>
              {startDate ? formatDate(startDate) : "Select start date"}
            </Text>
          </TouchableOpacity>

          {/* Due Date */}
          <Text style={{ marginTop: 20 }}>Due Date</Text>
          <TouchableOpacity
            onPress={() => setShowCalendar(true)}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginTop: 5,
            }}
          >
            <Text>{dueDate ? formatDate(dueDate) : "Select due date"}</Text>
          </TouchableOpacity>

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
          isDarkmode={isDarkmode}
          themeColor={themeColor}
          title="Select Start Date"
        />

        {/* Due Date Picker */}
        <DatePickerModal
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={dueDate}
          onSelectDate={setDueDate}
          isDarkmode={isDarkmode}
          themeColor={themeColor}
          title="Select Due Date"
        />
      </Layout>
    </KeyboardAvoidingView>
  );
}

import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  TouchableOpacity,
} from "react-native";
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
import {
  MODULE_COLOR,
  DatePickerModal,
  formatDateGB,
} from "../task-management/TS FILE/TaskSharedUI";

/* ------------------------Add Task Screen-------------------------------- */

export default function AddTaskScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();

  const [taskName, setTaskName] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);

  const [assignedInput, setAssignedInput] = useState("");
  const [assignedList, setAssignedList] = useState<string[]>([]);

  const gmailPattern = useMemo(() => /^[a-zA-Z0-9._%+-]+@gmail\.com$/, []);

  const inputShadow = useMemo(
    () => ({
      borderRadius: 10,
      shadowColor: MODULE_COLOR,
      shadowOpacity: theme.isDark ? 0.4 : 0.25,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
    }),
    [theme.isDark]
  );

  const formatDate = useCallback(
    (date: Date) =>
      date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    []
  );

  const emptyState = useCallback(() => {
    setTaskName("");
    setDetails("");
    setDueDate(null);
    setStartDate(null);
    setAssignedInput("");
    setAssignedList([]);
  }, []);

  const handleAddAssignee = useCallback(() => {
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
  }, [assignedInput, assignedList, gmailPattern]);

  const handleRemoveAssignee = useCallback((index: number) => {
    setAssignedList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddTask = useCallback(async () => {
    if (!taskName.trim()) return alert("Task name is required");
    if (!dueDate) return alert("Please select a due date");
    if (assignedList.length === 0)
      return alert("Please add at least one user's Gmail");

    if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
      return alert("Start date cannot be after due date.");
    }

    setLoading(true);
    const auth = getAuth();
    const db = getFirestore();

    if (!auth.currentUser) {
      setLoading(false);
      return alert("You must be logged in to add a task.");
    }

    const currentUser: User = auth.currentUser;
    const createdAt = Date.now();

    try {
      await addDoc(collection(db, "Tasks"), {
        taskName: taskName.trim(),
        details: details.trim(),
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
      alert("Error adding task: " + (err?.message || "Unknown error"));
    }
  }, [taskName, details, dueDate, startDate, assignedList, emptyState, router]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
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
                icon={theme.isDark ? "moon" : "sunny"}
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
              containerStyle={inputShadow}
            />

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
              containerStyle={inputShadow}
            />

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

            <View
              style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 4 }}
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
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons
                    name="person-circle-outline"
                    size={14}
                    color={MODULE_COLOR}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{ fontSize: 11, color: theme.colors.textPrimary }}
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

            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                alignItems: "center",
              }}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <TextInput
                  placeholder="Enter user's Gmail..."
                  value={assignedInput}
                  onChangeText={setAssignedInput}
                  containerStyle={inputShadow}
                />
              </View>
              <Button
                text="Add"
                status="info"
                onPress={handleAddAssignee}
                style={{ alignSelf: "stretch", paddingHorizontal: 8 }}
              />
            </View>

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

            <Button
              text={loading ? "Saving..." : "Add Task"}
              onPress={handleAddTask}
              style={{ marginTop: 30 }}
              disabled={loading}
            />
          </ScrollView>

          <DatePickerModal
            visible={showStartCalendar}
            onClose={() => setShowStartCalendar(false)}
            selectedDate={startDate}
            onSelectDate={setStartDate}
            theme={theme}
            title="Select Start Date"
          />

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

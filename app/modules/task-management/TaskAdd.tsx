import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
  Pressable,
  TouchableOpacity,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getAuth, User } from "firebase/auth";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import { MODULE_COLOR, DatePickerModal, formatDateGB } from "./utils/sharedUI";
import { createTaskFormStyles } from "./styles/taskFormStyles";

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

  const styles = useMemo(
    () => createTaskFormStyles(theme, MODULE_COLOR),
    [theme, MODULE_COLOR]
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
            {/* Task Information Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Task Information</Text>
              </View>

              <Text style={styles.label}>Task Name *</Text>
              <TextInput
                placeholder="Enter task name..."
                value={taskName}
                onChangeText={setTaskName}
                containerStyle={styles.inputContainer}
                style={{ fontSize: 14 }}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>
                Details (optional)
              </Text>
              <TextInput
                placeholder="Add task details and notes..."
                value={details}
                multiline
                numberOfLines={4}
                onChangeText={setDetails}
                containerStyle={styles.inputContainer}
                style={{ fontSize: 14, minHeight: 80 }}
              />
            </View>

            {/* Assignees Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Assign To</Text>
              </View>

              {assignedList.length > 0 && (
                <View style={styles.chipContainer}>
                  {assignedList.map((email, index) => (
                    <View key={`${email}-${index}`} style={styles.chip}>
                      <Ionicons
                        name="person-circle-outline"
                        size={16}
                        color={MODULE_COLOR}
                      />
                      <Text style={styles.chipText}>{email}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveAssignee(index)}
                        style={styles.chipClose}
                      >
                        <Ionicons
                          name="close-circle"
                          size={18}
                          color="#6B7280"
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.addInputRow}>
                <View style={styles.addInputContainer}>
                  <TextInput
                    placeholder="Enter user's Gmail address..."
                    value={assignedInput}
                    onChangeText={setAssignedInput}
                    containerStyle={styles.inputContainer}
                    style={{ fontSize: 14 }}
                  />
                </View>
                <Button
                  text="Add"
                  status="info"
                  onPress={handleAddAssignee}
                  style={{ paddingHorizontal: 20, minWidth: 80 }}
                />
              </View>
            </View>

            {/* Dates Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Schedule</Text>
              </View>

              <Text style={styles.label}>Start Date (optional)</Text>
              <TouchableOpacity
                onPress={() => setShowStartCalendar(true)}
                style={styles.dateButton}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    {
                      color: startDate
                        ? theme.colors.textPrimary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {startDate ? formatDate(startDate) : "Select start date"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={MODULE_COLOR}
                />
              </TouchableOpacity>

              <Text style={[styles.label, { marginTop: 16 }]}>Due Date *</Text>
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={styles.dateButton}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    {
                      color: dueDate
                        ? theme.colors.textPrimary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {dueDate ? formatDate(dueDate) : "Select due date"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={MODULE_COLOR}
                />
              </TouchableOpacity>
            </View>

            <Button
              text={loading ? "Saving..." : "Create Task"}
              onPress={handleAddTask}
              style={styles.submitButton}
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

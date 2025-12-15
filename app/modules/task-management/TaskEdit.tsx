import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import {
  MODULE_COLOR,
  DatePickerModal,
  formatDateGB,
} from "./TS FILE/TaskSharedUI";
import { createTaskFormStyles } from "./styles/taskFormStyles";

export default function TaskEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, toggleTheme }: any = useTheme();

  const db = getFirestore();
  const isDark = theme.isDark;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [taskName, setTaskName] = useState("");
  const [details, setDetails] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);

  const [assignedInput, setAssignedInput] = useState("");
  const [assignedList, setAssignedList] = useState<string[]>([]);

  const [showCalendar, setShowCalendar] = useState(false);
  const [showStartCalendar, setShowStartCalendar] = useState(false);

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

  /* -------------------- HANDLE MISSING ID SAFELY -------------------- */
  useEffect(() => {
    if (id) return;
    Alert.alert("Error", "No task selected");
    router.back();
  }, [id, router]);

  /* -------------------------- LOAD TASK -------------------------- */
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const refDoc = doc(db, "Tasks", id);
        const snap = await getDoc(refDoc);

        if (!snap.exists()) {
          Alert.alert("Error", "Task not found");
          router.back();
          return;
        }

        const data: any = snap.data();

        setTaskName(data.taskName || "");
        setDetails(data.details || "");

        if (data.assignedTo) {
          const assigned = Array.isArray(data.assignedTo)
            ? data.assignedTo
            : typeof data.assignedTo === "string"
            ? [data.assignedTo]
            : [];
          setAssignedList(assigned);
        }

        if (data.startDate) {
          setStartDate(new Date(data.startDate));
        }

        if (data.dueDate) {
          setDueDate(new Date(data.dueDate));
        }
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load task");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, db, router]);

  /* --------------------------- HANDLERS --------------------------- */
  const handleAddAssignee = useCallback(() => {
    const trimmed = assignedInput.trim();
    if (!trimmed) return;

    if (!gmailPattern.test(trimmed)) {
      Alert.alert("Validation", "Please enter a valid Gmail address");
      return;
    }

    const exists = assignedList.some(
      (email) => email.toLowerCase() === trimmed.toLowerCase()
    );
    if (exists) {
      Alert.alert("Info", "This Gmail is already added");
      return;
    }

    setAssignedList((prev) => [...prev, trimmed]);
    setAssignedInput("");
  }, [assignedInput, assignedList, gmailPattern]);

  const handleRemoveAssignee = useCallback((index: number) => {
    setAssignedList((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSaveTask = useCallback(async () => {
    if (!id) return;

    if (!taskName.trim()) {
      Alert.alert("Validation", "Task name is required");
      return;
    }
    if (!dueDate) {
      Alert.alert("Validation", "Please select a due date");
      return;
    }
    if (assignedList.length === 0) {
      Alert.alert("Validation", "Please add at least one user's Gmail");
      return;
    }

    if (startDate && dueDate && startDate.getTime() > dueDate.getTime()) {
      Alert.alert("Validation", "Start date cannot be after due date");
      return;
    }

    try {
      setSaving(true);
      const refDoc = doc(db, "Tasks", id);

      await updateDoc(refDoc, {
        taskName: taskName.trim(),
        details: details.trim(),
        assignedTo: assignedList,
        startDate: startDate ? startDate.getTime() : null,
        dueDate: dueDate.getTime(),
        updatedAt: Date.now(),
      });

      Alert.alert("Success", "Task updated successfully!");
      router.back();
    } catch (err: any) {
      console.error(err);
      Alert.alert("Error", err?.message || "Failed to update task");
    } finally {
      setSaving(false);
    }
  }, [id, db, taskName, details, dueDate, startDate, assignedList, router]);

  /* ------------------------- LOADING UI -------------------------- */
  if (loading) {
    return (
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
              Edit Task
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
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <ActivityIndicator size="large" color={MODULE_COLOR} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  /* --------------------------- MAIN UI --------------------------- */
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
              Edit Task
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
              text={saving ? "Saving..." : "Save Task"}
              status="primary"
              onPress={handleSaveTask}
              style={styles.submitButton}
              disabled={saving}
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

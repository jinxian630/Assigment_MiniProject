// src/screens/Task/EventEdit.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Modal,
  Alert,
  Image,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Text, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { Calendar } from "react-native-calendars";
import * as ImagePicker from "expo-image-picker";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { SafeAreaView } from "react-native-safe-area-context";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

const MODULE_COLOR = "#38BDF8";

export default function EventEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, toggleTheme }: any = useTheme();
  const db = getFirestore();
  const storage = getStorage();

  const isDarkmode = theme.isDark;

  if (!id) {
    Alert.alert("Error", "No event selected");
    router.back();
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"Online" | "Physical">("Physical");
  const [location, setLocation] = useState("");

  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");

  const [attachments, setAttachments] = useState<string[]>([]);

  const [date, setDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);
  const [calendarCurrent, setCalendarCurrent] = useState<string>("");

  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  /* ----------------------- STYLES (THEMED) ----------------------- */
  const styles = useMemo(
    () => ({
      container: { flex: 1 },
      headerRow: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 6,
      },
      headerTitle: {
        fontSize: 20,
        fontWeight: "700" as const,
        color: theme.colors.textPrimary,
      },
      headerRight: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
      },
      contentScroll: {
        flex: 1,
      },
      contentScrollContainer: {
        padding: 20,
        paddingBottom: 40,
      },
      label: {
        marginTop: 10,
        marginBottom: 4,
        fontSize: 13,
        color: theme.colors.textSecondary,
      },
      input: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
        backgroundColor: theme.colors.card,
        color: theme.colors.textPrimary,
        shadowColor: MODULE_COLOR,
        shadowOpacity: theme.isDark ? 0.4 : 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },
      textarea: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 8,
        minHeight: 80,
        textAlignVertical: "top" as const,
        backgroundColor: theme.colors.card,
        color: theme.colors.textPrimary,
        shadowColor: MODULE_COLOR,
        shadowOpacity: theme.isDark ? 0.4 : 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },
      dateButton: {
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        marginTop: 2,
        marginBottom: 8,
        backgroundColor: theme.colors.card,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        shadowColor: MODULE_COLOR,
        shadowOpacity: theme.isDark ? 0.4 : 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },
      modeRow: {
        flexDirection: "row" as const,
        marginBottom: 12,
        columnGap: 8,
      },
      modeChip: (active: boolean) => ({
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: active ? MODULE_COLOR : theme.colors.border,
        backgroundColor: active
          ? isDarkmode
            ? "#0f172a"
            : "#DBEAFE"
          : "transparent",
        alignItems: "center" as const,
        shadowColor: MODULE_COLOR,
        shadowOpacity: theme.isDark ? 0.4 : 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      }),
      modeChipText: (active: boolean) => ({
        fontSize: 13,
        fontWeight: active ? "600" : "400",
        color: active ? theme.colors.textPrimary : theme.colors.textSecondary,
      }),
      guestChip: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: isDarkmode ? "#0f172a" : "#E5F3FF",
        borderWidth: 1,
        borderColor: isDarkmode ? "#1f2937" : "#BFDBFE",
        marginRight: 6,
        marginBottom: 6,
      },
      guestChipText: {
        fontSize: 11,
        color: theme.colors.textPrimary,
      },
      guestRow: {
        flexDirection: "row" as const,
        marginBottom: 20,
        columnGap: 8,
        alignItems: "center" as const,
      },
      guestInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        backgroundColor: theme.colors.card,
        color: theme.colors.textPrimary,
        shadowColor: MODULE_COLOR,
        shadowOpacity: theme.isDark ? 0.4 : 0.25,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },
      attachPreviewWrapper: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        marginBottom: 20,
      },
      attachThumbWrapper: {
        marginRight: 8,
        marginBottom: 8,
        position: "relative" as const,
      },
      attachThumb: {
        width: 70,
        height: 70,
        borderRadius: 10,
      },
      attachRemoveBtn: {
        position: "absolute" as const,
        top: -6,
        right: -6,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: 999,
        padding: 3,
      },
      centerLoading: {
        flex: 1,
        justifyContent: "center" as const,
        alignItems: "center" as const,
      },
      modalOuter: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.5)",
        justifyContent: "center" as const,
        alignItems: "center" as const,
        paddingHorizontal: 16,
      },
      modalCard: {
        width: "100%",
        maxWidth: 420,
        borderRadius: 20,
        padding: 16,
        backgroundColor: theme.colors.card,
        borderWidth: 1,
        borderColor: isDarkmode ? "#1f2937" : "#d1d5db",
        shadowColor: MODULE_COLOR,
        shadowOpacity: isDarkmode ? 0.55 : 0.35,
        shadowRadius: 26,
        shadowOffset: { width: 0, height: 10 },
        elevation: 16,
      },
      calendarTitle: {
        fontSize: 16,
        fontWeight: "600" as const,
        marginBottom: 8,
        textAlign: "center" as const,
        color: theme.colors.textPrimary,
      },
    }),
    [theme]
  );

  /* ---------------------- PERMISSIONS (MEDIA) --------------------- */
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission required",
            "Media library access is needed to add attachments."
          );
        }
      }
    })();
  }, []);

  /* ------------------------- LOAD EVENT --------------------------- */
  useEffect(() => {
    const load = async () => {
      try {
        const refDoc = doc(db, "Events", id);
        const snap = await getDoc(refDoc);
        if (!snap.exists()) {
          Alert.alert("Error", "Event not found");
          router.back();
          return;
        }

        const data: any = snap.data();

        setTitle(data.title || "");
        setDescription(data.description || "");
        setMode(data.mode === "Online" ? "Online" : "Physical");
        setLocation(data.location || "");

        if (Array.isArray(data.guests)) {
          setGuests(data.guests);
        } else if (typeof data.guests === "string" && data.guests.trim()) {
          setGuests(
            data.guests
              .split(/[;,]/)
              .map((g: string) => g.trim())
              .filter((g: string) => g.length > 0)
          );
        } else {
          setGuests([]);
        }

        if (Array.isArray(data.attachments)) {
          setAttachments(data.attachments);
        } else {
          setAttachments([]);
        }

        const eventDate = data.date ? new Date(data.date) : new Date();
        setDate(eventDate);
        setCalendarCurrent(
          `${eventDate.getFullYear()}-${pad2(eventDate.getMonth() + 1)}-${pad2(
            eventDate.getDate()
          )}`
        );
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load event");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /* ------------------------- HANDLERS ----------------------------- */

  const handleSelectDate = (day: any) => {
    const d = new Date(day.dateString);
    setDate(d);
    setCalendarCurrent(day.dateString);
    setShowDateModal(false);
  };

  const handleAddGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;

    if (guests.includes(trimmed)) {
      Alert.alert("Info", "This guest is already added");
      return;
    }

    setGuests((prev) => [...prev, trimmed]);
    setGuestInput("");
  };

  const handleRemoveGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  };

  // Add / upload attachments
  const handleAddAttachment = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) return;

      setUploading(true);
      const newUrls: string[] = [];

      for (const asset of result.assets) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();

        const idStr = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const storageRef = ref(storage, `EventAttachments/${idStr}`);
        const snap = await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(snap.ref);
        newUrls.push(url);
      }

      setAttachments((prev) => [...prev, ...newUrls]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to add attachment");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Title is required");
      return;
    }
    if (!date) {
      Alert.alert("Validation", "Please choose a date");
      return;
    }

    try {
      setSaving(true);
      const refDoc = doc(db, "Events", id);
      await updateDoc(refDoc, {
        title: title.trim(),
        description: description.trim(),
        mode,
        location: location.trim(),
        guests,
        attachments,
        date: date.getTime(),
        updatedAt: new Date().getTime(),
      });

      router.push("/modules/task-management/EventList");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------- LOADING UI --------------------------- */
  if (loading) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.container} edges={["top"]}>
          <View style={styles.headerRow}>
            <IconButton
              icon="arrow-back"
              onPress={() => router.back()}
              variant="secondary"
              size="medium"
            />
            <Text style={styles.headerTitle}>Edit Event</Text>
            <View style={styles.headerRight}>
              <IconButton
                icon={isDarkmode ? "moon" : "sunny"}
                onPress={() => toggleTheme && toggleTheme()}
                variant="secondary"
                size="small"
              />
            </View>
          </View>

          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color={MODULE_COLOR} />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  /* --------------------------- MAIN UI ---------------------------- */
  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />
          <Text style={styles.headerTitle}>Edit Event</Text>
          <View style={styles.headerRight}>
            <IconButton
              icon={isDarkmode ? "moon" : "sunny"}
              onPress={() => toggleTheme && toggleTheme()}
              variant="secondary"
              size="small"
            />
          </View>
        </View>

        {/* CONTENT */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentScrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text style={styles.label}>Title</Text>
          <RNTextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Event title"
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
          />

          {/* Date */}
          <Text style={styles.label}>Date</Text>
          <TouchableOpacity
            onPress={() => setShowDateModal(true)}
            style={styles.dateButton}
          >
            <Text
              style={{
                fontSize: 13,
                color: date
                  ? theme.colors.textPrimary
                  : theme.colors.textSecondary,
              }}
            >
              {date ? formatDate(date) : "Select date"}
            </Text>
            <Ionicons name="calendar-outline" size={18} color={MODULE_COLOR} />
          </TouchableOpacity>

          {/* Mode */}
          <Text style={styles.label}>Mode</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setMode("Physical")}
              style={styles.modeChip(mode === "Physical")}
            >
              <Text style={styles.modeChipText(mode === "Physical")}>
                Physical
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setMode("Online")}
              style={styles.modeChip(mode === "Online")}
            >
              <Text style={styles.modeChipText(mode === "Online")}>Online</Text>
            </TouchableOpacity>
          </View>

          {/* Location / Link */}
          <Text style={styles.label}>
            {mode === "Online" ? "Online Link" : "Location"}
          </Text>
          <RNTextInput
            value={location}
            onChangeText={setLocation}
            placeholder={mode === "Online" ? "https://..." : "Address"}
            placeholderTextColor={theme.colors.textSecondary}
            style={styles.input}
          />

          {/* Description */}
          <Text style={styles.label}>Details</Text>
          <RNTextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Event details"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            style={styles.textarea}
          />

          {/* Guests */}
          <Text style={styles.label}>Guests</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginBottom: 6,
            }}
          >
            {guests.map((g, index) => (
              <View key={`${g}-${index}`} style={styles.guestChip}>
                <Ionicons
                  name="person-circle-outline"
                  size={14}
                  color={MODULE_COLOR}
                  style={{ marginRight: 4 }}
                />
                <Text style={styles.guestChipText}>{g}</Text>
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
          <View style={styles.guestRow}>
            <RNTextInput
              value={guestInput}
              onChangeText={setGuestInput}
              placeholder="guest@example.com"
              placeholderTextColor={theme.colors.textSecondary}
              style={styles.guestInput}
            />
            <Button
              text="Add"
              onPress={handleAddGuest}
              style={{ alignSelf: "center" }}
            />
          </View>

          {/* Attachments */}
          <Text style={styles.label}>Attachments</Text>
          <Button
            text={uploading ? "Uploading..." : "Add Attachment"}
            onPress={handleAddAttachment}
            disabled={uploading || saving}
            style={{ marginBottom: 10 }}
          />

          <View style={styles.attachPreviewWrapper}>
            {attachments.map((uri, index) => (
              <View key={index} style={styles.attachThumbWrapper}>
                <Image source={{ uri }} style={styles.attachThumb} />
                <TouchableOpacity
                  onPress={() => handleRemoveAttachment(index)}
                  style={styles.attachRemoveBtn}
                >
                  <Ionicons name="close" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Save button */}
          <Button
            text={saving ? "Saving..." : "Save Event"}
            onPress={handleSave}
            disabled={saving || uploading}
          />
        </ScrollView>

        {/* DATE PICKER MODAL */}
        <Modal
          visible={showDateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDateModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.modalOuter}
            onPressOut={() => setShowDateModal(false)}
          >
            <View style={styles.modalCard}>
              <Text style={styles.calendarTitle}>Select Event Date</Text>
              <Calendar
                current={calendarCurrent || undefined}
                onDayPress={handleSelectDate}
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
                  arrowColor: MODULE_COLOR,
                }}
              />
              <Button
                text="Close"
                onPress={() => setShowDateModal(false)}
                style={{ marginTop: 10 }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

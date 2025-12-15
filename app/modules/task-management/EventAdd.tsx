import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
  Text,
} from "react-native";
import { useRouter } from "expo-router";
import { TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { getAuth } from "firebase/auth";
import { addDoc, collection, getFirestore } from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

import { SafeAreaView } from "react-native-safe-area-context";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";
import {
  ensureMediaPermission,
  isValidGmail,
  addUniqueEmail,
  removeAtIndex,
  pickImagesFromLibrary,
  uploadUrisToFirebaseStorage,
} from "../task-management/TS FILE/taskSharedForm";

import {
  MODULE_COLOR,
  DatePickerModal,
  formatDateGB,
} from "../task-management/TS FILE/TaskSharedUI";
import { createTaskFormStyles } from "./styles/taskFormStyles";

type ModeType = "physical" | "online";

export default function AddEventScreen() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const isDark = theme.isDark;

  const [title, setTitle] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guestList, setGuestList] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState<ModeType>("physical");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const styles = useMemo(
    () => createTaskFormStyles(theme, MODULE_COLOR),
    [theme, MODULE_COLOR]
  );

  const customStyles = useMemo(
    () => ({
      thumbsWrap: {
        marginTop: 12,
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
      },
      thumb: {
        width: 90,
        height: 90,
        borderRadius: 12,
        marginRight: 12,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: theme.colors.border,
      },
      modeButton: {
        flex: 1,
        marginHorizontal: 6,
      },
    }),
    [theme]
  );

  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") alert("Media library permission is required!");
    })();
  }, []);

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

  const pickAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newFiles = result.assets.map((x) => x.uri);
      setAttachments((prev) => [...prev, ...newFiles]);
    }
  };

  const uploadAttachments = async (uris: string[]) => {
    const storage = getStorage();
    const uploadedURLs: string[] = [];

    for (const fileUri of uris) {
      const response = await fetch(fileUri);
      const blob = await response.blob();

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const storageRef = ref(storage, `EventAttachments/${id}`);

      const snap = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snap.ref);
      uploadedURLs.push(url);
    }

    return uploadedURLs;
  };

  const handleAddEvent = async () => {
    if (!title.trim()) return alert("Event title is required");
    if (!dueDate) return alert("Please select a date");

    const auth = getAuth();
    const db = getFirestore();

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    const createdAt = Date.now();

    try {
      const uploadedURLs = await uploadAttachments(attachments);

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
      alert("Error: " + (e?.message || "Unknown error"));
    }
  };

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

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Event Information Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Event Information</Text>
              </View>

              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Meeting, Birthday, Workshop..."
                containerStyle={styles.inputContainer}
                style={{ fontSize: 14 }}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>
                Description (optional)
              </Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="Add event details and notes..."
                multiline
                numberOfLines={4}
                containerStyle={styles.inputContainer}
                style={{ fontSize: 14, minHeight: 80 }}
              />
            </View>

            {/* Location & Mode Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Location & Type</Text>
              </View>

              <Text style={styles.label}>Location *</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Physical address or online meeting link..."
                containerStyle={styles.inputContainer}
                style={{ fontSize: 14 }}
              />

              <Text style={[styles.label, { marginTop: 16 }]}>Event Type</Text>
              <View
                style={{
                  flexDirection: "row",
                  marginTop: 8,
                  justifyContent: "space-between",
                }}
              >
                <TouchableOpacity
                  onPress={() => setMode("physical")}
                  style={[
                    customStyles.modeButton,
                    {
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor:
                        mode === "physical"
                          ? MODULE_COLOR
                          : theme.colors.border,
                      backgroundColor:
                        mode === "physical"
                          ? theme.isDark
                            ? "rgba(56, 189, 248, 0.1)"
                            : "rgba(56, 189, 248, 0.05)"
                          : theme.colors.card,
                      alignItems: "center",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="location"
                    size={20}
                    color={
                      mode === "physical"
                        ? MODULE_COLOR
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        mode === "physical"
                          ? MODULE_COLOR
                          : theme.colors.textSecondary,
                    }}
                  >
                    Physical
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMode("online")}
                  style={[
                    customStyles.modeButton,
                    {
                      padding: 14,
                      borderRadius: 12,
                      borderWidth: 2,
                      borderColor:
                        mode === "online" ? MODULE_COLOR : theme.colors.border,
                      backgroundColor:
                        mode === "online"
                          ? theme.isDark
                            ? "rgba(56, 189, 248, 0.1)"
                            : "rgba(56, 189, 248, 0.05)"
                          : theme.colors.card,
                      alignItems: "center",
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="videocam"
                    size={20}
                    color={
                      mode === "online"
                        ? MODULE_COLOR
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={{
                      marginTop: 6,
                      fontSize: 14,
                      fontWeight: "600",
                      color:
                        mode === "online"
                          ? MODULE_COLOR
                          : theme.colors.textSecondary,
                    }}
                  >
                    Online
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Guests Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Guests</Text>
              </View>

              {guestList.length > 0 && (
                <View style={styles.chipContainer}>
                  {guestList.map((guest, index) => (
                    <View key={`${guest}-${index}`} style={styles.chip}>
                      <Ionicons
                        name="person-circle-outline"
                        size={16}
                        color={MODULE_COLOR}
                      />
                      <Text style={styles.chipText}>{guest}</Text>
                      <TouchableOpacity
                        onPress={() => handleRemoveGuest(index)}
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
                    value={guestInput}
                    onChangeText={setGuestInput}
                    placeholder="Enter guest's Gmail address..."
                    containerStyle={styles.inputContainer}
                    style={{ fontSize: 14 }}
                  />
                </View>
                <Button
                  text="Add"
                  status="info"
                  onPress={handleAddGuest}
                  style={{ paddingHorizontal: 20, minWidth: 80 }}
                />
              </View>
            </View>

            {/* Date & Attachments Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={MODULE_COLOR}
                  style={styles.sectionIcon}
                />
                <Text style={styles.sectionTitle}>Schedule & Media</Text>
              </View>

              <Text style={styles.label}>Event Date *</Text>
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
                  {dueDate ? formatDateGB(dueDate) : "Select event date"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={MODULE_COLOR}
                />
              </TouchableOpacity>

              <DatePickerModal
                visible={showCalendar}
                onClose={() => setShowCalendar(false)}
                selectedDate={dueDate}
                onSelectDate={setDueDate}
                theme={theme}
                title="Select Event Date"
              />

              <Text style={[styles.label, { marginTop: 16 }]}>
                Attachments (optional)
              </Text>
              <Button
                text="Add Images"
                status="info"
                onPress={pickAttachment}
                style={{ marginTop: 8 }}
              />

              {attachments.length > 0 && (
                <View style={customStyles.thumbsWrap}>
                  {attachments.map((uri, index) => (
                    <Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      style={customStyles.thumb}
                    />
                  ))}
                </View>
              )}
            </View>

            <Button
              text="Create Event"
              status="primary"
              onPress={handleAddEvent}
              style={styles.submitButton}
            />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

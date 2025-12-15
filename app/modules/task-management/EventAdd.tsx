import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Text, TextInput, Button } from "react-native-rapi-ui";
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

  const styles = useMemo(() => {
    const inputShadow = {
      borderRadius: 10,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: MODULE_COLOR,
      shadowOpacity: isDark ? 0.55 : 0.2,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    };

    return {
      label: { fontSize: 13, color: theme.colors.textSecondary },

      inputShadow,

      dateBox: {
        padding: 12,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 10,
        marginTop: 2,
        backgroundColor: theme.colors.card,
        flexDirection: "row" as const,
        alignItems: "center" as const,
        justifyContent: "space-between" as const,
        shadowColor: MODULE_COLOR,
        shadowOpacity: isDark ? 0.55 : 0.35,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 10,
      },

      chipRow: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        marginTop: 4,
      },

      chip: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: isDark ? "#0f172a" : "#E5F3FF",
        borderWidth: 1,
        borderColor: isDark ? "#1f2937" : "#BFDBFE",
        marginRight: 8,
        marginBottom: 8,
      },

      chipText: { fontSize: 11, color: theme.colors.textColor },

      thumbsWrap: {
        marginTop: 10,
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
      },

      thumb: {
        width: 80,
        height: 80,
        borderRadius: 10,
        marginRight: 10,
        marginBottom: 10,
      },
    };
  }, [isDark, theme]);

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
            {/* IMPORTANT: no style arrays on rapi-ui Text (web crash fix) */}
            <Text style={{ ...styles.label, marginBottom: 4 }}>
              Event Title
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Meeting, Birthday, Workshop..."
              containerStyle={styles.inputShadow}
            />

            <Text style={{ ...styles.label, marginTop: 18, marginBottom: 4 }}>
              Guests (Gmail)
            </Text>

            <View style={styles.chipRow}>
              {guestList.map((guest, index) => (
                <View key={`${guest}-${index}`} style={styles.chip}>
                  <Ionicons
                    name="person-circle-outline"
                    size={14}
                    color={MODULE_COLOR}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={styles.chipText}>{guest}</Text>
                  <TouchableOpacity
                    onPress={() => handleRemoveGuest(index)}
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
                  value={guestInput}
                  onChangeText={setGuestInput}
                  placeholder="guest@example.com"
                  containerStyle={styles.inputShadow}
                />
              </View>
              <Button
                text="Add"
                status="info"
                onPress={handleAddGuest}
                style={{ alignSelf: "stretch", paddingHorizontal: 8 }}
              />
            </View>

            <Text style={{ ...styles.label, marginTop: 18, marginBottom: 4 }}>
              Location
            </Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="Location / Online link"
              containerStyle={styles.inputShadow}
            />

            <Text style={{ ...styles.label, marginTop: 18, marginBottom: 4 }}>
              Mode
            </Text>
            <View style={{ flexDirection: "row", marginVertical: 10 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Button
                  text="Physical"
                  status={mode === "physical" ? "primary" : "info"}
                  onPress={() => setMode("physical")}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  text="Online"
                  status={mode === "online" ? "primary" : "info"}
                  onPress={() => setMode("online")}
                />
              </View>
            </View>

            <Text style={{ ...styles.label, marginTop: 4, marginBottom: 4 }}>
              Description
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Event details..."
              multiline
              numberOfLines={3}
              containerStyle={styles.inputShadow}
            />

            <Text style={{ ...styles.label, marginTop: 18, marginBottom: 4 }}>
              Date
            </Text>
            <TouchableOpacity
              onPress={() => setShowCalendar(true)}
              style={styles.dateBox}
            >
              <Text
                style={{
                  color: dueDate
                    ? theme.colors.textPrimary
                    : theme.colors.textSecondary,
                  fontSize: 13,
                }}
              >
                {dueDate ? formatDateGB(dueDate) : "Select date"}
              </Text>
              <Ionicons
                name="calendar-outline"
                size={18}
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

            <Text style={{ ...styles.label, marginTop: 22, marginBottom: 6 }}>
              Attachments (optional)
            </Text>
            <Button text="Add Attachment" onPress={pickAttachment} />

            <View style={styles.thumbsWrap}>
              {attachments.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={styles.thumb}
                />
              ))}
            </View>

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

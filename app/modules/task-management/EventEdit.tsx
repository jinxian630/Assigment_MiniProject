import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Image,
  KeyboardAvoidingView,
  Text,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { TextInput, Button } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
import {
  isValidGmail,
  addUniqueEmail,
  pickImagesFromLibrary,
  uploadUrisToFirebaseStorage,
} from "./TS FILE/taskSharedForm";

type ModeType = "physical" | "online";

export default function EventEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { theme, toggleTheme }: any = useTheme();

  const db = getFirestore();
  const isDark = theme.isDark;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<ModeType>("physical");
  const [location, setLocation] = useState("");

  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");

  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachmentUris, setNewAttachmentUris] = useState<string[]>([]);

  const [date, setDate] = useState<Date | null>(null);
  const [showDateModal, setShowDateModal] = useState(false);

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
      thumbWrapper: {
        position: "relative" as const,
      },
      thumbRemove: {
        position: "absolute" as const,
        top: -6,
        right: -6,
        backgroundColor: "rgba(0,0,0,0.8)",
        borderRadius: 999,
        padding: 4,
      },
      modeButton: {
        flex: 1,
        marginHorizontal: 6,
      },
    }),
    [theme]
  );

  /* -------------------- HANDLE MISSING ID SAFELY -------------------- */
  useEffect(() => {
    if (id) return;
    Alert.alert("Error", "No event selected");
    router.back();
  }, [id, router]);

  /* ---------------------- MEDIA PERMISSIONS ---------------------- */
  useEffect(() => {
    (async () => {
      if (Platform.OS === "web") return;

      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Media library access is needed to add attachments."
        );
      }
    })();
  }, []);

  /* -------------------------- LOAD EVENT -------------------------- */
  useEffect(() => {
    if (!id) return;

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
        setMode(data.mode?.toLowerCase() === "online" ? "online" : "physical");
        setLocation(data.location || "");

        if (Array.isArray(data.guests)) {
          setGuests(data.guests);
        } else if (typeof data.guests === "string" && data.guests.trim()) {
          setGuests(
            data.guests
              .split(/[;,]/)
              .map((g: string) => g.trim())
              .filter(Boolean)
          );
        } else {
          setGuests([]);
        }

        setAttachments(Array.isArray(data.attachments) ? data.attachments : []);

        const eventDate = data.date ? new Date(data.date) : new Date();
        setDate(eventDate);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load event");
        router.back();
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, db, router]);

  /* --------------------------- HANDLERS --------------------------- */
  const handleAddGuest = useCallback(() => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;

    if (!isValidGmail(trimmed)) {
      Alert.alert("Validation", "Please enter a valid Gmail address");
      return;
    }

    const updated = addUniqueEmail(guests, trimmed);
    if (updated === guests) {
      Alert.alert("Info", "This guest is already added");
      return;
    }

    setGuests(updated);
    setGuestInput("");
  }, [guestInput, guests]);

  const handleRemoveGuest = useCallback((index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handlePickAttachment = useCallback(async () => {
    const uris = await pickImagesFromLibrary();
    if (uris.length > 0) {
      setNewAttachmentUris((prev) => [...prev, ...uris]);
    }
  }, []);

  const handleRemoveNewAttachment = useCallback((index: number) => {
    setNewAttachmentUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRemoveExistingAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSave = useCallback(async () => {
    if (!id) return;

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
      setUploading(true);

      // Upload new attachments
      const uploadedNewUrls =
        newAttachmentUris.length > 0
          ? await uploadUrisToFirebaseStorage({
              uris: newAttachmentUris,
              folder: "EventAttachments",
            })
          : [];

      // Combine existing and new attachments
      const allAttachments = [...attachments, ...uploadedNewUrls];

      const refDoc = doc(db, "Events", id);

      await updateDoc(refDoc, {
        title: title.trim(),
        description: description.trim(),
        mode: mode === "online" ? "Online" : "Physical",
        location: location.trim(),
        guests,
        attachments: allAttachments,
        date: date.getTime(),
        updatedAt: Date.now(),
      });

      Alert.alert("Success", "Event updated successfully!");
      router.back();
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message || "Failed to update event");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  }, [
    id,
    db,
    title,
    description,
    mode,
    location,
    guests,
    attachments,
    newAttachmentUris,
    date,
    router,
  ]);

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
              Edit Event
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
              Edit Event
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

              {guests.length > 0 && (
                <View style={styles.chipContainer}>
                  {guests.map((guest, index) => (
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
                onPress={() => setShowDateModal(true)}
                style={styles.dateButton}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.dateButtonText,
                    {
                      color: date
                        ? theme.colors.textPrimary
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {date ? formatDateGB(date) : "Select event date"}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={MODULE_COLOR}
                />
              </TouchableOpacity>

              <DatePickerModal
                visible={showDateModal}
                onClose={() => setShowDateModal(false)}
                selectedDate={date}
                onSelectDate={setDate}
                theme={theme}
                title="Select Event Date"
              />

              <Text style={[styles.label, { marginTop: 16 }]}>
                Attachments (optional)
              </Text>
              <Button
                text="Add Images"
                status="info"
                onPress={handlePickAttachment}
                disabled={uploading || saving}
                style={{ marginTop: 8 }}
              />

              {/* Existing attachments */}
              {attachments.length > 0 && (
                <View style={customStyles.thumbsWrap}>
                  {attachments.map((uri, index) => (
                    <View
                      key={`existing-${uri}-${index}`}
                      style={customStyles.thumbWrapper}
                    >
                      <Image source={{ uri }} style={customStyles.thumb} />
                      <TouchableOpacity
                        onPress={() => handleRemoveExistingAttachment(index)}
                        style={customStyles.thumbRemove}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {/* New attachments (preview before upload) */}
              {newAttachmentUris.length > 0 && (
                <View style={customStyles.thumbsWrap}>
                  {newAttachmentUris.map((uri, index) => (
                    <View
                      key={`new-${uri}-${index}`}
                      style={customStyles.thumbWrapper}
                    >
                      <Image source={{ uri }} style={customStyles.thumb} />
                      <TouchableOpacity
                        onPress={() => handleRemoveNewAttachment(index)}
                        style={customStyles.thumbRemove}
                      >
                        <Ionicons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Button
              text={saving ? "Saving..." : "Save Event"}
              status="primary"
              onPress={handleSave}
              disabled={saving || uploading}
              style={styles.submitButton}
            />
          </ScrollView>
        </SafeAreaView>
      </GradientBackground>
    </KeyboardAvoidingView>
  );
}

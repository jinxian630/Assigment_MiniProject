import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput as RNTextInput,
  Modal,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";

import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
  Button,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import { Calendar } from "react-native-calendars";

export default function EventEdit() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { isDarkmode, setTheme } = useTheme();
  const db = getFirestore();

  // extra safety if opened without params
  if (!id) {
    Alert.alert("Error", "No event selected");
    router.back();
    return null;
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"Online" | "Physical">("Physical");
  const [location, setLocation] = useState("");

  // 👇 NEW: multiple guests
  const [guests, setGuests] = useState<string[]>([]);
  const [guestInput, setGuestInput] = useState("");

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

  // Load event from Firestore
  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, "Events", id);
        const snap = await getDoc(ref);
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

        // 👇 guests: support both string and array from old data
        if (Array.isArray(data.guests)) {
          setGuests(data.guests);
        } else if (typeof data.guests === "string" && data.guests.trim()) {
          setGuests(
            data.guests
              .split(/[;,]/) // split by comma or semicolon
              .map((g: string) => g.trim())
              .filter((g: string) => g.length > 0)
          );
        } else {
          setGuests([]);
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

  const handleSelectDate = (day: any) => {
    const d = new Date(day.dateString);
    setDate(d);
    setCalendarCurrent(day.dateString);
    setShowDateModal(false);
  };

  // 👇 Add one guest from input
  const handleAddGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;

    // avoid duplicates (optional)
    if (guests.includes(trimmed)) {
      Alert.alert("Info", "This guest is already added");
      return;
    }

    setGuests((prev) => [...prev, trimmed]);
    setGuestInput("");
  };

  // 👇 Remove guest by index
  const handleRemoveGuest = (index: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== index));
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
      const ref = doc(db, "Events", id);
      await updateDoc(ref, {
        title: title.trim(),
        description: description.trim(),
        mode,
        location: location.trim(),
        guests, // 👈 save as array
        date: date.getTime(), // store as timestamp
        updatedAt: new Date().getTime(),
      });

      // after save, go back to EventList
      router.push("/modules/task-management/EventList");
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e.message || "Failed to update event");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <TopNav
          middleContent="Edit Event"
          leftContent={
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          leftAction={() => navigation.goBack()}
          rightContent={
            <Ionicons
              name={isDarkmode ? "sunny" : "moon"}
              size={20}
              color={isDarkmode ? themeColor.white100 : themeColor.dark}
            />
          }
          rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
        />
        <View style={{ flex: 1, justifyContent: "center" }}>
          <ActivityIndicator />
        </View>
      </Layout>
    );
  }

  return (
    <Layout>
      <TopNav
        middleContent="Edit Event"
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
        style={{ flex: 1, padding: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Text fontWeight="bold" style={{ marginBottom: 4 }}>
          Title
        </Text>
        <RNTextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginBottom: 12,
            backgroundColor: isDarkmode ? "#222" : "#fff",
            color: isDarkmode ? "#fff" : "#000",
          }}
        />

        {/* Date */}
        <Text fontWeight="bold" style={{ marginBottom: 4 }}>
          Date
        </Text>
        <TouchableOpacity
          onPress={() => setShowDateModal(true)}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 12,
            marginBottom: 12,
            backgroundColor: isDarkmode ? "#222" : "#fff",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text>{date ? formatDate(date) : "Select date"}</Text>
          <Ionicons name="calendar-outline" size={18} />
        </TouchableOpacity>

        {/* Mode */}
        <Text fontWeight="bold" style={{ marginBottom: 4 }}>
          Mode
        </Text>
        <View
          style={{
            flexDirection: "row",
            marginBottom: 12,
            gap: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => setMode("Physical")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: mode === "Physical" ? "#2563EB" : "#ccc",
              backgroundColor: mode === "Physical" ? "#dbeafe" : "transparent",
              alignItems: "center",
            }}
          >
            <Text>Physical</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setMode("Online")}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: mode === "Online" ? "#2563EB" : "#ccc",
              backgroundColor: mode === "Online" ? "#dbeafe" : "transparent",
              alignItems: "center",
            }}
          >
            <Text>Online</Text>
          </TouchableOpacity>
        </View>

        {/* Location / Link */}
        <Text fontWeight="bold" style={{ marginBottom: 4 }}>
          {mode === "Online" ? "Online Link" : "Location"}
        </Text>
        <RNTextInput
          value={location}
          onChangeText={setLocation}
          placeholder={mode === "Online" ? "https://..." : "Address"}
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginBottom: 12,
            backgroundColor: isDarkmode ? "#222" : "#fff",
            color: isDarkmode ? "#fff" : "#000",
          }}
        />

        {/* Description */}
        <Text fontWeight="bold" style={{ marginBottom: 4 }}>
          Details
        </Text>
        <RNTextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Event details"
          multiline
          style={{
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 8,
            marginBottom: 12,
            minHeight: 80,
            textAlignVertical: "top",
            backgroundColor: isDarkmode ? "#222" : "#fff",
            color: isDarkmode ? "#fff" : "#000",
          }}
        />

        {/* Guests – multiple */}
        <Text fontWeight="bold" style={{ marginBottom: 4 }}>
          Guests
        </Text>

        {/* chips */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            marginBottom: 6,
          }}
        >
          {guests.map((g, index) => (
            <View
              key={`${g}-${index}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#e5e7eb",
                marginRight: 6,
                marginBottom: 6,
              }}
            >
              <Text style={{ fontSize: 12 }}>{g}</Text>
              <TouchableOpacity
                onPress={() => handleRemoveGuest(index)}
                style={{ marginLeft: 6 }}
              >
                <Ionicons name="close" size={14} color="#555" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* add guest input */}
        <View style={{ flexDirection: "row", marginBottom: 20, gap: 8 }}>
          <RNTextInput
            value={guestInput}
            onChangeText={setGuestInput}
            placeholder="guest@example.com"
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              backgroundColor: isDarkmode ? "#222" : "#fff",
              color: isDarkmode ? "#fff" : "#000",
            }}
          />
          <Button
            text="Add"
            onPress={handleAddGuest}
            style={{ alignSelf: "center" }}
          />
        </View>

        <Button
          text={saving ? "Saving..." : "Save Event"}
          onPress={handleSave}
          disabled={saving}
        />
      </ScrollView>

      {/* Date picker modal */}
      <Modal
        visible={showDateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateModal(false)}
      >
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "center",
            alignItems: "center",
          }}
          activeOpacity={1}
          onPressOut={() => setShowDateModal(false)}
        >
          <View
            style={{
              width: "90%",
              backgroundColor: isDarkmode ? themeColor.dark : themeColor.white,
              borderRadius: 12,
              padding: 16,
            }}
          >
            <Calendar
              current={calendarCurrent || undefined}
              onDayPress={handleSelectDate}
            />
            <Button
              text="Close"
              onPress={() => setShowDateModal(false)}
              style={{ marginTop: 10 }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Layout>
  );
}

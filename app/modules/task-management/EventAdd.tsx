import React, { useState, useEffect } from "react";
import {
  View,
  KeyboardAvoidingView,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import {
  Layout,
  TopNav,
  Text,
  TextInput,
  Button,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";

import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import DropDownPicker from "react-native-dropdown-picker";
import * as ImagePicker from "expo-image-picker";

import { getAuth, User } from "firebase/auth";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function () {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();

  // Event fields
  const [title, setTitle] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guestList, setGuestList] = useState<string[]>([]);

  const gmailPattern = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

  const handleAddGuest = () => {
    const trimmed = guestInput.trim();
    if (!trimmed) return;
    if (!gmailPattern.test(trimmed)) {
      alert("Please enter a valid Gmail address");
      return;
    }
    if (guestList.includes(trimmed)) {
      alert("Guest already added");
      return;
    }
    setGuestList((prev) => [...prev, trimmed]);
    setGuestInput("");
  };

  const handleRemoveGuest = (index: number) => {
    setGuestList((prev) => prev.filter((_, i) => i !== index));
  };
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState("physical");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);

  // Calendar
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);

  // Year / Month
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const pad2 = (n: number) => (n < 10 ? `0${n}` : String(n));

  const years = Array.from({ length: 50 }, (_, i) => ({
    label: `${new Date().getFullYear() - i}`,
    value: new Date().getFullYear() - i,
  }));

  const months = [
    { label: "Jan", value: 1 },
    { label: "Feb", value: 2 },
    { label: "Mar", value: 3 },
    { label: "Apr", value: 4 },
    { label: "May", value: 5 },
    { label: "Jun", value: 6 },
    { label: "Jul", value: 7 },
    { label: "Aug", value: 8 },
    { label: "Sep", value: 9 },
    { label: "Oct", value: 10 },
    { label: "Nov", value: 11 },
    { label: "Dec", value: 12 },
  ];

  const [yearOpen, setYearOpen] = useState(false);
  const [monthOpen, setMonthOpen] = useState(false);

  const [calendarCurrent, setCalendarCurrent] = useState(
    `${year}-${pad2(month)}-01`
  );

  useEffect(() => {
    setCalendarCurrent(`${year}-${pad2(month)}-01`);
  }, [year, month]);

  // Image Picker
  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          alert("Media library permission is required!");
        }
      }
    })();
  }, []);

  const pickAttachment = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      const newFiles = result.assets.map((x) => x.uri);
      setAttachments([...attachments, ...newFiles]);
    }
  };

  const onDateSelect = (day: any) => {
    const selected = new Date(day.dateString);
    setDueDate(selected);
    setYear(selected.getFullYear());
    setMonth(selected.getMonth() + 1);
    setShowCalendar(false);
  };

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

  const handleAddEvent = async () => {
    if (!title.trim()) return alert("Event title is required");
    if (!dueDate) return alert("Please select a date");

    const auth = getAuth();
    const db = getFirestore();
    const storage = getStorage();

    const user = auth.currentUser;
    if (!user) return alert("Not logged in");

    const createdAt = Date.now();

    // Upload attachments
    const uploadedURLs: string[] = [];

    for (const file of attachments) {
      const response = await fetch(file);
      const blob = await response.blob();

      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const storageRef = ref(storage, `EventAttachments/${id}`);

      const snap = await uploadBytes(storageRef, blob);
      const url = await getDownloadURL(snap.ref);
      uploadedURLs.push(url);
    }

    try {
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
        },
      });

      alert("Event added successfully!");
      setGuestList([]);
      setGuestInput("");
      router.back();
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior="height" style={{ flex: 1 }}>
      <Layout>
        <TopNav
          middleContent="Add Event"
          leftContent={<Ionicons name="chevron-back" size={20} />}
          leftAction={() => router.back()}
          rightContent={
            <Ionicons name={isDarkmode ? "sunny" : "moon"} size={20} />
          }
          rightAction={() => setTheme(isDarkmode ? "light" : "dark")}
        />

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <Text>Event Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Meeting, Birthday, Workshop..."
            style={{ marginBottom: 20 }}
          />

          {/* Guests */}
          <Text>Guests (Gmail)</Text>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              marginTop: 10,
              gap: 8,
            }}
          >
            {guestList.map((guest, index) => (
              <View
                key={`${guest}-${index}`}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 999,
                  backgroundColor: "#e5e7eb",
                }}
              >
                <Text style={{ fontSize: 12 }}>{guest}</Text>
                <TouchableOpacity
                  onPress={() => handleRemoveGuest(index)}
                  style={{ marginLeft: 6 }}
                >
                  <Ionicons name="close" size={14} color="#555" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <TextInput
              value={guestInput}
              onChangeText={setGuestInput}
              placeholder="guest@example.com"
              style={{ flex: 1 }}
            />
            <Button
              text="Add"
              status="info"
              onPress={handleAddGuest}
              style={{ alignSelf: "center" }}
            />
          </View>

          {/* Location */}
          <Text>Location</Text>
          <TextInput
            value={location}
            onChangeText={setLocation}
            placeholder="Location / Online link"
            style={{ marginBottom: 20 }}
          />

          {/* Mode */}
          <Text>Mode</Text>
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginVertical: 10,
            }}
          >
            <Button
              text="Physical"
              status={mode === "physical" ? "primary" : "info"}
              onPress={() => setMode("physical")}
            />
            <Button
              text="Online"
              status={mode === "online" ? "primary" : "info"}
              onPress={() => setMode("online")}
            />
          </View>

          {/* Description */}
          <Text>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Event details..."
            multiline
            numberOfLines={3}
            style={{ marginBottom: 20 }}
          />

          {/* Date */}
          <Text>Date</Text>
          <TouchableOpacity
            onPress={() => setShowCalendar(true)}
            style={{
              padding: 12,
              borderWidth: 1,
              borderColor: "#ccc",
              borderRadius: 8,
              marginTop: 5,
              marginBottom: 20,
            }}
          >
            <Text>{dueDate ? formatDate(dueDate) : "Select date"}</Text>
          </TouchableOpacity>

          {/* Calendar Modal */}
          {showCalendar && (
            <Modal transparent animationType="fade">
              <TouchableOpacity
                activeOpacity={1}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.5)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
                onPress={() => setShowCalendar(false)}
              >
                <View
                  style={{
                    backgroundColor: isDarkmode
                      ? themeColor.dark
                      : themeColor.white,
                    padding: 20,
                    borderRadius: 10,
                    width: "90%",
                  }}
                >
                  {/* Year + Month Picker */}
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1, zIndex: 999 }}>
                      <DropDownPicker
                        open={yearOpen}
                        value={year}
                        items={years}
                        setOpen={setYearOpen}
                        setValue={setYear}
                        setItems={() => {}}
                      />
                    </View>

                    <View style={{ flex: 1, zIndex: 998 }}>
                      <DropDownPicker
                        open={monthOpen}
                        value={month}
                        items={months}
                        setOpen={setMonthOpen}
                        setValue={setMonth}
                        setItems={() => {}}
                      />
                    </View>
                  </View>

                  <Calendar
                    current={calendarCurrent}
                    hideArrows
                    onDayPress={onDateSelect}
                    markedDates={
                      dueDate
                        ? {
                            [dueDate.toISOString().split("T")[0]]: {
                              selected: true,
                              selectedColor: themeColor.primary,
                            },
                          }
                        : {}
                    }
                  />

                  <Button
                    text="Close"
                    style={{ marginTop: 15 }}
                    onPress={() => setShowCalendar(false)}
                  />
                </View>
              </TouchableOpacity>
            </Modal>
          )}

          {/* Attachments */}
          <Button text="Add Attachment" onPress={pickAttachment} />

          <View style={{ marginTop: 10 }}>
            {attachments.map((uri, index) => (
              <Image
                key={index}
                source={{ uri }}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 10,
                  marginVertical: 5,
                }}
              />
            ))}
          </View>

          {/* Submit */}
          <Button
            text="Create Event"
            status="primary"
            onPress={handleAddEvent}
            style={{ marginTop: 30 }}
          />
        </ScrollView>
      </Layout>
    </KeyboardAvoidingView>
  );
}

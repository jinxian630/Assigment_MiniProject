// app/modules/memory-book/MemoryPostCreate.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StyleSheet,
  TextInput as RNTextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import EmotionSelector, { MoodData } from "./EmotionSelector";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

const PRIMARY_PURPLE = "#a855f7";

export default function MemoryPostCreate() {
  const router = useRouter();
  const { theme, toggleTheme }: any = useTheme();
  const isDarkMode = theme === "dark";

  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [moodData, setMoodData] = useState<MoodData>({
    energy: 50,
    stress: 20,
    clarity: 50,
    warmth: 40,
    color: "#a78bfa",
  });

  // 🎨 FIXED THEME COLORS — CARDS STAY DARK ALWAYS
  const colors = {
    background: isDarkMode ? "#020617" : "#0b1020",
    surface: "#020617",
    text: isDarkMode ? "#e5e7eb" : "#f3f4f6",
    textSoft: isDarkMode ? "#9ca3af" : "#c7d2fe",
    borderSoft: "#1f2937",
    chipBg: "rgba(168,85,247,0.12)",
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const removeImage = () => setImage(null);

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert("Missing title", "Please enter a title for this memory.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing story", "Please write something about this memory.");
      return;
    }
    if (!image) {
      Alert.alert("No cover image", "Please choose a cover image.");
      return;
    }

    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Not logged in", "Please sign in again.");
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const storage = getStorage();

      // upload image
      const resp = await fetch(image);
      const blob = await resp.blob();

      // create unique id for Firestore image name
      const uniqueId =
        Date.now().toString(16) + Math.random().toString(16) + "0".repeat(16);
      const guid = [
        uniqueId.substring(0, 8),
        uniqueId.substring(8, 12),
        "4000-8" + uniqueId.substring(13, 16),
        uniqueId.substring(16, 28),
      ].join("-");

      const imageRef = ref(storage, `MemoryPosts/${guid}`);
      const snap = await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(snap.ref);

      const now = Date.now();

      await addDoc(collection(db, "MemoryPosts"), {
        userId: user.uid,
        title: title.trim(),
        description: description.trim(),
        imageURL: downloadURL,
        emotionSpectrum: {
          energy: moodData.energy,
          stress: moodData.stress,
          clarity: moodData.clarity,
          warmth: moodData.warmth,
        },
        emotionColor: moodData.color,
        startDate: now,
        updatedDate: now,
        likesCount: 0,
        commentsCount: 0,
        savesCount: 0,
        CreatedUser: {
          CreatedUserId: user.uid,
          CreatedUserName: user.displayName,
          CreatedUserPhoto: user.photoURL,
        },
      });

      setTitle("");
      setDescription("");
      setImage(null);
      setMoodData({
        energy: 50,
        stress: 20,
        clarity: 50,
        warmth: 40,
        color: "#a78bfa",
      });

      Alert.alert("Success", "Memory post created successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.log(err);
      Alert.alert("Error", err.message || "Failed to create memory.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              New Memory
            </Text>
          </View>
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
            <Ionicons
              name={isDarkMode ? "sunny-outline" : "moon-outline"}
              size={20}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={[styles.flex]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* INTRO */}
            <View style={styles.introRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.introTitle, { color: colors.text }]}>
                  Capture a moment
                </Text>
                <Text
                  style={[styles.introSubtitle, { color: colors.textSoft }]}
                >
                  Add a photo, give it a title, describe what happened, and how
                  you felt.
                </Text>
              </View>

              <View
                style={[styles.stepChip, { borderColor: colors.borderSoft }]}
              >
                <Text style={[styles.stepChipText, { color: colors.textSoft }]}>
                  STEP 1 OF 2
                </Text>
              </View>
            </View>

            {/* IMAGE CARD */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View
                  style={[styles.iconPill, { backgroundColor: colors.chipBg }]}
                >
                  <Ionicons
                    name="image-outline"
                    size={16}
                    color={PRIMARY_PURPLE}
                  />
                </View>

                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>
                    Cover image
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, { color: colors.textSoft }]}
                  >
                    This photo will appear in your timeline.
                  </Text>
                </View>
              </View>

              {image ? (
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: image }} style={styles.coverImage} />
                  <TouchableOpacity
                    onPress={removeImage}
                    style={styles.removeImageBtn}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickImage}
                  style={[
                    styles.imagePlaceholder,
                    { borderColor: colors.textSoft },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={32}
                    color={colors.textSoft}
                  />
                  <Text
                    style={[
                      styles.imagePlaceholderTitle,
                      { color: colors.text },
                    ]}
                  >
                    Tap to add cover image
                  </Text>
                  <Text
                    style={[
                      styles.imagePlaceholderSub,
                      { color: colors.textSoft },
                    ]}
                  >
                    JPG or PNG, up to 10MB
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* DETAILS CARD */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.borderSoft,
                },
              ]}
            >
              <View style={styles.detailsHeaderRow}>
                <View
                  style={[
                    styles.detailsChip,
                    { backgroundColor: colors.chipBg },
                  ]}
                >
                  <Text
                    style={[styles.detailsChipText, { color: colors.textSoft }]}
                  >
                    DETAILS
                  </Text>
                </View>

                <Text style={[styles.detailsHint, { color: colors.textSoft }]}>
                  Give this memory a name and tell the story behind it.
                </Text>
              </View>

              {/* Title */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Title
              </Text>
              <RNTextInput
                placeholder="eg. Picnic at KLCC park"
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.textInput,
                  {
                    borderColor: colors.borderSoft,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textSoft}
              />

              {/* Story */}
              <Text
                style={[
                  styles.fieldLabel,
                  { color: colors.text, marginTop: 14 },
                ]}
              >
                Story
              </Text>
              <Text style={[styles.fieldHelper, { color: colors.textSoft }]}>
                What happened? What made this moment special or important to
                you?
              </Text>
              <RNTextInput
                placeholder="Write your memory here..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                style={[
                  styles.textArea,
                  {
                    borderColor: colors.borderSoft,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* EMOTIONS */}
            <EmotionSelector moodData={moodData} setMoodData={setMoodData} />

            {/* PUBLISH BUTTON */}
            <TouchableOpacity
              onPress={handlePublish}
              disabled={loading}
              style={[
                styles.publishBtn,
                {
                  backgroundColor: PRIMARY_PURPLE,
                  opacity: loading ? 0.7 : 1,
                },
              ]}
            >
              <Text style={styles.publishText}>
                {loading ? "Publishing..." : "Publish memory"}
              </Text>
              {!loading && (
                <Ionicons
                  name="paper-plane"
                  size={18}
                  color="#ffffff"
                  style={{ marginLeft: 6 }}
                />
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  themeToggle: {
    width: 40,
    alignItems: "flex-end",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  introRow: {
    marginBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 13,
  },
  stepChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(15,23,42,0.85)",
  },
  stepChipText: {
    fontSize: 11,
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 18,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  iconPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  coverImage: {
    width: "100%",
    height: 220,
    borderRadius: 14,
  },
  removeImageBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(15,23,42,0.95)",
    padding: 6,
    borderRadius: 999,
  },
  imagePlaceholder: {
    borderStyle: "dashed",
    borderWidth: 1.4,
    borderRadius: 14,
    paddingVertical: 30,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  imagePlaceholderTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  imagePlaceholderSub: {
    marginTop: 4,
    fontSize: 11,
  },

  detailsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  detailsChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginRight: 8,
  },
  detailsChipText: {
    fontSize: 11,
  },
  detailsHint: {
    fontSize: 12,
    flex: 1,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  fieldHelper: {
    fontSize: 11,
    marginBottom: 6,
  },

  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 120,
  },

  publishBtn: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  publishText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});

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
import { testFirestoreConnection } from "./utils/testFirestore";

const PRIMARY_PURPLE = "#a855f7";

/** 🎨 Cyberpunk neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: accentColor + (isDark ? "66" : "CC"), // Stronger border in light mode
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.9 : 0.75, // Stronger shadow in light mode
    shadowRadius: isDark ? 30 : 25, // Larger glow in light mode
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 18 : 15, // Higher elevation in light mode
    ...extra,
  };
};

/** 🎨 Glow text styles - adapts to theme */
const getGlowText = (accentColor: string, isDark: boolean) => ({
  color: isDark ? "#E0F2FE" : "#6B21A8", // Dark purple for light mode
  textShadowColor: accentColor + (isDark ? "CC" : "88"), // Stronger glow in light mode
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: isDark ? 8 : 6, // Stronger glow radius in light mode
});

const getSoftText = (isDark: boolean) => ({
  color: isDark ? "#CBD5E1" : "#9333EA", // Dark glowing purple for light mode
});

export default function MemoryPostCreate() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);

  const [moodData, setMoodData] = useState<MoodData>({
    energy: 50,
    stress: 20,
    clarity: 50,
    warmth: 40,
    color: "#a78bfa",
  });

  // 🎨 Theme-aware colors - Professional dark glowing purple for light mode
  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF", // Soft lavender-tinted white
    surface: isDarkMode ? "#020617" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B", // Deep indigo for better contrast
    textSoft: isDarkMode ? "#9CA3AF" : "#9333EA", // Dark glowing purple for light mode
    borderSoft: isDarkMode ? "#1F2937" : "#7C3AED", // Dark purple border for light mode
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)", // Dark purple with glow for light mode
    inputBg: isDarkMode ? "#020617" : "#F8F7FF", // Very subtle purple tint
    inputBorder: isDarkMode ? "#1F2937" : "#C4B5FD", // Dark purple border for light mode
    stepChipBg: isDarkMode ? "rgba(15,23,42,0.85)" : "rgba(255,255,255,0.98)", // More opaque white in light mode
  };

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

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

      // Prepare the data object
      const memoryData = {
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
          CreatedUserName: user.displayName || "Unknown User",
          CreatedUserPhoto: user.photoURL || null,
        },
      };

      console.log("📝 Attempting to save memory to Firestore...");
      console.log("📦 Data:", JSON.stringify(memoryData, null, 2));
      console.log("👤 User ID:", user.uid);
      console.log("📚 Collection: MemoryPosts");

      // Add document to Firestore
      const docRef = await addDoc(collection(db, "MemoryPosts"), memoryData);

      console.log("✅ Success! Document created with ID:", docRef.id);
      console.log("🔗 Document path:", docRef.path);

      // Show visual success indicator immediately
      setCreatedDocId(docRef.id);
      setShowSuccess(true);
      setLoading(false);

      // Reset form
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

      // Show success alert after a brief delay
      setTimeout(() => {
        Alert.alert(
          "✅ Success!",
          `Memory post created successfully!\n\nDocument ID: ${docRef.id.substring(
            0,
            20
          )}...\n\nYour memory has been saved to Firestore.`,
          [
            {
              text: "View Timeline",
              onPress: () => {
                setShowSuccess(false);
                router.back();
              },
            },
            {
              text: "Create Another",
              style: "cancel",
              onPress: () => {
                setShowSuccess(false);
                setCreatedDocId(null);
              },
            },
          ],
          { cancelable: false }
        );
      }, 300);
    } catch (err: any) {
      console.error("❌ Error creating memory:", err);
      console.error("❌ Error code:", err.code);
      console.error("❌ Error message:", err.message);
      console.error("❌ Full error:", JSON.stringify(err, null, 2));

      // More detailed error messages
      let errorMessage = "Failed to create memory.";
      if (err.code === "permission-denied") {
        errorMessage = "Permission denied. Check Firestore security rules.";
      } else if (err.code === "unavailable") {
        errorMessage =
          "Firestore is unavailable. Check your internet connection.";
      } else if (err.message) {
        errorMessage = err.message;
      }

      Alert.alert(
        "Error",
        `${errorMessage}\n\nError Code: ${
          err.code || "Unknown"
        }\n\nCheck console for details.`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* SUCCESS OVERLAY */}
        {showSuccess && (
          <View
            style={[
              styles.successOverlay,
              {
                backgroundColor: isDarkMode
                  ? "rgba(15,23,42,0.95)"
                  : "rgba(255,255,255,0.95)",
              },
            ]}
          >
            <View
              style={[
                styles.successCard,
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  padding: 24,
                }),
                {
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <View
                style={[
                  styles.successIcon,
                  {
                    backgroundColor: PRIMARY_PURPLE + "20",
                    borderColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={64}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <Text style={[styles.successTitle, glowText]}>
                Memory Created!
              </Text>
              <Text style={[styles.successSubtitle, softText]}>
                Your memory has been saved successfully
              </Text>
              {createdDocId && (
                <Text style={[styles.successDocId, softText]}>
                  ID: {createdDocId.substring(0, 16)}...
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  setShowSuccess(false);
                  router.back();
                }}
                style={[
                  styles.successButton,
                  {
                    backgroundColor: PRIMARY_PURPLE,
                  },
                ]}
              >
                <Text style={styles.successButtonText}>View Timeline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* HEADER */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="ghost"
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, glowText]}>New Memory</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={testFirestoreConnection}
              style={{
                padding: 6,
                borderRadius: 6,
                backgroundColor: isDarkMode
                  ? "rgba(139,92,246,0.2)"
                  : "rgba(139,92,246,0.1)",
              }}
            >
              <Ionicons name="bug-outline" size={18} color={PRIMARY_PURPLE} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
              <Ionicons
                name={isDarkMode ? "sunny-outline" : "moon-outline"}
                size={20}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
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
                <Text style={[styles.introTitle, glowText]}>
                  Capture a moment
                </Text>
                <Text style={[styles.introSubtitle, softText]}>
                  Add a photo, give it a title, describe what happened, and how
                  you felt.
                </Text>
              </View>

              <View
                style={[
                  styles.stepChip,
                  {
                    borderColor: PRIMARY_PURPLE + (isDarkMode ? "66" : "AA"),
                    backgroundColor: colors.stepChipBg,
                    shadowColor: PRIMARY_PURPLE,
                    shadowOpacity: isDarkMode ? 0.3 : 0.4,
                    shadowRadius: isDarkMode ? 8 : 10,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: isDarkMode ? 4 : 6,
                  },
                ]}
              >
                <Text style={[styles.stepChipText, glowText]}>STEP 1 OF 2</Text>
              </View>
            </View>

            {/* IMAGE CARD */}
            <View
              style={[
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  padding: 16,
                  marginBottom: 18,
                }),
                {
                  backgroundColor: colors.surface,
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
                  <Text style={[styles.cardTitle, glowText]}>Cover image</Text>
                  <Text style={[styles.cardSubtitle, softText]}>
                    This photo will appear in your timeline.
                  </Text>
                </View>
              </View>

              {image ? (
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: image }} style={styles.coverImage} />
                  <TouchableOpacity
                    onPress={removeImage}
                    style={[
                      styles.removeImageBtn,
                      {
                        backgroundColor: isDarkMode
                          ? "rgba(15,23,42,0.95)"
                          : "rgba(124,58,237,0.95)",
                        shadowColor: "#7C3AED",
                        shadowOpacity: isDarkMode ? 0 : 0.5,
                        shadowRadius: 8,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: isDarkMode ? 0 : 6,
                      },
                    ]}
                  >
                    <Ionicons name="close" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickImage}
                  style={[
                    styles.imagePlaceholder,
                    {
                      borderColor: colors.inputBorder,
                      backgroundColor: isDarkMode ? "transparent" : "#F5F3FF",
                    },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={36}
                    color={isDarkMode ? colors.textSoft : "#9333EA"}
                  />
                  <Text style={[styles.imagePlaceholderTitle, glowText]}>
                    Tap to add cover image
                  </Text>
                  <Text style={[styles.imagePlaceholderSub, softText]}>
                    JPG or PNG, up to 10MB
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* DETAILS CARD */}
            <View
              style={[
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  padding: 16,
                  marginBottom: 18,
                }),
                {
                  backgroundColor: colors.surface,
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
                  <Text style={[styles.detailsChipText, glowText]}>
                    DETAILS
                  </Text>
                </View>

                <Text style={[styles.detailsHint, softText]}>
                  Give this memory a name and tell the story behind it.
                </Text>
              </View>

              {/* Title */}
              <Text style={[styles.fieldLabel, glowText]}>Title</Text>
              <RNTextInput
                placeholder="eg. Picnic at KLCC park"
                value={title}
                onChangeText={setTitle}
                style={[
                  styles.textInput,
                  {
                    borderColor: colors.inputBorder,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textSoft}
              />

              {/* Story */}
              <Text style={[styles.fieldLabel, glowText, { marginTop: 14 }]}>
                Story
              </Text>
              <Text style={[styles.fieldHelper, softText]}>
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
                    borderColor: colors.inputBorder,
                    backgroundColor: colors.inputBg,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textSoft}
              />
            </View>

            {/* EMOTIONS */}
            <EmotionSelector
              moodData={moodData}
              setMoodData={setMoodData}
              isDarkMode={isDarkMode}
            />

            {/* PUBLISH BUTTON */}
            <TouchableOpacity
              onPress={handlePublish}
              disabled={loading}
              style={[
                styles.publishBtn,
                createNeonCardShell(PRIMARY_PURPLE, isDarkMode, {
                  paddingVertical: 14,
                  opacity: loading ? 0.7 : 1,
                }),
                {
                  backgroundColor: PRIMARY_PURPLE,
                },
              ]}
            >
              <Text style={[styles.publishText, { color: "#ffffff" }]}>
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
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  introSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.85,
  },
  stepChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  stepChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  iconPill: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 3,
    opacity: 0.8,
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
    padding: 6,
    borderRadius: 999,
  },
  imagePlaceholder: {
    borderStyle: "dashed",
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 16,
  },
  detailsChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 10,
    borderWidth: 1,
  },
  detailsChipText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  detailsHint: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },

  fieldLabel: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  fieldHelper: {
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 18,
    opacity: 0.85,
  },

  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "400",
  },
  textArea: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    textAlignVertical: "top",
    minHeight: 120,
    fontWeight: "400",
    lineHeight: 20,
  },

  publishBtn: {
    marginTop: 8,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  publishText: {
    fontSize: 15,
    fontWeight: "600",
  },
  successOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  successCard: {
    alignItems: "center",
    maxWidth: 320,
    width: "100%",
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 4,
  },
  successDocId: {
    fontSize: 11,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  successButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    minWidth: 160,
  },
  successButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
});

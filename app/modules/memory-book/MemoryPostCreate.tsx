// app/modules/memory-book/MemoryPostCreate.tsx

import React, { useState, useRef } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";

import { addDoc, collection, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db, storage } from "@/config/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { extractStoragePathFromURL } from "./utils/storageHelpers";

import EmotionSelector, { MoodData } from "./EmotionSelector";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import InteractiveButton from "./components/InteractiveButton";
import { useTheme } from "@/hooks/useTheme";
import { testFirestoreConnection } from "./utils/testFirestore";
import BottomNavBar from "./components/BottomNavBar";
import VoiceJournal from "./components/VoiceJournal";

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
  const params = useLocalSearchParams<{ editId?: string }>();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const editId = params.editId;
  const isEditMode = !!editId;

  const [image, setImage] = useState<string | null>(null);
  const [existingImageURL, setExistingImageURL] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMemory, setLoadingMemory] = useState(isEditMode);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  const [moodData, setMoodData] = useState<MoodData>({
    energy: 50,
    stress: 20,
    clarity: 50,
    warmth: 40,
    color: "#a78bfa",
  });

  // Voice journal state
  const [voiceJournalData, setVoiceJournalData] = useState<{
    emoji?: string;
    feeling?: string;
    prompt?: string;
    audioURI?: string;
    duration?: number;
    moodTag?: string;
    timestamp: number;
  } | null>(null);

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
  };

  const glowText = getGlowText(PRIMARY_PURPLE, isDarkMode);
  const softText = getSoftText(isDarkMode);

  // Load existing memory data when in edit mode
  React.useEffect(() => {
    const loadMemory = async () => {
      if (!editId) return;

      try {
        setLoadingMemory(true);
        const memoryRef = doc(db, "MemoryPosts", editId);
        const memorySnap = await getDoc(memoryRef);

        if (memorySnap.exists()) {
          const data = memorySnap.data();
          setTitle(data.title || "");
          setDescription(data.description || "");
          setExistingImageURL(data.imageURL || null);
          setMoodData({
            energy: data.emotionSpectrum?.energy || 50,
            stress: data.emotionSpectrum?.stress || 20,
            clarity: data.emotionSpectrum?.clarity || 50,
            warmth: data.emotionSpectrum?.warmth || 40,
            color: data.emotionColor || "#a78bfa",
          });
        } else {
          Alert.alert("Error", "Memory not found.");
          router.back();
        }
      } catch (error: any) {
        console.error("Error loading memory:", error);
        Alert.alert("Error", "Failed to load memory for editing.");
        router.back();
      } finally {
        setLoadingMemory(false);
      }
    };

    loadMemory();
  }, [editId]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Abort any ongoing uploads
      if (uploadAbortController.current) {
        uploadAbortController.current.abort();
      }
      // Reset loading state
      setLoading(false);
    };
  }, []);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable native editing to avoid dark UI issues
        quality: 1,
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];

        // Optionally resize/crop the image to maintain aspect ratio
        // This helps with consistency without forcing users through native cropping UI
        try {
          const manipulatedImage = await ImageManipulator.manipulateAsync(
            selectedImage.uri,
            [
              {
                resize: {
                  width: 1200, // Max width to keep file size reasonable
                },
              },
            ],
            {
              compress: 0.9,
              format: ImageManipulator.SaveFormat.JPEG,
            }
          );
          setImage(manipulatedImage.uri);
        } catch (manipulateError) {
          // If manipulation fails, use original image
          console.warn(
            "Image manipulation failed, using original:",
            manipulateError
          );
          setImage(selectedImage.uri);
        }
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const removeImage = () => setImage(null);

  const handlePublish = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();

    if (!trimmedTitle) {
      Alert.alert("Missing title", "Please enter a title for this memory.");
      return;
    }
    if (trimmedTitle.length > 100) {
      Alert.alert("Title too long", "Title must be 100 characters or less.");
      return;
    }
    if (!trimmedDescription) {
      Alert.alert("Missing story", "Please write something about this memory.");
      return;
    }
    if (trimmedDescription.length > 2000) {
      Alert.alert(
        "Description too long",
        "Description must be 2000 characters or less."
      );
      return;
    }
    // Validate image requirement
    if (!isEditMode && !image) {
      Alert.alert("No cover image", "Please choose a cover image.");
      return;
    }
    // In edit mode, allow saving without image if existing image exists
    // (user might want to keep the existing image)

    try {
      setLoading(true);
      const user = auth.currentUser;

      if (!user) {
        Alert.alert("Not logged in", "Please sign in again.");
        setLoading(false);
        return;
      }

      let downloadURL = existingImageURL;
      let oldImagePath: string | null = null;

      // Upload new image only if a new one was selected
      if (image) {
        try {
          // If editing and there's an existing image, mark it for deletion
          if (isEditMode && existingImageURL) {
            oldImagePath = extractStoragePathFromURL(existingImageURL);
          }

          console.log("📤 Uploading image:", image.substring(0, 50) + "...");

          // Handle image upload for both web and mobile
          let blob: Blob;

          if (Platform.OS === "web") {
            // Web: use fetch directly
            const resp = await fetch(image);
            if (!resp.ok) {
              throw new Error(`Failed to fetch image: ${resp.statusText}`);
            }
            blob = await resp.blob();
          } else {
            // Mobile: use XMLHttpRequest for better compatibility with local URIs
            blob = await new Promise<Blob>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.onload = () => {
                resolve(xhr.response);
              };
              xhr.onerror = () => {
                reject(new Error("Failed to load image"));
              };
              xhr.responseType = "blob";
              xhr.open("GET", image, true);
              xhr.send();
            });
          }

          if (!blob || blob.size === 0) {
            throw new Error("Image blob is empty or invalid");
          }

          console.log("✅ Image blob created, size:", blob.size, "bytes");

          // create unique id for Firestore image name
          const uniqueId =
            Date.now().toString(16) +
            Math.random().toString(16) +
            "0".repeat(16);
          const guid = [
            uniqueId.substring(0, 8),
            uniqueId.substring(8, 12),
            "4000-8" + uniqueId.substring(13, 16),
            uniqueId.substring(16, 28),
          ].join("-");

          const imageRef = ref(storage, `MemoryPosts/${guid}`);
          console.log("📤 Uploading to Firebase Storage...");
          const snap = await uploadBytes(imageRef, blob);
          console.log("✅ Image uploaded successfully");
          downloadURL = await getDownloadURL(snap.ref);
          console.log(
            "✅ Download URL obtained:",
            downloadURL.substring(0, 50) + "..."
          );
        } catch (imageError: any) {
          console.error("❌ Error uploading image:", imageError);
          setLoading(false);
          Alert.alert(
            "Image Upload Error",
            `Failed to upload image: ${
              imageError.message || "Unknown error"
            }\n\nPlease try selecting the image again or check your internet connection.`
          );
          return;
        }
      }

      const now = Date.now();

      // Upload voice recording if available
      let voiceAudioURL: string | null = null;
      if (voiceJournalData?.audioURI) {
        try {
          console.log("📤 Uploading voice recording...");
          console.log("📁 Audio URI:", voiceJournalData.audioURI);
          console.log("📊 Voice journal data:", voiceJournalData);

          // Use expo-file-system to read the file (works with file:// URIs on mobile)
          const fileUri = voiceJournalData.audioURI;
          let fileData: Blob | Uint8Array;

          if (Platform.OS === "web") {
            // Web: use fetch
            console.log("🌐 Using fetch for web platform");
            const response = await fetch(fileUri);
            if (!response.ok) {
              throw new Error(
                `Failed to fetch audio: ${response.status} ${response.statusText}`
              );
            }
            fileData = await response.blob();
            console.log("✅ Fetched audio blob, size:", fileData.size, "bytes");
          } else {
            // Mobile: use XMLHttpRequest to create Blob (same approach as images)
            console.log("📱 Using XMLHttpRequest for mobile platform");
            
            // Use XMLHttpRequest to load the file as a Blob (works with file:// URIs)
            fileData = await new Promise<Blob>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.onload = () => {
                if (xhr.status === 200 || xhr.status === 0) {
                  // Status 0 is for file:// URIs
                  resolve(xhr.response);
                } else {
                  reject(new Error(`Failed to load audio: ${xhr.status} ${xhr.statusText}`));
                }
              };
              xhr.onerror = () => {
                reject(new Error("Failed to load audio file"));
              };
              xhr.responseType = "blob";
              xhr.open("GET", fileUri, true);
              xhr.send();
            });
            
            console.log("✅ Loaded audio blob, size:", fileData.size, "bytes");
            
            // Validate file size (max 10MB)
            const maxSizeBytes = 10 * 1024 * 1024; // 10MB
            if (fileData.size > maxSizeBytes) {
              throw new Error(
                `Audio file is too large (${(
                  fileData.size /
                  1024 /
                  1024
                ).toFixed(2)}MB). Maximum size is 10MB.`
              );
            }
          }

          const uniqueId =
            Date.now().toString(16) +
            Math.random().toString(16) +
            "0".repeat(16);
          const guid = [
            uniqueId.substring(0, 8),
            uniqueId.substring(8, 12),
            "4000-8" + uniqueId.substring(13, 16),
            uniqueId.substring(16, 28),
          ].join("-");

          const audioRef = ref(storage, `MemoryPosts/Voice/${guid}.m4a`);
          console.log("📤 Uploading to Firebase Storage:", audioRef.fullPath);
          await uploadBytes(audioRef, fileData);
          voiceAudioURL = await getDownloadURL(audioRef);
          console.log(
            "✅ Voice recording uploaded successfully:",
            voiceAudioURL.substring(0, 50) + "..."
          );
          console.log("🔗 Full URL:", voiceAudioURL);
        } catch (audioError: any) {
          console.error("❌ Error uploading voice recording:", audioError);
          console.error("❌ Error details:", {
            message: audioError.message,
            stack: audioError.stack,
            audioURI: voiceJournalData.audioURI,
            platform: Platform.OS,
          });
          Alert.alert(
            "Upload Warning",
            `Voice recording could not be uploaded: ${audioError.message}. Your memory will still be saved.`
          );
          // Don't block publishing if voice upload fails
        }
      } else {
        console.log("ℹ️ No audioURI in voiceJournalData:", voiceJournalData);
      }

      // Prepare the data object
      const memoryData: any = {
        title: trimmedTitle,
        description: trimmedDescription,
        imageURL: downloadURL,
        emotionSpectrum: {
          energy: moodData.energy,
          stress: moodData.stress,
          clarity: moodData.clarity,
          warmth: moodData.warmth,
        },
        emotionColor: moodData.color,
        updatedDate: now,
      };

      // Add voice journal data if available (only include defined values)
      if (voiceJournalData) {
        console.log("📝 Preparing voice journal data for Firestore...");
        const voiceJournal: any = {};
        if (voiceJournalData.emoji) voiceJournal.emoji = voiceJournalData.emoji;
        if (voiceJournalData.feeling)
          voiceJournal.feeling = voiceJournalData.feeling;
        if (voiceJournalData.prompt)
          voiceJournal.prompt = voiceJournalData.prompt;
        if (voiceAudioURL) {
          voiceJournal.audioURL = voiceAudioURL;
          console.log(
            "✅ Added audioURL to voiceJournal:",
            voiceAudioURL.substring(0, 50) + "..."
          );
        } else {
          console.warn(
            "⚠️ No voiceAudioURL - upload may have failed or audioURI was missing"
          );
        }
        if (
          voiceJournalData.duration !== undefined &&
          voiceJournalData.duration !== null
        ) {
          voiceJournal.duration = voiceJournalData.duration;
        }
        if (voiceJournalData.moodTag)
          voiceJournal.moodTag = voiceJournalData.moodTag;
        if (voiceJournalData.timestamp)
          voiceJournal.timestamp = voiceJournalData.timestamp;

        console.log("📋 Voice journal object:", voiceJournal);
        console.log("📊 Voice journal keys:", Object.keys(voiceJournal));

        // Only add voiceJournal if it has at least one field
        if (Object.keys(voiceJournal).length > 0) {
          memoryData.voiceJournal = voiceJournal;
          console.log("✅ Added voiceJournal to memoryData");
        } else {
          console.warn(
            "⚠️ Voice journal object is empty, not adding to memoryData"
          );
        }
      } else {
        console.log("ℹ️ No voiceJournalData to add");
      }

      // Only add these fields when creating new memory
      if (!isEditMode) {
        memoryData.userId = user.uid;
        memoryData.startDate = now;
        memoryData.likesCount = 0;
        memoryData.commentsCount = 0;
        memoryData.savesCount = 0;
        memoryData.CreatedUser = {
          CreatedUserId: user.uid,
          CreatedUserName: user.displayName || "Unknown User",
          CreatedUserPhoto: user.photoURL || null,
        };
      }

      console.log(
        isEditMode
          ? "📝 Attempting to update memory..."
          : "📝 Attempting to save memory to Firestore..."
      );
      console.log(
        "📦 Final memoryData before saving:",
        JSON.stringify(memoryData, null, 2)
      );
      console.log("🔍 Voice journal in memoryData:", memoryData.voiceJournal);
      if (memoryData.voiceJournal) {
        console.log(
          "🎙️ Voice journal audioURL:",
          memoryData.voiceJournal.audioURL
        );
      }
      console.log("👤 User ID:", user.uid);
      console.log("📚 Collection: MemoryPosts");

      let docRef;
      if (isEditMode && editId) {
        // Update existing document
        const memoryRef = doc(db, "MemoryPosts", editId);
        await updateDoc(memoryRef, memoryData);
        docRef = { id: editId } as any;
        console.log("✅ Success! Document updated with ID:", editId);

        // Delete old image if a new one was uploaded
        if (oldImagePath) {
          try {
            const oldImageRef = ref(storage, oldImagePath);
            await deleteObject(oldImageRef);
            console.log("✅ Old image deleted from storage:", oldImagePath);
          } catch (error: any) {
            // Image might already be deleted - this is okay
            if (error.code !== "storage/object-not-found") {
              console.warn("⚠️ Failed to delete old image:", error);
            }
          }
        }
      } else {
        // Add new document to Firestore
        try {
          console.log("📝 Attempting to add document to Firestore...");
          console.log("📊 Project ID:", db.app.options.projectId);
          console.log("📚 Collection: MemoryPosts");
          console.log("📦 Data keys:", Object.keys(memoryData));

          docRef = await addDoc(collection(db, "MemoryPosts"), memoryData);

          console.log("✅ Success! Document created with ID:", docRef.id);
          console.log("🔗 Document path:", docRef.path);
          console.log("🌐 Full path: MemoryPosts/" + docRef.id);
          console.log("📊 Project:", db.app.options.projectId);
          console.log(
            "💡 Check Firestore console: https://console.firebase.google.com/project/" +
              db.app.options.projectId +
              "/firestore/data/~2FMemoryPosts~2F" +
              docRef.id
          );
          console.log("📊 Project ID:", db.app.options.projectId);
          console.log(
            "🌐 Database URL:",
            `https://console.firebase.google.com/project/${db.app.options.projectId}/firestore/data/~2FMemoryPosts~2F${docRef.id}`
          );
        } catch (addError: any) {
          console.error("❌ Error adding document:", addError);
          console.error("Error code:", addError.code);
          console.error("Error message:", addError.message);
          let errorMessage = `Failed to save memory post.\n\nError: ${
            addError.message || "Unknown error"
          }\n\nCode: ${addError.code || "N/A"}`;

          if (addError.code === "permission-denied") {
            errorMessage += `\n\n⚠️ PERMISSION DENIED!\n\nYour Firestore security rules are blocking writes.\n\nTo fix this:\n1. Go to Firebase Console\n2. Firestore Database > Rules\n3. Copy rules from firestore.rules file\n4. Paste and Publish\n\nOr visit:\nhttps://console.firebase.google.com/project/${db.app.options.projectId}/firestore/rules`;
          }

          Alert.alert("Error Saving Post", errorMessage, [{ text: "OK" }]);
          setLoading(false);
          return;
        }
      }

      // Show visual success indicator (dark purple overlay only, no white alert)
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
                {isEditMode ? "Memory Updated!" : "Memory Created!"}
              </Text>
              <Text style={[styles.successSubtitle, softText]}>
                {isEditMode
                  ? "Your memory has been updated successfully"
                  : "Your memory has been saved successfully"}
              </Text>
              {createdDocId && (
                <Text style={[styles.successDocId, softText]}>
                  ID: {createdDocId.substring(0, 16)}...
                </Text>
              )}
              <TouchableOpacity
                onPress={() => {
                  setShowSuccess(false);
                  router.push("/modules/memory-book/MemoryTimeline");
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
            <Text style={[styles.headerTitle, glowText]}>
              {isEditMode ? "Edit Memory" : "New Memory"}
            </Text>
          </View>
          <View style={styles.headerRight}>
            <InteractiveButton
              onPress={toggleTheme}
              icon={isDarkMode ? "sunny-outline" : "moon-outline"}
              description={`Switch to ${isDarkMode ? "light" : "dark"} mode`}
              variant="ghost"
              size="sm"
              isDarkMode={isDarkMode}
              iconColor={isDarkMode ? "#E5E7EB" : PRIMARY_PURPLE}
              iconSize={Platform.OS === "ios" ? 28 : 26}
              noBorder={true}
              style={styles.themeToggle}
              accessibilityLabel="Toggle theme"
              accessibilityHint={`Changes to ${
                isDarkMode ? "light" : "dark"
              } mode`}
            />
          </View>
        </View>

        {loadingMemory ? (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, glowText]}>
              Loading memory...
            </Text>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
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
                    Add a photo, give it a title, describe what happened, and
                    how you felt.
                  </Text>
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
                    style={[
                      styles.iconPill,
                      { backgroundColor: colors.chipBg },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={16}
                      color={PRIMARY_PURPLE}
                    />
                  </View>

                  <View>
                    <Text style={[styles.cardTitle, glowText]}>
                      Cover image
                    </Text>
                    <Text style={[styles.cardSubtitle, softText]}>
                      {isEditMode
                        ? "Image cannot be changed when editing."
                        : "This photo will appear in your timeline."}
                    </Text>
                  </View>
                </View>

                {image || existingImageURL ? (
                  <View style={{ position: "relative" }}>
                    <Image
                      source={{ uri: image || existingImageURL || "" }}
                      style={styles.coverImage}
                    />
                    {!isEditMode && (
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
                    )}
                    {isEditMode && (
                      <View
                        style={[
                          styles.editModeBadge,
                          {
                            backgroundColor: PRIMARY_PURPLE + "CC",
                          },
                        ]}
                      >
                        <Ionicons name="lock-closed" size={16} color="#fff" />
                        <Text style={styles.editModeBadgeText}>
                          Cannot change
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={pickImage}
                    disabled={isEditMode}
                    style={[
                      styles.imagePlaceholder,
                      {
                        borderColor: colors.inputBorder,
                        backgroundColor: isDarkMode ? "transparent" : "#F5F3FF",
                        opacity: isEditMode ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={36}
                      color={isDarkMode ? colors.textSoft : "#9333EA"}
                    />
                    <Text style={[styles.imagePlaceholderTitle, glowText]}>
                      {isEditMode ? "Image locked" : "Tap to add cover image"}
                    </Text>
                    <Text style={[styles.imagePlaceholderSub, softText]}>
                      {isEditMode
                        ? "Cannot change image when editing"
                        : "JPG or PNG, up to 10MB"}
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
                  maxLength={100}
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
                {title.length > 80 && (
                  <Text
                    style={[styles.characterCount, { color: colors.textSoft }]}
                  >
                    {title.length}/100 characters
                  </Text>
                )}

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
                  maxLength={2000}
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
                {description.length > 1800 && (
                  <Text
                    style={[styles.characterCount, { color: colors.textSoft }]}
                  >
                    {description.length}/2000 characters
                  </Text>
                )}
              </View>

              {/* EMOTIONS */}
              <EmotionSelector
                moodData={moodData}
                setMoodData={setMoodData}
                isDarkMode={isDarkMode}
              />

              {/* VOICE JOURNAL */}
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
                    <Ionicons
                      name="mic"
                      size={14}
                      color={PRIMARY_PURPLE}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.detailsChipText, glowText]}>
                      VOICE JOURNAL
                    </Text>
                  </View>
                  <Text style={[styles.detailsHint, softText]}>
                    Express your feelings through voice (Optional)
                  </Text>
                </View>
                <VoiceJournal
                  onRecordingComplete={(data) => {
                    setVoiceJournalData(data);
                    console.log("🎙️ Voice journal data:", data);
                  }}
                  isDarkMode={isDarkMode}
                />
                {voiceJournalData && (
                  <View
                    style={[
                      styles.voiceJournalSummary,
                      {
                        backgroundColor: colors.chipBg,
                        borderColor: PRIMARY_PURPLE + "66",
                      },
                    ]}
                  >
                    <View style={styles.voiceJournalSummaryRow}>
                      {voiceJournalData.emoji && (
                        <Text style={styles.voiceJournalEmoji}>
                          {voiceJournalData.emoji}
                        </Text>
                      )}
                      <View style={{ flex: 1 }}>
                        {voiceJournalData.feeling && (
                          <Text style={[styles.voiceJournalFeeling, glowText]}>
                            {voiceJournalData.feeling}
                          </Text>
                        )}
                        {voiceJournalData.moodTag && (
                          <Text style={[styles.voiceJournalFeeling, glowText]}>
                            {voiceJournalData.moodTag}
                          </Text>
                        )}
                        {voiceJournalData.duration && (
                          <Text style={[styles.voiceJournalDuration, softText]}>
                            {Math.floor(voiceJournalData.duration / 60)}:
                            {(voiceJournalData.duration % 60)
                              .toString()
                              .padStart(2, "0")}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#10B981"
                      />
                    </View>
                  </View>
                )}
              </View>

              {/* PUBLISH BUTTON */}
              <InteractiveButton
                onPress={handlePublish}
                disabled={loading}
                icon={loading ? undefined : "paper-plane"}
                label={
                  loading
                    ? isEditMode
                      ? "Updating..."
                      : "Publishing..."
                    : isEditMode
                    ? "Update memory"
                    : "Publish memory"
                }
                description={
                  isEditMode
                    ? "Save changes to this memory"
                    : "Publish your memory to the timeline"
                }
                variant="primary"
                size="lg"
                isDarkMode={isDarkMode}
                style={styles.publishBtn}
                accessibilityLabel={
                  isEditMode ? "Update memory" : "Publish memory"
                }
                accessibilityHint={
                  isEditMode
                    ? "Saves your changes"
                    : "Publishes memory to timeline"
                }
              />
            </ScrollView>
          </KeyboardAvoidingView>
        )}
        {/* Bottom Navigation */}
        <BottomNavBar isDarkMode={isDarkMode} />
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
    paddingHorizontal: Platform.OS === "ios" ? 14 : 12,
    paddingTop: Platform.OS === "ios" ? 6 : 4,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    minHeight: Platform.OS === "ios" ? 50 : 48,
  },
  headerTitle: {
    fontSize: Platform.OS === "ios" ? 17 : 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Platform.OS === "ios" ? 10 : 12,
    flexShrink: 0,
    minWidth: Platform.OS === "ios" ? 44 : 40,
  },
  themeToggle: {
    minWidth: Platform.OS === "ios" ? 44 : 40,
    minHeight: Platform.OS === "ios" ? 44 : 40,
    alignItems: "center",
    justifyContent: "center",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 160 : 140, // Increased to clear bottom navigation bar
  },

  introRow: {
    marginBottom: 18,
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
  editModeBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  editModeBadgeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
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
  voiceJournalSummary: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  voiceJournalSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  voiceJournalEmoji: {
    fontSize: 32,
  },
  voiceJournalFeeling: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  voiceJournalDuration: {
    fontSize: 12,
  },
  characterCount: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
});

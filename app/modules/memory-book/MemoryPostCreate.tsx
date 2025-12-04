import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TextInput, Button } from "react-native-rapi-ui";
import { useRouter } from "expo-router";

import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import EmotionSelector, { MoodData } from "./EmotionSelector";
import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

const MODULE_COLOR = "#FF6B9D";

export default function MemoryPostCreateScreen() {
  const router = useRouter();
  const { isDarkMode } = useTheme();

  const [image, setImage] = useState<string | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [moodData, setMoodData] = useState<MoodData>({
    energy: 50,
    stress: 20,
    clarity: 50,
    warmth: 40,
    color: "#a78bfa",
  });

  const colors = {
    background: "#020617",
    surface: "rgba(15,23,42,0.96)",
    text: "#e2e8f0",
    textSecondary: "#94a3b8",
    primary: MODULE_COLOR,
    border: "#1f2937",
    dashedBg: "#020617",
  };

  // ---------- image handling ----------
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

  const removeImage = () => {
    setImage(null);
  };

  // ---------- submit ----------
  const handlePress = async () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!description.trim()) {
      alert("Please enter a description");
      return;
    }
    if (!image) {
      alert("Please select a cover image");
      return;
    }

    setLoading(true);

    const auth = getAuth();
    const storage = getStorage();
    const db = getFirestore();

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        alert("User not logged in");
        setLoading(false);
        return;
      }

      const startDate = Date.now();
      const response = await fetch(image);
      const blob = await response.blob();

      // simple unique id
      const u =
        Date.now().toString(16) + Math.random().toString(16) + "0".repeat(16);
      const guid = [
        u.substring(0, 8),
        u.substring(8, 12),
        "4000-8" + u.substring(13, 16),
        u.substring(16, 28),
      ].join("-");

      const spaceRef = ref(storage, "MemoryPosts/" + guid);

      const snapshot = await uploadBytes(spaceRef, blob);
      const downloadURL = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, "MemoryPosts"), {
        // who owns this post
        userId: currentUser.uid,

        // main content
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
        startDate,
        updatedDate: startDate,

        // social counters
        likesCount: 0,
        commentsCount: 0,
        savesCount: 0,

        // creator info
        CreatedUser: {
          CreatedUserId: currentUser.uid,
          CreatedUserName: currentUser.displayName,
          CreatedUserPhoto: currentUser.photoURL,
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
      setLoading(false);
      alert("Memory post created successfully!");
      router.back();
    } catch (err: any) {
      console.log(err);
      setLoading(false);
      alert("Error creating memory post: " + err.message);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-back"
            onPress={() => router.back()}
            variant="secondary"
            size="medium"
          />

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>NEW MEMORY</Text>
            <Text style={styles.headerSubtitle}>
              Capture a moment you care about
            </Text>
          </View>

          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Intro */}
            <View style={styles.introBlock}>
              <Text style={[styles.introTitle, { color: colors.text }]}>
                Capture a moment
              </Text>
              <Text
                style={[styles.introSubtitle, { color: colors.textSecondary }]}
              >
                Add a photo, give it a title, describe what happened, and how
                you felt.
              </Text>
            </View>

            {/* Image picker card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.text }]}>
                Cover Image
              </Text>
              <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
                A picture that represents this memory. It will appear in your
                timeline and stories.
              </Text>

              {image ? (
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: image }} style={styles.image} />
                  <TouchableOpacity
                    onPress={removeImage}
                    style={styles.removeImageBtn}
                  >
                    <Ionicons name="close" size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={pickImage}
                  style={[
                    styles.imagePlaceholder,
                    {
                      borderColor: colors.textSecondary,
                      backgroundColor: colors.dashedBg,
                    },
                  ]}
                >
                  <Ionicons
                    name="image-outline"
                    size={40}
                    color={colors.textSecondary}
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
                      styles.imagePlaceholderHelp,
                      { color: colors.textSecondary },
                    ]}
                  >
                    JPG or PNG, up to 10MB
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Title card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.text }]}>
                Title
              </Text>
              <TextInput
                containerStyle={{ marginBottom: 0 }}
                placeholder="Give this memory a name..."
                value={title}
                autoCapitalize="sentences"
                autoCompleteType="off"
                autoCorrect={true}
                onChangeText={setTitle}
                style={[
                  styles.textInput,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Story card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardLabel, { color: colors.text }]}>
                Story
              </Text>
              <Text style={[styles.cardHelp, { color: colors.textSecondary }]}>
                What happened? What made this moment special or important to
                you?
              </Text>
              <TextInput
                containerStyle={{ marginBottom: 0 }}
                placeholder="Write your memory here..."
                value={description}
                autoCapitalize="sentences"
                autoCompleteType="off"
                autoCorrect={true}
                multiline
                numberOfLines={6}
                onChangeText={setDescription}
                style={[
                  styles.textArea,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                    color: colors.text,
                  },
                ]}
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Emotion selector */}
            <EmotionSelector moodData={moodData} setMoodData={setMoodData} />

            {/* Publish button */}
            <Button
              text={loading ? "Publishing..." : "Publish Memory"}
              onPress={handlePress}
              disabled={loading}
              style={styles.publishButton}
              rightContent={
                !loading ? (
                  <Ionicons name="paper-plane" size={18} color="#ffffff" />
                ) : undefined
              }
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#e5e7eb",
    letterSpacing: 1.4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 12,
  },
  introBlock: {
    marginBottom: 16,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  introSubtitle: {
    fontSize: 13,
  },
  card: {
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  cardHelp: {
    fontSize: 12,
    marginBottom: 8,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    resizeMode: "cover",
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(15,23,42,0.9)",
    borderRadius: 999,
    padding: 6,
  },
  imagePlaceholder: {
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 32,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  imagePlaceholderTitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  imagePlaceholderHelp: {
    marginTop: 4,
    fontSize: 11,
  },
  textInput: {
    fontSize: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  textArea: {
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    textAlignVertical: "top",
    minHeight: 120,
  },
  publishButton: {
    marginTop: 8,
    borderRadius: 999,
    paddingVertical: 14,
  },
});

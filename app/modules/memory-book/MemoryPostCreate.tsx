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
} from "react-native";
import {
  Layout,
  TopNav,
  TextInput,
  Button,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import EmotionSelector, { MoodData } from "./EmotionSelector";

const PRIMARY_PURPLE = "#a855f7";

export default function MemoryPostCreate() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();

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

  const colors = {
    background: isDarkmode ? "#020617" : "#f1f5f9",
    surface: isDarkmode ? "#020617" : "#020617",
    text: "#e5e7eb",
    textSecondary: "#9ca3af",
    border: "#1f2937",
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
    <Layout>
      <TopNav
        middleContent="New Memory"
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

      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.background }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <View style={{ marginBottom: 18 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                color: colors.text,
                marginBottom: 4,
              }}
            >
              Capture a moment
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
              }}
            >
              Add a photo, give it a title, describe what happened, and how you
              felt.
            </Text>
          </View>

          {/* Image picker card */}
          <View
            style={{
              marginBottom: 20,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Cover image
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginBottom: 10,
              }}
            >
              A picture that represents this memory. It will appear in your
              timeline and stories.
            </Text>

            {image ? (
              <View style={{ position: "relative" }}>
                <Image
                  source={{ uri: image }}
                  style={{
                    width: "100%",
                    height: 220,
                    borderRadius: 12,
                    resizeMode: "cover",
                  }}
                />
                <TouchableOpacity
                  onPress={removeImage}
                  style={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    borderRadius: 999,
                    padding: 6,
                  }}
                >
                  <Ionicons name="close" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  borderStyle: "dashed",
                  borderColor: colors.textSecondary,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingVertical: 32,
                  paddingHorizontal: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#020617",
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={40}
                  color={colors.textSecondary}
                />
                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 14,
                    color: colors.text,
                    fontWeight: "500",
                  }}
                >
                  Tap to add cover image
                </Text>
                <Text
                  style={{
                    marginTop: 4,
                    fontSize: 11,
                    color: colors.textSecondary,
                  }}
                >
                  JPG or PNG, up to 10MB
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Title card */}
          <View
            style={{
              marginBottom: 16,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Title
            </Text>
            <TextInput
              containerStyle={{ marginBottom: 0 }}
              placeholder="Give this memory a name..."
              value={title}
              autoCapitalize="sentences"
              autoCompleteType="off"
              autoCorrect
              onChangeText={setTitle}
              style={{
                fontSize: 16,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Story card */}
          <View
            style={{
              marginBottom: 16,
              borderRadius: 16,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 8,
              }}
            >
              Story
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: colors.textSecondary,
                marginBottom: 8,
              }}
            >
              What happened? What made this moment special or important to you?
            </Text>
            <TextInput
              containerStyle={{ marginBottom: 0 }}
              placeholder="Write your memory here..."
              value={description}
              autoCapitalize="sentences"
              autoCompleteType="off"
              autoCorrect
              multiline
              numberOfLines={6}
              onChangeText={setDescription}
              style={{
                fontSize: 14,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.text,
                textAlignVertical: "top",
              }}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Emotion selector (spectrum + color) */}
          <EmotionSelector moodData={moodData} setMoodData={setMoodData} />

          {/* Publish button */}
          <Button
            text={loading ? "Publishing..." : "Publish memory"}
            onPress={handlePublish}
            disabled={loading}
            style={{
              marginTop: 10,
              borderRadius: 999,
              paddingVertical: 14,
              backgroundColor: PRIMARY_PURPLE,
            }}
            rightContent={
              !loading ? (
                <Ionicons name="paper-plane" size={18} color="#fff" />
              ) : undefined
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Layout,
  TopNav,
  TextInput,
  Button,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";

import EmotionSelector, { MoodData } from "./EmotionSelector";

export default function MemoryPostCreate() {
  const router = useRouter();
  const { isDarkmode, setTheme } = useTheme();
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
    background: isDarkmode ? "#020617" : "#f1f5f9",
    surface: isDarkmode ? "#0f172a" : "#ffffff",
    text: isDarkmode ? "#e2e8f0" : "#0f172a",
    textSecondary: isDarkmode ? "#94a3b8" : "#64748b",
    primary: "#ec4899",
    border: isDarkmode ? "#1f2937" : "#e2e8f0",
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

  const removeImage = () => {
    setImage(null);
  };

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

        // keep your existing creator info
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
        >
          {/* Intro */}
          <View style={{ marginBottom: 16 }}>
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
              Cover Image
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
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    borderRadius: 999,
                    padding: 6,
                  }}
                >
                  <Ionicons name="close" size={18} color="white" />
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
                  backgroundColor: isDarkmode ? "#020617" : "#f8fafc",
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
              autoCorrect={true}
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
              autoCorrect={true}
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
            text={loading ? "Publishing..." : "Publish Memory"}
            onPress={handlePress}
            disabled={loading}
            style={{
              marginTop: 4,
              borderRadius: 999,
              paddingVertical: 14,
            }}
            rightContent={
              !loading ? (
                <Ionicons name="paper-plane" size={18} color="white" />
              ) : undefined
            }
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Layout>
  );
}

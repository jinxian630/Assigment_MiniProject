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
    background: "#020617", // keep dark, same as home
    surface: "#020617",
    text: "#e5e7eb",
    textSoft: "#9ca3af",
    borderSoft: "#1f2937",
    borderStrong: PRIMARY_PURPLE,
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
          {/* Header / step chip */}
          <View
            style={{
              marginBottom: 18,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 8 }}>
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
                  color: colors.textSoft,
                }}
              >
                Add a photo, give it a title, describe what happened, and how
                you felt.
              </Text>
            </View>

            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: "rgba(15,23,42,0.9)",
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: colors.textSoft,
                  letterSpacing: 0.6,
                }}
              >
                STEP 1 OF 2
              </Text>
            </View>
          </View>

          {/* IMAGE CARD */}
          <View
            style={{
              marginBottom: 18,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  marginRight: 8,
                  backgroundColor: colors.chipBg,
                }}
              >
                <Ionicons
                  name="image-outline"
                  size={16}
                  color={PRIMARY_PURPLE}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: colors.text,
                  }}
                >
                  Cover image
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSoft,
                    marginTop: 2,
                  }}
                >
                  This photo will appear in your timeline and stories.
                </Text>
              </View>
            </View>

            {image ? (
              <View style={{ position: "relative", marginTop: 6 }}>
                <Image
                  source={{ uri: image }}
                  style={{
                    width: "100%",
                    height: 220,
                    borderRadius: 14,
                    resizeMode: "cover",
                  }}
                />
                <TouchableOpacity
                  onPress={removeImage}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    backgroundColor: "rgba(15,23,42,0.95)",
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
                  borderColor: colors.textSoft,
                  borderWidth: 1.4,
                  borderRadius: 14,
                  paddingVertical: 30,
                  paddingHorizontal: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#020617",
                  marginTop: 6,
                }}
              >
                <Ionicons
                  name="cloud-upload-outline"
                  size={32}
                  color={colors.textSoft}
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
                    color: colors.textSoft,
                  }}
                >
                  JPG or PNG, up to 10MB
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* TEXT DETAILS CARD */}
          <View
            style={{
              marginBottom: 18,
              borderRadius: 18,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.borderSoft,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 999,
                  backgroundColor: colors.chipBg,
                  marginRight: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: colors.textSoft,
                    letterSpacing: 0.8,
                  }}
                >
                  DETAILS
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: colors.textSoft,
                  flex: 1,
                }}
              >
                Give this memory a name and tell the story behind it.
              </Text>
            </View>

            {/* Title */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 6,
              }}
            >
              Title
            </Text>
            <TextInput
              containerStyle={{ marginBottom: 10 }}
              placeholder="eg. Picnic at KLCC park"
              value={title}
              autoCapitalize="sentences"
              autoCompleteType="off"
              autoCorrect
              onChangeText={setTitle}
              style={{
                fontSize: 15,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.borderSoft,
                backgroundColor: colors.surface,
                color: colors.text,
              }}
              placeholderTextColor={colors.textSoft}
            />

            {/* Story */}
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: colors.text,
                marginBottom: 6,
                marginTop: 4,
              }}
            >
              Story
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: colors.textSoft,
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
                borderColor: colors.borderSoft,
                backgroundColor: colors.surface,
                color: colors.text,
                textAlignVertical: "top",
              }}
              placeholderTextColor={colors.textSoft}
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
              marginTop: 8,
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

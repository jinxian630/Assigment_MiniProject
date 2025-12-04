import React, { useState, useEffect } from "react";
import { View, Text, Image, TouchableOpacity, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { Layout, TopNav, useTheme, themeColor } from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import {
  getFirestore,
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

const { width, height } = Dimensions.get("window");

export default function MemoryStories() {
  const router = useRouter();
  // 👇 IMPORTANT: take BOTH isDarkmode and setTheme
  const { isDarkmode, setTheme } = useTheme();
  const [memories, setMemories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const db = getFirestore();
    const postsRef = collection(db, "MemoryPosts"); // same collection as create/timeline
    const q = query(postsRef, orderBy("startDate", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setMemories(list);
      setCurrentIndex(0);
    });

    return () => unsubscribe();
  }, []);

  const colors = {
    background: isDarkmode ? "#0f172a" : "#f8fafc",
    surface: isDarkmode ? "#1e293b" : "#ffffff",
    text: isDarkmode ? "#e2e8f0" : "#1e293b",
    accent: isDarkmode ? "#3b82f6" : "#10b981",
  };

  const hasMemories = memories.length > 0;
  const currentMemory = hasMemories ? memories[currentIndex] : null;

  return (
    <Layout>
      <TopNav
        middleContent="Memory Stories"
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        leftAction={() => router.back()}
        // 👇 THIS MAKES THE SUN / MOON BUTTON SHOW & WORK
        rightContent={
          <Ionicons
            name={isDarkmode ? "sunny" : "moon"}
            size={20}
            color={isDarkmode ? themeColor.white100 : themeColor.dark}
          />
        }
        rightAction={() => {
          setTheme(isDarkmode ? "light" : "dark");
        }}
      />

      {!hasMemories ? (
        // EMPTY STATE
        <View
          style={{
            flex: 1,
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Ionicons
            name="image-outline"
            size={64}
            color={colors.text}
            opacity={0.3}
          />
          <Text
            style={{
              marginTop: 20,
              fontSize: 18,
              color: colors.text,
              opacity: 0.7,
            }}
          >
            No memories yet
          </Text>
          <Text
            style={{
              marginTop: 8,
              fontSize: 14,
              color: colors.text,
              opacity: 0.5,
            }}
          >
            Create a memory to see it as a story
          </Text>
        </View>
      ) : (
        // STORY VIEW
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.9}>
            <Image
              source={{ uri: currentMemory.imageURL }}
              style={{
                width,
                height: height - 80, // leave space for TopNav
                resizeMode: "cover",
              }}
            />

            {/* Text overlay */}
            <View
              style={{ position: "absolute", top: 120, left: 20, right: 20 }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: "bold",
                  color: "white",
                  textShadowColor: "rgba(0,0,0,0.7)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 4,
                }}
              >
                {currentMemory.title}
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  color: "rgba(255,255,255,0.9)",
                  marginTop: 12,
                  lineHeight: 24,
                  textShadowColor: "rgba(0,0,0,0.7)",
                  textShadowOffset: { width: 1, height: 1 },
                  textShadowRadius: 4,
                }}
                numberOfLines={3}
              >
                {currentMemory.description}
              </Text>
            </View>

            {/* Progress dots */}
            <View
              style={{
                position: "absolute",
                top: 80,
                left: 20,
                flexDirection: "row",
              }}
            >
              {memories.map((_, index) => (
                <View
                  key={index}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    marginRight: 6,
                    backgroundColor:
                      index === currentIndex
                        ? "white"
                        : "rgba(255,255,255,0.3)",
                  }}
                />
              ))}
            </View>

            {/* Navigation buttons */}
            <View
              style={{
                position: "absolute",
                bottom: 100,
                left: 20,
                right: 20,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              <TouchableOpacity
                onPress={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="chevron-back" size={24} color="white" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  setCurrentIndex(
                    Math.min(memories.length - 1, currentIndex + 1)
                  )
                }
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: "rgba(0,0,0,0.3)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons name="chevron-forward" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Like button */}
            <TouchableOpacity
              style={{
                position: "absolute",
                bottom: 40,
                right: 20,
                width: 60,
                height: 60,
                borderRadius: 30,
                backgroundColor: "rgba(0,0,0,0.3)",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Ionicons name="heart-outline" size={24} color="white" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </Layout>
  );
}

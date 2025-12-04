import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Image } from "react-native";
import {
  Layout,
  TopNav,
  Text,
  useTheme,
  themeColor,
} from "react-native-rapi-ui";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { MainStackParamList } from "../../types/navigation";
import { getFirestore, doc, getDoc } from "firebase/firestore";

type Props = NativeStackScreenProps<MainStackParamList, "MemoryPostDetail">;

type PostData = {
  title: string;
  description: string;
  imageURL?: string;
  startDate?: number;
};

export default function MemoryPostDetail({ navigation, route }: Props) {
  const { postId } = route.params;
  const { isDarkmode } = useTheme();
  const colors = themeColor[isDarkmode ? "dark" : "light"];
  const db = getFirestore();

  const [post, setPost] = useState<PostData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      try {
        const ref = doc(db, "MemoryPosts", postId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setPost(snap.data() as PostData);
        } else {
          setPost(null);
        }
      } catch (e) {
        console.log(e);
      } finally {
        setLoading(false);
      }
    };
    loadPost();
  }, [db, postId]);

  const formatShortDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Layout>
      <TopNav
        middleContent={post?.title || "Memory Detail"}
        leftContent={
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDarkmode ? colors.white100 : colors.dark}
          />
        }
        leftAction={() => navigation.goBack()}
      />
      {loading ? (
        <View style={styles.center}>
          <Text>Loading...</Text>
        </View>
      ) : !post ? (
        <View style={styles.center}>
          <Text>Post not found.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {post.imageURL && (
            <Image source={{ uri: post.imageURL }} style={styles.image} />
          )}
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            <Text
              style={{
                fontSize: 20,
                fontWeight: "700",
                marginBottom: 4,
              }}
            >
              {post.title}
            </Text>
            {post.startDate && (
              <Text
                style={{ fontSize: 12, color: "#6b7280", marginBottom: 12 }}
              >
                {formatShortDate(post.startDate)}
              </Text>
            )}
            <Text style={{ fontSize: 14, lineHeight: 20 }}>
              {post.description}
            </Text>
          </View>
        </ScrollView>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: 260,
    resizeMode: "cover",
  },
});

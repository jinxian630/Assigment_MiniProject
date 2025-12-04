import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
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
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";

type Props = NativeStackScreenProps<MainStackParamList, "UserProfile">;

type UserProfileData = {
  displayName?: string;
  email?: string;
  gender?: string;
  birthDate?: string;
  phoneNumber?: string;
};

type MemoryPost = {
  id: string;
  title: string;
  description: string;
  mood?: string;
  startDate?: number;
  imageURL?: string;
  likesCount?: number;
  commentsCount?: number;
  savesCount?: number;
};

export default function UserProfile({ navigation, route }: Props) {
  const { userId } = route.params;
  const { isDarkmode } = useTheme();
  const colors = themeColor[isDarkmode ? "dark" : "light"];

  const [user, setUser] = useState<UserProfileData | null>(null);
  const [posts, setPosts] = useState<MemoryPost[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const db = getFirestore();

  useEffect(() => {
    // Load user profile once
    const loadUser = async () => {
      try {
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setUser(snap.data() as UserProfileData);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.log("Error loading user profile:", err);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadUser();

    // Subscribe to this user's posts
    const postsRef = collection(db, "MemoryPosts");
    const q = query(
      postsRef,
      where("userId", "==", userId),
      orderBy("startDate", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: MemoryPost[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as any;
          list.push({
            id: docSnap.id,
            title: data.title,
            description: data.description,
            mood: data.mood,
            startDate: data.startDate,
            imageURL: data.imageURL,
            likesCount: data.likesCount || 0,
            commentsCount: data.commentsCount || 0,
            savesCount: data.savesCount || 0,
          });
        });
        setPosts(list);
        setLoadingPosts(false);
      },
      (error) => {
        console.log("Error loading posts:", error);
        setLoadingPosts(false);
      }
    );

    return () => unsub();
  }, [db, userId]);

  const formatShortDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const totalPosts = posts.length;
  const totalLikes = posts.reduce((sum, p) => sum + (p.likesCount || 0), 0);
  const totalComments = posts.reduce(
    (sum, p) => sum + (p.commentsCount || 0),
    0
  );
  const totalSaves = posts.reduce((sum, p) => sum + (p.savesCount || 0), 0);

  const headerName = user?.displayName || "Profile";

  return (
    <Layout>
      <TopNav
        middleContent={headerName}
        leftContent={
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDarkmode ? colors.white100 : colors.dark}
          />
        }
        leftAction={() => navigation.goBack()}
      />

      {loadingProfile ? (
        <View style={styles.centered}>
          <ActivityIndicator />
        </View>
      ) : !user ? (
        <View style={styles.centered}>
          <Text>User not found.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* Profile header */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: isDarkmode ? "#020617" : "#f1f5f9",
              },
            ]}
          >
            <View style={styles.profileRow}>
              <View style={styles.avatar}>
                <Text style={{ color: "white", fontWeight: "700" }}>
                  {user.displayName?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    marginBottom: 2,
                    color: isDarkmode ? colors.white100 : colors.dark,
                  }}
                >
                  {user.displayName}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: isDarkmode ? "#94a3b8" : "#6b7280",
                    marginBottom: 2,
                  }}
                >
                  {user.email}
                </Text>
                {user.gender ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: isDarkmode ? "#94a3b8" : "#6b7280",
                    }}
                  >
                    {user.gender}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Stats row */}
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalPosts}</Text>
                <Text style={styles.statLabel}>Posts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalLikes}</Text>
                <Text style={styles.statLabel}>Likes</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalComments}</Text>
                <Text style={styles.statLabel}>Comments</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalSaves}</Text>
                <Text style={styles.statLabel}>Saves</Text>
              </View>
            </View>
          </View>

          {/* Posts list */}
          <View style={{ marginTop: 16 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 8,
                color: isDarkmode ? colors.white100 : colors.dark,
              }}
            >
              Memories
            </Text>

            {loadingPosts ? (
              <ActivityIndicator />
            ) : posts.length === 0 ? (
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 8 }}>
                No memories yet.
              </Text>
            ) : (
              posts.map((post) => (
                <TouchableOpacity
                  key={post.id}
                  style={[
                    styles.card,
                    { marginBottom: 12, backgroundColor: colors.white100 },
                  ]}
                  activeOpacity={0.9}
                  onPress={() =>
                    navigation.navigate("MemoryPostDetail", { postId: post.id })
                  }
                >
                  {/* Thumbnail */}
                  {post.imageURL ? (
                    <Image
                      source={{ uri: post.imageURL }}
                      style={styles.postImage}
                    />
                  ) : null}

                  <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "600",
                        marginBottom: 4,
                        color: isDarkmode ? colors.dark : "#111827",
                      }}
                      numberOfLines={1}
                    >
                      {post.title}
                    </Text>

                    <Text
                      style={{
                        fontSize: 12,
                        color: "#6b7280",
                        marginBottom: 4,
                      }}
                      numberOfLines={2}
                    >
                      {post.description}
                    </Text>

                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 6,
                      }}
                    >
                      <View
                        style={{ flexDirection: "row", alignItems: "center" }}
                      >
                        {post.mood ? (
                          <View style={styles.moodPill}>
                            <Text style={styles.moodText}>
                              Mood: {post.mood}
                            </Text>
                          </View>
                        ) : null}
                        {post.startDate ? (
                          <Text style={styles.dateText}>
                            {formatShortDate(post.startDate)}
                          </Text>
                        ) : null}
                      </View>

                      {/* like / comment / save counts (display only for now) */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        <View style={styles.iconStat}>
                          <Ionicons
                            name="heart-outline"
                            size={14}
                            color="#f97316"
                          />
                          <Text style={styles.iconStatText}>
                            {post.likesCount || 0}
                          </Text>
                        </View>
                        <View style={styles.iconStat}>
                          <Ionicons
                            name="chatbubble-outline"
                            size={14}
                            color="#0ea5e9"
                          />
                          <Text style={styles.iconStatText}>
                            {post.commentsCount || 0}
                          </Text>
                        </View>
                        <View style={styles.iconStat}>
                          <Ionicons
                            name="bookmark-outline"
                            size={14}
                            color="#6366f1"
                          />
                          <Text style={styles.iconStatText}>
                            {post.savesCount || 0}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </Layout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#0ea5e9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 14,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
  },
  postImage: {
    width: "100%",
    height: 170,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    marginBottom: 6,
  },
  moodPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#e0f2fe",
    marginRight: 6,
  },
  moodText: {
    fontSize: 10,
    color: "#0ea5e9",
    fontWeight: "600",
  },
  dateText: {
    fontSize: 11,
    color: "#9ca3af",
  },
  iconStat: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconStatText: {
    fontSize: 11,
    marginLeft: 3,
    color: "#6b7280",
  },
});

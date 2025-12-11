// app/modules/memory-book/UserSearch.tsx

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { getFirestore, collection, onSnapshot } from "firebase/firestore";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

const MODULE_PURPLE = "#a855f7";

type User = {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
};

export default function UserSearch() {
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const colors = {
    bg: isDarkMode ? "#020617" : "#f9fafb",
    card: isDarkMode ? "#020617" : "#ffffff",
    textMain: isDarkMode ? "#F9FAFB" : "#020617",
    textSoft: isDarkMode ? "#9CA3AF" : "#6B7280",
    borderSoft: isDarkMode ? "#1F2937" : "#E5E7EB",
    inputBg: isDarkMode ? "#020617" : "#ffffff",
    inputBorder: isDarkMode ? "#1F2937" : "#CBD5F5",
  };

  useEffect(() => {
    const db = getFirestore();
    const usersRef = collection(db, "Users"); // ⚠️ change collection name if different

    const unsub = onSnapshot(
      usersRef,
      (snapshot) => {
        const list: User[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as any) });
        });
        setUsers(list);
        setLoading(false);
      },
      (err) => {
        console.log("UserSearch error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;

    return users.filter((u) => {
      const name = (u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [search, users]);

  const handleOpenProfile = (userId: string) => {
    router.push(`/modules/memory-book/UserProfile?userId=${userId}`);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.headerRow}>
          <IconButton
            icon="arrow-back"
            variant="ghost"
            onPress={() => router.back()}
          />
          <View style={{ flex: 1, alignItems: "center" }}>
            <Text style={[styles.headerTitle, { color: colors.textMain }]}>
              Explore Users
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Body */}
        <View style={[styles.flex, { backgroundColor: "transparent" }]}>
          {/* Search bar */}
          <View style={styles.searchWrapper}>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="search"
                size={18}
                color={colors.textSoft}
                style={{ marginRight: 6 }}
              />
              <TextInput
                placeholder="Search by name or email..."
                placeholderTextColor={colors.textSoft}
                value={search}
                onChangeText={setSearch}
                style={[styles.searchInput, { color: colors.textMain }]}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.textSoft}
                  />
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.searchHint, { color: colors.textSoft }]}>
              Find friends or classmates and view their shared memories.
            </Text>
          </View>

          {/* Results */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={MODULE_PURPLE} />
              <Text style={[styles.loadingText, { color: colors.textSoft }]}>
                Loading users...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.resultsContent}
              showsVerticalScrollIndicator={false}
            >
              {filteredUsers.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons
                    name="search-outline"
                    size={30}
                    color={colors.textSoft}
                  />
                  <Text style={[styles.emptyTitle, { color: colors.textMain }]}>
                    No users found
                  </Text>
                  <Text
                    style={[styles.emptySubtitle, { color: colors.textSoft }]}
                  >
                    Try searching with a different name or email.
                  </Text>
                </View>
              ) : (
                filteredUsers.map((user) => (
                  <TouchableOpacity
                    key={user.id}
                    onPress={() => handleOpenProfile(user.id)}
                    style={[
                      styles.userRow,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.borderSoft,
                      },
                    ]}
                  >
                    {user.photoURL ? (
                      <Image
                        source={{ uri: user.photoURL }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons
                          name="person-circle-outline"
                          size={32}
                          color={MODULE_PURPLE}
                        />
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text
                        numberOfLines={1}
                        style={[styles.userName, { color: colors.textMain }]}
                      >
                        {user.displayName || "Unnamed user"}
                      </Text>
                      {user.email && (
                        <Text
                          numberOfLines={1}
                          style={[styles.userEmail, { color: colors.textSoft }]}
                        >
                          {user.email}
                        </Text>
                      )}
                      {user.bio && (
                        <Text
                          numberOfLines={1}
                          style={[styles.userBio, { color: colors.textSoft }]}
                        >
                          {user.bio}
                        </Text>
                      )}
                    </View>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={colors.textSoft}
                    />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
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
  searchWrapper: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  searchHint: {
    fontSize: 11,
    marginTop: 6,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 12,
    marginTop: 8,
  },
  resultsContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
  },
  userEmail: {
    fontSize: 12,
    marginTop: 1,
  },
  userBio: {
    fontSize: 11,
    marginTop: 1,
  },
  emptyBox: {
    marginTop: 40,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "600",
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
});

// app/modules/memory-book/UserSearch.tsx

import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { getFirestore, collection, onSnapshot } from "firebase/firestore";

import { GradientBackground } from "@/components/common/GradientBackground";
import { IconButton } from "@/components/common/IconButton";
import { useTheme } from "@/hooks/useTheme";

const MODULE_PURPLE = "#a855f7";

/** 🎨 Neon card shell helper */
const createNeonCardShell = (
  accentColor: string,
  isDark: boolean,
  extra: any = {}
) => {
  return {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: accentColor + (isDark ? "66" : "80"),
    shadowColor: accentColor,
    shadowOpacity: isDark ? 0.8 : 0.5,
    shadowRadius: isDark ? 25 : 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: isDark ? 15 : 10,
    ...extra,
  };
};

type User = {
  id: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  bio?: string;
};

export default function UserSearch() {
  const router = useRouter();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFocused, setIsFocused] = useState(false);

  // Animation refs
  const cardScales = useRef<Record<string, Animated.Value>>({}).current;
  const searchFocusAnim = useRef(new Animated.Value(0)).current;
  const searchGlow = useRef(new Animated.Value(0)).current;
  const cardGlow = useRef(new Animated.Value(0)).current;

  const colors = {
    background: isDarkMode ? "#020617" : "#FAF5FF",
    surface: isDarkMode ? "#020617" : "#FFFFFF",
    card: isDarkMode ? "#0F172A" : "#FFFFFF",
    text: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    textSecondary: isDarkMode ? "#9CA3AF" : "#9333EA",
    border: isDarkMode ? "#1F2937" : "#7C3AED",
    inputBg: isDarkMode ? "#0F172A" : "#FFFFFF",
    inputBorder: isDarkMode ? "#1F2937" : "#7C3AED",
    inputBorderFocused: MODULE_PURPLE,
    accent: MODULE_PURPLE,
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
  };

  // Search focus animation
  useEffect(() => {
    Animated.timing(searchFocusAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused]);

  // Pulsing glow animations
  useEffect(() => {
    const searchGlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(searchGlow, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(searchGlow, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    searchGlowAnimation.start();

    const cardGlowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cardGlow, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: false,
        }),
        Animated.timing(cardGlow, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: false,
        }),
      ])
    );
    cardGlowAnimation.start();

    return () => {
      searchGlowAnimation.stop();
      cardGlowAnimation.stop();
    };
  }, []);

  useEffect(() => {
    const db = getFirestore();
    const usersRef = collection(db, "Users");

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
    if (!term) return [];
    return users.filter((u) => {
      const name = (u.displayName || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [search, users]);

  const handleOpenProfile = (userId: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push(`/modules/memory-book/UserProfile?userId=${userId}`);
  };

  const handleCardPress = (userId: string, cardId: string) => {
    if (!cardScales[cardId]) {
      cardScales[cardId] = new Animated.Value(1);
    }
    const scaleAnim = cardScales[cardId];

    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }),
    ]).start();

    setTimeout(() => handleOpenProfile(userId), 100);
  };

  const borderColor = searchFocusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputBorder, colors.inputBorderFocused],
  });

  const searchShadowOpacity = searchGlow.interpolate({
    inputRange: [0, 1],
    outputRange: isDarkMode ? [0.6, 1.0] : [0.4, 0.7],
  });

  const searchShadowRadius = searchGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 35],
  });

  return (
    <GradientBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
              shadowColor: MODULE_PURPLE,
              shadowOpacity: 0.2,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            },
          ]}
        >
          <IconButton
            icon="arrow-back"
            variant="ghost"
            onPress={() => router.back()}
          />
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Search Users
          </Text>
          <TouchableOpacity
            onPress={() => {
              toggleTheme();
              if (Platform.OS === "ios") {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
            }}
            style={styles.themeButton}
          >
            <Ionicons
              name={isDarkMode ? "sunny" : "moon"}
              size={22}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <Animated.View
            style={[
              styles.searchContainer,
              createNeonCardShell(MODULE_PURPLE, isDarkMode, {
                paddingHorizontal: 16,
                paddingVertical: 14,
              }),
              {
                backgroundColor: colors.inputBg,
                borderColor: borderColor,
                shadowOpacity: searchShadowOpacity,
                shadowRadius: searchShadowRadius,
              },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={MODULE_PURPLE}
              style={styles.searchIcon}
            />
            <TextInput
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setSearch("");
                  if (Platform.OS === "ios") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </Animated.View>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading users...
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {search.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Animated.View
                  style={[
                    styles.emptyIconContainer,
                    {
                      backgroundColor: colors.chipBg,
                      borderColor: MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                      shadowColor: MODULE_PURPLE,
                      shadowOpacity: searchGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 0.9],
                      }),
                      shadowRadius: searchGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 30],
                      }),
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 8,
                    },
                  ]}
                >
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={MODULE_PURPLE}
                  />
                </Animated.View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  Start Searching
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  Enter a name or email to find users
                </Text>
              </View>
            ) : filteredUsers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Animated.View
                  style={[
                    styles.emptyIconContainer,
                    {
                      backgroundColor: colors.chipBg,
                      borderColor: MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                      shadowColor: MODULE_PURPLE,
                      shadowOpacity: searchGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.5, 0.9],
                      }),
                      shadowRadius: searchGlow.interpolate({
                        inputRange: [0, 1],
                        outputRange: [15, 30],
                      }),
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 8,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-remove-outline"
                    size={48}
                    color={MODULE_PURPLE}
                  />
                </Animated.View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Results
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: colors.textSecondary },
                  ]}
                >
                  No users found matching "{search}"
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.resultsHeader}>
                  <Text
                    style={[
                      styles.resultsCount,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {filteredUsers.length}{" "}
                    {filteredUsers.length === 1 ? "result" : "results"}
                  </Text>
                </View>
                {filteredUsers.map((user) => {
                  const cardId = user.id;
                  if (!cardScales[cardId]) {
                    cardScales[cardId] = new Animated.Value(1);
                  }
                  const scaleAnim = cardScales[cardId];

                  return (
                    <TouchableOpacity
                      key={user.id}
                      activeOpacity={0.9}
                      onPress={() => handleCardPress(user.id, cardId)}
                      onPressIn={() => {
                        Animated.spring(scaleAnim, {
                          toValue: 0.98,
                          useNativeDriver: true,
                          tension: 300,
                          friction: 10,
                        }).start();
                      }}
                      onPressOut={() => {
                        Animated.spring(scaleAnim, {
                          toValue: 1,
                          useNativeDriver: true,
                          tension: 300,
                          friction: 10,
                        }).start();
                      }}
                    >
                      <Animated.View
                        style={[
                          styles.userCard,
                          createNeonCardShell(MODULE_PURPLE, isDarkMode, {
                            paddingHorizontal: 16,
                            paddingVertical: 16,
                          }),
                          {
                            backgroundColor: colors.card,
                            shadowOpacity: cardGlow.interpolate({
                              inputRange: [0, 1],
                              outputRange: isDarkMode
                                ? [0.7, 0.95]
                                : [0.4, 0.6],
                            }),
                            shadowRadius: cardGlow.interpolate({
                              inputRange: [0, 1],
                              outputRange: [20, 30],
                            }),
                            transform: [{ scale: scaleAnim }],
                          },
                        ]}
                      >
                        <View style={styles.userCardContent}>
                          {/* Avatar */}
                          {user.photoURL ? (
                            <Image
                              source={{ uri: user.photoURL }}
                              style={[
                                styles.avatar,
                                {
                                  borderColor: MODULE_PURPLE + "40",
                                },
                              ]}
                            />
                          ) : (
                            <View
                              style={[
                                styles.avatarPlaceholder,
                                {
                                  backgroundColor: colors.chipBg,
                                  borderColor:
                                    MODULE_PURPLE + (isDarkMode ? "66" : "80"),
                                },
                              ]}
                            >
                              <Ionicons
                                name="person"
                                size={24}
                                color={MODULE_PURPLE}
                              />
                            </View>
                          )}

                          {/* User Info */}
                          <View style={styles.userInfo}>
                            <Text
                              numberOfLines={1}
                              style={[styles.userName, { color: colors.text }]}
                            >
                              {user.displayName || "Unnamed User"}
                            </Text>
                            {user.email && (
                              <Text
                                numberOfLines={1}
                                style={[
                                  styles.userEmail,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {user.email}
                              </Text>
                            )}
                            {user.bio && (
                              <Text
                                numberOfLines={2}
                                style={[
                                  styles.userBio,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                {user.bio}
                              </Text>
                            )}
                          </View>

                          {/* Arrow */}
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={MODULE_PURPLE}
                            style={styles.chevron}
                          />
                        </View>
                      </Animated.View>
                    </TouchableOpacity>
                  );
                })}
              </>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.3,
    flex: 1,
    textAlign: "center",
  },
  themeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "400",
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 16,
    letterSpacing: 0.2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  resultsHeader: {
    marginBottom: 12,
    paddingTop: 8,
  },
  resultsCount: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  userCard: {
    marginBottom: 14,
  },
  userCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontWeight: "400",
    letterSpacing: 0.1,
    marginTop: 2,
  },
  userBio: {
    fontSize: 13,
    fontWeight: "400",
    letterSpacing: 0.1,
    marginTop: 6,
    lineHeight: 18,
  },
  chevron: {
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 80,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    fontWeight: "400",
    letterSpacing: 0.2,
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 22,
  },
});

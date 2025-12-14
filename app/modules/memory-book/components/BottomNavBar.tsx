import React, { useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import InteractiveNavItem from "./InteractiveNavItem";
import { useAuth } from "@/hooks/useAuth";
import { auth } from "@/config/firebase";

const PRIMARY_PURPLE = "#a855f7";

type BottomNavBarProps = {
  isDarkMode: boolean;
};

export default function BottomNavBar({ isDarkMode }: BottomNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const currentUser = auth.currentUser;

  const colors = {
    background: isDarkMode ? "rgba(10,10,15,0.98)" : "rgba(15,23,42,0.95)",
    border: isDarkMode ? "#1F2937" : "#111827",
    active: PRIMARY_PURPLE,
    inactive: isDarkMode ? "#9CA3AF" : "#64748B",
    textSecondary: isDarkMode ? "#9CA3AF" : "#64748B",
    chipBg: isDarkMode ? "rgba(168,85,247,0.12)" : "rgba(124,58,237,0.2)",
  };

  // Left side nav items (3 items)
  const leftNavItems = [
    {
      id: "home",
      icon: "home-outline",
      activeIcon: "home",
      label: "Home",
      route: "/modules/memory-book",
      description: "View your memory feed and profile",
    },
    {
      id: "timeline",
      icon: "time-outline",
      activeIcon: "time",
      label: "Timeline",
      route: "/modules/memory-book/MemoryTimeline",
      description: "Browse all memories in chronological order",
    },
    {
      id: "profile",
      icon: "person-outline",
      activeIcon: "person",
      label: "Profile",
      route: "/modules/memory-book/UserProfile",
      description: "View your profile and stats",
      isProfile: true,
    },
  ];

  // Right side nav items (3 items)
  const rightNavItems = [
    {
      id: "saved",
      icon: "bookmark-outline",
      activeIcon: "bookmark",
      label: "Saved",
      route: "/modules/memory-book/SavedPosts",
      description: "View your saved memories",
    },
    {
      id: "insights",
      icon: "sparkles-outline",
      activeIcon: "sparkles",
      label: "Insights",
      route: "/modules/memory-book/AIInsightsPage",
      description: "AI-powered mood analysis and insights",
    },
    {
      id: "search",
      icon: "search-outline",
      activeIcon: "search",
      label: "Search",
      route: "/modules/memory-book/UserSearch",
      description: "Search for other users",
    },
  ];

  const createButtonScale = useRef(new Animated.Value(1)).current;

  const handlePress = (route: string, isProfile?: boolean) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (isProfile) {
      // Navigate to profile with current user ID
      const currentUserId = currentUser?.uid || user?.id;
      if (currentUserId) {
        router.push(`/modules/memory-book/UserProfile?userId=${currentUserId}` as any);
      } else {
        router.push("/modules/memory-book/UserProfile" as any);
      }
    } else if (route !== pathname) {
      router.push(route as any);
    }
  };

  const handleCreatePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/modules/memory-book/MemoryPostCreate");
  };

  const isActive = (route: string, isProfile?: boolean) => {
    if (isProfile) {
      return pathname.includes("/modules/memory-book/UserProfile");
    }
    if (route === "/modules/memory-book") {
      return pathname === route || pathname === "/modules/memory-book/";
    }
    return pathname === route;
  };

  return (
    <SafeAreaView edges={["bottom"]} style={styles.safeAreaContainer}>
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
      {/* Left Navigation Items (3 items) */}
      <View style={styles.leftNavSection}>
        {leftNavItems.map((item) => (
          <InteractiveNavItem
            key={item.id}
            icon={item.icon}
            activeIcon={item.activeIcon}
            label={item.label}
            description={item.description}
            isActive={isActive(item.route, item.isProfile)}
            onPress={() => handlePress(item.route, item.isProfile)}
            isDarkMode={isDarkMode}
            activeColor={PRIMARY_PURPLE}
            inactiveColor={colors.inactive}
          />
        ))}
      </View>

      {/* Center Floating Create Button */}
      <View style={styles.floatingAdd}>
        <Animated.View
            style={[
              styles.floatingAddOuter,
              {
                shadowColor: PRIMARY_PURPLE,
                transform: [{ scale: createButtonScale }],
              },
            ]}
          // @ts-ignore - web only
          onMouseEnter={() => {
            if (Platform.OS === "web") {
              Animated.spring(createButtonScale, {
                toValue: 1.15,
                useNativeDriver: true,
                tension: 300,
                friction: 8,
              }).start();
            }
          }}
          onMouseLeave={() => {
            if (Platform.OS === "web") {
              Animated.spring(createButtonScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 300,
                friction: 8,
              }).start();
            }
          }}
        >
          <TouchableOpacity
            style={[
              styles.floatingAddButton,
              {
                backgroundColor: PRIMARY_PURPLE,
                borderColor: PRIMARY_PURPLE + "AA",
                shadowColor: PRIMARY_PURPLE,
              },
            ]}
            onPress={handleCreatePress}
            onPressIn={() => {
              Animated.spring(createButtonScale, {
                toValue: 0.9,
                useNativeDriver: true,
                tension: 300,
                friction: 8,
              }).start();
            }}
            onPressOut={() => {
              Animated.spring(createButtonScale, {
                toValue: 1,
                useNativeDriver: true,
                tension: 300,
                friction: 8,
              }).start();
            }}
            activeOpacity={1}
            accessibilityLabel="Create new memory"
            accessibilityRole="button"
            accessibilityHint="Opens memory creation screen"
          >
            <View style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}>
              <Ionicons name="add" size={Platform.OS === "ios" ? 28 : 26} color="#FFFFFF" />
            </View>
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Right Navigation Items (3 items) */}
      <View style={styles.rightNavSection}>
        {rightNavItems.map((item) => (
          <InteractiveNavItem
            key={item.id}
            icon={item.icon}
            activeIcon={item.activeIcon}
            label={item.label}
            description={item.description}
            isActive={isActive(item.route)}
            onPress={() => handlePress(item.route)}
            isDarkMode={isDarkMode}
            activeColor={PRIMARY_PURPLE}
            inactiveColor={colors.inactive}
          />
        ))}
      </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeAreaContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 10,
  },
  bottomBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Platform.OS === "ios" ? 12 : 10,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    marginHorizontal: 12,
    marginBottom: Platform.OS === "ios" ? 8 : 4,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    minHeight: Platform.OS === "ios" ? 58 : 56,
    maxHeight: Platform.OS === "ios" ? 58 : 56,
  },
  leftNavSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
    gap: Platform.OS === "ios" ? 4 : 2,
    paddingRight: Platform.OS === "ios" ? 32 : 28,
  },
  rightNavSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
    gap: Platform.OS === "ios" ? 4 : 2,
    paddingLeft: Platform.OS === "ios" ? 32 : 28,
  },
  floatingAdd: {
    position: "absolute",
    top: Platform.OS === "ios" ? -30 : -28,
    left: "50%",
    transform: [{ translateX: -18 }], // Adjusted to move button more to the right (less negative = more right)
    zIndex: 10,
    elevation: 10,
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  floatingAddOuter: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 0, // Remove black border
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent", // Remove black background
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  floatingAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 20,
    zIndex: 400,
    // Ensure icon is perfectly centered
    padding: 0,
    margin: 0,
  },
  bottomBarItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 60,
  },
  bottomBarIconWrapper: {
    padding: 6,
    borderRadius: 999,
  },
  bottomBarLabel: {
    fontSize: 10,
    marginTop: 2,
  },
});

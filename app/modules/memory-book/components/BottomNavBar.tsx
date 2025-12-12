import React, { useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import InteractiveNavItem from "./InteractiveNavItem";

const PRIMARY_PURPLE = "#a855f7";

type BottomNavBarProps = {
  isDarkMode: boolean;
};

export default function BottomNavBar({ isDarkMode }: BottomNavBarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const colors = {
    background: isDarkMode ? "rgba(10,10,15,0.98)" : "rgba(15,23,42,0.95)",
    border: isDarkMode ? "#1F2937" : "#111827",
    active: PRIMARY_PURPLE,
    inactive: isDarkMode ? "#9CA3AF" : "#64748B",
    textSecondary: isDarkMode ? "#9CA3AF" : "#64748B",
  };

  const navItems = [
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

  const handlePress = (route: string) => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    if (route !== pathname) {
      router.push(route as any);
    }
  };

  const handleCreatePress = () => {
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push("/modules/memory-book/MemoryPostCreate");
  };

  const isActive = (route: string) => {
    if (route === "/modules/memory-book") {
      return pathname === route || pathname === "/modules/memory-book/";
    }
    return pathname === route;
  };

  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
        },
      ]}
    >
      {/* Center Floating Create Button */}
      <View style={styles.floatingAdd}>
        <Animated.View
          style={[
            styles.floatingAddOuter,
            {
              borderColor: PRIMARY_PURPLE,
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
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* Navigation Items */}
      {navItems.map((item) => (
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
  );
}

const styles = StyleSheet.create({
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: Platform.OS === "ios" ? 16 : 12,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 26,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 1,
    elevation: 10,
  },
  floatingAdd: {
    position: "absolute",
    top: -34,
    alignSelf: "center",
    zIndex: 10,
    elevation: 10,
  },
  floatingAddOuter: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  floatingAddButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    shadowOpacity: 0.9,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 25,
    zIndex: 400,
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

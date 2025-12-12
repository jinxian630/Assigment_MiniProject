import React from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";

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
      label: "Home",
      route: "/modules/memory-book",
    },
    {
      id: "timeline",
      icon: "time-outline",
      label: "Timeline",
      route: "/modules/memory-book/MemoryTimeline",
    },
    {
      id: "saved",
      icon: "bookmark-outline",
      label: "Saved",
      route: "/modules/memory-book/SavedPosts",
    },
    {
      id: "search",
      icon: "search-outline",
      label: "Search",
      route: "/modules/memory-book/UserSearch",
    },
  ];

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
        <View
          style={[
            styles.floatingAddOuter,
            {
              borderColor: PRIMARY_PURPLE,
              shadowColor: PRIMARY_PURPLE,
            },
          ]}
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
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Home */}
      <TouchableOpacity
        style={styles.bottomBarItem}
        onPress={() => handlePress(navItems[0].route)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.bottomBarIconWrapper,
            isActive(navItems[0].route) && {
              backgroundColor: PRIMARY_PURPLE + "22",
            },
          ]}
        >
          <Ionicons
            name={isActive(navItems[0].route) ? "home" : "home-outline"}
            size={20}
            color={
              isActive(navItems[0].route) ? PRIMARY_PURPLE : colors.inactive
            }
          />
        </View>
        <Text
          style={[
            styles.bottomBarLabel,
            {
              color: isActive(navItems[0].route)
                ? PRIMARY_PURPLE
                : colors.textSecondary,
              fontWeight: isActive(navItems[0].route) ? "600" : "400",
            },
          ]}
        >
          {navItems[0].label}
        </Text>
      </TouchableOpacity>

      {/* Timeline */}
      <TouchableOpacity
        style={styles.bottomBarItem}
        onPress={() => handlePress(navItems[1].route)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.bottomBarIconWrapper,
            isActive(navItems[1].route) && {
              backgroundColor: PRIMARY_PURPLE + "22",
            },
          ]}
        >
          <Ionicons
            name={isActive(navItems[1].route) ? "time" : "time-outline"}
            size={20}
            color={
              isActive(navItems[1].route) ? PRIMARY_PURPLE : colors.inactive
            }
          />
        </View>
        <Text
          style={[
            styles.bottomBarLabel,
            {
              color: isActive(navItems[1].route)
                ? PRIMARY_PURPLE
                : colors.textSecondary,
              fontWeight: isActive(navItems[1].route) ? "600" : "400",
            },
          ]}
        >
          {navItems[1].label}
        </Text>
      </TouchableOpacity>

      {/* Saved */}
      <TouchableOpacity
        style={styles.bottomBarItem}
        onPress={() => handlePress(navItems[2].route)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.bottomBarIconWrapper,
            isActive(navItems[2].route) && {
              backgroundColor: PRIMARY_PURPLE + "22",
            },
          ]}
        >
          <Ionicons
            name={isActive(navItems[2].route) ? "bookmark" : "bookmark-outline"}
            size={20}
            color={
              isActive(navItems[2].route) ? PRIMARY_PURPLE : colors.inactive
            }
          />
        </View>
        <Text
          style={[
            styles.bottomBarLabel,
            {
              color: isActive(navItems[2].route)
                ? PRIMARY_PURPLE
                : colors.textSecondary,
              fontWeight: isActive(navItems[2].route) ? "600" : "400",
            },
          ]}
        >
          {navItems[2].label}
        </Text>
      </TouchableOpacity>

      {/* Search */}
      <TouchableOpacity
        style={styles.bottomBarItem}
        onPress={() => handlePress(navItems[3].route)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.bottomBarIconWrapper,
            isActive(navItems[3].route) && {
              backgroundColor: PRIMARY_PURPLE + "22",
            },
          ]}
        >
          <Ionicons
            name={isActive(navItems[3].route) ? "search" : "search-outline"}
            size={20}
            color={
              isActive(navItems[3].route) ? PRIMARY_PURPLE : colors.inactive
            }
          />
        </View>
        <Text
          style={[
            styles.bottomBarLabel,
            {
              color: isActive(navItems[3].route)
                ? PRIMARY_PURPLE
                : colors.textSecondary,
              fontWeight: isActive(navItems[3].route) ? "600" : "400",
            },
          ]}
        >
          {navItems[3].label}
        </Text>
      </TouchableOpacity>
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
  },
  bottomBarIconWrapper: {
    padding: 6,
    borderRadius: 999,
  },
  bottomBarLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});

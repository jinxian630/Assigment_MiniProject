import React, { useRef, useState } from "react";
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const PRIMARY_PURPLE = "#a855f7";

type InteractiveNavItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  isActive: boolean;
  onPress: () => void;
  isDarkMode: boolean;
  activeColor?: string;
  inactiveColor?: string;
};

export default function InteractiveNavItem({
  icon,
  activeIcon,
  label,
  description,
  isActive,
  onPress,
  isDarkMode,
  activeColor = PRIMARY_PURPLE,
  inactiveColor,
}: InteractiveNavItemProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  const inactive = inactiveColor || (isDarkMode ? "#9CA3AF" : "#64748B");

  const handlePressIn = () => {
    setIsPressed(true);
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.spring(scaleAnim, {
      toValue: 0.85,
      useNativeDriver: true,
      tension: 300,
      friction: 8,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 300,
      friction: 8,
    }).start();
  };

  const handleMouseEnter = () => {
    if (Platform.OS === "web") {
      setShowTooltip(true);
      Animated.parallel([
        Animated.timing(tooltipOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.15,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === "web") {
      Animated.parallel([
        Animated.timing(tooltipOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: isActive ? 1.05 : 1,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        }),
        Animated.timing(glowAnim, {
          toValue: isActive ? 1 : 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start(() => setShowTooltip(false));
    }
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.6],
  });

  const glowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
        // @ts-ignore - web only
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={styles.navItem}
          accessibilityLabel={label}
          accessibilityRole="button"
          accessibilityHint={description || `Navigate to ${label}`}
        >
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isActive ? activeColor + "22" : "transparent",
                shadowColor: activeColor,
                shadowOpacity: glowOpacity,
                shadowRadius: glowRadius,
                shadowOffset: { width: 0, height: 0 },
                elevation: isActive ? 8 : 0,
              },
            ]}
          >
            <Ionicons
              name={(isActive ? activeIcon || icon : icon) as any}
              size={Platform.OS === "ios" ? 20 : 18}
              color={isActive ? activeColor : inactive}
            />
          </Animated.View>
          <Text
            style={[
              styles.label,
              {
                color: isActive ? activeColor : inactive,
                fontWeight: isActive ? "600" : "400",
              },
            ]}
          >
            {label}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Tooltip */}
      {description &&
        typeof description === "string" &&
        showTooltip &&
        Platform.OS === "web" && (
          <View style={styles.tooltip} pointerEvents="none">
            <Animated.View
              style={[
                {
                  opacity: tooltipOpacity,
                  backgroundColor: isDarkMode ? "#1F2937" : "#0F172A",
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  minWidth: 120,
                  maxWidth: 200,
                },
              ]}
              // Ensure no layout properties are animated
              collapsable={false}
            >
              <Text
                style={[
                  styles.tooltipText,
                  { color: isDarkMode ? "#E5E7EB" : "#FFFFFF" },
                ]}
              >
                {description}
              </Text>
            </Animated.View>
            <View
              style={[
                styles.tooltipArrow,
                {
                  borderTopColor: isDarkMode ? "#1F2937" : "#0F172A",
                },
              ]}
              pointerEvents="none"
            />
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    minWidth: Platform.OS === "ios" ? 48 : 44,
    maxWidth: Platform.OS === "ios" ? 70 : 65,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: Platform.OS === "ios" ? 40 : 38,
    minHeight: Platform.OS === "ios" ? 40 : 38,
    paddingVertical: Platform.OS === "ios" ? 3 : 2,
    paddingHorizontal: Platform.OS === "ios" ? 6 : 4,
  },
  iconWrapper: {
    padding: Platform.OS === "ios" ? 6 : 5,
    borderRadius: 999,
    minWidth: Platform.OS === "ios" ? 32 : 30,
    minHeight: Platform.OS === "ios" ? 32 : 30,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: Platform.OS === "ios" ? 10 : 9,
    marginTop: Platform.OS === "ios" ? 3 : 2,
    fontWeight: "500",
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    alignSelf: "center",
    marginBottom: 4,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tooltipText: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -6,
    alignSelf: "center",
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

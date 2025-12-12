import React, { useState, useRef } from "react";
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

type InteractiveButtonProps = {
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  label?: string;
  description?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  isDarkMode: boolean;
  style?: any;
  iconColor?: string;
  iconSize?: number;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

export default function InteractiveButton({
  onPress,
  icon,
  label,
  description,
  variant = "primary",
  size = "md",
  disabled = false,
  isDarkMode,
  style,
  iconColor,
  iconSize = 20,
  accessibilityLabel,
  accessibilityHint,
}: InteractiveButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const colorAnim = useRef(new Animated.Value(0)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const tooltipOpacity = useRef(new Animated.Value(0)).current;

  const colors = {
    primary: PRIMARY_PURPLE,
    secondary: isDarkMode ? "#374151" : "#E5E7EB",
    ghost: "transparent",
    danger: "#ef4444",
  };

  const textColors = {
    primary: "#FFFFFF",
    secondary: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    ghost: isDarkMode ? "#E5E7EB" : "#1E1B4B",
    danger: "#FFFFFF",
  };

  const sizes = {
    sm: { padding: 8, fontSize: 12, iconSize: 16 },
    md: { padding: 12, fontSize: 14, iconSize: 20 },
    lg: { padding: 16, fontSize: 16, iconSize: 24 },
  };

  const currentSize = sizes[size];
  const currentIconSize = iconSize || currentSize.iconSize;

  const handlePressIn = () => {
    if (disabled) return;
    setIsPressed(true);
    
    if (Platform.OS === "ios") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.92,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(colorAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 300,
        friction: 8,
      }),
      Animated.timing(colorAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handleMouseEnter = () => {
    if (Platform.OS === "web" && !disabled) {
      setShowTooltip(true);
      Animated.timing(tooltipOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.08,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        }),
        Animated.timing(shadowAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === "web") {
      Animated.timing(tooltipOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => setShowTooltip(false));
      
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 300,
          friction: 8,
        }),
        Animated.timing(shadowAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      variant === "primary"
        ? PRIMARY_PURPLE
        : variant === "danger"
        ? "#ef4444"
        : variant === "secondary"
        ? (isDarkMode ? "#374151" : "#E5E7EB")
        : "transparent",
      variant === "primary"
        ? "#9333EA"
        : variant === "danger"
        ? "#dc2626"
        : variant === "secondary"
        ? (isDarkMode ? "#4B5563" : "#D1D5DB")
        : PRIMARY_PURPLE + "20",
    ],
  });

  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const shadowRadius = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 20],
  });

  const borderColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      variant === "ghost" ? PRIMARY_PURPLE + "66" : "transparent",
      PRIMARY_PURPLE,
    ],
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={{
          transform: [{ scale: scaleAnim }],
        }}
        // @ts-ignore - web only props
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          activeOpacity={1}
          style={[
            styles.button,
            {
              padding: currentSize.padding,
              opacity: disabled ? 0.5 : 1,
            },
          ]}
          accessibilityLabel={accessibilityLabel || label}
          accessibilityRole="button"
          accessibilityHint={accessibilityHint || description}
        >
          <Animated.View
            style={[
              styles.buttonInner,
              {
                backgroundColor,
                borderColor,
                borderWidth: variant === "ghost" ? 1.5 : 0,
                shadowColor: PRIMARY_PURPLE,
                shadowOpacity,
                shadowRadius,
                shadowOffset: { width: 0, height: 4 },
                elevation: shadowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 12],
                }) as any,
              },
            ]}
          >
            {icon && (
              <Ionicons
                name={icon}
                size={currentIconSize}
                color={
                  iconColor ||
                  (variant === "ghost" && !isPressed
                    ? PRIMARY_PURPLE
                    : textColors[variant])
                }
              />
            )}
            {label && (
              <Text
                style={[
                  styles.label,
                  {
                    fontSize: currentSize.fontSize,
                    color:
                      iconColor ||
                      (variant === "ghost" && !isPressed
                        ? PRIMARY_PURPLE
                        : textColors[variant]),
                    marginLeft: icon ? 8 : 0,
                  },
                ]}
              >
                {label}
              </Text>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* Tooltip */}
      {description && showTooltip && Platform.OS === "web" && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity: tooltipOpacity,
              backgroundColor: isDarkMode ? "#1F2937" : "#0F172A",
            },
          ]}
        >
          <Text
            style={[
              styles.tooltipText,
              { color: isDarkMode ? "#E5E7EB" : "#FFFFFF" },
            ]}
          >
            {description}
          </Text>
          <View
            style={[
              styles.tooltipArrow,
              {
                borderTopColor: isDarkMode ? "#1F2937" : "#0F172A",
              },
            ]}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  button: {
    borderRadius: 12,
  },
  buttonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  label: {
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tooltip: {
    position: "absolute",
    bottom: "100%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -8 }],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
    minWidth: 120,
    maxWidth: 200,
    zIndex: 1000,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  tooltipText: {
    fontSize: 12,
    textAlign: "center",
    fontWeight: "500",
  },
  tooltipArrow: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    transform: [{ translateX: -6 }],
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});


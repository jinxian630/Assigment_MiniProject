import React, { useMemo } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "@/hooks/useTheme";

type CardVariant = "default" | "elevated" | "flat";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  style?: StyleProp<ViewStyle>; // ✅ support array styles too
  noPadding?: boolean;
}

/**
 * ✅ Card rules:
 * 1) Use theme defaults (background, radius, padding, shadows)
 * 2) BUT always allow caller to override via `style`
 *    - especially backgroundColor for module-specific UIs (Money / Task / Memory)
 */
export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = "default",
  style,
  noPadding = false,
}) => {
  const { theme } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          borderRadius: theme.card.borderRadius ?? 16,
          overflow: "hidden",
        },

        padding: {
          padding: theme.card.padding ?? 14,
        },

        // Variants
        default: {
          ...(theme.shadows?.card ?? {}),
        },

        elevated: {
          ...(theme.shadows?.large ?? {}),
        },

        flat: {
          ...(theme.shadows?.none ?? {}),
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
      }),
    [theme]
  );

  /**
   * ✅ IMPORTANT:
   * Put `style` LAST so it can override theme defaults
   * (backgroundColor, borderRadius, etc.)
   */
  const cardStyle: StyleProp<ViewStyle> = [
    styles.base,
    styles[variant],
    !noPadding && styles.padding,
    style, // ✅ last = override wins
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

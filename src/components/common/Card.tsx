import React, { useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

type CardVariant = "default" | "elevated" | "flat";

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: CardVariant;
  style?: ViewStyle;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  onPress,
  variant = "default",
  style,
  noPadding = false,
}) => {
  // your hook returns ThemeContext
  const themeCtx: any = useTheme();
  const theme = themeCtx?.theme ?? themeCtx;

  const isDarkmode =
    (typeof theme?.isDarkmode === "boolean" ? theme.isDarkmode : undefined) ??
    (typeof themeCtx?.isDarkmode === "boolean" ? themeCtx.isDarkmode : false);

  // ✅ fallback if theme.colors.cardBackground isn't defined correctly
  const fallbackCardBg = isDarkmode ? "rgba(2,6,23,0.88)" : "rgba(255,255,255,0.95)";
  const fallbackBorder = isDarkmode ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.10)";

  const cardBg = theme?.colors?.cardBackground ?? fallbackCardBg;
  const borderColor = theme?.colors?.border ?? fallbackBorder;

  const radius = theme?.card?.borderRadius ?? 12;
  const padding = theme?.card?.padding ?? 16;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        base: {
          backgroundColor: cardBg,
          borderRadius: radius,
          overflow: "hidden",
        },

        padding: {
          padding,
        },

        default: {
          ...(theme?.shadows?.card ?? {}),
        },

        elevated: {
          ...(theme?.shadows?.large ?? {}),
        },

        flat: {
          ...(theme?.shadows?.none ?? {}),
          borderWidth: 1,
          borderColor: borderColor,
        },
      }),
    [cardBg, radius, padding, theme, borderColor]
  );

  const cardStyle = [styles.base, styles[variant], !noPadding && styles.padding, style];

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.7}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

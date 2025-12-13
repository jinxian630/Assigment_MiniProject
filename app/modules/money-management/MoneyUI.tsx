import React from "react";
import { View, StyleSheet, TouchableOpacity, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Theme } from "@/constants/theme";
import { IconButton } from "@/components/common/IconButton";

/**
 * Your useTheme() returns ThemeContext value:
 * { theme, toggleTheme, ... }  :contentReference[oaicite:1]{index=1}
 *
 * This file is written to support BOTH:
 *  - passing the themeContext object (recommended)
 *  - passing the theme object directly (fallback)
 */

type ThemeLike = {
  isDarkmode?: boolean;
  colors?: {
    textPrimary?: string;
    textSecondary?: string;
    textMuted?: string;
    primary?: string;
  };
};

type ThemeContextLike = {
  theme?: ThemeLike;
  toggleTheme?: () => void;
  setTheme?: (mode: "light" | "dark") => void;
};

function unwrapTheme(input: ThemeContextLike | ThemeLike | any): ThemeLike {
  return (input?.theme ?? input) as ThemeLike;
}

export function resolveIsDarkmode(
  input: ThemeContextLike | ThemeLike | any
): boolean {
  const t = unwrapTheme(input);
  return !!t?.isDarkmode;
}

/**
 * Money module colors:
 * - Prefer global theme.colors.* if present (so text ALWAYS matches app theme)
 * - Card background/border/chips are Money-specific (for your UI)
 */
export function getMoneyColors(input: ThemeContextLike | ThemeLike | any) {
  const t = unwrapTheme(input);
  const isDarkmode = !!t?.isDarkmode;

  const textPrimary =
    t?.colors?.textPrimary ?? (isDarkmode ? "#F9FAFB" : "#0F172A");
  const textSecondary =
    t?.colors?.textSecondary ?? (isDarkmode ? "#CBD5E1" : "#334155");
  const textMuted =
    t?.colors?.textMuted ?? (isDarkmode ? "#9CA3AF" : "#64748B");

  return {
    isDarkmode,

    // ✅ Always safe text colors (prefer app theme)
    textPrimary,
    textSecondary,
    textMuted,

    // ✅ Cards/containers (Money look)
    cardBorder: isDarkmode ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.10)",
    cardBg: isDarkmode
      ? "rgba(2,6,23,0.85)" // darker, more premium
      : "rgba(255,255,255,0.95)",

    cardBorder: isDarkmode ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.10)",

    chipBg: isDarkmode ? "rgba(255,255,255,0.09)" : "rgba(15,23,42,0.06)",

    // Accents
    cyanBorder: "rgba(56,189,248,0.55)",
    danger: "#EF4444",
    success: "#22C55E",
    warning: "#F59E0B",
  };
}

/**
 * ✅ Correct theme toggle for your app:
 * - If you pass useTheme() result, this will call toggleTheme()
 * - If someone passes a legacy setTheme API, still works
 */
export function toggleThemeSafe(input: ThemeContextLike | any) {
  if (typeof input?.toggleTheme === "function") {
    input.toggleTheme();
    return;
  }

  // fallback: some pages might pass theme only; try themeContext stored inside
  if (typeof input?.theme?.toggleTheme === "function") {
    input.theme.toggleTheme();
    return;
  }

  // legacy fallback
  const t = unwrapTheme(input);
  const isDark = !!t?.isDarkmode;
  if (typeof input?.setTheme === "function")
    input.setTheme(isDark ? "light" : "dark");
}

/**
 * Optional reusable header for Money screens
 * (consistent back + title + theme toggle)
 */
export function MoneyHeader({
  title,
  onBack,
  themeContext,
  moduleColor = "#FFD93D",
}: {
  title: string;
  onBack: () => void;
  themeContext: ThemeContextLike; // pass the result of useTheme()
  moduleColor?: string;
}) {
  const ui = getMoneyColors(themeContext);

  return (
    <View style={styles.header}>
      <IconButton
        icon="arrow-back"
        variant="secondary"
        size="medium"
        onPress={onBack}
      />

      <Text
        style={[styles.headerTitle, { color: ui.textPrimary }]}
        numberOfLines={1}
      >
        {title}
      </Text>

      <TouchableOpacity
        onPress={() => toggleThemeSafe(themeContext)}
        style={[
          styles.themeToggle,
          {
            borderColor: moduleColor,
            backgroundColor: ui.isDarkmode
              ? "rgba(15,23,42,0.65)"
              : "rgba(255,255,255,0.75)",
          },
        ]}
        activeOpacity={0.85}
      >
        <Ionicons
          name={ui.isDarkmode ? "sunny-outline" : "moon-outline"}
          size={18}
          color={ui.isDarkmode ? "#FDE68A" : "#0F172A"}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Theme.spacing.lg,
    gap: Theme.spacing.sm,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
    fontSize: Theme.typography.fontSizes.xl,
    fontWeight: Theme.typography.fontWeights.bold,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});

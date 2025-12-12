// Design System Constants
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const TYPOGRAPHY = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
  xxxl: 24,
} as const;

export const FONT_WEIGHTS = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
  spring: {
    tension: 300,
    friction: 10,
  },
} as const;

export const PRIMARY_PURPLE = "#a855f7";

export const TOUCH_TARGET_SIZE = 44; // Minimum touch target for accessibility


// Consolidated constants for Memory Book module

export const PRIMARY_PURPLE = "#a855f7";
export const MODULE_PURPLE = PRIMARY_PURPLE; // Alias for consistency

// Spacing scale (4px base unit)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Typography scale
export const TYPOGRAPHY = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

// Icon sizes
export const ICON_SIZES = {
  xs: 16,
  sm: 18,
  md: 20,
  lg: 24,
  xl: 28,
  xxl: 32,
} as const;

// Button sizes
export const BUTTON_SIZES = {
  sm: {
    height: 36,
    paddingHorizontal: 12,
    fontSize: 14,
    iconSize: 16,
  },
  md: {
    height: 44,
    paddingHorizontal: 16,
    fontSize: 16,
    iconSize: 20,
  },
  lg: {
    height: 52,
    paddingHorizontal: 20,
    fontSize: 18,
    iconSize: 24,
  },
} as const;

// Touch target minimum size (44x44pt for accessibility)
export const TOUCH_TARGET_SIZE = 44;

// Character limits
export const LIMITS = {
  title: {
    max: 100,
    warning: 80,
  },
  description: {
    max: 2000,
    warning: 1800,
  },
  comment: {
    max: 500,
    warning: 450,
  },
} as const;

// Network timeouts (in milliseconds)
export const TIMEOUTS = {
  network: 10000, // 10 seconds
  ai: 8000, // 8 seconds for AI requests
  image: 30000, // 30 seconds for image uploads
} as const;

// Keyboard offsets (based on header heights)
export const KEYBOARD_OFFSETS = {
  ios: 100,
  android: 80,
  default: 60,
} as const;

// Image settings
export const IMAGE_SETTINGS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.9,
  format: "JPEG" as const,
} as const;

// Border radius scale
export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999, // For circular elements
} as const;

// Shadow presets
export const SHADOWS = {
  sm: {
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: PRIMARY_PURPLE,
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

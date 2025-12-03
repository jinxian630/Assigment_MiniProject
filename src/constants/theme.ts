import { Colors } from './Colors';
import { Spacing } from './spacing';
import { Typography } from './typography';
import { Shadows } from './shadows';

export const Theme = {
  colors: Colors,
  spacing: Spacing,
  typography: Typography,
  shadows: Shadows,

  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },

  // Component-specific defaults
  button: {
    height: 52,
    borderRadius: 8, // Tech round
    minWidth: 120,
  },

  input: {
    height: 52,
    borderRadius: 8, // Tech round
    borderWidth: 1,
  },

  card: {
    borderRadius: 12, // Tech round
    padding: 16,
  },

  iconButton: {
    size: 48,
    borderRadius: 12, // Tech round
  },

  avatar: {
    small: 32,
    medium: 48,
    large: 64,
  },
};

export default Theme;

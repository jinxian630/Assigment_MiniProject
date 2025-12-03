export const Typography = {
  fontSizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
    xxxl: 40,
    display: 48,
  },

  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.8,
  },

  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
  },
};

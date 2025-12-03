import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '@/constants/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'error' | 'info';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'primary',
  style,
}) => {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.md,
    alignSelf: 'flex-start',
  },

  // Variants
  primary: {
    backgroundColor: `${Theme.colors.primary}20`,
  },

  success: {
    backgroundColor: `${Theme.colors.success}20`,
  },

  warning: {
    backgroundColor: `${Theme.colors.warning}20`,
  },

  error: {
    backgroundColor: `${Theme.colors.error}20`,
  },

  info: {
    backgroundColor: `${Theme.colors.info}20`,
  },

  // Text styles
  text: {
    fontSize: Theme.typography.fontSizes.xs,
    fontWeight: Theme.typography.fontWeights.semibold,
  },

  text_primary: {
    color: Theme.colors.primary,
  },

  text_success: {
    color: Theme.colors.success,
  },

  text_warning: {
    color: Theme.colors.warning,
  },

  text_error: {
    color: Theme.colors.error,
  },

  text_info: {
    color: Theme.colors.info,
  },
});

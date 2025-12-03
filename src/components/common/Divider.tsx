import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Theme } from '@/constants/theme';

interface DividerProps {
  style?: ViewStyle;
  spacing?: 'none' | 'small' | 'medium' | 'large';
}

export const Divider: React.FC<DividerProps> = ({
  style,
  spacing = 'medium',
}) => {
  return (
    <View style={[styles.container, styles[spacing]]}>
      <View style={[styles.divider, style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },

  divider: {
    height: 1,
    backgroundColor: Theme.colors.border,
  },

  none: {
    marginVertical: 0,
  },

  small: {
    marginVertical: Theme.spacing.sm,
  },

  medium: {
    marginVertical: Theme.spacing.md,
  },

  large: {
    marginVertical: Theme.spacing.lg,
  },
});

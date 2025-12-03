import React, { useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';

type CardVariant = 'default' | 'elevated' | 'flat';

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
  variant = 'default',
  style,
  noPadding = false,
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    base: {
      backgroundColor: theme.colors.cardBackground,
      borderRadius: theme.card.borderRadius,
      overflow: 'hidden',
    },

    padding: {
      padding: theme.card.padding,
    },

    // Variants
    default: {
      ...theme.shadows.card,
    },

    elevated: {
      ...theme.shadows.large,
    },

    flat: {
      ...theme.shadows.none,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
  }), [theme]);

  const cardStyle = [
    styles.base,
    styles[variant],
    !noPadding && styles.padding,
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

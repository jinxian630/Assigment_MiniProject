import React, { useMemo } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

type IconButtonVariant = 'primary' | 'secondary' | 'ghost';
type IconButtonSize = 'small' | 'medium' | 'large';

interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  disabled?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  variant = 'secondary',
  size = 'medium',
  disabled = false,
  style,
}) => {
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    base: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.borderRadius.full,
    },

    // Variants
    primary: {
      backgroundColor: theme.colors.primary,
      ...theme.shadows.medium,
    },

    secondary: {
      backgroundColor: theme.colors.white,
      borderWidth: 2,
      borderColor: 'rgba(0, 0, 0, 0.08)',
      ...theme.shadows.medium,
    },

    ghost: {
      backgroundColor: 'transparent',
    },

    // Sizes
    size_small: {
      width: 36,
      height: 36,
    },

    size_medium: {
      width: theme.iconButton.size,
      height: theme.iconButton.size,
    },

    size_large: {
      width: 56,
      height: 56,
    },

    // States
    disabled: {
      backgroundColor: theme.colors.disabled,
      shadowOpacity: 0,
      elevation: 0,
    },
  }), [theme]);

  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    style,
  ];

  const iconSize = size === 'small' ? 18 : size === 'large' ? 28 : 22;

  // Icon color logic:
  // - primary: white icon on colored background
  // - secondary: dark icon on white background (always dark, regardless of theme)
  // - ghost: follows theme text color
  const iconColor =
    variant === 'primary'
      ? theme.colors.white
      : variant === 'secondary'
      ? '#1F2937' // Always dark gray for visibility on white background
      : disabled
      ? theme.colors.textDisabled
      : theme.colors.textPrimary;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Ionicons name={icon} size={iconSize} color={iconColor} />
    </TouchableOpacity>
  );
};

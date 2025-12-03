import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline';
type ButtonSize = 'small' | 'medium' | 'large';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  onPress,
  children,
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    disabled && styles.disabled,
    fullWidth && styles.fullWidth,
    style,
  ];

  const textStyleCombined = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Theme.colors.white : Theme.colors.primary}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon && (
            <Ionicons
              name={icon}
              size={20}
              color={
                variant === 'primary'
                  ? Theme.colors.white
                  : disabled
                  ? Theme.colors.textDisabled
                  : Theme.colors.primary
              }
              style={styles.icon}
            />
          )}
          <Text style={textStyleCombined}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: Theme.button.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.buttonPaddingHorizontal,
    ...Theme.shadows.medium,
  },

  // Variants
  primary: {
    backgroundColor: Theme.colors.primary,
  },

  secondary: {
    backgroundColor: Theme.colors.white,
    borderWidth: 0,
  },

  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    shadowOpacity: 0,
    elevation: 0,
  },

  // Sizes
  size_small: {
    height: 40,
    paddingHorizontal: Theme.spacing.md,
  },

  size_medium: {
    height: Theme.button.height,
  },

  size_large: {
    height: 60,
    paddingHorizontal: Theme.spacing.xl,
  },

  // States
  disabled: {
    backgroundColor: Theme.colors.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },

  fullWidth: {
    width: '100%',
  },

  // Text styles
  text: {
    fontWeight: Theme.typography.fontWeights.semibold,
    textAlign: 'center',
  },

  text_primary: {
    color: Theme.colors.textOnPrimary,
  },

  text_secondary: {
    color: Theme.colors.primary,
  },

  text_outline: {
    color: Theme.colors.primary,
  },

  textSize_small: {
    fontSize: Theme.typography.fontSizes.sm,
  },

  textSize_medium: {
    fontSize: Theme.typography.fontSizes.md,
  },

  textSize_large: {
    fontSize: Theme.typography.fontSizes.lg,
  },

  textDisabled: {
    color: Theme.colors.textDisabled,
  },

  // Icon styles
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  icon: {
    marginRight: Theme.spacing.sm,
  },
});

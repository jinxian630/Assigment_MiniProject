import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  secureTextEntry,
  ...textInputProps
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => setIsFocused(false);

  const toggleSecureEntry = () => {
    if (secureTextEntry) {
      setIsSecure(!isSecure);
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };

  const inputContainerStyle = [
    styles.inputContainer,
    isFocused && styles.inputContainerFocused,
    error && styles.inputContainerError,
  ];

  // Auto-detect if this is a password field and show eye icon
  const showSecureToggle = secureTextEntry;
  const finalRightIcon = showSecureToggle
    ? isSecure
      ? 'eye-off-outline'
      : 'eye-outline'
    : rightIcon;

  const finalRightIconPress = showSecureToggle ? toggleSecureEntry : onRightIconPress;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={inputContainerStyle}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={
              error
                ? Theme.colors.error
                : isFocused
                ? Theme.colors.primary
                : Theme.colors.textSecondary
            }
            style={styles.leftIcon}
          />
        )}

        <TextInput
          style={[styles.input, leftIcon && styles.inputWithLeftIcon]}
          placeholderTextColor={Theme.colors.textMuted}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={isSecure}
          {...textInputProps}
        />

        {finalRightIcon && (
          <TouchableOpacity
            onPress={finalRightIconPress}
            style={styles.rightIconContainer}
            disabled={!finalRightIconPress}
          >
            <Ionicons
              name={finalRightIcon}
              size={20}
              color={
                error
                  ? Theme.colors.error
                  : isFocused
                  ? Theme.colors.primary
                  : Theme.colors.textSecondary
              }
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Theme.spacing.md,
  },

  label: {
    fontSize: Theme.typography.fontSizes.sm,
    fontWeight: Theme.typography.fontWeights.medium,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.sm,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.inputBackground,
    borderRadius: Theme.input.borderRadius,
    borderWidth: Theme.input.borderWidth,
    borderColor: Theme.colors.border,
    paddingHorizontal: Theme.spacing.inputPaddingHorizontal,
    height: Theme.input.height,
    ...Theme.shadows.small,
  },

  inputContainerFocused: {
    borderColor: Theme.colors.primary,
    borderWidth: 2,
  },

  inputContainerError: {
    borderColor: Theme.colors.error,
    borderWidth: 2,
  },

  input: {
    flex: 1,
    fontSize: Theme.typography.fontSizes.md,
    color: Theme.colors.textPrimary,
    paddingVertical: Theme.spacing.inputPaddingVertical,
  },

  inputWithLeftIcon: {
    marginLeft: Theme.spacing.sm,
  },

  leftIcon: {
    marginRight: Theme.spacing.xs,
  },

  rightIconContainer: {
    padding: Theme.spacing.xs,
    marginLeft: Theme.spacing.xs,
  },

  errorText: {
    fontSize: Theme.typography.fontSizes.sm,
    color: Theme.colors.error,
    marginTop: Theme.spacing.xs,
    marginLeft: Theme.spacing.xs,
  },
});

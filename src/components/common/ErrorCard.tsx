import React, { useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

type ErrorCardVariant = 'error' | 'warning' | 'info';

interface ErrorCardProps {
  message: string;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onDismiss?: () => void;
  variant?: ErrorCardVariant;
  style?: ViewStyle;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  message,
  title,
  icon,
  onDismiss,
  variant = 'error',
  style,
}) => {
  const { theme } = useTheme();

  const variantConfig = useMemo(() => {
    const configs = {
      error: {
        color: theme.colors.error,
        icon: icon || 'alert-circle-outline',
      },
      warning: {
        color: theme.colors.warning,
        icon: icon || 'warning-outline',
      },
      info: {
        color: theme.colors.info,
        icon: icon || 'information-circle-outline',
      },
    };
    return configs[variant];
  }, [variant, icon, theme]);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      backgroundColor: `${variantConfig.color}33`, // 20% opacity
      borderRadius: theme.borderRadius.lg,
      borderLeftWidth: 4,
      borderLeftColor: variantConfig.color,
      padding: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'flex-start',
      ...theme.shadows.medium,
    },

    iconContainer: {
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },

    content: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },

    title: {
      fontSize: theme.typography.fontSizes.md,
      fontWeight: theme.typography.fontWeights.semibold,
      color: variantConfig.color,
      marginBottom: theme.spacing.xs,
    },

    message: {
      fontSize: theme.typography.fontSizes.sm,
      fontWeight: theme.typography.fontWeights.regular,
      color: theme.colors.textPrimary,
      lineHeight: 20,
    },

    closeButton: {
      padding: 4,
      marginTop: -4,
    },
  }), [theme, variantConfig]);

  return (
    <View style={[styles.container, style]}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Ionicons
          name={variantConfig.icon}
          size={24}
          color={variantConfig.color}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {title && <Text style={styles.title}>{title}</Text>}
        <Text style={styles.message}>{message}</Text>
      </View>

      {/* Close Button */}
      {onDismiss && (
        <TouchableOpacity
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name="close"
            size={20}
            color={variantConfig.color}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

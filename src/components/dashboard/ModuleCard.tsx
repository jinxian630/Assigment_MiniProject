import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Module } from '@/types/module';

interface ModuleCardProps {
  module: Module;
  onPress: () => void;
  fullWidth?: boolean;
}

export const ModuleCard: React.FC<ModuleCardProps> = ({ module, onPress, fullWidth = false }) => {
  const { theme } = useTheme();

  const styles = useMemo(() => StyleSheet.create({
    container: {
      width: '48%',
      marginBottom: theme.spacing.md,
    },
  
    fullWidth: {
      width: '100%',
    },
  
    content: {
      backgroundColor: theme.colors.cardBackground, // Glassmorphism
      borderRadius: theme.card.borderRadius,
      padding: theme.spacing.md,
      minHeight: 140,
      borderWidth: 1,
      borderColor: `${module.color}40`,
      ...theme.shadows.card,
      overflow: 'hidden',
    },
  
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      backgroundColor: `${module.color}10`,
      borderColor: `${module.color}50`,
      shadowColor: module.color,
      // Glow effect
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 4,
    },
  
    textContainer: {
      flex: 1,
    },
  
    title: {
      fontSize: theme.typography.fontSizes.md,
      fontWeight: theme.typography.fontWeights.bold,
      marginBottom: theme.spacing.xs,
      fontFamily: 'monospace', // Tech font
      letterSpacing: 0.5,
      color: theme.colors.textPrimary,
    },
  
    description: {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.colors.textSecondary,
      lineHeight: 16,
    },
  
    accent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 2, // Thinner neon line
      backgroundColor: module.color,
      shadowColor: module.color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 5,
      elevation: 3,
    },
  }), [theme, module.color]);

  return (
    <TouchableOpacity 
      style={[styles.container, fullWidth && styles.fullWidth]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Icon Container with Glow */}
        <View style={styles.iconContainer}>
          <Ionicons
            name={module.icon as any}
            size={28}
            color={module.color}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {module.title}
          </Text>
          <Text style={styles.description} numberOfLines={2}>
            {module.description}
          </Text>
        </View>

        {/* Neon Accent Line (Bottom) */}
        <View style={styles.accent} />
      </View>
    </TouchableOpacity>
  );
};

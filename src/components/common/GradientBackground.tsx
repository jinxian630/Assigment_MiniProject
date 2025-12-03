import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  colors?: readonly [string, string, ...string[]];
  style?: ViewStyle;
}

export const GradientBackground: React.FC<GradientBackgroundProps> = ({
  children,
  colors,
  style,
}) => {
  const { theme } = useTheme();
  const gradientColors = colors || [theme.colors.gradientStart, theme.colors.gradientEnd];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[StyleSheet.absoluteFill, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({});

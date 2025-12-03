import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconButton } from '@/components/common/IconButton';
import { useTheme } from '@/hooks/useTheme';

interface WelcomeHeaderProps {
  userName: string;
}

export const WelcomeHeader: React.FC<WelcomeHeaderProps> = ({ userName }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const [displayedGreeting, setDisplayedGreeting] = useState('');
  const fullGreeting = `> SYSTEM_READY: User_Login...`;

  useEffect(() => {
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex <= fullGreeting.length) {
        setDisplayedGreeting(fullGreeting.slice(0, currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 50); // Typing speed

    return () => clearInterval(interval);
  }, []);

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingVertical: theme.spacing.md,
    },

    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },

    avatarContainer: {
      position: 'relative',
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: theme.spacing.md,
    },

    avatarRing: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      borderRadius: 28,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      opacity: 0.6,
      // Add glow effect
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 5,
    },

    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: `${theme.colors.primary}50`,
    },

    greetingContainer: {
      flex: 1,
    },

    greeting: {
      fontSize: theme.typography.fontSizes.xs,
      color: theme.colors.primary, // Neon Cyan
      fontFamily: 'monospace', // Terminal style
      marginBottom: 2,
    },

    userName: {
      fontSize: theme.typography.fontSizes.lg,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeights.bold,
      textShadowColor: theme.colors.primary,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 10,
    },

    rightSection: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },

    notificationButton: {
      backgroundColor: `${theme.colors.textPrimary}15`, // Increased opacity for better visibility
      borderWidth: 1,
      borderColor: `${theme.colors.textPrimary}30`, // Increased border visibility
    },
  }), [theme]);

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {/* Avatar with Glowing Ring */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatarRing} />
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={theme.colors.primary} />
          </View>
        </View>

        {/* Terminal Greeting */}
        <View style={styles.greetingContainer}>
          <Text style={styles.greeting}>{displayedGreeting}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>

      {/* Right Section with Actions */}
      <View style={styles.rightSection}>
        {/* Theme Toggle */}
        <IconButton
          icon={isDarkMode ? "moon" : "sunny"}
          onPress={toggleTheme}
          variant="ghost"
          size="medium"
          style={styles.notificationButton}
        />

        {/* Notification Button */}
        <IconButton
          icon="notifications-outline"
          onPress={() => {}}
          variant="ghost"
          size="medium"
          style={styles.notificationButton}
        />
      </View>
    </View>
  );
};

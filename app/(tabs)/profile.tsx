import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GradientBackground } from '@/components/common/GradientBackground';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Divider } from '@/components/common/Divider';
import { useAuth } from '@/hooks/useAuth';
import { useRegistration } from '@/contexts/RegistrationContext';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { resetRegistration } = useRegistration();
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const router = useRouter();

  const styles = React.useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.xxl,
    },
    header: {
      marginBottom: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSizes.xxxl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
    },
    userCard: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      marginBottom: theme.spacing.xl,
    },
    avatarContainer: {
      marginBottom: theme.spacing.md,
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: `${theme.colors.primary}20`,
      alignItems: 'center',
      justifyContent: 'center',
      ...theme.shadows.medium,
    },
    userName: {
      fontSize: theme.typography.fontSizes.xl,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.xs,
    },
    userEmail: {
      fontSize: theme.typography.fontSizes.md,
      color: theme.colors.textSecondary,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSizes.lg,
      fontWeight: theme.typography.fontWeights.bold,
      color: theme.colors.textPrimary,
      marginBottom: theme.spacing.md,
    },
    settingItem: {
      borderRadius: 0,
      borderWidth: 0,
    },
    settingContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    settingTitle: {
      fontSize: theme.typography.fontSizes.md,
      color: theme.colors.textPrimary,
      fontWeight: theme.typography.fontWeights.medium,
      marginLeft: theme.spacing.md,
    },
    logoutSection: {
      marginTop: theme.spacing.lg,
    },
  }), [theme]);

  const handleLogout = async () => {
    // Web-compatible confirmation
    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to logout?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Logout', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) {
      console.log('🚫 Logout cancelled');
      return;
    }

    try {
      console.log('🚪 Logout confirmed');

      // Step 1: Clear registration data (security: remove cached credentials)
      resetRegistration();
      console.log('✅ Registration context cleared');

      // Step 2: Perform logout (clears auth state, triggers navigation)
      await logout();
      console.log('✅ Logout completed');

      // Navigation to Welcome happens automatically via RootNavigator

    } catch (error) {
      console.error('❌ Logout error:', error);

      // Show user-friendly error (web-compatible)
      if (Platform.OS === 'web') {
        window.alert('An error occurred during logout. Please try again.');
      } else {
        Alert.alert(
          'Logout Error',
          'An error occurred during logout. Please try again.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleSettingPress = (title: string) => {
    Alert.alert('Coming Soon', `${title} will be available soon!`);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Profile</Text>
          </View>

          {/* User Info Card */}
          <Card style={styles.userCard}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={theme.colors.primary} />
              </View>
            </View>
            <Text style={styles.userName}>{user?.displayName || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
          </Card>

          {/* Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>

            <Card noPadding>
              <ThemeToggleItem
                icon={isDarkMode ? "moon" : "sunny"}
                title={isDarkMode ? "Dark Mode" : "Light Mode"}
                isDarkMode={isDarkMode}
                onToggle={toggleTheme}
                theme={theme}
                styles={styles}
              />
              <Divider spacing="none" />
              <SettingItem
                icon="person-outline"
                title="Edit Profile"
                onPress={() => handleSettingPress('Edit Profile')}
                theme={theme}
                styles={styles}
              />
              <Divider spacing="none" />
              <SettingItem
                icon="notifications-outline"
                title="Notifications"
                onPress={() => handleSettingPress('Notifications')}
                theme={theme}
                styles={styles}
              />
              <Divider spacing="none" />
              <SettingItem
                icon="lock-closed-outline"
                title="Privacy"
                onPress={() => handleSettingPress('Privacy')}
                theme={theme}
                styles={styles}
              />
              <Divider spacing="none" />
              <SettingItem
                icon="help-circle-outline"
                title="Help & Support"
                onPress={() => handleSettingPress('Help & Support')}
                theme={theme}
                styles={styles}
              />
            </Card>
          </View>

          {/* Logout Button */}
          <View style={styles.logoutSection}>
            <Button
              variant="outline"
              onPress={handleLogout}
              fullWidth
              icon="log-out-outline"
            >
              Logout
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

interface ThemeToggleItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  isDarkMode: boolean;
  onToggle: () => void;
  theme: any;
  styles: any;
}

const ThemeToggleItem: React.FC<ThemeToggleItemProps> = ({ icon, title, isDarkMode, onToggle, theme, styles }) => (
  <Card noPadding variant="flat" style={styles.settingItem}>
    <View style={styles.settingContent}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Switch
        value={isDarkMode}
        onValueChange={onToggle}
        trackColor={{ false: '#D1D5DB', true: theme.colors.primary }}
        thumbColor={isDarkMode ? '#FFFFFF' : '#F3F4F6'}
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  </Card>
);

interface SettingItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  theme: any;
  styles: any;
}

const SettingItem: React.FC<SettingItemProps> = ({ icon, title, onPress, theme, styles }) => (
  <Card onPress={onPress} noPadding variant="flat" style={styles.settingItem}>
    <View style={styles.settingContent}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon} size={22} color={theme.colors.textPrimary} />
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </View>
  </Card>
);

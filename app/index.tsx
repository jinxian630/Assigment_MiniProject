import { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { Theme } from '@/constants/theme';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    console.log('🔄 Navigation effect triggered:', {
      isLoading,
      isAuthenticated,
      navigationKey: navigationState?.key,
      segments,
    });

    if (isLoading) {
      console.log('⏳ Still loading, skipping navigation');
      return;
    }
    if (!navigationState?.key) {
      console.log('⏳ Navigation not ready, skipping');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('📊 Current location:', { inAuthGroup, inTabsGroup });

    if (isAuthenticated && !inTabsGroup) {
      // Redirect to main app if authenticated
      console.log('✈️ Redirecting to /(tabs)');
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthGroup) {
      // Redirect to auth flow if not authenticated
      console.log('✈️ Redirecting to /(auth)/welcome');
      router.replace('/(auth)/welcome');
    } else {
      console.log('✅ Already in correct location');
    }
  }, [isAuthenticated, isLoading, segments, navigationState?.key]);

  // Show loading screen while checking auth status or navigation readiness
  if (isLoading || !navigationState?.key) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Theme.colors.gradientStart,
  },
});

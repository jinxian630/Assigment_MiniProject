import { useEffect } from 'react';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { AuthProvider, AuthContext } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { RegistrationProvider } from '@/contexts/RegistrationContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useContext } from 'react';

function RootNavigator() {
  const { isAuthenticated, isLoading } = useContext(AuthContext)!;
  const router = useRouter();
  const segments = useSegments();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('🔄 Auth redirect check:', {
      isAuthenticated,
      isLoading,
      inAuthGroup,
      inTabsGroup,
      segments
    });

    // Don't redirect while loading
    if (isLoading) {
      return;
    }

    // Force redirect to welcome when logged out (from any location)
    if (!isAuthenticated) {
      if (!inAuthGroup) {
        console.log('✈️ Not authenticated, redirecting to welcome');
        router.replace('/(auth)/welcome');
      }
    }
    // Redirect to tabs when logged in (but not if in modules)
    else if (isAuthenticated) {
      if (!inTabsGroup && segments[0] !== 'modules') {
        console.log('✈️ Authenticated, redirecting to tabs');
        router.replace('/(tabs)');
      }
    }
  }, [isAuthenticated, isLoading, segments, navigationState?.key, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="modules" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RegistrationProvider>
        <ThemeProvider>
          <SafeAreaProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </SafeAreaProvider>
        </ThemeProvider>
      </RegistrationProvider>
    </AuthProvider>
  );
}

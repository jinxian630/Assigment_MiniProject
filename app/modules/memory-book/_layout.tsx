import { Stack } from "expo-router";

export default function MemoryBookLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
      <Stack.Screen name="index" />
      <Stack.Screen name="MemoryTimeline" />
      <Stack.Screen name="MemoryPostCreate" />
      <Stack.Screen name="MemoryPostDetail" />
      <Stack.Screen name="UserProfile" />
      <Stack.Screen name="UserSearch" />
      <Stack.Screen name="SavedPosts" />
      <Stack.Screen name="AIInsightsPage" />
    </Stack>
  );
}

import { Stack } from 'expo-router';

export default function ModulesLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="health-fitness" />
      <Stack.Screen name="memory-book" />
      <Stack.Screen name="money-management" />
      <Stack.Screen name="task-management" />
    </Stack>
  );
}

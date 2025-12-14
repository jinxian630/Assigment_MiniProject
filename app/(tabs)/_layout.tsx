import { Tabs } from "expo-router";
import { TabBar } from "@/components/navigation/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        lazy: false, // ✅ IMPORTANT
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="modules" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

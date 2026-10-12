import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { useTheme } from '@/lib/theme';

type GlyphName = keyof typeof Ionicons.glyphMap;

/** Web has no system tab bar, so mirror the iOS look with JS tabs. */
export default function WebTabLayout() {
  const t = useTheme();
  const icon = (name: GlyphName, active: GlyphName) => {
    const TabIcon = ({ color, focused }: { color: ColorValue; focused: boolean }) => (
      <Ionicons name={focused ? active : name} size={23} color={color as string} />
    );
    return TabIcon;
  };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.text3,
        tabBarStyle: {
          backgroundColor: t.scheme === 'dark' ? 'rgba(20,20,20,0.92)' : 'rgba(255,255,255,0.92)',
          borderTopColor: t.separator,
          height: 70,
          paddingTop: 6,
          paddingBottom: 12,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', lineHeight: 15 },
        sceneStyle: { backgroundColor: t.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('sunny-outline', 'sunny') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: icon('calendar-outline', 'calendar') }} />
      <Tabs.Screen name="nutrition" options={{ title: 'Macros', tabBarIcon: icon('restaurant-outline', 'restaurant') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('trending-up-outline', 'trending-up') }} />
    </Tabs>
  );
}

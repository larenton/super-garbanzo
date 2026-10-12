import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

function useHydrated() {
  return useSyncExternalStore(
    (onChange) => useStore.persist.onFinishHydration(onChange),
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}

export default function RootLayout() {
  const t = useTheme();
  const hydrated = useHydrated();
  const onboarded = useStore((s) => s.settings.onboarded);

  const navTheme = t.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...navTheme,
    colors: { ...navTheme.colors, primary: t.accent, background: t.bg, card: t.bg, text: t.text, border: t.separator },
  };

  if (!hydrated) return <View style={{ flex: 1, backgroundColor: t.bg }} />;

  const modal = { presentation: 'modal' as const, headerShown: false };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={theme}>
        <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerShadowVisible: false,
            headerStyle: { backgroundColor: t.bg },
            headerTintColor: t.accent,
            headerTitleStyle: { color: t.text },
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: t.bg },
          }}
        >
          <Stack.Protected guard={onboarded}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Today' }} />
            <Stack.Screen name="session/[date]" options={{ title: '' }} />
            <Stack.Screen name="log/[id]" options={{ title: 'Session' }} />
            <Stack.Screen name="exercise/[id]" options={{ title: '' }} />
            <Stack.Screen name="plan-edit" options={{ title: 'Edit plan' }} />
            <Stack.Screen name="template/[id]" options={{ title: 'Workout' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
            <Stack.Screen name="workout" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
            <Stack.Screen name="log-activity" options={modal} />
            <Stack.Screen name="food-add" options={modal} />
            <Stack.Screen name="goal-add" options={modal} />
            <Stack.Screen name="weight-add" options={modal} />
            <Stack.Screen name="exercise-picker" options={modal} />
          </Stack.Protected>
          <Stack.Protected guard={!onboarded}>
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          </Stack.Protected>
        </Stack>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

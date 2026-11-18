import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Stack, usePathname, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useColorScheme, Platform, View } from 'react-native';
import { useFonts } from 'expo-font';
import { useEffect } from 'react';

import { AuthProvider } from '@/components/AuthProvider';
import { BottomTabBar } from '@/components/BottomTabBar';
import { LanguageProvider } from '@/lib/i18n';
import { ScoreBoardTheme } from '@/constants/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  const segments = useSegments();

  const [fontsLoaded, fontError] = useFonts({
    Digital7: require('@/assets/fonts/digital-7.ttf'),
    Digital7Mono: require('@/assets/fonts/digital-7-mono.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    // Lock app to portrait on launch
    if (Platform.OS !== 'web') {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  const isScoreboardRoute =
    pathname?.includes('/scoreboard') || (segments as string[]).includes('scoreboard');

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <LanguageProvider>
        <AuthProvider>
          <View style={{ flex: 1, backgroundColor: ScoreBoardTheme.background }}>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="match/[id]/scoreboard"
                  options={{
                    headerShown: false,
                    orientation: "landscape",
                  }}
                />
              </Stack>
            </View>
            {!isScoreboardRoute && <BottomTabBar />}
          </View>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

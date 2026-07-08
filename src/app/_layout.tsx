import '@/global.css';

import {
  BarlowCondensed_400Regular,
  BarlowCondensed_500Medium,
  BarlowCondensed_700Bold,
} from '@expo-google-fonts/barlow-condensed';
import { Fraunces_400Regular_Italic, Fraunces_600SemiBold_Italic } from '@expo-google-fonts/fraunces';
import {
  IBMPlexMono_400Regular,
  IBMPlexMono_500Medium,
  IBMPlexMono_600SemiBold,
} from '@expo-google-fonts/ibm-plex-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect } from 'react';
import { View, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/lib/store';
import { ThemeProvider, useResolvedTheme } from '@/theme/ThemeProvider';
import { currentPalette } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

/** Reads the resolved (state-aware) theme, so it can only render inside StoreProvider. */
function RootStack() {
  const { c } = useResolvedTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.paper },
        animation: 'fade',
      }}
    />
  );
}

export default function RootLayout() {
  // used only for the pre-store splash frame, before ThemeProvider can read state
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = currentPalette(scheme);
  const [loaded] = useFonts({
    BarlowCondensed_400Regular,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
    Fraunces_400Regular_Italic,
    Fraunces_600SemiBold_Italic,
    IBMPlexMono_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>
          <RootStack />
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

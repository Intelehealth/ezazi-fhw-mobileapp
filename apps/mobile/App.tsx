import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, Lato_400Regular, Lato_700Bold } from '@expo-google-fonts/lato';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/core/ui/ThemeContext';
import '@/core/i18n';

// Keep the native splash up until Lato is loaded — core/ui/Text.tsx assumes
// Lato_400Regular/Lato_700Bold are already registered, so nothing should
// render (and fall back to the system font for a frame) before that.
void SplashScreen.preventAutoHideAsync();

// Note: Drizzle needs no DB provider — import `db` from '@/core/db' and read via
// `useLiveQuery` in components. When the DB gains its first consumer, gate the
// app on `useMigrations(db, migrations)` here to apply drizzle/ migrations on boot.
export default function App() {
  const [fontsLoaded] = useFonts({ Lato_400Regular, Lato_700Bold });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

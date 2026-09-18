import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/core/ui/ThemeContext';
import '@/core/i18n';

// Note: Drizzle needs no DB provider — import `db` from '@/core/db' and read via
// `useLiveQuery` in components. When the DB gains its first consumer, gate the
// app on `useMigrations(db, migrations)` here to apply drizzle/ migrations on boot.
export default function App() {
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

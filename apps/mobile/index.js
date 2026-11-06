// Polyfill Intl.PluralRules before anything else so i18next does not fall back
// to compatibilityJSON v3. Required because Hermes in Expo Go ships without
// full ICU data, leaving Intl.PluralRules undefined at runtime.
import 'intl-pluralrules';

// The labour card engine's wake-up (modules/card-alarm): after every alarm, boot, app update or clock
// change, the native CardScanService runs this task while it keeps the device awake. Registered at boot,
// outside the component tree, so it runs with the app closed too.
import { AppRegistry } from 'react-native';
import { CARD_SCAN_TASK, runCardScanTask } from '@/core/services/monitor';
AppRegistry.registerHeadlessTask(CARD_SCAN_TASK, () => runCardScanTask);

// notify-kit: only one onBackgroundEvent may exist app-wide. No alarm runs through notify-kit any more;
// this only receives taps on notifications (new card, low battery), which need no background work.
import notifee from 'react-native-notify-kit';
notifee.onBackgroundEvent(async () => {});

// `expo/AppEntry`'s hardcoded `../../App` import breaks once node_modules is
// hoisted to the monorepo root, so register the root component directly.
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);

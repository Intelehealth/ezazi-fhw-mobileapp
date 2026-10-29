// Polyfill Intl.PluralRules before anything else so i18next does not fall back
// to compatibilityJSON v3. Required because Hermes in Expo Go ships without
// full ICU data, leaving Intl.PluralRules undefined at runtime.
import 'intl-pluralrules';

// Registers what the Android foreground service runs. Must happen at boot,
// outside the component tree, so the OS can re-invoke it after a restart.
import { registerMonitorForegroundServiceHandler } from '@/core/services/monitor/foregroundService';
registerMonitorForegroundServiceHandler();

// Only one onBackgroundEvent handler may exist app-wide (notify-kit docs) —
// this is the AlarmManager-backed trigger firing, the reliable layer that
// survives backgrounding where the JS-timer heartbeat above does not.
// batteryGuard's own trigger is a second, independent alarm chain (own
// channel/notification id), but it has to share this one handler — adding
// an `else if` branch here, not touching the monitor branch above it.
import notifee, { EventType } from 'react-native-notify-kit';
import { handleTriggerDelivered } from '@/core/services/monitor/backboneTrigger';
import { MONITOR_TRIGGER_NOTIFICATION_ID } from '@/core/services/monitor/constants';
import { handleCheckTriggerDelivered, BATTERY_TRIGGER_NOTIFICATION_ID } from '@/core/services/batteryGuard/batteryGuard';
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type !== EventType.DELIVERED) return;
  if (detail.notification?.id === MONITOR_TRIGGER_NOTIFICATION_ID) {
    await handleTriggerDelivered();
  } else if (detail.notification?.id === BATTERY_TRIGGER_NOTIFICATION_ID) {
    await handleCheckTriggerDelivered();
  }
});

// `expo/AppEntry`'s hardcoded `../../App` import breaks once node_modules is
// hoisted to the monorepo root, so register the root component directly.
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);

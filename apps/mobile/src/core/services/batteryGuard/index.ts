import { useEffect } from 'react';
import notifee, { EventType } from 'react-native-notify-kit';
import { logger } from '@/core/utils/logger';
import {
  acknowledgeDialog,
  BATTERY_TRIGGER_NOTIFICATION_ID,
  checkPendingDialog,
  handleCheckTriggerDelivered,
  startBatteryGuard,
  stopBatteryGuard,
} from './batteryGuard';
import { useBatteryGuardStore } from './batteryGuard.store';

/**
 * Long-lived singleton, started once from the composition root (App.tsx) —
 * same gating as useMonitorService (only while `enabled`, i.e. authenticated)
 * and the same reason: no battery guard before a health worker is logged in.
 */
export function useBatteryGuard(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    void startBatteryGuard();

    // A dialog triggered while the app wasn't open (killed, or the check
    // fired in the background) shows now instead, the first time the app
    // is opened/re-authenticated.
    void checkPendingDialog().then((percent) => {
      if (percent !== null) {
        useBatteryGuardStore.getState().showDialog(percent);
      }
    });

    // Same foreground/background split as the labour-monitor trigger —
    // index.js's onBackgroundEvent only catches a delivery while backgrounded.
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DELIVERED && detail.notification?.id === BATTERY_TRIGGER_NOTIFICATION_ID) {
        void handleCheckTriggerDelivered();
      }
    });

    return () => {
      unsubscribe();
      void stopBatteryGuard();
    };
  }, [enabled]);
}

/** Dialog dismiss handler — stops it reappearing on the next app open. */
export function useDismissLowBatteryDialog(): () => void {
  const hideDialog = useBatteryGuardStore((s) => s.hideDialog);
  return () => {
    hideDialog();
    void acknowledgeDialog().catch((error) => logger.error('[batteryGuard] acknowledgeDialog failed', error));
  };
}

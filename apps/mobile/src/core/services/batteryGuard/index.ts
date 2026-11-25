import { useEffect, useRef } from 'react';
import { logger } from '@/core/utils/logger';
import { acknowledgeDialog, checkPendingDialog, startBatteryGuard, stopBatteryGuard } from './batteryGuard';
import { useBatteryGuardStore } from './batteryGuard.store';

/**
 * Long-lived singleton, started once from the composition root (App.tsx) —
 * same gating as useMonitorService (only while `enabled`, i.e. authenticated)
 * and the same reason: no battery guard before a health worker is logged in.
 */
export function useBatteryGuard(enabled: boolean): void {
  // Only logout (`enabled` true → false) stops the guard, as with useMonitorService: an unmount alone
  // (the app swiped away from Recents) leaves the process and the login running.
  const enabledRef = useRef(enabled);
  useEffect(() => {
    if (enabledRef.current && !enabled) void stopBatteryGuard();
    enabledRef.current = enabled;
  }, [enabled]);

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
    // The checks themselves run from the native battery alarm (monitor/cardScanTask.ts), app open or not.
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

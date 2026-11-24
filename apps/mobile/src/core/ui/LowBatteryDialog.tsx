import React from 'react';
import { useTranslation } from 'react-i18next';

import { useBatteryGuardStore } from '@/core/services/batteryGuard/batteryGuard.store';
import { useDismissLowBatteryDialog } from '@/core/services/batteryGuard';

import { ConfirmDialog } from './ConfirmDialog';

/**
 * One-time low-battery nudge — shown the first time battery crosses 35%
 * while unplugged. Mounted once at the composition root (see RootNavigator),
 * same as ApiProgressOverlay, so it's visible regardless of which screen is
 * active. Figma has no frame for it, so it is the app dialog (UI_CONVENTIONS §5), warning tone.
 */
export const LowBatteryDialog: React.FC = () => {
  const { t } = useTranslation();
  const dialogVisible = useBatteryGuardStore((s) => s.dialogVisible);
  const dialogPercent = useBatteryGuardStore((s) => s.dialogPercent);
  const dismiss = useDismissLowBatteryDialog();

  return (
    <ConfirmDialog
      visible={dialogVisible}
      tone="warning"
      title={t('batteryGuard.dialog.title')}
      message={t('batteryGuard.dialog.message', { percent: dialogPercent })}
      confirmLabel={t('batteryGuard.dialog.dismiss')}
      confirmAccessibilityLabel={t('batteryGuard.dialog.a11y.dismiss')}
      onConfirm={dismiss}
      onClose={dismiss}
    />
  );
};

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

import { ConfirmDialog } from './ConfirmDialog';
import { Text } from './Text';

interface Props {
  visible: boolean;
  /** True when at least one permission is permanently denied — user must go to Settings. */
  isPermanentlyDenied: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
  /** QA locator; its buttons are `-cancel` and `-confirm`. */
  testID?: string;
}

// Mirrors the legacy PermissionRequiredDialog
const PERMISSIONS_LIST = [
  { icon: '📷', labelKey: 'permissions.camera', reasonKey: 'permissions.cameraReason' },
  { icon: '📂', labelKey: 'permissions.storage', reasonKey: 'permissions.storageReason' },
  { icon: '👤', labelKey: 'permissions.contacts', reasonKey: 'permissions.contactsReason' },
  { icon: '🔔', labelKey: 'permissions.notifications', reasonKey: 'permissions.notificationsReason' },
] as const;

/**
 * The permissions gate, as Android's PermissionRequiredDialog: why each permission is needed, "Close Now" and
 * "Retry" (or "Open Settings" when one is permanently denied). Figma has no frame for it, so it is the app dialog
 * (UI_CONVENTIONS §5) as a gate: no ✕; the device Back button closes the app, as Close Now does.
 */
export const PermissionDeniedDialog: React.FC<Props> = ({
  visible,
  isPermanentlyDenied,
  onRetry,
  onOpenSettings,
  onClose,
  testID,
}) => {
  const { t } = useTranslation();
  const { fs } = useResponsive();

  return (
    <ConfirmDialog
      visible={visible}
      tone="warning"
      title={t('permissions.title')}
      message={isPermanentlyDenied ? t('permissions.descriptionPermanent') : t('permissions.descriptionDenied')}
      note={isPermanentlyDenied ? t('permissions.settingsHint') : undefined}
      cancelLabel={t('permissions.closeNow')}
      cancelAccessibilityLabel={t('permissions.a11y.closeApp')}
      confirmLabel={isPermanentlyDenied ? t('permissions.openSettings') : t('permissions.retry')}
      confirmAccessibilityLabel={isPermanentlyDenied ? t('permissions.a11y.openSettings') : t('permissions.a11y.retry')}
      onCancel={onClose}
      onConfirm={isPermanentlyDenied ? onOpenSettings : onRetry}
      onClose={onClose}
      hideClose
      testID={testID}
    >
      <View style={styles.list}>
        {PERMISSIONS_LIST.map((p) => (
          <View key={p.labelKey} style={styles.row}>
            <Text style={{ fontSize: fs('confirmTitle') }}>{p.icon}</Text>
            <View style={styles.text}>
              <Text style={[styles.label, { fontSize: fs('confirmMessage') }]}>{t(p.labelKey)}</Text>
              <Text style={[styles.reason, { fontSize: fs('confirmNote') }]}>{t(p.reasonKey)}</Text>
            </View>
          </View>
        ))}
      </View>
    </ConfirmDialog>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  text: {
    flex: 1,
  },
  label: {
    fontWeight: '700',
    color: colors.primaryTextFigma,
  },
  reason: {
    color: colors.secondaryTextFigma,
  },
});

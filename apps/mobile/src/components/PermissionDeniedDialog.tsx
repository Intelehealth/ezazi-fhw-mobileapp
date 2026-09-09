import React from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

interface Props {
  visible: boolean;
  /** True when at least one permission is permanently denied — user must go to Settings. */
  isPermanentlyDenied: boolean;
  onRetry: () => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

// Mirrors the legacy PermissionRequiredDialog
const PERMISSIONS_LIST = [
  { icon: '📷', labelKey: 'permissions.camera', reasonKey: 'permissions.cameraReason' },
  { icon: '📂', labelKey: 'permissions.storage', reasonKey: 'permissions.storageReason' },
  { icon: '👤', labelKey: 'permissions.contacts', reasonKey: 'permissions.contactsReason' },
  { icon: '🔔', labelKey: 'permissions.notifications', reasonKey: 'permissions.notificationsReason' },
] as const;

export const PermissionDeniedDialog: React.FC<Props> = ({
  visible,
  isPermanentlyDenied,
  onRetry,
  onOpenSettings,
  onClose,
}) => {
  const { t } = useTranslation();
  const { cornerRadius } = useResponsive();

  const primaryAction = isPermanentlyDenied ? onOpenSettings : onRetry;
  const primaryLabel  = isPermanentlyDenied
    ? t('permissions.openSettings')
    : t('permissions.retry');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: cornerRadius }]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{t('permissions.title')}</Text>
          </View>

          {/* Body */}
          <View style={styles.body}>
            <Text style={styles.description}>
              {isPermanentlyDenied
                ? t('permissions.descriptionPermanent')
                : t('permissions.descriptionDenied')}
            </Text>

            <View style={styles.permList}>
              {PERMISSIONS_LIST.map((p) => (
                <View key={p.labelKey} style={styles.permRow}>
                  <Text style={styles.permIcon}>{p.icon}</Text>
                  <View style={styles.permText}>
                    <Text style={styles.permLabel}>{t(p.labelKey)}</Text>
                    <Text style={styles.permReason}>{t(p.reasonKey)}</Text>
                  </View>
                </View>
              ))}
            </View>

            {isPermanentlyDenied && (
              <Text style={styles.settingsHint}>{t('permissions.settingsHint')}</Text>
            )}
          </View>

          {/* Actions — mirrors Android "Retry Again" / "Close Now" */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('permissions.a11y.closeApp')}
            >
              <Text style={[styles.btnText, styles.btnTextOutline]}>
                {t('permissions.closeNow')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.btnFilled]}
              onPress={primaryAction}
              accessibilityRole="button"
              accessibilityLabel={
                isPermanentlyDenied
                  ? t('permissions.a11y.openSettings')
                  : t('permissions.a11y.retry')
              }
            >
              <Text style={[styles.btnText, styles.btnTextFilled]}>
                {primaryLabel}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.dialogOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    overflow: 'hidden',
    elevation: 8,
    ...Platform.select({
      ios: {
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
    }),
  },

  header: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },

  title: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },

  description: {
    fontSize: 13,
    color: colors.dialogText,
    lineHeight: 19,
    marginBottom: 14,
  },

  permList: {
    gap: 10,
  },

  permRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },

  permIcon: {
    fontSize: 18,
    lineHeight: 22,
    width: 24,
    textAlign: 'center',
  },

  permText: {
    flex: 1,
  },

  permLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.dialogTextStrong,
  },

  permReason: {
    fontSize: 12,
    color: colors.dialogTextMuted,
    lineHeight: 17,
    marginTop: 1,
  },

  settingsHint: {
    marginTop: 14,
    fontSize: 12,
    color: colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: 16,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  btnOutline: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: colors.border,
  },

  btnFilled: {
    backgroundColor: colors.primary,
  },

  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  btnTextOutline: {
    color: colors.dialogTextMuted,
  },

  btnTextFilled: {
    color: colors.white,
  },
});

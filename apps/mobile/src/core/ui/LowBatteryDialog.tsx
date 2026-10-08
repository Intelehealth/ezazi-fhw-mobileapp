import React from 'react';
import { Modal, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from './Text';
import { colors } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { useBatteryGuardStore } from '@/core/services/batteryGuard/batteryGuard.store';
import { useDismissLowBatteryDialog } from '@/core/services/batteryGuard';

/**
 * One-time low-battery nudge — shown the first time battery crosses 35%
 * while unplugged. Mounted once at the composition root (see RootNavigator),
 * same as ApiProgressOverlay, so it's visible regardless of which screen is
 * active.
 */
export const LowBatteryDialog: React.FC = () => {
  const { t } = useTranslation();
  const { cornerRadius } = useResponsive();
  const dialogVisible = useBatteryGuardStore((s) => s.dialogVisible);
  const dialogPercent = useBatteryGuardStore((s) => s.dialogPercent);
  const dismiss = useDismissLowBatteryDialog();

  return (
    <Modal
      visible={dialogVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderRadius: cornerRadius }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('batteryGuard.dialog.title')}</Text>
          </View>

          <View style={styles.body}>
            <Text style={styles.description}>
              {t('batteryGuard.dialog.message', { percent: dialogPercent })}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btn}
              onPress={dismiss}
              accessibilityRole="button"
              accessibilityLabel={t('batteryGuard.dialog.a11y.dismiss')}
            >
              <Text style={styles.btnText}>{t('batteryGuard.dialog.dismiss')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
    backgroundColor: colors.warning,
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
    paddingVertical: 16,
  },

  description: {
    fontSize: 13,
    color: colors.dialogText,
    lineHeight: 19,
  },

  actions: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  btnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
});

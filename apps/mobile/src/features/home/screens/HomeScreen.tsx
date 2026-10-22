import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/core/session/auth.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { useMonitorTickCount, useBackboneStatus } from '@/core/services/monitor';
import { AppButton } from '@/core/ui/AppButton';
import { Text } from '@/core/ui/Text';
import { colors, radii, spacing, typography } from '@/core/config/theme';

/**
 * Placeholder Home — full implementation lands in the Home sprint.
 * Sprint 42 only needs Logout from here (EZ-943).
 *
 * Home also owns the **database bootstrap trigger** (ARCHITECTURE_RULES §6
 * "DB lifecycle"), matching the native Android flow of creating the DB once the
 * user is on Home. It mounts on both routes into the authenticated stack — cold
 * start with a stored token, and fresh login — so this single effect covers
 * both. The work is idempotent, and it renders nothing: schema init is two
 * migrations, far too fast to be worth gating the screen on. A failure is
 * logged and the next mount retries.
 */
type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC<Props> = ({ navigation }) => {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);
  const monitorTicks = useMonitorTickCount();
  const backbone = useBackboneStatus();

  const initialiseDb = useDbBootstrapStore((s) => s.initialise);

  useEffect(() => {
    void initialiseDb();
  }, [initialiseDb]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.note}>{t('home.note')}</Text>
      {/* Temporary dev indicator for the background-monitor soak test — remove once the notification alone is trusted. */}
      <View style={styles.monitorBadge}>
        <Text style={styles.monitorText}>Heartbeat (foreground only): tick {monitorTicks}</Text>
        <Text style={styles.monitorText}>
          Backbone (survives backgrounding): tick {backbone.tickCount}
          {backbone.lastTickAt ? ` · ${backbone.lastTickAt}` : ''}
        </Text>
      </View>
      <View style={styles.btn}>
        <AppButton label={t('home.logout')} onPress={() => void logout()} variant="destructive" />
      </View>

      {/* Android flow: Add Patient → Privacy Notice consent → registration */}
      <AppButton
        label={t('home.addPatient')}
        onPress={() => navigation.navigate('PrivacyNotice')}
        style={styles.addPatientBtn}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  monitorBadge: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  monitorText: { ...typography.caption, color: colors.textSecondary },
  btn: { marginTop: spacing.md },
  addPatientBtn: { marginTop: 'auto' },
});

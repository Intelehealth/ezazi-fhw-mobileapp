import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/session/auth.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { colors, spacing, typography } from '@/core/config/theme';

/**
 * Placeholder Home — full implementation lands in the Home sprint.
 * Sprint 42 only needs Logout from here (EZ-943).
 *
 * Home also owns the **database bootstrap trigger** (ARCHITECTURE_RULES §6
 * "DB lifecycle"), matching the native Android flow of creating the DB and
 * syncing once the user is on Home. It mounts on both routes into the
 * authenticated stack — cold start with a stored token, and fresh login — so
 * this single effect covers both. The work itself is idempotent.
 */
export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);

  const dbPhase = useDbBootstrapStore((s) => s.phase);
  const initialiseDb = useDbBootstrapStore((s) => s.initialise);
  const retryDb = useDbBootstrapStore((s) => s.retry);

  useEffect(() => {
    void initialiseDb();
  }, [initialiseDb]);

  // Failure is terminal until the user acts — never an endless spinner.
  if (dbPhase === 'failed') {
    return (
      <View style={styles.centred}>
        <Text style={styles.errorTitle}>{t('home.db.failedTitle')}</Text>
        <Text style={styles.note}>{t('home.db.failedBody')}</Text>
        <View style={styles.btn}>
          <Button title={t('home.db.retry')} onPress={() => void retryDb()} color={colors.primary} />
        </View>
        <View style={styles.btn}>
          <Button title={t('home.logout')} onPress={() => void logout()} color={colors.error} />
        </View>
      </View>
    );
  }

  if (dbPhase !== 'ready') {
    return (
      <View style={styles.centred}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.preparing}>{t('home.db.preparing')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.note}>{t('home.note')}</Text>
      <View style={styles.btn}>
        <Button title={t('home.logout')} onPress={() => void logout()} color={colors.error} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  centred: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: colors.bg,
  },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' },
  preparing: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
  errorTitle: { ...typography.h2, color: colors.error, marginBottom: spacing.md, textAlign: 'center' },
  btn: { marginTop: spacing.md, alignSelf: 'stretch' },
});

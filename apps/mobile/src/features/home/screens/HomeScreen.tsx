import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/core/session/auth.store';
import { AppButton } from '@/core/ui/AppButton';
import { Text } from '@/core/ui/Text';
import { colors, spacing, typography } from '@/core/config/theme';

/**
 * Placeholder Home — full implementation lands in the Home sprint.
 * Sprint 42 only needs Logout from here (EZ-943).
 */
export const HomeScreen: React.FC = () => {
  const { t } = useTranslation();
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('home.title')}</Text>
      <Text style={styles.note}>{t('home.note')}</Text>
      <View style={styles.btn}>
        <AppButton label={t('home.logout')} onPress={() => void logout()} variant="destructive" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  btn: { marginTop: spacing.md },
});

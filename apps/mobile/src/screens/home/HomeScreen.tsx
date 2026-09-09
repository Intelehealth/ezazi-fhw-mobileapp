import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { colors, spacing, typography } from '@/config/theme';

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
        <Button title={t('home.logout')} onPress={() => void logout()} color={colors.error} />
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

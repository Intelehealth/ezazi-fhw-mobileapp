import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

/**
 * EZ-928 — First-run facility setup.
 * Form: location dropdown (cached masters), username, password.
 * On submit → POST /auth/login → cache facility → navigate to Login or Home.
 *
 * TODO: implement form with react-hook-form + zod resolver.
 */
export const SetupScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>First-time setup</Text>
      <Text style={styles.note}>EZ-928 — implementation pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary },
});

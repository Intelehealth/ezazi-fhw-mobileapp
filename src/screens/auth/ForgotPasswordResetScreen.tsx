import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/config/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordReset'>;

/**
 * EZ-939 — Reset to new password.
 *
 * AC:
 * - New password + confirm both ≥ 8 chars; must match.
 * - Visible/hidden toggle.
 * - Success → return to Login.
 *
 * TODO: form with new password + confirm + show/hide -> authApi.resetPassword({
 *   userUuid, newPassword, otpToken }) -> route back to Login.
 */
export const ForgotPasswordResetScreen: React.FC<Props> = (_props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set new password</Text>
      <Text style={styles.note}>EZ-939 — implementation pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary },
});

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { colors, spacing, typography } from '@/config/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPasswordVerify'>;

/**
 * EZ-934 — OTP entry & verification.
 *
 * AC:
 * - 6-digit input; auto-submit on completion.
 * - Resend link after 30s.
 * - 3 attempts then lockout.
 * - Android SMS auto-read if permission granted.
 *
 * TODO: implement OTP input + countdown + authApi.verifyOtp -> navigate to
 *  ForgotPasswordReset with { userUuid, otpToken }.
 */
export const ForgotPasswordVerifyScreen: React.FC<Props> = ({ route }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.note}>Sent to {route.params.phone}</Text>
      <Text style={styles.note}>EZ-934 — implementation pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary, marginTop: spacing.xs },
});

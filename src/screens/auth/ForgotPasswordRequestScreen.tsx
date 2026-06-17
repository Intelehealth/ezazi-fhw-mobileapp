import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

/**
 * EZ-933 — Forgot Password: request OTP via registered mobile.
 *
 * AC:
 * - 10-digit (India) + non-India country codes supported.
 * - Block if number registered to a Doctor (BIZ_001).
 * - Rate-limited 5/hour per phone (429).
 *
 * TODO: form with phone input + country picker. On submit -> authApi.requestOtp ->
 *  navigate to ForgotPasswordVerify with { phone }.
 */
export const ForgotPasswordRequestScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Forgot password</Text>
      <Text style={styles.note}>EZ-933 — implementation pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary },
});

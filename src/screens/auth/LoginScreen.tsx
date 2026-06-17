import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

/**
 * EZ-932 — Username + password login.
 *
 * AC:
 * - Show inline errors on bad creds.
 * - Lock after 3 failures (AUTH_003 423).
 * - Forgot Password link visible.
 *
 * TODO: implement form (username, password), call authApi.login, on success ->
 *  secureStorage.set('accessToken'/'refreshToken'/'userUuid') -> useAuthStore.setAuthenticated.
 */
export const LoginScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign in</Text>
      <Text style={styles.note}>EZ-932 — implementation pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary },
});

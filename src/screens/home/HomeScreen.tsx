import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors, spacing, typography } from '@/config/theme';

/**
 * Placeholder Home — full implementation lands in the Home sprint.
 * Sprint 42 only needs Logout from here (EZ-943).
 */
export const HomeScreen: React.FC = () => {
  const logout = useAuthStore((s) => s.logout);
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.note}>Logged in. Active cases will appear here.</Text>
      <View style={styles.btn}>
        <Button title="Log out (EZ-943)" onPress={() => void logout()} color={colors.error} />
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

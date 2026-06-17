import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '@/config/theme';

/**
 * EZ-941 — Privacy notice (DPDPA consent).
 *
 * AC:
 * - Shown before first Add Patient or after Reset.
 * - 'I (Health Worker) confirm…' checkbox + Accept button.
 * - Toast if Accept clicked without ticking.
 * - Reject → return to Home.
 * - Audit log on accept (server POST /audit).
 *
 * TODO: full text + checkbox + accept/reject buttons + audit-log call.
 */
export const PrivacyNoticeScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Privacy notice</Text>
      <Text style={styles.note}>EZ-941 — implementation pending</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, backgroundColor: colors.bg },
  title: { ...typography.h2, color: colors.textPrimary, marginBottom: spacing.md },
  note: { ...typography.body, color: colors.textSecondary },
});

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth.store';
import { colors, spacing, typography } from '@/config/theme';

/**
 * EZ-920 — Splash & bootstrap.
 * Validates token, routes to Setup / Login / Home.
 * TODO: integrate biometric unlock (EZ-940) here when token exists but app was locked.
 */
export const SplashScreen: React.FC = () => {
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>eZAZI FHW</Text>
      <ActivityIndicator color={colors.white} style={styles.spinner} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...typography.h1, color: colors.white, marginBottom: spacing.lg },
  spinner: { marginTop: spacing.md },
});

import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useApiActivityStore } from '@/core/api/apiActivity.store';
import { colors } from '@/core/config/theme';

/**
 * Full-screen progress indicator (React Native's default ActivityIndicator)
 * shown for as long as any API request is in flight. The scrim also blocks
 * touches, so a form can't be re-submitted while its call is pending.
 */
export const ApiProgressOverlay: React.FC = () => {
  const isLoading = useApiActivityStore(s => s.pending > 0);
  if (!isLoading) return null;

  return (
    <View style={styles.scrim} accessibilityLiveRegion="polite" accessibilityLabel="Loading">
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    zIndex: 1000,
    elevation: 1000,
  },
});

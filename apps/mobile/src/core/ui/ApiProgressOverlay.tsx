import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useApiActivityStore } from '@/core/api/apiActivity.store';
import { colors } from '@/core/config/theme';
import { useTranslation } from 'react-i18next';

/**
 * Full-screen progress indicator (React Native's default ActivityIndicator)
 * shown for as long as any API request is in flight. The scrim also blocks
 * touches, so a form can't be re-submitted while its call is pending.
 */
export const ApiProgressOverlay: React.FC = () => {
  const { t } = useTranslation();
  const isLoading = useApiActivityStore(s => s.pending > 0);
  if (!isLoading) return null;

  return (
    <View style={styles.scrim} accessibilityLiveRegion="polite" accessibilityLabel={t('common.loading')}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
};

const styles = StyleSheet.create({
  scrim: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.progressScrim,
    zIndex: 1000,
    elevation: 1000,
  },
});

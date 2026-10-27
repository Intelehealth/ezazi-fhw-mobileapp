import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '@/core/config/theme';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { formatClockTime } from '@/core/utils/calendar';
import type { RootStackParamList } from '@/navigation/types';

import { useCardCaptureViewModel } from '../stores/useCardCaptureViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'CardCapture'>;

/**
 * Capture for one card, opened from Record Now. The patient app bar comes from the navigator
 * (`patientCaptureAppBar`); this screen draws the card's title, then its tabs (Figma 251:556).
 */
export const CardCaptureScreen: React.FC<Props> = ({ route }) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();
  const viewModel = useCardCaptureViewModel(route.params.encounterUuid);
  if (!viewModel) return <View style={styles.screen} />;
  const { header } = viewModel;

  const stage = t(`timeline.stages.${header.stage}`).toUpperCase();

  return (
    <View style={styles.screen}>
      {/* An SOS card is never scheduled, so it has no title (Kaveri, 2026-10-27). */}
      {!header.isSos && (
        <View
          style={[
            styles.titleBlock,
            isTablet && { paddingHorizontal: fromFigma(40), paddingTop: fromFigma(24), gap: fromFigma(8) },
          ]}
        >
          <Text style={[styles.kicker, { fontSize: isTablet ? fromFigma(18) : fs('captureKicker') }]}>
            {t('capture.kicker', { stage })}
          </Text>
          <Text style={[styles.title, { fontSize: isTablet ? fromFigma(32) : fs('captureTitle') }]}>
            {t('capture.title', { time: formatClockTime(header.scheduledAt) })}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  titleBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  kicker: {
    color: colors.secondaryTextFigma,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    color: colors.primaryTextDarkFigma,
    fontWeight: '700',
  },
});

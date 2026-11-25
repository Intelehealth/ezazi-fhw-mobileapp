import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors, spacing } from '@/core/config/theme';
import { AppButton } from '@/core/ui/AppButton';
import { ConfirmDialog } from '@/core/ui/ConfirmDialog';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { Text } from '@/core/ui/Text';

import type { OutcomeView } from '../domain/timelineModel';

/**
 * A completed visit's outcome, in place of the action bar (Android `setVisitOutcome`: no End Stage button,
 * no SOS / Chat / Video / Rx): the outcome line, a reason line, and "View more" for the full text.
 */
export const VisitOutcomePanel: React.FC<{ view: OutcomeView }> = ({ view }) => {
  const { t } = useTranslation();
  const { isTablet, fromFigma } = useResponsive();
  const insets = useSafeAreaInsets();
  const [moreVisible, setMoreVisible] = useState(false);

  const moreText = view.more
    ? [
        view.more.otherComment !== null && view.more.motherDeceasedReason !== null
          ? `${t('timeline.outcome.otherComment')}\n${view.more.otherComment}`
          : view.more.otherComment,
        view.more.motherDeceasedReason !== null
          ? `${t('timeline.outcome.motherDeceasedReason')}\n${view.more.motherDeceasedReason}`
          : null,
      ]
        .filter((part): part is string => part !== null)
        .join('\n\n')
    : '';

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + spacing.md },
        isTablet && { paddingHorizontal: fromFigma(40), paddingTop: fromFigma(25) },
      ]}
    >
      <Text style={[styles.line, view.kind === 'mother' && styles.centred]}>
        {t(view.kind === 'mother' ? 'timeline.outcome.mother' : 'timeline.outcome.outcome', { outcome: view.outcome })}
      </Text>
      {view.reason !== null && <Text style={styles.line}>{t('timeline.outcome.reason', { reason: view.reason })}</Text>}
      {view.more && (
        <AppButton
          label={t('timeline.outcome.viewMore')}
          onPress={() => setMoreVisible(true)}
          variant="secondary"
          size="compact"
          style={styles.more}
        />
      )}
      <ConfirmDialog
        visible={moreVisible}
        tone="warning"
        title={view.outcome}
        message={moreText}
        confirmLabel={t('timeline.endStageFlow.okay')}
        onConfirm={() => setMoreVisible(false)}
        onClose={() => setMoreVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.headerDividerFigma,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.xs,
  },
  line: {
    color: colors.primaryTextFigma,
    fontWeight: '700',
  },
  centred: {
    textAlign: 'center',
  },
  more: {
    marginTop: spacing.sm,
  },
});

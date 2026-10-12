import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@/core/ui/Text';
import { colors, spacing } from '@/core/config/theme';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { LABOUR_STAGES, type LabourStage } from '../domain/timeline.types';

interface StageProgressBarProps {
  activeStage: LabourStage;
}

/** Four-segment stepper across the top of TimelineScreen — current stage highlighted. */
export const StageProgressBar: React.FC<StageProgressBarProps> = ({ activeStage }) => {
  const { t } = useTranslation();
  const { fs } = useResponsive();
  const activeIndex = LABOUR_STAGES.indexOf(activeStage);

  return (
    <View style={styles.row}>
      {LABOUR_STAGES.map((stage, index) => {
        const isActive = index === activeIndex;
        const isDone = index < activeIndex;

        return (
          <View key={stage} style={styles.segment}>
            <View
              style={[
                styles.bar,
                { backgroundColor: isDone || isActive ? colors.primary : colors.border },
              ]}
            />
            <Text
              style={[
                styles.label,
                { fontSize: fs('timelineStageLabel') },
                isActive ? styles.labelActive : styles.labelInactive,
              ]}
              numberOfLines={1}
            >
              {t('timeline.stageStep', { index: index + 1, label: t(`timeline.stages.${stage}`) })}
            </Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
  },
  bar: {
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  label: {
    fontWeight: '600',
  },
  labelActive: {
    color: colors.textPrimary,
  },
  labelInactive: {
    color: colors.textDisabled,
  },
});

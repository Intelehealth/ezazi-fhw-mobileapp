import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { logger } from '@/core/utils/logger';
import { colors, spacing } from '@/core/config/theme';
import { ConfirmDialog } from '@/core/ui/ConfirmDialog';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { PatientHeader } from '../components/PatientHeader';
import { StageProgressBar } from '../components/StageProgressBar';
import { TimelineCheckpointCard } from '../components/TimelineCheckpointCard';
import { TimelineActionBar } from '../components/TimelineActionBar';
import { useTimelineViewModel } from '../stores/useTimelineViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

/**
 * Labour-monitoring timeline — patient header, stage stepper, the observation checklist, and
 * the quick-action bar — for one visit, from the database (useTimelineViewModel).
 */
export const TimelineScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { isTablet, fromFigma } = useResponsive();
  const viewModel = useTimelineViewModel(route.params.visitUuid);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);
  if (!viewModel?.patient) return <View style={styles.screen} />;
  const { patient, checkpoints, activeStage } = viewModel;

  const confirmSos = () => {
    setSosConfirmVisible(false);
    // Figma: Capture SOS then opens the SOS form; the capture screen is not built yet.
    void viewModel.captureSos();
  };

  return (
    <View style={styles.screen}>
      <PatientHeader
        patient={patient}
        onViewLcg={() => logger.debug('[timeline] View LCG tapped')}
        onViewPostpartumReport={() => logger.debug('[timeline] Postpartum Report tapped')}
        onClose={() => navigation.goBack()}
      />

      <View
        style={[
          styles.stageBarWrap,
          isTablet && { paddingHorizontal: fromFigma(40), paddingTop: fromFigma(26), paddingBottom: fromFigma(28) },
        ]}
      >
        <StageProgressBar activeStage={activeStage} />
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={[
          styles.listContent,
          isTablet && { paddingHorizontal: fromFigma(40), paddingTop: fromFigma(36), paddingBottom: fromFigma(24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Figma 251:408: the active stage's name over its cards. */}
        <Text style={[styles.stageHeading, isTablet && { fontSize: fromFigma(32), marginBottom: fromFigma(14) }]}>
          {t('timeline.stageHeading', { label: t(`timeline.stages.${activeStage}`) }).toUpperCase()}
        </Text>
        {checkpoints.map((checkpoint, index) => (
          <TimelineCheckpointCard
            key={checkpoint.id}
            checkpoint={checkpoint}
            isFirst={index === 0}
            isLast={index === checkpoints.length - 1}
            onRecordNow={() => logger.debug('[timeline] Record Now tapped', checkpoint.id)}
          />
        ))}
      </ScrollView>

      <TimelineActionBar
        onSos={() => setSosConfirmVisible(true)}
        onChat={() => logger.debug('[timeline] Chat tapped')}
        onVideoCall={() => logger.debug('[timeline] Video call tapped')}
        onRx={() => logger.debug('[timeline] Rx tapped')}
        onEndStage={() => logger.debug('[timeline] End stage tapped')}
      />

      <ConfirmDialog
        visible={sosConfirmVisible}
        tone="danger"
        title={t('timeline.sosDialog.title')}
        message={t('timeline.sosDialog.message')}
        note={t('timeline.sosDialog.note')}
        cancelLabel={t('timeline.sosDialog.cancel')}
        confirmLabel={t('timeline.sosDialog.confirm')}
        onCancel={() => setSosConfirmVisible(false)}
        onConfirm={confirmSos}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.timelineBg,
  },
  flex1: {
    flex: 1,
  },
  stageBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.headerDividerFigma,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  stageHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryTextDarkFigma,
    marginBottom: spacing.sm,
  },
});

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
import { StageProgressBar } from '../components/StageProgressBar';
import { TimelineCheckpointCard } from '../components/TimelineCheckpointCard';
import { TimelineActionBar } from '../components/TimelineActionBar';
import { useTimelineViewModel } from '../stores/useTimelineViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

/**
 * Labour-monitoring timeline — stage stepper, the observation checklist and the quick-action
 * bar — for one visit, from the database (useTimelineViewModel). The patient app bar comes
 * from the navigator (`patientAppBar`).
 */
export const TimelineScreen: React.FC<Props> = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { isTablet, fromFigma } = useResponsive();
  const viewModel = useTimelineViewModel(route.params.visitUuid);
  const [sosConfirmVisible, setSosConfirmVisible] = useState(false);
  const [endStage1ConfirmVisible, setEndStage1ConfirmVisible] = useState(false);
  if (!viewModel) return <View style={styles.screen} />;
  const { checkpoints, activeStage } = viewModel;
  const { visitUuid } = route.params;

  const confirmSos = () => {
    setSosConfirmVisible(false);
    // Figma: Capture SOS then opens the SOS form; the capture screen is not built yet.
    void viewModel.captureSos();
  };

  // Android opens the End Stage 1 choices first; only "Move to Stage 2" is built, so its confirm opens directly.
  // End Second/Third Stage come later.
  const endStage = () => {
    if (activeStage === 'stage1') setEndStage1ConfirmVisible(true);
    else logger.debug('[timeline] End stage tapped', activeStage);
  };

  const confirmEndStage1 = () => {
    setEndStage1ConfirmVisible(false);
    void viewModel.startStage2();
  };

  return (
    <View style={styles.screen}>
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
            onOpen={() => {
              const { encounterUuid, access } = checkpoint;
              if (encounterUuid && access && access !== 'none') {
                navigation.navigate('CardCapture', { visitUuid, encounterUuid, access });
              }
            }}
          />
        ))}
      </ScrollView>

      <TimelineActionBar
        onSos={() => setSosConfirmVisible(true)}
        onChat={() => logger.debug('[timeline] Chat tapped')}
        onVideoCall={() => logger.debug('[timeline] Video call tapped')}
        onRx={() => logger.debug('[timeline] Rx tapped')}
        endStageLabel={t(`timeline.endStage.${activeStage}`)}
        onEndStage={endStage}
      />

      <ConfirmDialog
        visible={endStage1ConfirmVisible}
        tone="warning"
        title={t('timeline.endStage1Dialog.title')}
        message={t('timeline.endStage1Dialog.message')}
        cancelLabel={t('timeline.endStage1Dialog.cancel')}
        confirmLabel={t('timeline.endStage1Dialog.confirm')}
        onCancel={() => setEndStage1ConfirmVisible(false)}
        onConfirm={confirmEndStage1}
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

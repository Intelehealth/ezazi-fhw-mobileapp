import React, { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Vibration, View, type LayoutChangeEvent } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { STAGE1_OUTCOME, STAGE2_OUTCOME } from '@ezazi/clinical-rules';
import type { EndStage2Details, Stage1OutcomeId, Stage2OutcomeId } from '@ezazi/clinical-rules';
import { logger } from '@/core/utils/logger';
import { colors, fontSizes, spacing } from '@/core/config/theme';
import { ConfirmDialog } from '@/core/ui/ConfirmDialog';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import type { RootStackParamList } from '@/navigation/types';
import { StageProgressBar } from '../components/StageProgressBar';
import { TimelineCheckpointCard } from '../components/TimelineCheckpointCard';
import { TimelineActionBar } from '../components/TimelineActionBar';
import { EndStage1ChoiceDialog, EndStage2Dialog, MotherDeathDialog, ReferHospitalDialog } from '../components/EndStageDialogs';
import { VisitOutcomePanel } from '../components/VisitOutcomePanel';
import { outcomeView, scrollTargetId, stageHeadings } from '../domain/timelineModel';
import { useTimelineViewModel } from '../stores/useTimelineViewModel';
import { LABOUR_TEST_IDS } from '../testIds';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

const SOS_VIBRATION_MS = 1000;

type EndStageId = 'stage1' | 'stage2';
type ConfirmableOutcome = 'referOtherHospital' | 'selfDischarge' | 'shiftToCSection' | 'referToIcu' | 'other';

/** Where the End Stage flow is (Android: choice → confirmation → details → write). */
type EndStageStep =
  | { kind: 'none' }
  | { kind: 'choose'; stage: EndStageId }
  | { kind: 'confirmStage2' }
  | { kind: 'confirm'; stage: EndStageId; outcome: ConfirmableOutcome; otherComment?: string }
  | { kind: 'refer'; stage: EndStageId }
  | { kind: 'motherDeath'; stage: EndStageId }
  | { kind: 'deliveryLater' };

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
  const [step, setStep] = useState<EndStageStep>({ kind: 'none' });
  const scrollRef = useRef<ScrollView>(null);
  // Opened scrolled to the due card, once (later cards do not move the list under the nurse's finger).
  const scrolledOnOpen = useRef(false);
  if (!viewModel) return <View style={styles.screen} />;
  const { checkpoints, activeStage } = viewModel;
  const targetId = scrolledOnOpen.current ? null : scrollTargetId(checkpoints);
  const headings = stageHeadings(checkpoints, activeStage);
  const scrollToTarget = (event: LayoutChangeEvent) => {
    if (scrolledOnOpen.current) return;
    scrolledOnOpen.current = true;
    scrollRef.current?.scrollTo({ y: Math.max(0, event.nativeEvent.layout.y - spacing.lg), animated: false });
  };
  const { visitUuid } = route.params;

  const confirmSos = () => {
    setSosConfirmVisible(false);
    // As Android (collectEmergencyData): only the SOS card is added; the nurse opens it from the Timeline.
    void viewModel.captureSos();
  };

  // End First / Second Stage (Android `TimelineVisitSummaryActivity` 664-694); no Stage 1/2 card: nothing.
  const endStage = () => {
    if (viewModel.endStage) setStep({ kind: 'choose', stage: viewModel.endStage });
    else logger.debug('[timeline] End stage tapped with no stage to end', activeStage);
  };

  const confirmEndStage1 = () => {
    setStep({ kind: 'none' });
    void viewModel.startStage2();
  };

  /** Writes a completion; done (or already done elsewhere): back to Home, as Android after its sync. */
  const complete = async (stage: EndStageId, outcome: string, details: EndStage2Details) => {
    setStep({ kind: 'none' });
    const result =
      stage === 'stage1'
        ? await viewModel.endStage1(outcome as Stage1OutcomeId, details)
        : await viewModel.endStage2(outcome as Stage2OutcomeId, details);
    if (result?.kind === 'completeVisit' || result?.kind === 'alreadyCompleted') navigation.popTo('Home');
  };

  const chooseStage1 = (outcome: Stage1OutcomeId) => {
    if (outcome === STAGE1_OUTCOME.MOVE_TO_STAGE2) setStep({ kind: 'confirmStage2' });
    else if (outcome === STAGE1_OUTCOME.MOTHER_DEATH) setStep({ kind: 'motherDeath', stage: 'stage1' });
    else setStep({ kind: 'confirm', stage: 'stage1', outcome });
  };

  const chooseStage2 = (outcome: Stage2OutcomeId, otherComment: string) => {
    if (outcome === STAGE2_OUTCOME.STAGE3_EARLY_POSTPARTUM) setStep({ kind: 'deliveryLater' });
    else if (outcome === STAGE2_OUTCOME.MOTHER_DEATH) setStep({ kind: 'motherDeath', stage: 'stage2' });
    else setStep({ kind: 'confirm', stage: 'stage2', outcome, otherComment });
  };

  // Yes on a referral's confirmation: "Refer to other Hospital" asks for its details first (ReferTypeHelper).
  const confirmOutcome = () => {
    if (step.kind !== 'confirm') return;
    if (step.outcome === 'referOtherHospital') setStep({ kind: 'refer', stage: step.stage });
    else void complete(step.stage, step.outcome, { otherComment: step.otherComment });
  };

  const view = viewModel.visitComplete ? outcomeView(viewModel.outcome) : null;

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
        ref={scrollRef}
        style={styles.flex1}
        contentContainerStyle={[
          styles.listContent,
          isTablet && { paddingHorizontal: fromFigma(40), paddingTop: fromFigma(36), paddingBottom: fromFigma(24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {checkpoints.length === 0 && (
          <Text style={[styles.stageHeading, isTablet && { fontSize: fromFigma(32), marginBottom: fromFigma(14) }]}>
            {t('timeline.stageHeading', { label: t(`timeline.stages.${activeStage}`) }).toUpperCase()}
          </Text>
        )}
        {checkpoints.map((checkpoint, index) => (
          <React.Fragment key={checkpoint.id}>
            {/* Figma 251:408 heading, over the first card of each stage (Android TimelineAdapter tvStage). */}
            {headings[index] && (
              <Text
                style={[
                  styles.stageHeading,
                  index > 0 && styles.laterStageHeading,
                  isTablet && { fontSize: fromFigma(32), marginBottom: fromFigma(14) },
                ]}
              >
                {t('timeline.stageHeading', { label: t(`timeline.stages.${headings[index]}`) }).toUpperCase()}
              </Text>
            )}
          <View
            testID={LABOUR_TEST_IDS.timeline.card(checkpoint.id)}
            onLayout={checkpoint.id === targetId ? scrollToTarget : undefined}
          >
            <TimelineCheckpointCard
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
          </View>
          </React.Fragment>
        ))}
      </ScrollView>

      {/* Completed: the outcome instead of the End Stage button and the quick actions (Android setVisitOutcome). */}
      {viewModel.visitComplete ? (
        view && <VisitOutcomePanel view={view} />
      ) : (
        <TimelineActionBar
          onSos={() => {
            // Android vibrates for a second as SOS is tapped, before its question (TimelineVisitSummaryActivity 243-246).
            Vibration.vibrate(SOS_VIBRATION_MS);
            setSosConfirmVisible(true);
          }}
          sosDisabled={!viewModel.sosAvailable}
          onChat={() => logger.debug('[timeline] Chat tapped')}
          onVideoCall={() => logger.debug('[timeline] Video call tapped')}
          onRx={() => logger.debug('[timeline] Rx tapped')}
          endStageLabel={t(`timeline.endStage.${activeStage}`)}
          onEndStage={endStage}
          endStageDisabled={!viewModel.isVisitHolder}
        />
      )}

      <EndStage1ChoiceDialog
        visible={step.kind === 'choose' && step.stage === 'stage1'}
        onCancel={() => setStep({ kind: 'none' })}
        onChoose={chooseStage1}
      />
      <EndStage2Dialog
        visible={step.kind === 'choose' && step.stage === 'stage2'}
        onCancel={() => setStep({ kind: 'none' })}
        onChoose={chooseStage2}
      />
      <ConfirmDialog
        visible={step.kind === 'confirmStage2'}
        tone="warning"
        title={t('timeline.endStage1Dialog.title')}
        message={t('timeline.endStage1Dialog.message')}
        cancelLabel={t('timeline.endStage1Dialog.cancel')}
        confirmLabel={t('timeline.endStage1Dialog.confirm')}
        onCancel={() => setStep({ kind: 'none' })}
        onConfirm={confirmEndStage1}
        testID={LABOUR_TEST_IDS.timeline.moveToStage2Dialog}
      />
      {/* Android's referral / "Other" confirmations: content only, Yes / Cancel. */}
      <ConfirmDialog
        visible={step.kind === 'confirm'}
        tone="warning"
        title=""
        message={
          step.kind === 'confirm'
            ? t(`timeline.endStageFlow.confirm.${step.outcome}`, { text: step.otherComment ?? '' })
            : ''
        }
        cancelLabel={t('timeline.endStageFlow.cancel')}
        confirmLabel={t('timeline.endStageFlow.yes')}
        onCancel={() => setStep({ kind: 'none' })}
        onConfirm={confirmOutcome}
        testID={LABOUR_TEST_IDS.timeline.outcomeConfirmDialog}
      />
      <ReferHospitalDialog
        visible={step.kind === 'refer'}
        onCancel={() => setStep({ kind: 'none' })}
        onDone={(details) => step.kind === 'refer' && void complete(step.stage, STAGE1_OUTCOME.REFER_OTHER_HOSPITAL, details)}
      />
      <MotherDeathDialog
        visible={step.kind === 'motherDeath'}
        onCancel={() => setStep({ kind: 'none' })}
        onDone={(reason) => step.kind === 'motherDeath' && void complete(step.stage, STAGE1_OUTCOME.MOTHER_DEATH, { reason })}
      />
      {/* Stage-3 & Early Postpartum: Android's Women Delivery Details form is the next task. */}
      <ConfirmDialog
        visible={step.kind === 'deliveryLater'}
        tone="warning"
        title={t('partogram.outcome.stage2.stage3EarlyPostpartum')}
        message={t('timeline.endStageFlow.deliveryFormLater')}
        confirmLabel={t('timeline.endStageFlow.okay')}
        onConfirm={() => setStep({ kind: 'none' })}
        testID={LABOUR_TEST_IDS.timeline.deliveryLaterDialog}
      />

      <ConfirmDialog
        visible={sosConfirmVisible}
        tone="danger"
        title={t('timeline.sosDialog.title')}
        message={t('timeline.sosDialog.message')}
        cancelLabel={t('timeline.sosDialog.cancel')}
        confirmLabel={t('timeline.sosDialog.confirm')}
        onCancel={() => setSosConfirmVisible(false)}
        onConfirm={confirmSos}
        testID={LABOUR_TEST_IDS.timeline.sosDialog}
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
    fontSize: fontSizes.timelineStageHeading.phone,
    fontWeight: '700',
    color: colors.primaryTextDarkFigma,
    marginBottom: spacing.sm,
  },
  // A later stage's heading, set apart from the cards above it.
  laterStageHeading: {
    marginTop: spacing.lg,
  },
});

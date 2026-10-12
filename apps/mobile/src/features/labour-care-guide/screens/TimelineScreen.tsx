import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { logger } from '@/core/utils/logger';
import { colors, spacing } from '@/core/config/theme';
import type { RootStackParamList } from '@/navigation/types';
import { PatientHeader } from '../components/PatientHeader';
import { StageProgressBar } from '../components/StageProgressBar';
import { TimelineCheckpointCard } from '../components/TimelineCheckpointCard';
import { TimelineActionBar } from '../components/TimelineActionBar';
import { MOCK_CHECKPOINTS, MOCK_PATIENT } from '../domain/timeline.mock';

type Props = NativeStackScreenProps<RootStackParamList, 'Timeline'>;

/**
 * Labour-monitoring timeline — patient header, stage stepper, the
 * observation checklist, and the quick-action bar. Falls back to sample
 * data (see timeline.mock.ts) when opened without route params, so it's
 * previewable before the real patient/checkpoint repository exists.
 */
export const TimelineScreen: React.FC<Props> = ({ navigation, route }) => {
  const patient = route.params?.patient ?? MOCK_PATIENT;
  const checkpoints = route.params?.checkpoints ?? MOCK_CHECKPOINTS;
  const activeStage = route.params?.activeStage ?? 'stage1';

  return (
    <View style={styles.screen}>
      <PatientHeader
        patient={patient}
        onViewLcg={() => logger.debug('[timeline] View LCG tapped')}
        onViewPostpartumReport={() => logger.debug('[timeline] Postpartum Report tapped')}
        onClose={() => navigation.goBack()}
      />

      <View style={styles.stageBarWrap}>
        <StageProgressBar activeStage={activeStage} />
      </View>

      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
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
        onSos={() => logger.debug('[timeline] SOS tapped')}
        onChat={() => logger.debug('[timeline] Chat tapped')}
        onVideoCall={() => logger.debug('[timeline] Video call tapped')}
        onRx={() => logger.debug('[timeline] Rx tapped')}
        onEndStage={() => logger.debug('[timeline] End stage tapped')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex1: {
    flex: 1,
  },
  stageBarWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.white,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
});

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NavigationAction } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import type { CardAccess, CardLayout, StoredObs } from '@ezazi/clinical-rules';

import { colors, spacing } from '@/core/config/theme';
import { ConfirmDialog } from '@/core/ui/ConfirmDialog';
import { TabPager } from '@/core/ui/TabPager';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { formatClockTime } from '@/core/utils/calendar';
import { logger } from '@/core/utils/logger';
import type { RootStackParamList } from '@/navigation/types';

import { CaptureActionBar } from '../components/CaptureActionBar';
import { CaptureTabPage } from '../components/CaptureTabPage';
import { useCaptureFormViewModel } from '../stores/useCaptureFormViewModel';
import { useCardCaptureViewModel } from '../stores/useCardCaptureViewModel';

type Props = NativeStackScreenProps<RootStackParamList, 'CardCapture'>;

/**
 * Capture for one card, opened from Record Now. The patient app bar comes from the navigator
 * (`patientCaptureAppBar`); this screen draws the card's title, then its tabs (Figma 251:556).
 */
export const CardCaptureScreen: React.FC<Props> = ({ route, navigation }) => {
  const { t } = useTranslation();
  const { isTablet, fs, fromFigma } = useResponsive();
  const { visitUuid, encounterUuid, access } = route.params;
  const viewModel = useCardCaptureViewModel(encounterUuid);
  if (!viewModel) return <View style={styles.screen} />;
  const { header, layout, stored } = viewModel;

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
          {/* Figma sets 18 and 32; both a little smaller on the device (Kaveri, 2026-11-01). */}
          <Text style={[styles.kicker, { fontSize: isTablet ? fromFigma(16) : fs('captureKicker') }]}>
            {t('capture.kicker', { stage })}
          </Text>
          <Text style={[styles.title, { fontSize: isTablet ? fromFigma(28) : fs('captureTitle') }]}>
            {t('capture.title', { time: formatClockTime(header.scheduledAt) })}
          </Text>
        </View>
      )}
      {layout && (
        <CaptureForm
          visitUuid={visitUuid}
          encounterUuid={encounterUuid}
          layout={layout}
          access={access}
          stored={stored}
          navigation={navigation}
        />
      )}
    </View>
  );
};

interface CaptureFormProps {
  visitUuid: string;
  encounterUuid: string;
  layout: CardLayout;
  access: Exclude<CardAccess, 'none'>;
  stored: readonly StoredObs[];
  navigation: NativeStackNavigationProp<RootStackParamList, 'CardCapture'>;
}

/**
 * The tabs, the bottom bar, and the Save & Exit question that the app-bar back and the device
 * Back open (Figma "Modal"); Continue and ✕ keep the form open, since nothing is saved as a draft.
 * A read-only card (Show on an older card) has nothing to save, so it leaves without asking.
 */
const CaptureForm: React.FC<CaptureFormProps> = ({ visitUuid, encounterUuid, layout, access, stored, navigation }) => {
  const { t } = useTranslation();
  const [askToLeave, setAskToLeave] = useState(false);
  const leaving = useRef(false);
  const pendingLeave = useRef<NavigationAction | null>(null);

  const viewModel = useCaptureFormViewModel({
    visitUuid,
    encounterUuid,
    layout,
    access,
    stored,
    onSaved: () => {
      leaving.current = true;
      if (pendingLeave.current) navigation.dispatch(pendingLeave.current);
      else navigation.goBack();
    },
    onExit: () => navigation.goBack(),
  });
  const readOnly = viewModel.readOnly;

  useEffect(
    () =>
      navigation.addListener('beforeRemove', (event) => {
        if (leaving.current || readOnly) return;
        event.preventDefault();
        pendingLeave.current = event.data.action;
        setAskToLeave(true);
      }),
    [navigation, readOnly],
  );

  const saveAndExit = () => {
    setAskToLeave(false);
    viewModel.save();
  };

  return (
    <>
      <TabPager
        tabs={viewModel.tabs.map((tab) => ({
          key: tab.id,
          label: t(tab.labelKey, { defaultValue: tab.androidLabel }),
          errorCount: viewModel.tabErrorCounts[tab.id],
        }))}
        index={viewModel.tabIndex}
        onIndexChange={viewModel.setTabIndex}
      >
        {viewModel.tabs.map((tab) => (
          <CaptureTabPage key={tab.id} tab={tab} form={viewModel.form} readOnly={readOnly} />
        ))}
      </TabPager>

      <CaptureActionBar
        showBack={viewModel.showBack}
        onBack={viewModel.goBack}
        onVideoCall={() => logger.debug('[capture] Video Call tapped')}
        onChat={() => logger.debug('[capture] Chat tapped')}
        onRx={() => logger.debug('[capture] Rx tapped')}
        onNext={viewModel.goNext}
        nextLabelKey={viewModel.nextLabelKey}
        nextDisabled={viewModel.nextDisabled}
      />

      {/* A failed save (Kaveri, 2026-11-18): say so and keep the card open; Android has no message here. */}
      <ConfirmDialog
        visible={viewModel.saveState === 'failed'}
        tone="danger"
        title={t('capture.saveFailed.title')}
        message={t('capture.saveFailed.message')}
        confirmLabel={t('timeline.endStageFlow.okay')}
        onConfirm={viewModel.dismissSaveError}
        onClose={viewModel.dismissSaveError}
      />

      <ConfirmDialog
        visible={askToLeave}
        tone="warning"
        title={t('capture.leave.title')}
        message={t('capture.leave.message')}
        cancelLabel={t('common.continue')}
        confirmLabel={t('capture.leave.saveAndExit')}
        onCancel={() => setAskToLeave(false)}
        onConfirm={saveAndExit}
      />
    </>
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

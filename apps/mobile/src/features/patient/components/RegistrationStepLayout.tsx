import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, dimens } from '@/core/config/theme';
import { AppIcon } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { DiscardRegistrationDialog } from './DiscardRegistrationDialog';
import { RegistrationStepper, type RegistrationStep } from './RegistrationStepper';

/**
 * The chrome both registration steps sit in — title, step counter, X, stepper,
 * the scrolling card and the pinned footer. It rolls its own scroll body:
 * FormScreenLayout puts no ref on its ScrollView and is not safe-area aware,
 * ScreenLayout has no footer, and both are auth's, so neither may change.
 */
interface RegistrationStepLayoutProps {
  currentStep: RegistrationStep;
  title: string;
  subtitle: string;
  /** The screen's fields. They render inside the card, which the layout owns. */
  children: React.ReactNode;
  /** The screen's own buttons. The layout owns only the pinning and the inset. */
  footer: React.ReactNode;
  /** Attached to the ScrollView so a screen can scroll to its first error. */
  scrollRef?: React.RefObject<ScrollView | null>;
}

const STEP_INDEX: Record<RegistrationStep, number> = { personal: 1, address: 2 };
const TOTAL_STEPS = 2;

export const RegistrationStepLayout: React.FC<RegistrationStepLayoutProps> = ({
  currentStep,
  title,
  subtitle,
  children,
  footer,
  scrollRef,
}) => {
  const { t } = useTranslation();
  const { fs, isTablet, scale } = useResponsive();
  const { bottom: bottomInset } = useSafeAreaInsets();
  const [discardVisible, setDiscardVisible] = useState(false);

  const gutter = isTablet ? scale(dimens.registrationHPad.tablet) : dimens.registrationHPad.phone;
  const sectionGap = isTablet
    ? scale(dimens.registrationSectionGap.tablet)
    : dimens.registrationSectionGap.phone;
  const footerGap = isTablet
    ? scale(dimens.registrationFooterGap.tablet)
    : dimens.registrationFooterGap.phone;
  const cardRadius = isTablet
    ? scale(dimens.registrationCardRadius.tablet)
    : dimens.registrationCardRadius.phone;
  const closeSize = isTablet
    ? scale(dimens.registrationCloseSize.tablet)
    : dimens.registrationCloseSize.phone;

  // Placeholder, like the screens' value/onChangeText. The code chat swaps it
  // for the draft store's discard: delete the photo, clear, then navigate.
  const onDiscardConfirmed = () => setDiscardVisible(false);

  return (
    <View style={styles.root}>
      <View style={{ paddingHorizontal: gutter, paddingTop: sectionGap }}>
        <View style={styles.titleRow}>
          <View style={styles.titleColumn}>
            <Text style={[styles.title, { fontSize: fs('registrationTitle') }]}>{title}</Text>
            <Text style={[styles.subtitle, { fontSize: fs('registrationSubtitle') }]}>
              {subtitle}
            </Text>
          </View>

          <View style={styles.counterRow}>
            <Text style={[styles.counter, { fontSize: fs('label') }]}>
              {t('patient.common.stepCounter', {
                current: STEP_INDEX[currentStep],
                total: TOTAL_STEPS,
              })}
            </Text>
            <TouchableOpacity
              onPress={() => setDiscardVisible(true)}
              accessibilityRole="button"
              accessibilityLabel={t('common.a11y.close')}
              hitSlop={closeSize / 2}
            >
              <AppIcon name="close" size={closeSize / 2} color={colors.primaryTextFigma} />
            </TouchableOpacity>
          </View>
        </View>

        <RegistrationStepper
          currentStep={currentStep}
          containerStyle={{ marginTop: sectionGap }}
        />
      </View>

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex1}
          contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: sectionGap }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { borderRadius: cardRadius }]}>{children}</View>
        </ScrollView>

        <View
          style={{
            paddingHorizontal: gutter,
            paddingTop: footerGap,
            paddingBottom: sectionGap + bottomInset,
          }}
        >
          {footer}
        </View>
      </KeyboardAvoidingView>

      <DiscardRegistrationDialog
        visible={discardVisible}
        onConfirm={onDiscardConfirmed}
        onDismiss={() => setDiscardVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },

  flex1: { flex: 1 },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  titleColumn: {
    flex: 1,
  },

  title: {
    color: colors.primaryTextFigma,
    fontWeight: '900',
    letterSpacing: -0.4,
  },

  subtitle: {
    color: colors.registrationSubtitle,
    marginTop: 2,
  },

  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  counter: {
    color: colors.registrationSubtitle,
    fontWeight: '700',
  },

  // Figma: white, radius 24 @800dp, shadow 0 1px 1.5px rgba(23,19,52,0.04).
  // Content sits flush — the frame has the fields and the card both 720 wide.
  //
  // The shadow is DELIBERATELY not carried (Arpan, 2026-11-24, seen on device).
  // `root` is white and the card is white, so there is nothing for a shadow to
  // separate: on Android `elevation: 1` against a white parent renders as a
  // hard grey outline hugging the card, which reads as an ugly border around
  // the whole field block on both screens. If the page ever gets a tinted
  // background of its own, restore the shadow then — it will do its job.
  card: {
    backgroundColor: colors.white,
  },
});

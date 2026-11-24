import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors, dimens } from '@/core/config/theme';
import { AppIcon, type IconName } from '@/core/ui/icons';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

export type RegistrationStep = 'personal' | 'address';

/**
 * The two-step progress bar on both registration screens. Done is a filled
 * green circle with a white glyph; anything not done is a tinted circle with
 * a green border and a green glyph (Arpan, off frame 1:23211). The connector
 * stays grey behind a completed step — it does not turn green.
 */
interface RegistrationStepperProps {
  currentStep: RegistrationStep;
  /** Placement only (margins) — never colors or sizing. */
  containerStyle?: StyleProp<ViewStyle>;
}

const STEPS: { key: RegistrationStep; icon: IconName }[] = [
  { key: 'personal', icon: 'person' },
  { key: 'address', icon: 'locationPin' },
];

/** The frame draws the glyph at roughly 40% of the circle. */
const GLYPH_RATIO = 0.4;

export const RegistrationStepper: React.FC<RegistrationStepperProps> = ({
  currentStep,
  containerStyle,
}) => {
  const { t } = useTranslation();
  const { fs, isTablet, scale } = useResponsive();

  const size = isTablet ? scale(dimens.stepperCircle.tablet) : dimens.stepperCircle.phone;
  const activeIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <View style={[styles.row, containerStyle]}>
      {STEPS.map((step, index) => {
        const done = index < activeIndex;
        const upcoming = index > activeIndex;

        return (
          <React.Fragment key={step.key}>
            {index > 0 && <View style={[styles.connector, { marginTop: size / 2 }]} />}

            <View style={styles.step}>
              <View
                // A filled circle has no text or role to find it by, which is
                // the one case this repo allows a testID for.
                testID={`step-circle-${step.key}`}
                style={[
                  styles.circle,
                  { width: size, height: size, borderRadius: size / 2 },
                  done ? styles.circleDone : styles.circlePending,
                ]}
              >
                <AppIcon
                  name={step.icon}
                  size={Math.round(size * GLYPH_RATIO)}
                  color={done ? colors.onPrimary : colors.stepperGreen}
                />
              </View>

              <Text
                style={[
                  styles.label,
                  upcoming && styles.labelUpcoming,
                  { fontSize: fs('registrationSubtitle') },
                ]}
              >
                {t(`patient.common.steps.${step.key}`)}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  step: {
    alignItems: 'center',
  },

  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleDone: {
    backgroundColor: colors.stepperGreen,
  },

  circlePending: {
    backgroundColor: colors.stepperGreenTint,
    borderWidth: 2,
    borderColor: colors.stepperGreen,
  },

  // height 0 + a top border is the RN idiom for a dashed rule; borderStyle on
  // a sized View draws inconsistently on Android.
  connector: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.stepperConnector,
  },

  label: {
    color: colors.textPrimary,
    marginTop: dimens.labelGap,
  },

  labelUpcoming: {
    color: colors.darkGray,
  },
});

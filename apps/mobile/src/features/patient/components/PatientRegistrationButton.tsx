import React from 'react';
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, dimens } from '@/core/config/theme';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * THE registration footer button — Continue on step 1, Register Patient on
 * step 2. Same job as AppButton, but the frame fills it with a left-to-right
 * gradient, so it is its own component and auth's button stays untouched.
 * Never disabled-until-valid: only while a save is in flight.
 */
interface PatientRegistrationButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Placement only (margins) — never colors or sizing. */
  style?: StyleProp<ViewStyle>;
}

export const PatientRegistrationButton: React.FC<PatientRegistrationButtonProps> = ({
  label,
  onPress,
  disabled = false,
  style,
}) => {
  const { isTablet, fs, cornerRadius } = useResponsive();
  // The SAME token AppButton reads, flat per tier. Address's Back is an
  // AppButton sitting beside this one; scaling made them disagree by 4-20dp.
  const height = isTablet ? dimens.buttonHeight.tablet : dimens.buttonHeight.phone;

  // Two identical stops render flat. AppButton's grey pair reads as broken on
  // the one primary action of the flow, so this uses the Figma disabled fill.
  const fill = disabled
    ? ([colors.buttonDisabledFigma, colors.buttonDisabledFigma] as const)
    : ([colors.primary, colors.registrationGradientEnd] as const);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      activeOpacity={0.85}
      style={style}
    >
      <LinearGradient
        colors={fill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.fill, { height, borderRadius: cornerRadius }]}
      >
        <Text style={[styles.label, { fontSize: fs('button') }]}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Figma: #2E1E91 → #3922CF, left to right.
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    color: colors.onPrimary,
    fontWeight: '600',
  },
});

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, spacing } from '@/core/config/theme';

import { useControlSizes } from './hooks/useControlSizes';
import { useResponsive } from './hooks/useResponsive';
import { Text } from './Text';

interface FormFieldProps {
  label: string;
  /** Shown in red under the control; the control draws its own red border. */
  error?: string;
  children: React.ReactNode;
  /** Placement only (margins, flex) — never colours or sizing. */
  style?: StyleProp<ViewStyle>;
}

/** A capture field: its upper-case caption, the control, and an error line (Figma 251:556). */
export const FormField: React.FC<FormFieldProps> = ({ label, error, children, style }) => {
  const sizes = useControlSizes();
  const { fs } = useResponsive();

  return (
    <View style={style}>
      <Text style={[styles.label, { fontSize: sizes.label }]}>{label.toUpperCase()}</Text>
      {children}
      {!!error && (
        <Text accessibilityRole="alert" style={[styles.error, { fontSize: fs('error') }]}>
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    color: colors.secondaryTextFigma,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.alertFigma,
    marginTop: spacing.xs,
  },
});

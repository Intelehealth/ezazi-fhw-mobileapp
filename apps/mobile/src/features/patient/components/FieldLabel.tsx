import React from 'react';
import { StyleSheet } from 'react-native';
import { colors, dimens } from '@/core/config/theme';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';

/**
 * THE registration field label — uppercase Lato Bold 700, with the asterisk
 * that marks a required field. Not auth's `fieldLabel` (weight 600, and eslint
 * blocks the cross-feature import) and not AppTextField's own label; neither
 * draws an asterisk. RegistrationTextField renders this, no screen does, and
 * its margins are the gap between field blocks.
 */
interface FieldLabelProps {
  label: string;
  /** Draws the asterisk. Not written into the string table. */
  required?: boolean;
}

export const FieldLabel: React.FC<FieldLabelProps> = ({ label, required = false }) => {
  const { fs } = useResponsive();

  return (
    <Text style={[styles.label, { fontSize: fs('label') }]}>
      {label}
      {required && <Text style={styles.asterisk}>*</Text>}
    </Text>
  );
};

const styles = StyleSheet.create({
  // Figma: Lato Bold 18 @800dp, #4A4665, 0.84 tracking. Uppercased here, not
  // in the string table, so a script without uppercase is not broken by it.
  label: {
    color: colors.fieldLabel,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: dimens.fieldGap,
    marginBottom: dimens.labelGap,
  },

  // Figma draws no asterisk, so the colour is ours. Weight repeats because
  // core/ui/Text reads the Lato face off each Text's own style, not the parent's.
  asterisk: {
    color: colors.error,
    fontWeight: '700',
  },
});

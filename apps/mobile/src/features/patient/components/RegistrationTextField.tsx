import React, { forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, dimens } from '@/core/config/theme';
import { Text } from '@/core/ui/Text';
import { useResponsive } from '@/core/ui/hooks/useResponsive';
import { FieldLabel } from './FieldLabel';

/**
 * THE text field for the whole registration section — both screens, every text
 * input. AppTextField's structure in a different skin (white fill, #DED9F0
 * border, its own uppercase label), deliberately not a variant of it, so auth
 * is untouched. It renders FieldLabel itself and derives accessibilityLabel
 * from `label` — which is why `label` is required where AppTextField's is not.
 */
interface RegistrationTextFieldProps extends TextInputProps {
  /** Title case, as the string table stores it; also the a11y name. */
  label: string;
  /** Draws FieldLabel's asterisk. Not written into the string table. */
  required?: boolean;
  error?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  /** Placement only (margins) — never colors or sizing. */
  containerStyle?: StyleProp<ViewStyle>;
  /**
   * Genuinely unusable — greys the FILL as well as the value. Deliberately not
   * the same thing as `editable={false}`, which this section also uses for
   * fields that cannot be typed into but CAN be tapped: Date of Birth and the
   * two address dropdown triggers. Those must keep a white fill or they read
   * as dead. GENDER is the only true disabled field today.
   */
  disabled?: boolean;
}

export const RegistrationTextField = forwardRef<TextInput, RegistrationTextFieldProps>(
  (
    {
      label,
      required,
      error,
      leftSlot,
      rightSlot,
      containerStyle,
      accessibilityLabel,
      editable,
      disabled,
      ...inputProps
    },
    ref,
  ) => {
    const { fs, cornerRadius } = useResponsive();

    // Grey lands on the value only — DATE OF BIRTH is read-only too, and its
    // placeholder must still read as a placeholder.
    const isReadOnly = editable === false || disabled === true;

    return (
      <View style={containerStyle}>
        <FieldLabel label={label} required={required} />

        <View
          style={[
            styles.inputRow,
            { borderRadius: cornerRadius },
            disabled && styles.inputRowDisabled,
            !!error && styles.inputRowError,
          ]}
        >
          {leftSlot != null && <View style={styles.leftSlot}>{leftSlot}</View>}
          <TextInput
            ref={ref}
            editable={disabled ? false : editable}
            style={[styles.input, { fontSize: fs('input') }, isReadOnly && styles.inputReadOnly]}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={accessibilityLabel ?? label}
            {...inputProps}
          />
          {rightSlot}
        </View>

        {!!error && (
          <Text style={[styles.errorText, { fontSize: fs('error') }]}>{error}</Text>
        )}
      </View>
    );
  },
);

RegistrationTextField.displayName = 'RegistrationTextField';

const styles = StyleSheet.create({
  // Figma: 80 tall, 16 radius, white fill, #DED9F0 border at 800dp. Height is
  // a flat 60 both tiers (Arpan, 2026-11-24); the radius renders 16 at 800dp.
  inputRow: {
    height: dimens.inputHeight,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.registrationFieldBorder,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // A field that genuinely cannot be used — GENDER. The grey fill is the auth
  // input's own, so "disabled input" looks the same across the app. Not keyed
  // off `editable={false}`: Date of Birth and the address dropdown triggers are
  // read-only but tappable and must stay white.
  inputRowDisabled: {
    backgroundColor: colors.inputBg,
  },

  // Neither design doc gives this a value. AppTextField reddens its border for
  // an error, so registration does the same rather than invent a token.
  inputRowError: {
    borderColor: colors.error,
  },

  leftSlot: {
    marginRight: 10,
  },

  input: {
    flex: 1,
    color: colors.textPrimary,
    padding: 0,
    fontFamily: 'Lato_400Regular',
  },

  inputReadOnly: {
    color: colors.textDisabled,
  },

  // Figma — error sits left-aligned under the field, as it does in auth.
  errorText: {
    color: colors.error,
    marginTop: 4,
  },
});

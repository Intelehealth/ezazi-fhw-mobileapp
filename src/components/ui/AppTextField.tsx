import React, { forwardRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { colors, dimens } from '@/config/theme';
import { useResponsive } from '@/hooks/useResponsive';

/**
 * THE app text field — label + 56dp input row + right-aligned error text
 * (RightAlignErrorTextInputLayout). Do not re-declare label/inputRow/errorText
 * styles in screens; compose this component instead.
 *
 * rightSlot renders inside the input row (eye toggle, chevron, …) so variants
 * like PasswordField stay decoupled from this base.
 *
 * forwardRef → parents can call .focus() for "next" field navigation.
 */

interface AppTextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  rightSlot?: React.ReactNode;
  /** Placement only (margins) — never colors or sizing. */
  containerStyle?: StyleProp<ViewStyle>;
}

export const AppTextField = forwardRef<TextInput, AppTextFieldProps>(
  ({ label, error, rightSlot, containerStyle, ...inputProps }, ref) => {
    const { fs, cornerRadius } = useResponsive();

    return (
      <View style={containerStyle}>
        {!!label && (
          <Text style={[styles.label, { fontSize: fs('label') }]}>{label}</Text>
        )}

        <View
          style={[
            styles.inputRow,
            { borderRadius: cornerRadius },
            !!error && styles.inputRowError,
          ]}
        >
          <TextInput
            ref={ref}
            style={[styles.input, { fontSize: fs('input') }]}
            placeholderTextColor={colors.placeholder}
            {...inputProps}
          />
          {rightSlot}
        </View>

        {!!error && (
          <Text style={[styles.errorText, { fontSize: fs('error') }]}>
            {error}
          </Text>
        )}
      </View>
    );
  },
);

AppTextField.displayName = 'AppTextField';

const styles = StyleSheet.create({
  // LabelStyle — font_black_0, input_label_size, medium
  label: {
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: dimens.labelGap,
  },

  // colorLoginInputBg background, input_height, input_box_corner_radius
  inputRow: {
    height: dimens.inputHeight,
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },

  inputRowError: {
    borderColor: colors.error,
  },

  input: {
    flex: 1,
    color: colors.textPrimary,
    padding: 0,
  },

  // RightAlignErrorTextInputLayout — error sits at the right edge
  errorText: {
    color: colors.error,
    marginTop: 4,
    textAlign: 'right',
  },
});

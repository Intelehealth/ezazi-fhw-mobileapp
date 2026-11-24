import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, dimens, spacing } from '@/core/config/theme';

import { controlLook } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';

interface ControlTextInputProps
  extends Pick<TextInputProps, 'value' | 'placeholder' | 'keyboardType' | 'maxLength' | 'onSubmitEditing' | 'multiline' | 'numberOfLines' | 'testID'> {
  /** The field's name for screen readers. */
  label: string;
  onChangeText: (text: string) => void;
  error?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  /** Drawn inside the box on the right, e.g. an "+ Add" link. */
  rightSlot?: React.ReactNode;
  onFocus?: () => void;
}

/** A text box in the capture controls' look (Figma "SUPERVISOR / DOCTOR", "ADD MEDICINE" fields). */
export const ControlTextInput: React.FC<ControlTextInputProps> = ({ label, error, disabled, readOnly, rightSlot, onFocus, ...input }) => {
  const sizes = useControlSizes();
  const [focused, setFocused] = useState(false);
  const look = controlLook({ disabled, error, focused });

  return (
    <View
      style={[
        styles.box,
        { minHeight: sizes.height, borderRadius: sizes.radius, backgroundColor: look.background, borderColor: look.border },
      ]}
    >
      <TextInput
        accessibilityLabel={label}
        editable={!disabled && !readOnly}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { fontSize: sizes.text, color: look.text }, input.multiline && styles.multiline]}
        {...input}
      />
      {rightSlot}
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
    fontFamily: 'Lato_400Regular',
  },
  // Android's 5-line reason / comment boxes: text starts at the top.
  multiline: {
    minHeight: dimens.multilineInputMinHeight,
    textAlignVertical: 'top',
  },
});

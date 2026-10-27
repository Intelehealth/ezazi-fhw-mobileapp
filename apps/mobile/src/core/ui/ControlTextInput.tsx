import React, { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, spacing } from '@/core/config/theme';

import { controlLook } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';

interface ControlTextInputProps
  extends Pick<TextInputProps, 'value' | 'placeholder' | 'keyboardType' | 'maxLength' | 'onSubmitEditing'> {
  /** The field's name for screen readers. */
  label: string;
  onChangeText: (text: string) => void;
  error?: boolean;
  disabled?: boolean;
  /** Drawn inside the box on the right, e.g. an "+ Add" link. */
  rightSlot?: React.ReactNode;
}

/** A text box in the capture controls' look (Figma "SUPERVISOR / DOCTOR", "ADD MEDICINE" fields). */
export const ControlTextInput: React.FC<ControlTextInputProps> = ({ label, error, disabled, rightSlot, ...input }) => {
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
        editable={!disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, { fontSize: sizes.text, color: look.text }]}
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
});

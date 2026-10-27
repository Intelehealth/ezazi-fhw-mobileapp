import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/core/config/theme';

import { controlLook, type ControlState } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';
import { AppIcon } from './icons';
import { sanitizeStepperText, stepValue, stepperLimits, type StepperBounds } from './stepperValue';

interface StepperInputProps {
  /** The field's name for screen readers, e.g. "Pulse". */
  label: string;
  value: string;
  onChange: (value: string) => void;
  bounds: StepperBounds;
  placeholder?: string;
  alert?: boolean;
  error?: boolean;
  disabled?: boolean;
}

/**
 * A number entered with - and + or by typing (Figma "BASELINE FHR", "PULSE"). The first press
 * on an empty field fills the base; presses stay within min and max; typing is not clamped,
 * so validation can flag an out-of-range value.
 */
export const StepperInput: React.FC<StepperInputProps> = ({
  label,
  value,
  onChange,
  bounds,
  placeholder,
  alert,
  error,
  disabled,
}) => {
  const { t } = useTranslation();
  const sizes = useControlSizes();
  const [focused, setFocused] = useState(false);
  const { canDecrease, canIncrease } = stepperLimits(value, bounds);

  const field = controlLook({ disabled, alert: alert && value !== '', error, focused } satisfies ControlState);
  const box = { height: sizes.height, borderRadius: sizes.radius };

  const renderButton = (direction: 1 | -1) => {
    const enabled = !disabled && (direction === 1 ? canIncrease : canDecrease);
    const look = controlLook({ disabled: !enabled });
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(direction === 1 ? 'common.a11y.increase' : 'common.a11y.decrease', { label })}
        accessibilityState={{ disabled: !enabled }}
        disabled={!enabled}
        onPress={() => onChange(stepValue(value, direction, bounds))}
        style={[styles.button, box, { width: sizes.height, backgroundColor: look.background, borderColor: look.border }]}
      >
        <AppIcon name={direction === 1 ? 'plus' : 'minus'} color={look.text} size={sizes.icon} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.row, { gap: sizes.gap }]}>
      {renderButton(-1)}
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={(text) => onChange(sanitizeStepperText(text, bounds))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        editable={!disabled}
        keyboardType={bounds.fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[
          styles.input,
          box,
          { fontSize: sizes.text, backgroundColor: field.background, borderColor: field.border, color: field.text },
        ]}
      />
      {renderButton(1)}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    textAlign: 'center',
    paddingVertical: 0,
    fontFamily: 'Lato_400Regular',
  },
});

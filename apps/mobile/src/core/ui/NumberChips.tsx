import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceButton } from './ChoiceButton';
import type { ChoiceOption } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';

interface NumberChipsProps {
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

/** A short scale as one row of equal chips (Figma "CERVIX - CM", "DESCENT"). */
export const NumberChips: React.FC<NumberChipsProps> = ({ options, value, onChange, error, disabled }) => {
  const sizes = useControlSizes();

  return (
    <View accessibilityRole="radiogroup" style={[styles.row, { gap: sizes.gap }]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <ChoiceButton
            key={option.value}
            label={option.label}
            state={{ selected, alert: selected && option.alert, error, disabled }}
            onPress={() => onChange(option.value)}
            style={styles.chip}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  chip: {
    flex: 1,
    paddingHorizontal: 0,
  },
});

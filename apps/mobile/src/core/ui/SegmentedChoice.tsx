import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ChoiceButton } from './ChoiceButton';
import type { ChoiceOption } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';

interface SegmentedChoiceProps {
  options: readonly ChoiceOption[];
  value: string | null;
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

/**
 * A single choice shown as option buttons that wrap onto more rows (Figma "COMPANION?",
 * "FETAL POSITION"). Picking the selected option again keeps it, as Android's dialogs do.
 */
export const SegmentedChoice: React.FC<SegmentedChoiceProps> = ({ options, value, onChange, error, disabled }) => {
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
            style={{ minWidth: sizes.minWidth }}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});

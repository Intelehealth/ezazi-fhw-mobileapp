import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/core/config/theme';

import { controlLook, type ControlState } from './controlLook';
import { useControlSizes } from './hooks/useControlSizes';
import { Text } from './Text';

interface ChoiceButtonProps {
  label: string;
  state: ControlState;
  onPress: () => void;
  /** Placement only (flex, width) — never colours or sizing. */
  style?: StyleProp<ViewStyle>;
}

/** One option button of SegmentedChoice and NumberChips, in the look of its state. */
export const ChoiceButton: React.FC<ChoiceButtonProps> = ({ label, state, onPress, style }) => {
  const sizes = useControlSizes();
  const look = controlLook(state);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!state.selected, disabled: !!state.disabled }}
      disabled={state.disabled}
      onPress={onPress}
      style={[
        styles.button,
        { minHeight: sizes.height, borderRadius: sizes.radius, backgroundColor: look.background, borderColor: look.border },
        style,
      ]}
    >
      <Text style={[styles.label, { color: look.text, fontSize: sizes.text }]}>{label}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.md,
  },
  label: {
    fontWeight: '500',
    textAlign: 'center',
  },
});

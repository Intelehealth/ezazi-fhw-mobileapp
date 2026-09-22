import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import type { TextProps } from 'react-native';

/**
 * App-wide Text — every screen/component imports this instead of RN's own
 * Text so the whole app renders in Lato (design spec) without each call
 * site setting fontFamily itself. Lato only ships 400/700 static weights
 * (no native 600 "semibold"), so any style fontWeight >= 500 resolves to
 * the Bold face; anything lighter falls back to Regular.
 */
const isBoldWeight = (weight: unknown): boolean => {
  if (weight == null) return false;
  const n = Number(weight);
  if (!Number.isNaN(n)) return n >= 500;
  return weight === 'bold';
};

export const Text: React.FC<TextProps> = ({ style, ...props }) => {
  const flat = StyleSheet.flatten(style);
  const fontFamily = isBoldWeight(flat?.fontWeight) ? 'Lato_700Bold' : 'Lato_400Regular';

  return <RNText {...props} style={[{ fontFamily }, style]} />;
};

import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import type { IconProps } from './types';

/** Outline check-circle for the success tone of a dialog (Figma "Successful" modal). */
export const CheckCircleIcon: React.FC<IconProps> = ({ size = 24, color }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.6} />
    <Path d="M8.5 12.3 L10.9 14.7 L15.8 9.6" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

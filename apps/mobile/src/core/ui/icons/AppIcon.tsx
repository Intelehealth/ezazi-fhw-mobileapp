import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { iconPaths, type IconName } from './iconPaths';

interface AppIconProps {
  name: IconName;
  color: string;
  size?: number;
}

/** Tiny renderer so screens stop writing raw <Svg><Path/></Svg> blocks. */
export const AppIcon: React.FC<AppIconProps> = ({ name, color, size = 24 }) => {
  const def = iconPaths[name];
  const d = typeof def === 'string' ? def : def.d;
  const fillRule = typeof def === 'string' ? undefined : def.fillRule;

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} fill={color} fillRule={fillRule} />
    </Svg>
  );
};

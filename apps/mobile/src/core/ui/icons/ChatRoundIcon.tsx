import React from 'react';
import Svg, { Path } from 'react-native-svg';

import { fitSquare } from './fitSquare';
import type { IconProps } from './types';

/**
 * "Outline / Messages, Conversation / Chat Round" — Timeline bottom action bar, Chat.
 * Figma export "Outline/Messages, Conversation/Chat Round.svg" (Ezazi Developer File, provided 2026-10-26).
 * Exported 34×34; viewBox trimmed to the bubble, see fitSquare.
 */
export const ChatRoundIcon: React.FC<IconProps> = ({ size = 34, color = '#2E1E91' }) => (
  <Svg {...fitSquare(size, 30.46, 30.46)} viewBox="1.77 1.77 30.46 30.46" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M32.2291 17.0002C32.2291 8.58933 25.4108 1.771 17 1.771C8.58912 1.771 1.77079 8.58933 1.77079 17.0002C1.77079 19.4344 2.34271 21.7382 3.36047 23.7815C3.51235 24.0865 3.54457 24.3978 3.47448 24.6597L2.6307 27.8133C2.0531 29.9721 4.02806 31.947 6.18683 31.3694L9.34038 30.5256C9.60232 30.4556 9.91366 30.4878 10.2186 30.6397C12.262 31.6574 14.5657 32.2293 17 32.2293C25.4108 32.2293 32.2291 25.411 32.2291 17.0002ZM17 3.896C24.2372 3.896 30.1041 9.76293 30.1041 17.0002C30.1041 24.2374 24.2372 30.1043 17 30.1043C14.9018 30.1043 12.9217 29.612 11.166 28.7375C10.4613 28.3866 9.61874 28.2514 8.79113 28.4728L5.63758 29.3166C5.0584 29.4716 4.52852 28.9417 4.68349 28.3625L5.52727 25.209C5.74871 24.3814 5.61356 23.5388 5.26259 22.8341C4.38812 21.0785 3.89579 19.0983 3.89579 17.0002C3.89579 9.76293 9.76273 3.896 17 3.896Z"
      fill={color}
    />
  </Svg>
);

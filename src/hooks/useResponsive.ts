import { useWindowDimensions } from 'react-native';
import { dimens, fontSizes } from '@/config/theme';

// Same qualifier Android uses for tablet layouts (sw600dp)
const TABLET_MIN_WIDTH = 600;

/**
 * Central responsive helper.
 * fs('button') → 14 on phone / 20 on tablet (values from theme.fontSizes).
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;

  const fs = (key: keyof typeof fontSizes): number =>
    fontSizes[key][isTablet ? 'tablet' : 'phone'];

  // Corner radius for input boxes AND buttons — 8dp phone / 16dp tablet
  const cornerRadius = dimens.cornerRadius[isTablet ? 'tablet' : 'phone'];

  return { width, height, isTablet, fs, cornerRadius };
}

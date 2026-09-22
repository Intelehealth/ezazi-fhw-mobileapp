import { useWindowDimensions } from 'react-native';
import { dimens, fontSizes } from '@/core/config/theme';

// Same qualifier Android uses for tablet layouts (sw600dp)
const TABLET_MIN_WIDTH = 600;

// The `tablet` values in theme.fontSizes/dimens were tuned against the
// internal reference tablet (~601dp wide). A wider tablet (e.g. an 11"
// device at ~800dp) has meaningfully more room than that reference, so
// fixed tablet-tier sizes read as relatively small on it. `tabletScale`
// grows those sizes proportionally with the extra width, capped so an
// even larger screen doesn't runaway-scale.
const TABLET_SCALE_REFERENCE_WIDTH = 600;
const TABLET_MAX_SCALE = 1.4;

/**
 * Central responsive helper.
 * fs('button') → 14 on phone / 20+ on tablet (values from theme.fontSizes,
 * scaled up further on tablets wider than the reference device).
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= TABLET_MIN_WIDTH;
  const tabletScale = isTablet
    ? Math.min(width / TABLET_SCALE_REFERENCE_WIDTH, TABLET_MAX_SCALE)
    : 1;

  const fs = (key: keyof typeof fontSizes): number => {
    const base = fontSizes[key][isTablet ? 'tablet' : 'phone'];
    return isTablet ? Math.round(base * tabletScale) : base;
  };

  // Corner radius for input boxes AND buttons — 8dp phone / 12dp+ tablet
  const cornerRadius = isTablet
    ? Math.round(dimens.cornerRadius.tablet * tabletScale)
    : dimens.cornerRadius.phone;

  // Scale an arbitrary tablet-tier size (logo/illustration px, tablet-only
  // paddings, …) the same way fs()/cornerRadius do. Phone values are the
  // caller's own literal and pass through untouched — call as
  // `isTablet ? scale(130) : 104`, never for the phone branch.
  const scale = (tabletValue: number): number =>
    isTablet ? Math.round(tabletValue * tabletScale) : tabletValue;

  return { width, height, isTablet, fs, cornerRadius, scale };
}

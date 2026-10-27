import { dimens, spacing } from '@/core/config/theme';

import { useResponsive } from './useResponsive';

/**
 * Sizes shared by the capture controls: phone from theme tokens, tablet from the Figma tab
 * frames (251:556). The tablet values were read off screenshots and are provisional.
 */
export function useControlSizes() {
  const { isTablet, fs, fromFigma, cornerRadius } = useResponsive();
  return {
    isTablet,
    height: isTablet ? fromFigma(72) : dimens.controlHeight,
    minWidth: isTablet ? fromFigma(150) : dimens.controlMinWidth,
    gap: isTablet ? fromFigma(8) : spacing.sm,
    radius: cornerRadius,
    icon: isTablet ? fromFigma(28) : dimens.headerNavIcon,
    text: isTablet ? fromFigma(20) : fs('controlText'),
    label: isTablet ? fromFigma(16) : fs('controlLabel'),
    tab: isTablet ? fromFigma(18) : fs('tabLabel'),
  };
}

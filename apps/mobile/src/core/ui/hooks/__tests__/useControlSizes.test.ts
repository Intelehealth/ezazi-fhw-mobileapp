import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';

import { dimens, fontSizes, spacing } from '@/core/config/theme';

import { useControlSizes } from '../useControlSizes';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const onScreen = (width: number) => {
  (useWindowDimensions as jest.Mock).mockReturnValue({ width, height: 1000, scale: 2, fontScale: 1 });
  return renderHook(() => useControlSizes()).result.current;
};

/** Capture-control sizes: theme tokens on a phone, Figma tab frames (251:556) on a tablet. */
describe('useControlSizes', () => {
  it('uses the phone theme tokens on a 360 dp phone', () => {
    expect(onScreen(360)).toEqual({
      isTablet: false,
      height: dimens.controlHeight,
      minWidth: dimens.controlMinWidth,
      gap: spacing.sm,
      radius: dimens.cornerRadius.phone,
      icon: dimens.headerNavIcon,
      text: fontSizes.controlText.phone,
      label: fontSizes.controlLabel.phone,
      tab: fontSizes.tabLabel.phone,
    });
  });

  it('turns the Figma sizes into dp at 0.75 on the 8.7" tablet (600 dp)', () => {
    expect(onScreen(600)).toEqual({
      isTablet: true,
      height: 54,
      minWidth: 113,
      gap: 6,
      radius: dimens.cornerRadius.tablet,
      icon: 21,
      text: 15,
      label: 12,
      tab: 11,
    });
  });

  it('draws the Figma sizes one to one on the 11" tablet (800 dp)', () => {
    expect(onScreen(800)).toMatchObject({
      isTablet: true,
      height: 72,
      minWidth: 150,
      gap: 8,
      icon: 28,
      text: 20,
      label: 16,
      tab: 15,
    });
  });
});

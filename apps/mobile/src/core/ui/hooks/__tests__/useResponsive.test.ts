import { renderHook } from '@testing-library/react-native';
import { useWindowDimensions } from 'react-native';
import { fontSizes } from '@/core/config/theme';
import { useResponsive } from '../useResponsive';

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const onScreen = (width: number) => {
  (useWindowDimensions as jest.Mock).mockReturnValue({ width, height: 1000, scale: 2, fontScale: 1 });
  return renderHook(() => useResponsive()).result.current;
};

/** The three device targets: an xhdpi phone, the 8.7" tablet (Figma's reference) and the 11" tablet. */
describe('useResponsive', () => {
  it('keeps phone sizes as given on a 360 dp phone', () => {
    const r = onScreen(360);

    expect(r.isTablet).toBe(false);
    expect(r.fs('button')).toBe(fontSizes.button.phone);
    expect(r.scale(30)).toBe(30);
  });

  it('turns Figma units into dp at 0.75 on the 8.7" tablet (600 dp)', () => {
    const r = onScreen(600);

    expect(r.isTablet).toBe(true);
    expect(r.fromFigma(800)).toBe(600);
    expect(r.fromFigma(50)).toBe(38);
    expect(r.scale(30)).toBe(30);
  });

  it('draws Figma sizes one to one on the 11" tablet (800 dp)', () => {
    const r = onScreen(800);

    expect(r.fromFigma(800)).toBe(800);
    expect(r.fromFigma(50)).toBe(50);
    expect(r.fs('button')).toBe(Math.round(fontSizes.button.tablet * (800 / 600)));
  });

  it('caps the growth on wider screens', () => {
    const r = onScreen(1200);

    expect(r.fromFigma(800)).toBe(Math.round(600 * 1.4));
  });
});

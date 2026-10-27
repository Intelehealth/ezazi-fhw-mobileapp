import { colors } from '@/core/config/theme';

import { controlLook } from '../controlLook';

describe('controlLook', () => {
  it('draws an empty control white with the Figma border', () => {
    expect(controlLook({})).toEqual({ background: colors.white, border: colors.borderFigma, text: colors.primaryTextFigma });
  });

  it('draws a selected control purple, and a selected alert value pink', () => {
    expect(controlLook({ selected: true }).background).toBe(colors.controlSelectedBg);
    expect(controlLook({ selected: true, alert: true })).toEqual({
      background: colors.controlAlertBg,
      border: colors.controlAlertBorder,
      text: colors.controlAlertText,
    });
  });

  it('shows an error and a focus by the border only', () => {
    expect(controlLook({ error: true })).toMatchObject({ background: colors.white, border: colors.alertFigma });
    expect(controlLook({ focused: true })).toMatchObject({ background: colors.white, border: colors.controlSelectedBorder });
  });

  it('lets disabled win over every other state', () => {
    expect(controlLook({ disabled: true, selected: true, alert: true, error: true }).background).toBe(colors.controlDisabledBg);
  });
});

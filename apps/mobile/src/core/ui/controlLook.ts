import { colors } from '@/core/config/theme';

/** One option of a choice control. A selected `alert` option takes the alert look. */
export interface ChoiceOption {
  value: string;
  label: string;
  alert?: boolean;
}

/** What a capture control is showing. Each look below wins over the ones after it. */
export interface ControlState {
  disabled?: boolean;
  alert?: boolean; // a selected or entered value the clinical rules flag
  selected?: boolean;
  error?: boolean; // required and missing, or out of range
  focused?: boolean;
}

export interface ControlLook {
  background: string;
  border: string;
  text: string;
}

/**
 * The colours of a capture control in its state (Figma 251:556). Alert and error are
 * provisional until a frame shows them (decided 2026-10-26).
 */
export function controlLook(state: ControlState): ControlLook {
  if (state.disabled) {
    return { background: colors.controlDisabledBg, border: colors.borderFigma, text: colors.textDisabled };
  }
  if (state.alert) {
    return { background: colors.controlAlertBg, border: colors.controlAlertBorder, text: colors.controlAlertText };
  }
  if (state.selected) {
    return { background: colors.controlSelectedBg, border: colors.controlSelectedBorder, text: colors.controlSelectedText };
  }
  if (state.error) return { background: colors.white, border: colors.alertFigma, text: colors.primaryTextFigma };
  if (state.focused) return { background: colors.white, border: colors.controlSelectedBorder, text: colors.primaryTextFigma };
  return { background: colors.white, border: colors.borderFigma, text: colors.primaryTextFigma };
}

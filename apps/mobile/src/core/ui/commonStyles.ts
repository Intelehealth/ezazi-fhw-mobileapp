import { StyleSheet } from 'react-native';
import { colors, dimens } from '@/core/config/theme';

/**
 * Shared style fragments reused across auth screens — the RN equivalent of
 * Android's styles.xml entries. Screens compose these via style arrays
 * instead of re-declaring the same properties locally.
 *
 * Only properties identical everywhere live here. Spacing that differs by
 * screen (margins) stays as a small inline override at the call site — the
 * same way an Android layout can still set its own layout_margin on a view
 * that uses a shared style.
 */
export const commonStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.white,
  },

  flex1: {
    flex: 1,
  },

  fieldHeading: {
    color: colors.textPrimary,
    fontWeight: '600',
  },

  instruction: {
    color: colors.darkGray,
    lineHeight: 20,
  },

  errorText: {
    color: colors.error,
    textAlign: 'right',
  },

  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },

  fieldGap: {
    marginTop: dimens.fieldGap,
  },
});

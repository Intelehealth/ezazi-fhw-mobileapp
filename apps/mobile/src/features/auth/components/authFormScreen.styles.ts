import { StyleSheet } from 'react-native';
import { colors, dimens } from '@/core/config/theme';

/**
 * Shared layout constants + StyleSheet for LoginScreen and SetupScreen —
 * Figma calls for an identical screen (logo + illustration + heading +
 * subtitle + first field + PASSWORD + forgot-password row + submit button),
 * Setup just adds a LOCATION field before USERNAME. Single source of truth
 * instead of two copies kept in sync by hand. The API error banner itself
 * is core/ui/ApiErrorBanner, shared with every other screen that calls an
 * API, not just these two.
 */

// Parent container padding.
export const FORM_H_PAD = 30;

// assets/clients/default/setup_logo.png natural aspect ratio (width / height)
export const LOGO_ASPECT = 364 / 144;

// setupIllustration.viewBox aspect ratio (width / height)
export const ILLUSTRATION_ASPECT = 267 / 177;

export const authFormStyles = StyleSheet.create({
  content: {
    paddingHorizontal: FORM_H_PAD,
    paddingBottom:     48,
  },

  // Wraps logo + heading + first field in normal flow — the illustration is
  // the last child here, positioned absolutely (see `illustration` below),
  // so it paints on top of the first field without affecting where any of
  // this content sits.
  topSection: {
    position: 'relative',
  },

  illustration: {
    position: 'absolute',
  },

  title: {
    color:      colors.textPrimary,
    fontWeight: '700',
    marginTop:  10,
  },

  subtitle: {
    color:      colors.textSecondary,
    marginTop:  6,
  },

  // Small gray caps label above each field — LOCATION / USERNAME / PASSWORD
  fieldLabel: {
    color:            colors.fieldLabel,
    fontWeight:       '600',
    textTransform:    'uppercase',
    letterSpacing:    0.5,
    marginTop:        dimens.fieldGap,
    marginBottom:     dimens.labelGap,
  },

  firstFieldLabel: {
    marginTop: 28,
  },

  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 10,
  },

  // Figma: color: var(--Primary-Color, #2E1E91); bold, no underline
  forgotText: {
    color:      colors.primary,
    fontWeight: '700',
  },

  // API error banner is core/ui/ApiErrorBanner — not local styles.

  loginButton: {
    marginTop: 32,
  },
});

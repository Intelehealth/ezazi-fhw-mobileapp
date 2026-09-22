import { StyleSheet } from 'react-native';
import { colors, dimens } from '@/core/config/theme';

/**
 * Shared layout constants + StyleSheet for LoginScreen and SetupScreen —
 * Figma calls for an identical screen (logo + illustration + heading +
 * subtitle + first field + PASSWORD + forgot-password row + error banner +
 * submit button), Setup just adds a LOCATION field before USERNAME. Single
 * source of truth instead of two copies kept in sync by hand.
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

  // API error banner — pale-red card with a filled circular "!" badge,
  // shown above the submit button (Figma: credentials/network error states).
  errorBanner: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    backgroundColor:   colors.colorEmergencyBg,
    padding:           12,
    marginTop:         20,
  },

  errorBannerIcon: {
    width:            20,
    height:           20,
    borderRadius:     10,
    backgroundColor:  colors.error,
    alignItems:       'center',
    justifyContent:   'center',
    marginRight:      10,
    marginTop:        1,
  },

  errorBannerIconGlyph: {
    color:      colors.white,
    fontSize:   13,
    lineHeight: 15,
    fontWeight: '700',
  },

  errorBannerTextWrap: {
    flex: 1,
  },

  errorBannerTitle: {
    color:      colors.error,
    fontWeight: '700',
  },

  errorBannerMessage: {
    color:     colors.textSecondary,
    marginTop: 2,
  },

  loginButton: {
    marginTop: 32,
  },
});

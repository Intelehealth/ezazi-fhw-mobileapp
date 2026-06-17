/**
 * Design tokens — Traffic-light colors per IHRDMP-593 + IHRDMP-592.
 * Used at data-entry screens, partograph plotting, and home-list risk indicators.
 */
export const colors = {
  // Risk schema (PRD IHRDMP-593)
  riskLow: '#019283', // Green — Normal (cumulative weightage = 0)
  riskModerate: '#FD8C3E', // Orange — Vigilance (1.0–3.5)
  riskHigh: '#ED1A56', // Red — Action (>3.5)
  riskSos: '#F8BBD0', // Pale Red — Emergency SOS

  // Brand
  primary: '#019283',
  primaryDark: '#01695F',
  secondary: '#FD8C3E',

  // Neutrals
  white: '#FFFFFF',
  black: '#000000',
  bg: '#F8F9FA',
  surface: '#FFFFFF',
  border: '#E0E0E0',
  textPrimary: '#212121',
  textSecondary: '#757575',
  textInverse: '#FFFFFF',
  textDisabled: '#BDBDBD',

  // Status
  success: '#019283',
  warning: '#FD8C3E',
  error: '#ED1A56',
  info: '#2196F3',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const },
  h2: { fontSize: 22, fontWeight: '700' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  button: { fontSize: 16, fontWeight: '600' as const },
} as const;

export const theme = { colors, spacing, radii, typography };
export type Theme = typeof theme;

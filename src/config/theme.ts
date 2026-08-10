import { clientConfig } from './clients';

/**
 * SINGLE source of design tokens — the RN equivalent of Android's
 * colors.xml + dimens.xml (IHRDMP-592 / IHRDMP-593).
 *
 * `palette` mirrors the legacy Android colors.xml 1:1 (names kept identical
 * for cross-referencing) and stays fixed across clients. The brand colors
 * (`colors.primary/primaryDark/secondary`) instead come from the resolved
 * `clientConfig` — see src/config/clients — so re-theming per client/country
 * never requires touching a screen or component.
 *
 * NOTE on translucent values: Android hex is #AARRGGBB, React Native is
 * #RRGGBBAA. Every 8-digit value below has been converted to RN order; the
 * original Android value is kept in the comment.
 *
 * UI is pixel-tested — do not change values here without a design decision.
 */

const palette = {
  // ── colors.xml — Material Palette deep-purple/blue ─────────────────────────
  colorPrimary: '#2E1E91',
  colorPrimarynew: '#2E1E91',
  colorPrimaryDark: '#241871',
  colorPrimaryLight: '#6F58BC',
  colorPrimaryLighter: '#2E1E911A', // Android #1a2E1E91
  intro_next: '#2014EB',
  colorAccent: '#ED1A56',
  primary_text: '#212121',
  icons: '#FFFFFF',
  titleBar_cardview: '#2E1E91',
  divider: '#BDBDBD',
  green: '#4CAF50',
  red: '#ED1A56',
  yellow: '#FFEB3B',
  amber: '#FFC107',
  gray: '#444440',
  white: '#FFFFFF',
  transparent: '#FFFFFF80', // Android #80FFFFFF
  button_text_color: '#4B0082',

  // scale colors
  scale_1: '#FF0000',
  scale_2: '#FFA100',
  scale_3: '#E6E600',
  scale_4: '#91BF00',
  scale_5: '#008000',

  font_black_0: '#212121',
  font_black_welcome: '#212121',
  font_black_1: '#424242',
  font_black_2: '#616161',
  font_black_3: '#757575',
  font_black_4: '#9E9E9E',
  font_black_5: '#BDBDBD',
  font_black_6: '#E0E0E0',

  lite_red: '#F3665C',
  // Home Screen Changes
  txt_sub_header_color: '#333333',

  // dots inactive colors
  dot_dark_screen1: '#D1395C',
  dot_dark_screen2: '#14A895',
  dot_dark_screen3: '#2278D4',
  dot_dark_screen4: '#A854D4',

  // dots active colors
  dot_light_screen1: '#F98DA5',
  dot_light_screen2: '#93C6FD',
  dot_light_screen3: '#93C6FD',
  dot_light_screen4: '#E4B5FC',

  transparent_tab: '#00000075', // Android #75000000

  newPrimaryColor: '#2E1E91',
  newPrimaryColorLight: '#33229F',
  light_blue_600: '#039BE5', // Android #FF039BE5
  light_blue_900: '#01579B', // Android #FF01579B
  light_blue_A200: '#40C4FF', // Android #FF40C4FF
  light_blue_A400: '#00B0FF', // Android #FF00B0FF
  black_overlay: '#00000066', // Android #66000000

  blinkCardColor: '#FFD7E2',
  darkGray: '#7F7B92',
  colorLoginInputBg: '#F7F7FA',
  colorLoginInputStroke: '#7F7B9280', // Android #807F7B92
  colorForgotPassword: '#706D7A',
  colorInputText: '#1E1E1E',
  colorContainer: '#F7F7FA',
  colorSearchContent: '#ED1A56',
  colorHighAlert: '#FD1053',
  colorMediumAlert: '#FD8C3E',
  colorNormalAlert: '#019283',
  darkGray_50_perc: '#7B779380', // Android #807B7793
  colorSelectedListItem: '#D7D4EA',
  colorScrollbar: '#C0C0C0',
  colorGrayBorder: '#7F7B9299', // Android #997F7B92
  colorIconButtonBg: '#2E1E9130', // Android #302E1E91
  colorEmergencyBg: '#FFD7E2',
  colorStageText: '#8D8D8D',
  colorStageStroke: '#2E1E9166', // purple @ 40% — already RN byte order
  colorAddPatientInput: '#B2AFBE33', // Android #33B2AFBE
  colorBlack: '#000000',
  colorGray: '#D8D5EB',
  colorDeactivated: '#B0ADBE',
  colorIncomingCallBg: '#B0ADBE',
  edittextBorder: '#B2AFBE',
  error_red: '#ED1A56', // unified app-wide error red (colors.xml value: #FF475D)
  colorInputBgBorder: '#7F7B9226', // Android #267F7B92
  days_calendar: '#19181A',
  dialog_transparency_bg: '#00000080', // Android #80000000
  darkPink: '#FFB7CB',
  decisionPending: '#E3D4EB',
  splash_bg: '#FFFFFF',

  // ── Values rendered by the RN app but absent from colors.xml ───────────────
  gray_2: '#CECDCD', // Reject button stroke + unchecked checkbox border
  gray_4: '#767272', // Theme.EZazi.Caption text (Privacy Notice body)
  containerBg: '#F2F2F7', // Privacy Notice window background
  headerBorder: '#D0D0D0', // ScreenHeader bottom hairline
  bg: '#F8F9FA', // Home screen background
  info: '#2196F3',
  riskSos: '#F8BBD0', // Pale red — Emergency SOS (PRD IHRDMP-593)
  dialogText: '#444444', // PermissionDeniedDialog description
  dialogTextStrong: '#222222', // PermissionDeniedDialog permission label
  dialogTextMuted: '#666666', // PermissionDeniedDialog reason / outline button
  dialogOverlay: 'rgba(0,0,0,0.55)',
} as const;

export const colors = {
  ...palette,

  // ── Semantic aliases — prefer these in shared components/screens ───────────
  // Brand colors come from the resolved client, not the static palette above.
  primary: clientConfig.theme.primary,
  primaryDark: clientConfig.theme.primaryDark,
  secondary: clientConfig.theme.secondary,
  onPrimary: palette.white,
  black: palette.colorBlack,
  error: palette.error_red,
  success: palette.colorNormalAlert,
  warning: palette.colorMediumAlert,
  textPrimary: palette.font_black_0,
  textSecondary: palette.font_black_3,
  textDisabled: palette.font_black_5,
  disabledBg: palette.font_black_6, // disabled button fill
  disabledText: palette.font_black_4, // disabled button label
  placeholder: palette.font_black_4,
  icon: palette.colorForgotPassword, // eye toggle, chevrons
  inputBg: palette.colorLoginInputBg,
  inputBorder: palette.divider,
  border: palette.font_black_6,
  wavePink: palette.blinkCardColor, // header blob + light bottom wave
  wavePinkDark: palette.darkPink, // dark bottom wave

  // Risk schema (PRD IHRDMP-593) — data entry, partograph, home-list indicators
  riskLow: palette.colorNormalAlert,
  riskModerate: palette.colorMediumAlert,
  riskHigh: palette.red,
} as const;

// ── dimens.xml equivalent — structural sizes shared across screens ───────────
export const dimens = {
  screenHPad: 28, // forgot_password_screen_padding
  inputHeight: 56, // input_height (inputs AND buttons)
  // input_box_corner_radius — inputs and buttons, via useResponsive().cornerRadius
  cornerRadius: { phone: 8, tablet: 12 },
  btnArrowInset: 8, // screen_container_padding — arrow inset from button right edge
  labelGap: 6, // gap between label and its input
  fieldGap: 20, // vertical gap between form fields
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

// Responsive font sizes — phone / tablet (sw600dp) pairs, mirrors Android dimens.
// Read via useResponsive().fs('label') etc.
export const fontSizes = {
  label: { phone: 12, tablet: 14 }, // input_label_size
  input: { phone: 14, tablet: 16 }, // input_inner_size
  button: { phone: 14, tablet: 20 }, // button_text_size
  link: { phone: 12, tablet: 14 }, // forgot_pwd_size
  error: { phone: 12, tablet: 13 }, // validation caption
  heading: { phone: 16, tablet: 20 }, // forgot_password_label_size
  instruction: { phone: 14, tablet: 16 }, // forgot_password_instruction_size
  headerTitle: { phone: 18, tablet: 30 }, // wave-header title
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

export const theme = { colors, dimens, spacing, radii, fontSizes, typography };
export type Theme = typeof theme;

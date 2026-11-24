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
  progressScrim: 'rgba(255, 255, 255, 0.6)', // ApiProgressOverlay full-screen scrim
  hintGray: '#9B97AA', // Figma-verified — input hint text + field icons (Setup screen, 2026-09-15)
  secondaryTextFigma: '#4A4665', // Figma "--Secondary-text" — LOCATION/USERNAME/PASSWORD field labels
  alertFigma: '#D4154A', // Figma "--Alert" — network-error banner circle + title (Ezazi Developer File, 2026-09-22)
  networkBannerBg: '#FEEAEF', // Figma network-error banner background (Ezazi Developer File, 2026-09-22)
  primaryTextFigma: '#17133B', // Figma "Primary Text" variable (Ezazi Developer File, 2026-10-21)
  borderFigma: '#DED9F0', // Figma "Border" variable — cards, checkbox, back button
  buttonDisabledFigma: '#C5C2D0', // Figma Component 1 / "disbaled" button fill
  buttonSecondaryBorderFigma: '#D5D7DA', // Figma Component 1 / "secondary button" stroke
  buttonSecondaryTextFigma: '#414651', // Figma "Gray/700" — secondary button label
  appBarBorder: '#F3F4F4', // BrandAppBar bottom hairline (Privacy Notice design)

  // ── Timeline, Figma Observation flow "First Iteration" (251:364), 2026-10-26 ──
  // Header values are Figma variables; the rest were read off the frame's render.
  primaryTextDarkFigma: '#171334', // patient name, close icon
  headerDividerFigma: '#F1EFFA', // header bottom border, action-bar top border
  headerPillBg: '#F8F7FE', // View LCG / Postpartum Report
  timelineBg: '#FCFCFC',
  timelineAccent: '#460092', // completed dot, Due Now chip text
  timelineRail: '#EAE4F2',
  timelineBody: '#6F6381', // card body text
  timelineCompletedBg: '#F1FAF5',
  timelineCompletedBorder: '#DCF3E9',
  timelineCompletedChipBg: '#CEFFEC',
  timelineCompletedChipText: '#00A04B',
  timelineMissedBorder: '#FF71A3',
  timelineMissedDot: '#F50060',
  timelineMissedChipBg: '#FFE7EF',
  timelineMissedChipText: '#F0004A',
  timelineDueBg: '#F9F6FE',
  timelineDueBorder: '#9D7CC8',
  timelineDueDot: '#885FBC',
  timelineDueChipBg: '#EFE1FF',
  timelineUpcomingBorder: '#ECE3F5',
  timelineUpcomingDot: '#E8DEF3',
  timelineUpcomingDotFill: '#F6F2F9',
  timelineUpcomingChipBg: '#EFEFEF',
  timelineActionBorder: '#EAE4F2',
  timelineActionText: '#1E023B',
  timelineSos: '#F0004A',

  // ── ConfirmDialog, Figma "Modal" frames (Capture SOS, Save & Exit), 2026-10-26 ──
  // Read off the frames' renders; the modal frames were not readable through Figma (rate limit).
  dialogDangerBg: '#FFEAF0',
  dialogWarningBg: '#FFF0E5',
  // The badge's four 1px rings, innermost first: near-white greys fading outwards.
  dialogRing1: '#F7F7F8',
  dialogRing2: '#F8F9F9',
  dialogRing3: '#FAFAFA',
  dialogRing4: '#FCFCFC',
  dialogWarningIcon: '#F2771A',
  dialogNoteBg: '#F5F1FF',
  dialogNoteBorder: '#CDBDF5',
  dialogCloseIcon: '#A4A1B5',
  // Success tone (Figma "Successful" modal): mint badge, green check-circle, as the password-reset dialog drew them.
  dialogSuccessBg: '#CDFFE6',
  dialogSuccessIcon: '#00A254',

  // ── Capture controls, Figma Observation flow tabs (251:556), 2026-10-28 ──
  // Read off Kaveri's frame screenshots (rate limit). Alert has no frame yet: provisional, the
  // Missed-chip pink (decided 2026-10-26). Error: Figma "Record 24/25" (2026-10-29).
  controlSelectedBg: '#F3EAFF',
  controlSelectedBorder: '#9D7CC8',
  controlSelectedText: '#460092',
  controlAlertBg: '#FFE7EF',
  controlAlertBorder: '#FF71A3',
  controlAlertText: '#F0004A',
  controlDisabledBg: '#F5F4F8',
  controlErrorBorder: '#FF71A3',
  controlErrorText: '#FB0077',
  tabUnselectedText: '#9B97AA',
  tabIndicator: '#460092',
} as const;

export const colors = {
  ...palette,

  // ── Semantic aliases — prefer these in shared components/screens ───────────
  // Brand colors come from the resolved client, not the static palette above.
  primary: clientConfig.theme.primary,
  primaryDark: clientConfig.theme.primaryDark,
  secondary: clientConfig.theme.secondary,
  onPrimary: palette.white,
  // Figma "Main CTA" fill (Next, Record Now, End First Stage; file 8kkAB3TRzBFY2mSRJzkTiy, 251:709 / 251:555):
  // left to right. Android draws these buttons flat in colorPrimary.
  ctaGradientStart: '#2E1E91',
  ctaGradientEnd: '#3922CF',
  black: palette.colorBlack,
  error: palette.error_red,
  // Network-error banner only (core/ui/ApiErrorBanner) — a separate, exact
  // Figma spec from the generic `error`/`colorEmergencyBg` pair every other
  // banner state still uses.
  networkBannerBg: palette.networkBannerBg,
  networkBannerAlert: palette.alertFigma,
  networkBannerMessage: palette.secondaryTextFigma,
  success: palette.colorNormalAlert,
  warning: palette.colorMediumAlert,
  textPrimary: palette.font_black_0,
  textSecondary: palette.font_black_3,
  fieldLabel: palette.secondaryTextFigma, // Figma "--Secondary-text" — field-label captions only
  textDisabled: palette.font_black_5,
  disabledBg: palette.font_black_6, // disabled button fill
  disabledText: palette.font_black_4, // disabled button label
  placeholder: palette.hintGray,
  icon: palette.hintGray, // eye toggle, chevrons, field icons
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
  inputHeight: 60, // input_height (text fields only — see buttonHeight for AppButton)
  buttonHeight: { phone: 60, tablet: 64 }, // AppButton — flat per phone/tablet, not run through useResponsive().scale()
  compactButtonHeight: 40, // AppButton size 'compact' on phone; tablet follows its Figma frame
  otpCellHeight: { phone: 52, tablet: 64 }, // OtpInput — single-digit boxes, scaled via useResponsive().scale() on tablet
  // input_box_corner_radius — inputs and buttons, via useResponsive().cornerRadius
  cornerRadius: { phone: 8, tablet: 12 },
  btnArrowInset: 8, // screen_container_padding — arrow inset from button right edge
  labelGap: 6, // gap between label and its input
  fieldGap: 20, // vertical gap between form fields
  timelineDotSize: { phone: 28, tablet: 34 }, // TimelineCheckpointCard — checkpoint circle
  headerNavButton: 40, // PatientHeader back / close on phone; tablet follows Figma 251:565
  headerNavIcon: 24, // icon inside it
  // Capture controls on phone; tablet follows the Figma tab frames via fromFigma
  controlHeight: 44, // segmented button, number chip, picker field, stepper box
  controlMinWidth: 72, // segmented button
  tabIndicator: 2, // selected tab underline
  // Labour screens, phone values (tablet sizes come from their Figma frames through fromFigma):
  timelineDateColumn: 76, // TimelineCheckpointCard date column
  timelineRailLine: 2, // the line joining checkpoint circles
  timelineDotBorder: 1.5, // checkpoint circle border
  timelineChipHeight: 22, // status chip
  timelineSosBadgeHeight: 26, // SOS badge
  timelineSosIcon: 14, // icon in the SOS badge
  timelineLockBadge: 30, // lock badge on an upcoming card
  actionBarIcon: 18, // TimelineActionBar and CaptureActionBar icons
  actionBarPillHeight: 48, // CaptureActionBar pill
  patientPillIcon: 16, // PatientHeader pill icon
  headerCloseIcon: 26, // PatientHeader close glyph
  stageProgressHeight: 4, // StageProgressBar segment
  dialogMaxWidth: 400, // End Stage dialogs
  dialogCloseIcon: 20, // a dialog's close glyph
  confirmDialogBadge: 40, // ConfirmDialog tone badge, phone
  confirmDialogMaxWidth: 360, // ConfirmDialog card, phone
  confirmDialogPadding: 20, // ConfirmDialog card padding, phone
  dialogNoteIcon: 16, // the info icon in a dialog note, phone

  // Shared core/ui and sign-in sizes. Where a component has a tablet size, it is set in place through scale().
  statusBarFallback: 24, // BrandAppBar, ScreenHeader, ForgotPasswordHeader: status bar height when Android reports none
  inputHPad: 14, // AppTextField row and the phone-number box: inner horizontal padding
  inputSlotGap: 10, // AppTextField: gap after the left icon
  fieldIcon: 20, // the icon in a sign-in field: person, lock, location pin, chevron
  instructionLineHeight: 20, // commonStyles.instruction
  multilineInputMinHeight: 110, // ControlTextInput multiline (reason / comment boxes)
  // ApiErrorBanner
  errorBannerPadding: 12,
  errorBannerMarginTop: 20, // both variants
  errorBannerIcon: 20, // the "!" circle
  errorBannerIconGap: 10, // "!" circle to text
  errorBannerGlyphLineHeight: 15, // the "!"
  errorBannerMessageGap: 2, // title to message, both variants
  networkBannerPadding: 14, // network variant: padding and icon-to-text gap
  networkBannerIcon: 44, // network variant: red circle
  networkBannerGlyph: 20, // network variant: icon in the circle
  // AppButton
  buttonArrowIcon: 24, // "next" arrow, phone
  buttonChevronGrowth: 4, // the chevron is this much larger than the label
  // BrandAppBar, phone
  appBarHeight: 52,
  appBarLogoHeight: 24,
  appBarTextLineHeight: 14, // "Last Refreshed" lines
  appBarMenuIcon: 22,
  appBarHPad: 20,
  // ScreenHeader, phone
  screenHeaderButton: 42, // back button
  screenHeaderIcon: 18, // arrow in the back button
  screenHeaderHeight: 56,
  screenHeaderHPad: 12,
  screenHeaderGap: 14, // back button to title
  // ScreenLayout gutters, phone
  screenLayoutHPad: 20,
  screenLayoutTop: 20,
  // Login and Setup (authFormScreen.styles), phone
  authFormHPad: 30, // content horizontal padding, phone and tablet
  authContentTop: 130, // content top padding
  authLogoHeight: 32, // client wordmark; ForgotPasswordHeader too
  authHeadingTop: 10, // heading under the wordmark; ForgotPasswordHeader too
  authSubtitleTop: 6, // subtitle under the heading
  authFirstFieldTop: 28, // first field label under the subtitle
  authForgotTop: 10, // "Forgot password?" row under the password field
  authIllustrationHeight: 104, // setup illustration over the first field
  authIllustrationRight: 14, // its inset from the content's right edge
  // ForgotPasswordHeader, phone
  forgotHeaderBackButton: 36,
  forgotHeaderBackIcon: 20,
  forgotHeaderTitleTop: 108, // logo/heading block under the back button
  forgotHeaderShieldHeight: 78,
  forgotHeaderShieldTop: 74, // shield position until the first field is measured
  forgotHeaderShieldGap: 12, // room between the text and the shield
  // Forgot Password screens (request, verify, reset)
  forgotPasswordContentTop: 40, // content top padding, all three screens
  countryCardHPad: 10, // request: country code box, phone
  countryChevronIcon: 16, // request: chevron in the country code box
  countryChevronGap: 2, // request: dial code to chevron
  otpMessageTop: 6, // verify: error / "verified" line under the OTP cells
  otpResendTop: 20, // verify: "Didn't receive it? Resend" row
  otpCellBorder: 1.5, // OtpInput cell
  otpCellActiveBorder: 2, // OtpInput cell with the cursor
  passwordToggleIcon: 22, // PasswordField eye icon
  requirementsCardHPad: 14, // reset: password requirements card
  requirementsCardVPad: 12,
  requirementsCardTop: 12,
  requirementsCardBottom: 20,
  requirementsRowGap: 6, // between the two rows
  requirementsColumnGap: 12, // between the two columns
  // LocationPickerModal
  locationDropdownMaxHeight: 260,
  locationDropdownGap: 6, // field bottom to dropdown
  locationStatePad: 20, // loading / empty state vertical padding
  locationRowPad: 14, // option row padding
  // PrivacyNoticeScreen, phone
  privacyBackButton: 36,
  privacyBackIcon: 18,
  privacyTitleGap: 12, // back button to title
  privacyBodyLineHeight: 18, // section heading and body lines
  privacySectionPad: 12, // section vertical padding
  privacyHeadingGap: 2, // section heading to body
  privacyBlockGap: 20, // between the title, the sections, the consent card and Accept
  privacyConsentPad: 12, // consent card padding
  privacyConsentGap: 12, // checkbox to consent text
  privacyCheckbox: 20,
  privacyCheckboxBorder: 1.5,
  privacyCheckboxTop: 2, // checkbox nudge to the first text line
  privacyCheckIcon: 14,
  // SplashScreen, phone
  splashWordmarkWidth: 140,
  splashWordmarkHeight: 60,
  splashIllustrationHeight: 230,
  splashTaglineLineHeight: 15,
  splashTaglineTop: 12, // tagline under the wordmark
  splashDividerLine: 32, // each line beside the heart
  splashHeartIcon: 12, // heart between the divider lines, phone and tablet
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
  progressBar: 3, // StageProgressBar segment
  chip: 6, // Timeline status chip and SOS badge
  card: 12, // Timeline card, action-bar pills, patient pill
  networkBanner: 14, // ApiErrorBanner network variant
  headerBackButton: 12, // ScreenHeader back button, phone
  forgotHeaderBackButton: 10, // ForgotPasswordHeader back button, phone
  consentCard: 10, // PrivacyNoticeScreen consent card, phone
} as const;

// Responsive font sizes — phone / tablet (sw600dp) pairs, mirrors Android dimens.
// Read via useResponsive().fs('label') etc.
export const fontSizes = {
  label: { phone: 12, tablet: 14 }, // input_label_size
  input: { phone: 12, tablet: 14 }, // input_inner_size
  button: { phone: 14, tablet: 20 }, // button_text_size
  link: { phone: 12, tablet: 14 }, // forgot_pwd_size
  error: { phone: 12, tablet: 13 }, // validation caption
  heading: { phone: 16, tablet: 20 }, // forgot_password_label_size
  instruction: { phone: 14, tablet: 16 }, // forgot_password_instruction_size
  headerTitle: { phone: 18, tablet: 30 }, // wave-header title

  // TimelineCheckpointCard / StageProgressBar / TimelineActionBar
  timelineStageLabel: { phone: 11, tablet: 13 }, // "1. Stage 1" stepper label
  timelineTime: { phone: 13, tablet: 15 }, // "9:30 AM" bold time
  timelineDate: { phone: 11, tablet: 13 }, // "25 Aug 2026" date
  timelineCardLabel: { phone: 11, tablet: 13 }, // "COMPLETED" / "MISSED" / "DUE NOW" / "UPCOMING" badge
  timelineCardBody: { phone: 13, tablet: 15 }, // checkpoint card description line
  timelineActionLabel: { phone: 11, tablet: 13 }, // SOS / Chat / Video Call / Rx captions
  compactButton: { phone: 14, tablet: 14 }, // AppButton size 'compact' ("Record Now")

  // CardCaptureScreen title (Figma 251:581); tablet follows the frame via fromFigma
  captureKicker: { phone: 10, tablet: 13 }, // "SCHEDULED OBSERVATION · STAGE 1"
  captureTitle: { phone: 18, tablet: 24 }, // "Observation 9:30 AM"

  // Capture controls (Figma 251:556); tablet follows the frame via fromFigma
  controlLabel: { phone: 11, tablet: 13 }, // "COMPANION?" field caption
  controlText: { phone: 14, tablet: 16 }, // option, chip, stepper and picker text
  tabLabel: { phone: 12, tablet: 14 }, // "Supportive care"
  dialogTitle: { phone: 18, tablet: 18 }, // End Stage dialog title
  confirmTitle: { phone: 18, tablet: 20 }, // ConfirmDialog title
  confirmMessage: { phone: 14, tablet: 14 }, // ConfirmDialog message
  confirmNote: { phone: 13, tablet: 13 }, // ConfirmDialog note
  // Phone sizes; on tablets the screen sets these from the Figma frame (fromFigma).
  patientName: { phone: 20, tablet: 20 }, // PatientHeader name
  timelineStageHeading: { phone: 20, tablet: 20 }, // "STAGE 1" heading over the cards
  // Phone sizes; on tablets the component sets these in place through scale().
  appBarRefreshed: { phone: 11, tablet: 11 }, // BrandAppBar "Last Refreshed" lines
  screenHeaderTitle: { phone: 18, tablet: 18 }, // ScreenHeader title
  otpDigit: { phone: 20, tablet: 20 }, // OtpInput digit
  privacyTitle: { phone: 21, tablet: 21 }, // PrivacyNoticeScreen title
  privacyHeading: { phone: 13, tablet: 13 }, // PrivacyNoticeScreen section heading
  privacyBody: { phone: 12, tablet: 12 }, // PrivacyNoticeScreen body and bullets
  privacyConsent: { phone: 13, tablet: 13 }, // PrivacyNoticeScreen consent text
  splashTagline: { phone: 11, tablet: 11 }, // SplashScreen tagline
  // Fixed sizes, the same on every device (read as .phone in a StyleSheet).
  errorBannerGlyph: { phone: 13, tablet: 13 }, // ApiErrorBanner "!"
  countryFlag: { phone: 20, tablet: 20 }, // ForgotPasswordRequestOtpScreen flag emoji
  locationOption: { phone: 15, tablet: 15 }, // LocationPickerModal option text
  splashLoading: { phone: 12, tablet: 12 }, // SplashScreen "Loading …" text
} as const;

export const letterSpacing = {
  caps: 0.5, // capitalised labels: kickers, chips, section labels
  button: 0.5, // AppButton label
  splashTagline: 1.2, // SplashScreen tagline
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

export const theme = { colors, dimens, spacing, radii, fontSizes, letterSpacing, typography };
export type Theme = typeof theme;

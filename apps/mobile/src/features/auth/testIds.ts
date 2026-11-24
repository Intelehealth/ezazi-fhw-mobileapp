/**
 * Every QA locator (`testID`) in the sign-in screens, in one place (UI_CONVENTIONS section 13). A dialog's id also
 * names its parts: `<id>-close`, `<id>-cancel`, `<id>-confirm`; a password field's eye toggle is `<id>-toggle`.
 */
export const AUTH_TEST_IDS = {
  splash: {
    permissionsDialog: 'splash-permissions-dialog',
    alarmsDialog: 'splash-alarms-dialog',
  },
  setup: {
    location: 'setup-location',
    locationList: 'setup-location-list',
    locationOption: (locationUuid: string) => `setup-location-option-${locationUuid}`,
    username: 'setup-username',
    password: 'setup-password',
    forgotPassword: 'setup-forgot-password',
    goToLogin: 'setup-go-to-login',
    goToPrivacy: 'setup-go-to-privacy',
    errorBanner: 'setup-error-banner',
    submit: 'setup-submit',
  },
  login: {
    username: 'login-username',
    password: 'login-password',
    forgotPassword: 'login-forgot-password',
    errorBanner: 'login-error-banner',
    submit: 'login-submit',
  },
  forgotRequest: {
    back: 'forgot-request-back',
    phone: 'forgot-request-phone',
    errorBanner: 'forgot-request-error-banner',
    submit: 'forgot-request-submit',
  },
  forgotVerify: {
    back: 'forgot-verify-back',
    otp: 'forgot-verify-otp',
    resend: 'forgot-verify-resend',
    errorBanner: 'forgot-verify-error-banner',
    submit: 'forgot-verify-submit',
  },
  forgotReset: {
    back: 'forgot-reset-back',
    newPassword: 'forgot-reset-new-password',
    confirmPassword: 'forgot-reset-confirm-password',
    errorBanner: 'forgot-reset-error-banner',
    submit: 'forgot-reset-submit',
    successDialog: 'forgot-reset-success-dialog',
  },
  privacy: {
    back: 'privacy-back',
    consent: 'privacy-consent',
    accept: 'privacy-accept',
    reject: 'privacy-reject',
  },
} as const;

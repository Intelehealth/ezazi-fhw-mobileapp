/**
 * Navigation type definitions — central source of truth.
 * Add new screens here so route names are type-safe.
 */
export type RootStackParamList = {
  // Auth stack
  Splash: undefined;
  Setup: undefined;
  Login: undefined;
  PrivacyNotice: undefined;
  // `origin` — which screen "Forgot password?" was tapped from (Setup or
  // Login), threaded through all 3 steps so the success dialog's "Back to
  // Login" can return there instead of always landing on Login.
  ForgotPasswordRequest: { origin: 'Setup' | 'Login' };
  ForgotPasswordVerify: { phoneNumber: string; countryCode: string; origin: 'Setup' | 'Login' };
  // resetToken — verifyOtp's short-lived JWT (expiresIn: 600s), required by
  // resetPassword; always the one from the latest verify response, never cached.
  ForgotPasswordReset: { userUuid: string; origin: 'Setup' | 'Login'; resetToken: string };

  // App stack
  Home: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

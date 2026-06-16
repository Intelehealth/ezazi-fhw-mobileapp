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
  ForgotPasswordRequest: undefined;
  ForgotPasswordVerify: { phone: string };
  ForgotPasswordReset: { userUuid: string; otpToken: string };

  // App stack
  Home: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

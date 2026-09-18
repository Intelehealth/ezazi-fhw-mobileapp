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
  ForgotPasswordVerify: { phoneNumber: string; countryCode: string };
  ForgotPasswordReset: { userUuid: string };

  // App stack
  Home: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}

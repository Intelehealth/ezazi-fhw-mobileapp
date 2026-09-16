/**
 * Auth-related types local to apps/web (not @ezazi/types). `AppConfig`
 * (feature flags, captcha) lives in @ezazi/types because both apps/mobile
 * and apps/web hit the same config endpoint — see reducers/config.reducer.ts.
 * These auth shapes stay local for now: the web login response hasn't been
 * confirmed to match the mobile app's auth contract yet (see
 * packages/types/src/index.ts's own note on not forcing premature sharing).
 * Promote to @ezazi/types once a second real call site needs the same shape.
 */
export interface AuthUser {
  uuid: string;
  username: string;
  displayName: string;
  /** Uppercased role names, e.g. 'ORGANIZATIONAL: NURSE' — see hooks/mutations/useLogin.ts. */
  roles: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

/** The auth-gateway's own user object, embedded directly in the login response. */
export interface AuthGatewayUser {
  uuid: string;
  username: string;
  display: string;
  /** Real casing from the backend, e.g. 'Organizational: Doctor' — not uppercased here. */
  roles: string[];
}

export interface AuthGatewayProviderPerson {
  uuid: string;
  display: string;
}

export interface AuthGatewayProvider {
  uuid: string;
  display: string;
  person: AuthGatewayProviderPerson;
}

/**
 * POST {AUTH_GATEWAY_URL}/auth/login's actual response (confirmed against
 * the real erevamp.intelehealth.org:3030 endpoint) — see
 * services/auth.service.ts. One call returns the token, the session user,
 * AND the provider record together; there's no separate OpenMRS
 * session/provider round-trip needed the way the Angular app's
 * `authService.login()` + `getProvider()` pair implied.
 */
export interface AuthGatewayLoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken: string;
  authenticated: boolean;
  user: AuthGatewayUser;
  provider: AuthGatewayProvider;
}

/**
 * POST {AUTH_GATEWAY_URL}/auth/requestOtp — mirrors auth-gateway's own
 * `RequestOtpSchema`/`RequestOtpResponse` (auth-gateway/src/modules/auth/auth.dto.ts)
 * field-for-field. `otpFor: 'username'` (forgot-username) identifies the
 * account by `phoneNumber` OR `email` and sends the OTP on that same
 * channel; `otpFor: 'password'` identifies it by `username` if given, else
 * by `phoneNumber`/`email`, and sends to both phone and email when both are
 * on file for the matched account. At least one of phoneNumber/email/username
 * is required — enforced by the backend's own `.refine`, not re-validated
 * here. The response is intentionally non-committal — same `message`
 * regardless of whether anything actually matched — so no enumeration
 * signal leaks either way.
 */
export interface RequestOtpPayload {
  otpFor: 'username' | 'password';
  phoneNumber?: string;
  countryCode?: string;
  email?: string;
  /** Only meaningful for otpFor: 'password' — ignored for 'username'. */
  username?: string;
  source?: string;
}

export interface RequestOtpResponse {
  message: string;
}

/** POST {AUTH_GATEWAY_URL}/auth/verifyOtp — mirrors `VerifyOtpSchema`/`VerifyOtpResponse`. */
export interface VerifyOtpPayload {
  verifyFor: 'username' | 'password';
  phoneNumber?: string;
  countryCode?: string;
  email?: string;
  username?: string;
  otp: string;
}

/**
 * `userUuid`/`resetToken`/`expiresIn` are only present for `verifyFor:
 * 'password'` — the follow-up `POST /auth/resetPassword/:userUuid` call
 * needs them. `verifyFor: 'username'` has no follow-up call (the recovered
 * username is emailed directly by the backend, never returned here), so
 * those fields are absent.
 */
export interface VerifyOtpResponse {
  verified: true;
  userUuid?: string;
  resetToken?: string;
  expiresIn?: number;
}

/** POST {AUTH_GATEWAY_URL}/auth/resetPassword/:userUuid — mirrors `ResetPasswordSchema`. Gated on verifyOtp's resetToken, not a session. */
export interface ResetPasswordPayload {
  newPassword: string;
  resetToken: string;
}

export interface ResetPasswordResponse {
  message: string;
}

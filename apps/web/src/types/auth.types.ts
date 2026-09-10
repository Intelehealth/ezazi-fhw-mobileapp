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

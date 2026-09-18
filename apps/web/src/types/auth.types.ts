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
  roles: string[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

/**
 * localStorage-backed auth/session storage for apps/web.
 *
 * Assumption (the migration guide left this open — "cookie or localStorage,
 * your call"): localStorage, not a cookie. Reasoning: this matches
 * intelehealth-hw-webapp-react's own utils/storage.ts convention (a sibling
 * team-owned product on the same backend), and apps/web's bearer token
 * (attached by @ezazi/api-client's auth interceptor) doesn't need to be
 * sent automatically by the browser the way a cookie-based session would.
 * If the backend later requires an httpOnly session cookie (as OpenMRS's
 * own JSESSIONID does), only this module's internals need to change —
 * callers (services/http.ts, actions/auth.actions.ts) stay the same.
 */
const AUTH_TOKEN_KEY = 'ezazi_web_auth_token';
const AUTH_USER_KEY = 'ezazi_web_auth_user';
const REFRESH_TOKEN_KEY = 'ezazi_web_refresh_token';
const AUTH_TOKEN_EXPIRES_AT_KEY = 'ezazi_web_auth_token_expires_at';

/** The token pair the auth-gateway hands back from login and from /auth/refresh. */
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds, as the gateway reports it. */
  expiresIn: number;
}

export const storage = {
  getAuthToken: (): string | null => localStorage.getItem(AUTH_TOKEN_KEY),
  setAuthToken: (token: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  /*
   * Clears the whole token set, not just the access token — the refresh token
   * and the expiry stamp belong to the same session and must never outlive it.
   */
  clearAuthToken: (): void => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_KEY);
  },

  getRefreshToken: (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY),

  /** Epoch milliseconds at which the stored access token expires, or null when unknown. */
  getAuthTokenExpiresAt: (): number | null => {
    const raw = localStorage.getItem(AUTH_TOKEN_EXPIRES_AT_KEY);
    const expiresAt = raw === null ? NaN : Number(raw);
    return Number.isFinite(expiresAt) ? expiresAt : null;
  },

  /** Stores a freshly issued token pair together, stamping when the access token expires. */
  setSessionTokens: ({
    accessToken,
    refreshToken,
    expiresIn,
  }: SessionTokens): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(
      AUTH_TOKEN_EXPIRES_AT_KEY,
      String(Date.now() + expiresIn * 1000)
    );
  },

  getStoredUser: (): string | null => localStorage.getItem(AUTH_USER_KEY),
  setStoredUser: (user: string): void => {
    localStorage.setItem(AUTH_USER_KEY, user);
  },
  clearStoredUser: (): void => localStorage.removeItem(AUTH_USER_KEY),
};

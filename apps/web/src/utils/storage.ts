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

export const storage = {
  getAuthToken: (): string | null => localStorage.getItem(AUTH_TOKEN_KEY),
  setAuthToken: (token: string): void => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },
  clearAuthToken: (): void => localStorage.removeItem(AUTH_TOKEN_KEY),

  getStoredUser: (): string | null => localStorage.getItem(AUTH_USER_KEY),
  setStoredUser: (user: string): void => {
    localStorage.setItem(AUTH_USER_KEY, user);
  },
  clearStoredUser: (): void => localStorage.removeItem(AUTH_USER_KEY),
};

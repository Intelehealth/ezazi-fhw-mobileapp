import { createApiClient } from '@ezazi/api-client';
import type { AxiosInstance } from 'axios';
import { env } from '../config/env';
import { storage } from '../utils/storage';

/**
 * Thin wrapper around @ezazi/api-client's createApiClient — replaces the
 * migration guide's standalone HttpService/axios example (§5) with the
 * shared client. All the interceptor logic (bearer attach, 401 handling)
 * lives in the shared package; this file only supplies web-specific token
 * plumbing.
 *
 * Token storage: localStorage, via utils/storage.ts (see that file for the
 * cookie-vs-localStorage assumption).
 *
 * onUnauthorized: apps/web has no refresh-token flow yet — the auth-gateway
 * contract for one hasn't been confirmed for this product (unlike
 * apps/mobile's, see apps/mobile/src/services/api/client.ts). A 401 clears
 * the stored session and bounces to /auth/login rather than retrying.
 */
function handleUnauthorized(): null {
  storage.clearAuthToken();
  storage.clearStoredUser();
  if (
    typeof window !== 'undefined' &&
    !window.location.hash.startsWith('#/auth')
  ) {
    window.location.hash = '#/auth/login';
  }
  return null;
}

/** Authenticated client — auth-gateway/portal calls that need a bearer token. */
export const httpClient: AxiosInstance = createApiClient({
  baseURL: env.AUTH_GATEWAY_URL,
  getAuthToken: () => storage.getAuthToken(),
  onUnauthorized: () => handleUnauthorized(),
});

/** Unauthenticated client — public endpoints such as app config. */
export const publicHttpClient: AxiosInstance = createApiClient({
  baseURL: env.CONFIG_URL,
});

/**
 * The OpenMRS base URL (env.OPENMRS_URL) in every mode, dev included —
 * there is no dev proxy. Exported for the one direct (non-axios) OpenMRS
 * request in the app: the profile photo `<img src>` (useProviderProfile.ts).
 * That request carries no Authorization header (browsers never attach one
 * to a plain `<img>` fetch) — it authenticates via the OpenMRS session
 * cookie alone, same as openMrsHttpClient's other calls. Because dev now
 * calls the real host cross-origin, the OpenMRS server must allow CORS with
 * credentials for the dev origin and send its session cookie with
 * `SameSite=None; Secure`, or every call after /session arrives anonymous
 * ("Privileges required: Get People").
 */
export function getOpenMrsBaseUrl(): string {
  return env.OPENMRS_URL;
}

/**
 * The OpenMRS REST API itself (env.OPENMRS_URL, NOT env.PORTAL_URL — see
 * that constant's own note in config/env.ts). profile.component.ts's
 * provider/person/attribute CRUD (services/profile.service.ts) lives here,
 * a different backend than httpClient's auth-gateway.
 *
 * Deliberately NOT given a getAuthToken/Bearer interceptor, unlike this
 * file's other authenticated clients: confirmed against
 * intelehealth-doctor-webapp's own JwtInterceptor, which explicitly
 * excludes any `/openmrs/ws/rest/` URL from its Bearer header. OpenMRS has
 * no component that verifies this app's auth-gateway JWT (it's a private
 * credential meaningful only to that gateway) — attaching it here would be
 * dead weight at best, and a bad Authorization header on a cross-origin
 * request is exactly what turns a simple CORS-eligible GET into one that
 * needs (and can fail) a preflight. Auth instead rides an OpenMRS session
 * cookie, same as the reference app: `withCredentials: true` below, and the
 * cookie itself is established by profile.service.ts's createSession
 * (Basic-auth to OpenMRS's own /session) right after every gateway login —
 * see hooks/mutations/useLogin.ts.
 *
 * Calls go straight to env.OPENMRS_URL in every mode (see getOpenMrsBaseUrl).
 */
export const openMrsHttpClient: AxiosInstance = createApiClient({
  baseURL: getOpenMrsBaseUrl(),
});
openMrsHttpClient.defaults.withCredentials = true;

/**
 * Authenticated client — the separate Node "mindmap" service
 * (env.MINDMAP_URL) that only backs the profile feature's email/phone
 * "already exists" check (services/profile.service.ts's
 * validateProviderAttribute).
 */
export const mindmapHttpClient: AxiosInstance = createApiClient({
  baseURL: env.MINDMAP_URL,
  getAuthToken: () => storage.getAuthToken(),
  onUnauthorized: () => handleUnauthorized(),
});

/**
 * Auth-gateway calls made before any session exists — the password-recovery
 * OTP flow (requestOtp/verifyOtp/resetPassword). Same baseURL as httpClient,
 * but deliberately WITHOUT its getAuthToken/onUnauthorized: there's no bearer
 * token yet at this point, and a 401 from verifyOtp means "wrong/expired
 * code" — not "your session expired". Routing that through httpClient would
 * trigger handleUnauthorized()'s clear-session-and-redirect-to-login on every
 * OTP typo, kicking the user out of the reset flow they're mid-way through.
 */
export const authGatewayPublicClient: AxiosInstance = createApiClient({
  baseURL: env.AUTH_GATEWAY_URL,
});

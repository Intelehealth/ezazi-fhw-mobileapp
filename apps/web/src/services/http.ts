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

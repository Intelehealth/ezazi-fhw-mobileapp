import axios from 'axios';
import { env } from '@/core/config/env';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { requestSessionEnd } from '@/core/session/sessionEnd';
import { logger } from '@/core/utils/logger';
import { createApiClient } from '@ezazi/api-client';
import { trackApiActivity } from './trackApiActivity';

/**
 * Shared axios instance for auth-gateway calls. Per-module API files import this
 * and add their own endpoint methods.
 *
 * Adds: JWT bearer, refresh-on-401 (one retry) — via @ezazi/api-client's
 * shared interceptor stack. This file is the mobile ADAPTER: it supplies the
 * secure-store token provider and the refresh handler; the transport contract
 * itself is shared with apps/web.
 * EZ-942 — transparent refresh / expiry handling lives here.
 */

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    try {
      const refreshToken = await secureStorage.get('refreshToken');
      if (!refreshToken) {
        // Returned BEFORE the catch below, so this path used to clear nothing
        // and leave the database on the device. It ends a session like any other.
        await requestSessionEnd('tokenExpired');
        return null;
      }
      const res = await axios.post(`${env.AUTH_GATEWAY_URL}/auth/refresh`, { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
      if (newAccess) await secureStorage.set('accessToken', newAccess);
      if (newRefresh) await secureStorage.set('refreshToken', newRefresh);
      return newAccess ?? null;
    } catch (err) {
      // logger.info, not .warn — a failed refresh is handled here (falls back to
      // unauthenticated) and must never pop React Native's LogBox on screen.
      logger.info('Token refresh failed', err);
      // Kept even though the handler clears too: the transport must not need
      // a store to be loaded before the secrets come off the device.
      await secureStorage.clear();
      await requestSessionEnd('tokenExpired');
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

const apiClient = createApiClient({
  baseURL: env.AUTH_GATEWAY_URL,
  timeout: 15000,
  getAuthToken: () => secureStorage.get('accessToken'),
  onUnauthorized: refreshAccessToken,
});

trackApiActivity(apiClient);

export { apiClient };

import { apiClient } from '@/core/api/client';
import { createRequestMethods } from '@/core/api/responseHandler';
import { env } from '@/core/config/env';
import { logger } from '@/core/utils/logger';

/**
 * Login-location lookup for the Setup screen's LOCATION dropdown.
 *
 * Feature-owned on purpose: only SetupScreen calls this, so nothing in
 * `core/` depends on it — same reasoning as password.api.ts.
 *
 * Legacy Android: SetupActivity.getLocationFromServer() — same OpenMRS REST
 * path and "Login Location" tag. Confirmed 2026-09-16: OpenMRS REST lives on
 * the SAME host as the auth-gateway but WITHOUT its :3030 port (default
 * https port instead) — same split the legacy code had between `setupUrl`
 * (OpenMRS) and `setupUrl + ":3030/auth/login"` (auth-gateway). Passed as an
 * absolute URL below so it overrides apiClient's :3030 baseURL for just this
 * one call.
 */

const http = createRequestMethods(apiClient);

export interface LoginLocation {
  uuid: string;
  display: string;
}

interface LoginLocationResults {
  results: LoginLocation[];
}

const OPENMRS_BASE_URL = env.AUTH_GATEWAY_URL.replace(/:\d+$/, '');
const LOGIN_LOCATIONS_URL = `${OPENMRS_BASE_URL}/openmrs/ws/rest/v1/location`;
const LOGIN_LOCATIONS_PARAMS = { tag: 'Login Location' };

export const locationApi = {
  listLoginLocations: () => {
    // Console-only — never shown on screen. Full URL + params, for verifying
    // this against the backend team's actual route.
    logger.debug('[Location] Requesting login locations', {
      url: LOGIN_LOCATIONS_URL,
      params: LOGIN_LOCATIONS_PARAMS,
    });

    return http.get<LoginLocationResults>(LOGIN_LOCATIONS_URL, {
      params: LOGIN_LOCATIONS_PARAMS,
    });
  },
};

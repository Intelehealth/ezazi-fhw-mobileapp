import {
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import { httpClient } from './http';
import type {
  AuthGatewayLoginResponse,
  LoginCredentials,
} from '../types/auth.types';

/**
 * Auth-gateway login — POST {AUTH_GATEWAY_URL}/auth/login with plain
 * {username, password} JSON (confirmed against the real
 * erevamp.intelehealth.org:3030 endpoint). One call is the whole login:
 * the response already carries the token, the session user, AND the
 * provider record (see AuthGatewayLoginResponse) — no separate OpenMRS
 * session/provider round-trip needed the way an earlier pass here assumed
 * from reading the Angular source alone.
 */
export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResult<AuthGatewayLoginResponse>> {
    try {
      const { data } = await httpClient.post<AuthGatewayLoginResponse>(
        '/auth/login',
        credentials
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};

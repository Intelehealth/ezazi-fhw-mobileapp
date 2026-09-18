import { apiClient } from '@/core/api/client';
import { createRequestMethods } from '@/core/api/responseHandler';
import { toBase64 } from '@/core/utils/base64';

/**
 * Session-lifecycle endpoints on the auth-gateway — EZ-920, 932, 942, 943.
 *
 * These live in `core/`, not in `features/auth`, because they are not the auth
 * FEATURE's concern: `core/api/client.ts` calls refresh from its 401 interceptor,
 * the root navigator routes off the resulting session, and every future feature
 * inherits it. The Android equivalent is SessionManager + OkHttp Authenticator
 * sitting in `:core`, not in `:feature:login`.
 *
 * Password recovery (requestOtp / verifyOtp / resetPassword) is the opposite —
 * only the Forgot Password screens use it, so it stays in
 * `features/auth/data/password.api.ts`.
 *
 * login() is verified against the real gateway; the rest may still be stubbed.
 */

const http = createRequestMethods(apiClient);

export interface LoginRequest {
  username: string;
  password: string;
}

/** Verified against the real auth-gateway response — see EZ-1097 login integration notes. */
export interface LoginResponse {
  tokenType: string;
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresIn: number;
  sessionId: string;
  authenticated: boolean;
  user: {
    uuid: string;
    username: string;
    systemId: string;
    personUuid: string;
    display: string;
    gender: string;
    birthdate: string;
    roles: string[];
    privileges: string[];
  };
  provider: {
    uuid: string;
    identifier: string;
    display: string;
    person: {
      uuid: string;
      display: string;
      gender: string;
      age: number;
      birthdate: string;
      preferredName: string;
    };
    attributes: Record<string, string>;
  };
}

export const sessionApi = {
  // EZ-920
  check: () => http.get('/auth/check'),

  // EZ-932
  // Authorization: Basic <base64(username:password)> — matches Android's base64Utils.encoded().
  // rememberme is hardcoded true: Android always passes true here too (no UI toggle exists).
  login: (body: LoginRequest) => {
    const authHeader = `Basic ${toBase64(`${body.username}:${body.password}`)}`;
    return http.post<LoginResponse>(
      '/auth/login',
      { username: body.username, password: body.password, rememberme: true },
      { headers: { Authorization: authHeader } },
    );
  },

  // EZ-942
  refresh: (refreshToken: string) => http.post('/auth/refresh', { refreshToken }),

  // EZ-943
  logout: () => http.post('/auth/logout'),
};

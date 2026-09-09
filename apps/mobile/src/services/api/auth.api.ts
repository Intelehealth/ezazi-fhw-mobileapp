import { apiClient } from './client';
import { createRequestMethods } from './responseHandler';
import { toBase64 } from '@/utils/base64';

/**
 * Endpoint wrappers for the auth-gateway. Sprint 42 — EZ-920, 932, 933, 934, 939, 942, 943.
 * login() is live and verified against the real server; other endpoints may still be stubbed.
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

export interface OtpRequest {
  phone: string;
  countryCode: string;
}

export interface OtpVerifyRequest {
  phone: string;
  code: string;
}

export interface ResetPasswordRequest {
  userUuid: string;
  newPassword: string;
  otpToken: string;
}

export const authApi = {
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

  // EZ-933
  requestOtp: (body: OtpRequest) => http.post('/auth/requestOtp', body),

  // EZ-934
  verifyOtp: (body: OtpVerifyRequest) => http.post('/auth/verifyOtp', body),

  // EZ-939
  resetPassword: (body: ResetPasswordRequest) =>
    http.post(`/auth/resetPassword/${body.userUuid}`, body),

  // EZ-942
  refresh: (refreshToken: string) => http.post('/auth/refresh', { refreshToken }),

  // EZ-943
  logout: () => http.post('/auth/logout'),
};

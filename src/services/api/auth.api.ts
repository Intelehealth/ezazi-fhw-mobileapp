import { apiClient } from './client';
import { createRequestMethods } from './responseHandler';

/**
 * Endpoint wrappers for the auth-gateway. Sprint 42 — EZ-920, 932, 933, 934, 939, 942, 943.
 * Backend endpoints are still stubbed (501). Calls will start working as backend stories land.
 */

const http = createRequestMethods(apiClient);

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userUuid: string;
  role: string;
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
  login: (body: LoginRequest) => http.post<LoginResponse>('/auth/login', body),

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

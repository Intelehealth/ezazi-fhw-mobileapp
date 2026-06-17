import { apiClient } from './client';

/**
 * Endpoint wrappers for the auth-gateway. Sprint 42 — EZ-920, 932, 933, 934, 939, 942, 943.
 * Backend endpoints are still stubbed (501). Calls will start working as backend stories land.
 */

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
  check: () => apiClient.get('/auth/check'),

  // EZ-932
  login: (body: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', body),

  // EZ-933
  requestOtp: (body: OtpRequest) => apiClient.post('/auth/requestOtp', body),

  // EZ-934
  verifyOtp: (body: OtpVerifyRequest) => apiClient.post('/auth/verifyOtp', body),

  // EZ-939
  resetPassword: (body: ResetPasswordRequest) =>
    apiClient.post(`/auth/resetPassword/${body.userUuid}`, body),

  // EZ-942
  refresh: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),

  // EZ-943
  logout: () => apiClient.post('/auth/logout'),
};

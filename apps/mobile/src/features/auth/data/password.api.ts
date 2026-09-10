import { apiClient } from '@/core/api/client';
import { createRequestMethods } from '@/core/api/responseHandler';

/**
 * Password-recovery endpoints — EZ-933, 934, 939.
 *
 * Feature-owned on purpose: only the Forgot Password screens call these, so
 * nothing in `core/` depends on them. Session lifecycle (login/logout/refresh/
 * check) is the opposite case and lives in `core/session/session.api.ts`.
 */

const http = createRequestMethods(apiClient);

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

export const passwordApi = {
  // EZ-933
  requestOtp: (body: OtpRequest) => http.post('/auth/requestOtp', body),

  // EZ-934
  verifyOtp: (body: OtpVerifyRequest) => http.post('/auth/verifyOtp', body),

  // EZ-939
  resetPassword: (body: ResetPasswordRequest) =>
    http.post(`/auth/resetPassword/${body.userUuid}`, body),
};

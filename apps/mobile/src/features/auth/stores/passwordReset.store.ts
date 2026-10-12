import { create } from 'zustand';
import type { ApiResult } from '@ezazi/api-client';
import {
  passwordApi,
  type RequestOtpParams,
  type RequestOtpResponse,
  type VerifyOtpParams,
  type VerifyOtpResponse,
  type ResetPasswordParams,
  type PasswordFlowResponse,
} from '@/features/auth/data/password.api';
import { logApiError } from '@/core/api/errors/logApiError';

/**
 * Forgot Password flow state — the boundary between the 3 screens and
 * password.api.ts (see CLAUDE.md's boundaries/dependencies rule: presentation
 * must not import features/*\/data directly, same reasoning as
 * auth.store's login() / location.store's fetchLocations()).
 */

interface PasswordResetState {
  requestOtp: (params: RequestOtpParams) => Promise<ApiResult<RequestOtpResponse>>;
  verifyOtp: (params: VerifyOtpParams) => Promise<ApiResult<VerifyOtpResponse>>;
  resetPassword: (params: ResetPasswordParams) => Promise<ApiResult<PasswordFlowResponse>>;
}

export const usePasswordResetStore = create<PasswordResetState>(() => ({
  requestOtp: async (params) => {
    const result = await passwordApi.requestOtp(params);
    if (!result.ok) logApiError('Forgot password: requestOtp', result.error);
    return result;
  },

  verifyOtp: async (params) => {
    const result = await passwordApi.verifyOtp(params);
    if (!result.ok) logApiError('Forgot password: verifyOtp', result.error);
    return result;
  },

  resetPassword: async (params) => {
    const result = await passwordApi.resetPassword(params);
    if (!result.ok) logApiError('Forgot password: resetPassword', result.error);
    return result;
  },
}));

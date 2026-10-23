import {
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import { authGatewayPublicClient } from './http';
import type {
  AuthGatewayLoginResponse,
  LoginCredentials,
  RequestOtpPayload,
  RequestOtpResponse,
  ResetPasswordPayload,
  ResetPasswordResponse,
  VerifyOtpPayload,
  VerifyOtpResponse,
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
      /*
       * The public client, not httpClient: a wrong password is a 401 here,
       * and httpClient treats a 401 as "my session expired" (refresh, then
       * the hard-expiry modal) — wrong for a login that has no session yet.
       */
      const { data } =
        await authGatewayPublicClient.post<AuthGatewayLoginResponse>(
          '/auth/login',
          credentials
        );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /**
   * POST {AUTH_GATEWAY_URL}/auth/requestOtp — forgot-username and
   * password-reset OTP, phone or email (see RequestOtpPayload). Uses
   * authGatewayPublicClient, not httpClient: this runs before any session
   * exists.
   */
  async requestOtp(
    payload: RequestOtpPayload
  ): Promise<ApiResult<RequestOtpResponse>> {
    try {
      const { data } = await authGatewayPublicClient.post<RequestOtpResponse>(
        '/auth/requestOtp',
        payload
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {AUTH_GATEWAY_URL}/auth/verifyOtp — see VerifyOtpPayload/Response. */
  async verifyOtp(
    payload: VerifyOtpPayload
  ): Promise<ApiResult<VerifyOtpResponse>> {
    try {
      const { data } = await authGatewayPublicClient.post<VerifyOtpResponse>(
        '/auth/verifyOtp',
        payload
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },

  /** POST {AUTH_GATEWAY_URL}/auth/resetPassword/:userUuid — gated on verifyOtp's resetToken. */
  async resetPassword(
    userUuid: string,
    payload: ResetPasswordPayload
  ): Promise<ApiResult<ResetPasswordResponse>> {
    try {
      const { data } =
        await authGatewayPublicClient.post<ResetPasswordResponse>(
          `/auth/resetPassword/${userUuid}`,
          payload
        );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};

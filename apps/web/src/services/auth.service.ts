import { failure, mapAxiosError, success, type ApiResult } from '@ezazi/api-client';
import { httpClient } from './http';
import type { LoginCredentials, LoginResponse } from '../types/auth.types';

/**
 * 1:1 with the migration guide's services/*.service.ts pattern (§3/§5) — a
 * thin module over the shared http client. Every method returns an
 * ApiResult (per @ezazi/api-client's own contract) so callers
 * (hooks/mutations/useLogin.ts) never need try/catch.
 */
export const authService = {
  async login(
    credentials: LoginCredentials
  ): Promise<ApiResult<LoginResponse>> {
    try {
      const { data } = await httpClient.post<LoginResponse>(
        '/auth/login',
        credentials
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};

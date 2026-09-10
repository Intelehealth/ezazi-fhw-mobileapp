import {
  failure,
  mapAxiosError,
  success,
  type ApiResult,
} from '@ezazi/api-client';
import type { AppConfig } from '@ezazi/types';
import { publicHttpClient } from './http';

/**
 * Backs hooks/queries/useAppConfig.ts — the "app-wide config" row of the
 * migration guide's §5 state table (fetched via React Query, synced into
 * the config Redux slice on load).
 */
export const configService = {
  async getPublishedConfig(): Promise<ApiResult<AppConfig>> {
    try {
      const { data } = await publicHttpClient.get<AppConfig>(
        '/api/config/getPublishedConfig'
      );
      return success(data);
    } catch (error) {
      return failure(mapAxiosError(error));
    }
  },
};

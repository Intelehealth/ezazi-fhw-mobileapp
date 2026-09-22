import { env } from '@/core/config/env';
import type { ConfigResponse } from '@/core/config/config.types';
import { createApiClient, ApiError, failure } from '@ezazi/api-client';
import { createRequestMethods } from '@/core/api/responseHandler';
import type { ApiResult } from '@ezazi/api-client';

/**
 * Unauthenticated — the config endpoint has no auth interceptor.
 * baseURL comes from clientConfig.servers[APP_ENV].configUrl via env.CONFIG_URL.
 */
const configClient = createApiClient({ baseURL: env.CONFIG_URL, timeout: 30_000 });
const http = createRequestMethods(configClient);

function hasRequiredShape(data: unknown): data is ConfigResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.configVersion === 'number' && d.featureFlags !== null && typeof d.featureFlags === 'object';
}

export async function fetchPublishedConfig(): Promise<ApiResult<ConfigResponse>> {
  const result = await http.get<ConfigResponse>('/api/config/getPublishedConfig');
  if (!result.ok) return result;
  if (!hasRequiredShape(result.data)) {
    return failure(new ApiError('api', 'Config response missing required fields'));
  }
  return result;
}

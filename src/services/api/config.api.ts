import axios from 'axios';
import type { AxiosError } from 'axios';
import { env } from '@/config/env';
import type { ConfigResponse } from '@/types/config.types';

export class ConfigFetchError extends Error {
  constructor(
    public readonly code: 'NETWORK' | 'TIMEOUT' | 'SERVER' | 'INVALID_SCHEMA',
    message: string,
  ) {
    super(message);
    this.name = 'ConfigFetchError';
  }
}

/**
 * Separate Axios instance for the config service.
 * No auth interceptor — the config endpoint is unauthenticated.
 * baseURL comes from clientConfig.servers[APP_ENV].configUrl via env.CONFIG_URL.
 */
const configAxios = axios.create({
  baseURL: env.CONFIG_URL,
  timeout: 30_000,
});

function hasRequiredShape(data: unknown): data is ConfigResponse {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return typeof d.configVersion === 'number' && d.featureFlags !== null && typeof d.featureFlags === 'object';
}

export async function fetchPublishedConfig(): Promise<ConfigResponse> {
  try {
    const res = await configAxios.get<ConfigResponse>('/api/config/getPublishedConfig');
    if (!hasRequiredShape(res.data)) {
      throw new ConfigFetchError('INVALID_SCHEMA', 'Config response missing required fields');
    }
    return res.data;
  } catch (err) {
    if (err instanceof ConfigFetchError) throw err;
    if (axios.isAxiosError(err)) {
      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED') {
        throw new ConfigFetchError('TIMEOUT', 'Config request timed out after 30s');
      }
      if (!axiosErr.response) {
        throw new ConfigFetchError('NETWORK', `Network error: ${axiosErr.message}`);
      }
      throw new ConfigFetchError('SERVER', `Server returned ${axiosErr.response.status}`);
    }
    throw new ConfigFetchError('NETWORK', String(err));
  }
}

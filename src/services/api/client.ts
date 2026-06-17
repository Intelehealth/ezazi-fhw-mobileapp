import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { env } from '@/config/env';
import { secureStorage } from '@/services/storage/secure-storage';
import { logger } from '@/utils/logger';

/**
 * Shared axios instance for auth-gateway calls. Per-module API files import this
 * and add their own endpoint methods.
 *
 * Adds: JWT bearer, refresh-on-401 (one retry), correlation IDs.
 * EZ-942 — transparent refresh / expiry handling lives here.
 */

const apiClient: AxiosInstance = axios.create({
  baseURL: env.AUTH_GATEWAY_URL,
  timeout: 15000,
});

// ---- request interceptor: attach Authorization
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await secureStorage.get('accessToken');
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// ---- response interceptor: refresh on 401 once, then bail
type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await secureStorage.get('refreshToken');
    if (!refreshToken) return null;
    try {
      const res = await axios.post(`${env.AUTH_GATEWAY_URL}/auth/refresh`, { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data;
      if (newAccess) await secureStorage.set('accessToken', newAccess);
      if (newRefresh) await secureStorage.set('refreshToken', newRefresh);
      return newAccess ?? null;
    } catch (err) {
      logger.warn('Token refresh failed', err);
      await secureStorage.clear();
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryableRequestConfig | undefined;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers?.set?.('Authorization', `Bearer ${newToken}`);
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

export { apiClient };

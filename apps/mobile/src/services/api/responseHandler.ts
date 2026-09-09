import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import { mapAxiosError } from './errors/mapAxiosError';
import { failure, success } from './result/ApiResult';
import type { ApiResult } from './result/ApiResult';

/** Runs one request through `instance`, never throwing — always resolves to an ApiResult. */
export async function request<T>(instance: AxiosInstance, config: AxiosRequestConfig): Promise<ApiResult<T>> {
  try {
    const response = await instance.request<T>(config);
    return success(response.data);
  } catch (error) {
    return failure(mapAxiosError(error));
  }
}

/**
 * Terse per-method wrappers so a new `*.api.ts` file only has to name the
 * endpoint and its request/response types — see the architecture doc §9.
 */
export function createRequestMethods(instance: AxiosInstance) {
  return {
    get: <T>(url: string, config?: AxiosRequestConfig) =>
      request<T>(instance, { ...config, method: 'GET', url }),
    post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>(instance, { ...config, method: 'POST', url, data }),
    put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>(instance, { ...config, method: 'PUT', url, data }),
    patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
      request<T>(instance, { ...config, method: 'PATCH', url, data }),
    delete: <T>(url: string, config?: AxiosRequestConfig) =>
      request<T>(instance, { ...config, method: 'DELETE', url }),
  };
}

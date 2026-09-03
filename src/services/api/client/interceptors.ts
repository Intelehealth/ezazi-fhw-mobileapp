import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

export type TokenProvider = () => Promise<string | null | undefined> | string | null | undefined;

/** Return the new access token to retry the failed request once, or a falsy value to give up. */
export type UnauthorizedHandler = () => Promise<string | null | undefined> | string | null | undefined;

/** Attaches `Authorization: Bearer <token>` to every request when a token is available. */
export function attachAuthInterceptor(instance: AxiosInstance, getToken: TokenProvider): void {
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await getToken();
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    return config;
  });
}

type RetryableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * On a 401, calls `onUnauthorized` once and retries the original request with
 * the token it returns. Any other outcome (no token, already retried, non-401)
 * rejects unchanged. Generic equivalent of the refresh-on-401 logic already
 * hand-written in services/api/client.ts.
 */
export function attachUnauthorizedRetryInterceptor(
  instance: AxiosInstance,
  onUnauthorized: UnauthorizedHandler,
): void {
  instance.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) {
        return Promise.reject(error);
      }

      const original = error.config as RetryableRequestConfig | undefined;
      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true;
        const newToken = await onUnauthorized();
        if (newToken) {
          original.headers?.set?.('Authorization', `Bearer ${newToken}`);
          return instance(original);
        }
      }

      return Promise.reject(error);
    },
  );
}

import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import { env } from '@/core/config/env';
import { logger } from '@/core/utils/logger';

/**
 * Request/response logging for an axios instance — the equivalent of OkHttp's
 * `HttpLoggingInterceptor` at BASIC level.
 *
 * Separate from `core/api/trackApiActivity`, which is the same shape of
 * interceptor pair but exists to drive the progress spinner and logs nothing.
 *
 * **Deliberately no headers and no bodies.** This app carries clinical data
 * and a credential that decodes back to a password, and Metro's console is
 * shared, scrollable and easy to paste into an issue. What a header would
 * genuinely tell you while debugging is whether auth was attached and of what
 * kind, so that is reported as a word — never the value. A pull response is
 * also the whole location's data; printing one would bury every other line.
 */

/** Start times, keyed on the config object axios carries through to the response. */
const started = new WeakMap<InternalAxiosRequestConfig, number>();

/** 'basic' / 'bearer' / 'none' — the KIND of credential, never the credential. */
function authKind(config: InternalAxiosRequestConfig): string {
  const header = config.headers?.Authorization;
  if (typeof header !== 'string' || header.length === 0) return 'none';
  const [scheme] = header.split(' ');
  return scheme.toLowerCase();
}

function route(config: InternalAxiosRequestConfig): string {
  return `${(config.method ?? 'get').toUpperCase()} ${config.url ?? '(no url)'}`;
}

function elapsedMs(config: InternalAxiosRequestConfig): number | undefined {
  const start = started.get(config);
  if (start === undefined) return undefined;
  started.delete(config);
  return Date.now() - start;
}

/** Only when the server sent one — axios does not compute it. */
function size(response: AxiosResponse): string | undefined {
  const length = response.headers?.['content-length'];
  return typeof length === 'string' ? `${length}b` : undefined;
}

/**
 * Registers the pair on `instance`. Call it AFTER `createApiClient()` so it
 * sits outside the refresh-on-401 interceptor: a retried request is then
 * logged on its own, which is what makes a silent refresh visible.
 *
 * **Debug builds only, and `__DEV__` is what guarantees it.** `APP_ENV` alone
 * does not: it comes from `EXPO_PUBLIC_APP_ENV`, which `env.ts` defaults to
 * `'development'` when unset, so a LOCAL release build reads `.env` and an EAS
 * *preview* build reports `'preview'` — both would have logged. `__DEV__` is
 * false in every release bundle whatever the env says, and being a
 * compile-time constant it lets the minifier drop this whole body. It is the
 * same gate expo-sqlite uses for its own devtools client
 * (`SQLiteDevToolsClient.ts:45`).
 *
 * The interceptors are not registered at all rather than registered and muted,
 * so a release build pays nothing per request either.
 */
export function logApiTraffic(instance: AxiosInstance, label: string): void {
  if (!__DEV__ || env.APP_ENV === 'production') return;

  instance.interceptors.request.use(
    (config) => {
      started.set(config, Date.now());
      logger.debug(`[${label}] → ${route(config)}`, { auth: authKind(config) });
      return config;
    },
    (error: unknown) => {
      // Never sent, so there is no response to pair this with.
      logger.debug(`[${label}] ✕ request was never sent`, error);
      return Promise.reject(error);
    },
  );

  instance.interceptors.response.use(
    (response) => {
      logger.debug(`[${label}] ← ${String(response.status)} ${route(response.config)}`, {
        ms: elapsedMs(response.config),
        size: size(response),
      });
      return response;
    },
    (error: unknown) => {
      const failure = error as AxiosError;
      const config = failure.config as InternalAxiosRequestConfig | undefined;

      logger.debug(`[${label}] ✕ ${String(failure.response?.status ?? failure.code ?? 'failed')}`, {
        route: config ? route(config) : undefined,
        ms: config ? elapsedMs(config) : undefined,
      });
      return Promise.reject(error);
    },
  );
}

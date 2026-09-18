import type { ApiError } from '@ezazi/api-client';

/**
 * Shared login-failure → banner mapping for SetupScreen and LoginScreen.
 * Both screens call the same auth-store `login()` action (EZ-1097) and want
 * the same title/message pairs back — only the i18n namespace differs
 * ('setup.errors' vs 'login.errors'), because each screen owns its own copy
 * of the strings. No behavior change versus the two screens' previous
 * identical, hand-duplicated getErrorBanner() functions — see api error.tsv
 * for the status/code table.
 */

export interface ErrorBanner {
  title: string;
  message: string;
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

export function getApiErrorBanner(error: ApiError, t: Translate, namespace: string): ErrorBanner {
  const bannerFor = (key: string, options?: Record<string, unknown>): ErrorBanner => ({
    title: t(`${namespace}.${key}.title`, options),
    message: t(`${namespace}.${key}.message`, options),
  });

  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return bannerFor('invalidCredentials');
    case 'ACCOUNT_LOCKED': {
      const retryAfterSeconds = (error.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
      return retryAfterSeconds
        ? bannerFor('accountLocked', { minutes: Math.ceil(retryAfterSeconds / 60) })
        : bannerFor('accountLockedGeneric');
    }
    case 'RATE_LIMITED':
      return bannerFor('rateLimited');
    case 'VALIDATION_ERROR':
      return {
        title: t(`${namespace}.genericError.title`),
        message: error.message || t(`${namespace}.genericError.message`),
      };
    default:
      break;
  }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return bannerFor('networkError');
  }
  return bannerFor('genericError');
}

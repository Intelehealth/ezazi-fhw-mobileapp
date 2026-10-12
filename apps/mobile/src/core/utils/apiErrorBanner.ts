import type { ApiError } from '@ezazi/api-client';

/**
 * Shared API-failure → banner mapping, paired with core/ui/ApiErrorBanner.
 * Started as SetupScreen/LoginScreen's login()-failure mapping (EZ-1097,
 * same auth-store action, only the i18n namespace differs — 'setup.errors'
 * vs 'login.errors'); now used by every screen that calls an API and wants
 * a banner back for the failure, keyed off its own `<namespace>.errors.*`
 * title/message pairs so each screen still owns its own copy strings.
 */

export interface ErrorBanner {
  title: string;
  message: string;
  // Set only for a network/timeout failure — core/ui/ApiErrorBanner renders
  // this with its own exact Figma spec (icon, colors, sizing), distinct from
  // every other error state's banner.
  variant?: 'network';
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
    case 'INVALID_OTP':
      return bannerFor('otpIncorrect');
    case 'VALIDATION_ERROR':
      return {
        title: t(`${namespace}.genericError.title`),
        message: error.message || t(`${namespace}.genericError.message`),
      };
    default:
      break;
  }
  if (error.kind === 'network' || error.kind === 'timeout') {
    return { ...bannerFor('networkError'), variant: 'network' };
  }
  return bannerFor('genericError');
}

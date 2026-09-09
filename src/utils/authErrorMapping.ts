import type { TFunction } from 'i18next';
import type { ApiError } from '@/services/api/errors/ApiError';

/**
 * Maps an `ApiError` (or a plain `Error` for network drops) to the copy the
 * `<ServerErrorBanner>` shows.
 *
 * Extracted from `SetupScreen` so every auth screen (Setup, Login, Forgot*)
 * uses the same mapping. Copy is resolved through i18n so translations live
 * in `en.json` / `ne.json` under `auth.errorBanner.*`.
 *
 * Returns `null` when the caller should render nothing (e.g. a client-side
 * validation error already shown inline).
 */

export interface BannerCopy {
  title: string;
  subtitle?: string;
}

interface MapOptions {
  /** i18next `t` — pass one that scopes to your screen's namespace. */
  t: TFunction;
  /** Optional fallback namespace prefix for legacy screen-scoped keys. */
  fallbackPrefix?: string;
}

function tr(t: TFunction, key: string, fallback: string, params?: Record<string, unknown>): string {
  // Third arg forces a default so a missing key doesn't render `[key]` to the user.
  return String(t(key, { defaultValue: fallback, ...(params ?? {}) }));
}

export function mapAuthApiError(error: unknown, opts: MapOptions): BannerCopy | null {
  const { t } = opts;

  // Plain JS network / DOM errors (offline, timeout) don't carry a `code`.
  const isNetworkErr = (err: unknown): boolean => {
    if (!(err instanceof Error)) return false;
    const msg = err.message.toLowerCase();
    return msg.includes('network') || msg.includes('timeout') || msg.includes('offline');
  };

  const apiErr = error as (ApiError | undefined);
  const code = apiErr?.code;

  switch (code) {
    case 'AUTH_INVALID_CREDENTIALS':
    case 'INVALID_CREDENTIALS':
      return {
        title:    tr(t, 'auth.errorBanner.invalidCredentials.title',    'Username or password is incorrect'),
        subtitle: tr(t, 'auth.errorBanner.invalidCredentials.subtitle', 'Please check your credentials and try again.'),
      };

    case 'AUTH_003':
    case 'ACCOUNT_LOCKED': {
      const retryAfterSeconds =
        (apiErr?.details as { retryAfterSeconds?: number } | undefined)?.retryAfterSeconds;
      const minutes = retryAfterSeconds ? Math.ceil(retryAfterSeconds / 60) : null;
      return {
        title:    tr(t, 'auth.errorBanner.accountLocked.title', 'Account temporarily locked'),
        subtitle: minutes
          ? tr(t, 'auth.errorBanner.accountLocked.subtitleWithMinutes',
              'Too many failed attempts. Try again in {{minutes}} minutes.', { minutes })
          : tr(t, 'auth.errorBanner.accountLocked.subtitle',
              'Too many failed attempts. Please try again later.'),
      };
    }

    case 'RATE_LIMITED':
    case 'OTP_RATE_LIMITED':
      return {
        title:    tr(t, 'auth.errorBanner.rateLimited.title',    'Too many attempts'),
        subtitle: tr(t, 'auth.errorBanner.rateLimited.subtitle', 'Please wait a moment and try again.'),
      };

    case 'BIZ_001':
      return {
        title:    tr(t, 'auth.errorBanner.doctorBlocked.title',    'Use the web portal'),
        subtitle: tr(t, 'auth.errorBanner.doctorBlocked.subtitle', 'Doctor accounts cannot reset their password from the mobile app.'),
      };

    case 'AUTH_USER_NOT_FOUND':
      return {
        title:    tr(t, 'auth.errorBanner.userNotFound.title',    'Account not found'),
        subtitle: tr(t, 'auth.errorBanner.userNotFound.subtitle', 'We could not find an account for that phone number.'),
      };

    case 'OTP_INVALID':
      return {
        title:    tr(t, 'auth.errorBanner.otpInvalid.title',    'Wrong code'),
        subtitle: tr(t, 'auth.errorBanner.otpInvalid.subtitle', 'The code you entered doesn’t match. Please try again.'),
      };

    case 'OTP_EXPIRED':
    case 'OTP_TOKEN_EXPIRED':
      return {
        title:    tr(t, 'auth.errorBanner.otpExpired.title',    'Code expired'),
        subtitle: tr(t, 'auth.errorBanner.otpExpired.subtitle', 'Please request a new code and try again.'),
      };

    case 'VALIDATION_ERROR':
      // Server-side validation — surface the server-provided message when it's
      // a real explanation, not the client-side code fallback.
      return apiErr?.message && apiErr.message !== code
        ? { title: apiErr.message }
        : {
            title:    tr(t, 'auth.errorBanner.genericError.title',    'Something went wrong'),
            subtitle: tr(t, 'auth.errorBanner.genericError.subtitle', 'Please try again.'),
          };
  }

  if (isNetworkErr(error)) {
    return {
      title:    tr(t, 'auth.errorBanner.networkError.title',    'No internet connection'),
      subtitle: tr(t, 'auth.errorBanner.networkError.subtitle', 'Please check your connection and try again.'),
    };
  }

  // Nothing matched — surface a safe generic banner. Callers may return
  // `null` if they'd rather show nothing.
  return {
    title:    tr(t, 'auth.errorBanner.genericError.title',    'Something went wrong'),
    subtitle: tr(t, 'auth.errorBanner.genericError.subtitle', 'Please check your connection and try again.'),
  };
}

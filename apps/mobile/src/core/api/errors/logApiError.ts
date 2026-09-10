import { logger } from '@/core/utils/logger';
import type { ApiError } from '@ezazi/api-client';

/**
 * Console-only diagnostic log for a failed API call — never shown to the user.
 * Every screen should show a message mapped from error.code/kind instead
 * (see e.g. SetupScreen's getErrorMessage) and call this for the raw detail.
 *
 * Uses logger.info (console.info), not .warn/.error — React Native's LogBox
 * auto-intercepts console.warn/console.error and puts them on screen even in
 * a dev build. An API failure we've already mapped to a friendly message is a
 * handled condition, not something that should alarm a developer with a
 * pop-up; console.info/.log are the only levels LogBox leaves alone.
 */
export function logApiError(context: string, error: ApiError): void {
  logger.info(`[API] ${context} failed`, {
    kind: error.kind,
    status: error.status,
    code: error.code,
    message: error.message,
    details: error.details,
  });
}

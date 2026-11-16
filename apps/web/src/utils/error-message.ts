/*
 * OpenMRS puts the literal text "[null]" (or "[]") in an error body's
 * `message` when the server-side exception had no message of its own, so a
 * non-empty string can still carry no information.
 */
const BLANK_MESSAGE = /^\[?\s*(null|undefined)?\s*\]?$/i;

/**
 * The error's message when it says something, otherwise `fallback` — keeps
 * toasts from showing "[null]", "null" or an empty description.
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : '';
  return BLANK_MESSAGE.test(message) ? fallback : message;
}

/*
 * What a person can do about each transport-level failure. These replace the
 * raw text for those kinds, which is either axios's ("Network Error",
 * "timeout of 15000ms exceeded") or a generic "Internal server error".
 */
const MESSAGE_BY_KIND: Record<string, string> = {
  network:
    'Unable to reach the server. Check your internet connection and try again.',
  timeout: 'The server is taking too long to respond. Please try again.',
  server: 'The server ran into a problem. Please try again in a moment.',
  unauthorized: 'Your session has expired. Please sign in again.',
};

/**
 * A user-facing message for a failed request: a fixed explanation for
 * network/timeout/server/unauthorized failures (an @ezazi/api-client
 * ApiError's `kind`), otherwise the backend's own message via
 * getErrorMessage — e.g. a 400's validation message.
 */
export function getApiErrorMessage(error: unknown, fallback: string): string {
  const kind =
    error && typeof error === 'object' && 'kind' in error
      ? String((error as { kind: unknown }).kind)
      : '';
  return MESSAGE_BY_KIND[kind] ?? getErrorMessage(error, fallback);
}

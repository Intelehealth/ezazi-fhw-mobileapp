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

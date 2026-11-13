import { logger } from '@/core/utils/logger';

/**
 * Seam between the transport and the session store: `client.ts` cannot import
 * `auth.store` without closing a cycle through `session.api.ts`. See N1.
 */

export type SessionEndReason = 'logout' | 'tokenExpired';

type SessionEndHandler = (reason: SessionEndReason) => Promise<void>;

let handler: SessionEndHandler | null = null;
let inFlight: Promise<void> | null = null;

/** Registered once, by `auth.store`. A second call means a hot reload. */
export function setSessionEndHandler(next: SessionEndHandler): void {
  handler = next;
}

/**
 * Never rejects — a failure here must not replace the caller's own error.
 * Concurrent calls share one teardown, so N failed requests end one session.
 */
export function requestSessionEnd(reason: SessionEndReason): Promise<void> {
  if (inFlight) return inFlight;

  if (!handler) {
    // Only reachable before the store module has loaded.
    logger.warn('[session] end requested with no handler registered', reason);
    return Promise.resolve();
  }

  inFlight = handler(reason)
    .catch((error: unknown) => {
      logger.error('[session] teardown failed', error);
    })
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
}

/** Test seam: a handler left from one test would run inside the next. */
export function resetSessionEnd(): void {
  handler = null;
  inFlight = null;
}

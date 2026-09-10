import { create } from 'zustand';

import { ensureSchema, resetSchemaInit } from '@/core/db/init';
import { logger } from '@/core/utils/logger';

/**
 * Readiness of the local offline store.
 *
 * `hydrating` is reserved for the initial data pull, which is not implemented
 * yet — declared now so screens can branch on it without a later breaking
 * change. Today `ready` means "schema applied", not "data present".
 */
export type DbPhase = 'idle' | 'preparing' | 'hydrating' | 'ready' | 'failed';

/**
 * Automatic attempts before the UI stops retrying by itself and waits for the
 * user. Bounded on purpose: an unbounded retry loop across remounts would spin
 * forever against a genuinely broken database.
 */
const MAX_AUTO_ATTEMPTS = 2;

interface DbBootstrapState {
  phase: DbPhase;
  error: string | null;
  attempts: number;
  /** Idempotent — safe to call from a screen effect on every mount. */
  initialise: () => Promise<void>;
  /** Manual retry from the failure UI; resets the automatic attempt budget. */
  retry: () => Promise<void>;
  /** Logout teardown — forget readiness so the next login rebuilds from scratch. */
  reset: () => void;
}

/**
 * Drives the post-auth database bootstrap (ARCHITECTURE_RULES §6 "DB lifecycle").
 *
 * Lives in `core/session` rather than a feature because the DB lifecycle spans
 * login → home → logout, and because screens are forbidden from importing
 * `core/db` directly — this store is the legal seam between them.
 */
export const useDbBootstrapStore = create<DbBootstrapState>((set, get) => ({
  phase: 'idle',
  error: null,
  attempts: 0,

  initialise: async () => {
    const { phase, attempts } = get();

    // Already running, or already done — nothing to do. zustand's set is
    // synchronous, so a second caller in the same tick sees 'preparing'.
    if (phase === 'preparing' || phase === 'hydrating' || phase === 'ready') return;

    // Out of automatic attempts: hold until the user presses Retry.
    if (phase === 'failed' && attempts >= MAX_AUTO_ATTEMPTS) return;

    set({ phase: 'preparing', error: null, attempts: attempts + 1 });

    try {
      await ensureSchema();
      set({ phase: 'ready', error: null });
    } catch (error: unknown) {
      // Console-only; the screen shows a translated message, never this text.
      logger.error('[db] schema init failed', error);
      set({
        phase: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  retry: async () => {
    set({ phase: 'idle', error: null, attempts: 0 });
    await get().initialise();
  },

  reset: () => {
    resetSchemaInit();
    set({ phase: 'idle', error: null, attempts: 0 });
  },
}));

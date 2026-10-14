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

interface DbBootstrapState {
  phase: DbPhase;
  /** Idempotent — safe to call from a screen effect on every mount. */
  initialise: () => Promise<void>;
  /** Logout teardown — forget readiness so the next login rebuilds from scratch. */
  reset: () => void;
}

/**
 * Drives the post-auth database bootstrap (ARCHITECTURE_RULES §6 "DB lifecycle").
 *
 * Lives in `core/session` rather than a feature because the DB lifecycle spans
 * login → home → logout, and because screens are forbidden from importing
 * `core/db` directly — this store is the legal seam between them.
 *
 * It drives no UI. `phase` exists only so a second caller in the same tick does
 * not start a second migration run; nothing outside this file reads it. A
 * failure is logged and leaves `phase` at 'failed', which the guard below does
 * NOT treat as terminal — the next mount retries.
 */
export const useDbBootstrapStore = create<DbBootstrapState>((set, get) => ({
  phase: 'idle',

  initialise: async () => {
    // Already running, or already done — nothing to do. zustand's set is
    // synchronous, so a second caller in the same tick sees 'preparing'.
    const { phase } = get();
    if (phase === 'preparing' || phase === 'hydrating' || phase === 'ready') return;

    set({ phase: 'preparing' });

    try {
      await ensureSchema();
      set({ phase: 'ready' });
    } catch (error: unknown) {
      // Console-only. Nothing surfaces this to the user by design.
      logger.error('[db] schema init failed', error);
      set({ phase: 'failed' });
    }
  },

  reset: () => {
    // `teardownDb()` already calls resetSchemaInit(), but reset() is also
    // reachable on its own, and clearing `phase` is the half teardown cannot
    // do — without it the next login sees 'ready' and skips init entirely.
    resetSchemaInit();
    set({ phase: 'idle' });
  },
}));

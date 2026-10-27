import { create } from 'zustand';

import { env } from '@/core/config/env';
import { ensureSchema, resetSchemaInit } from '@/core/db/init';
import { runDevSeed, runDevVisitStart } from '@/core/db/seeds';
import { logger } from '@/core/utils/logger';

import { readWriterIdentity } from './writerIdentity';

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
  /** The fake patient's visit, set only when the dev seed ran (EXPO_PUBLIC_DEV_SEED). */
  devVisitUuid: string | null;
  /** Idempotent — safe to call from a screen effect on every mount. */
  initialise: (providerUuid?: string | null) => Promise<void>;
  /**
   * Dev seed builds only: starts Stage 1 (once) on the live test visit as the logged-in writer;
   * its uuid, or null when logged out or on failure.
   */
  startDevVisit: () => Promise<string | null>;
  /** Logout teardown — forget readiness so the next login rebuilds from scratch. */
  reset: () => void;
}

/** A failed dev seed is logged and never blocks the real database from being ready. */
function seedQuietly(providerUuid: string): string | null {
  try {
    return runDevSeed(providerUuid);
  } catch (error: unknown) {
    logger.error('[db] dev seed failed', error);
    return null;
  }
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
  devVisitUuid: null,

  initialise: async (providerUuid) => {
    // Already running, or already done — nothing to do. zustand's set is
    // synchronous, so a second caller in the same tick sees 'preparing'.
    const { phase } = get();
    if (phase === 'preparing' || phase === 'hydrating' || phase === 'ready') return;

    set({ phase: 'preparing' });

    try {
      await ensureSchema();
      const devVisitUuid = env.DEV_SEED && providerUuid ? seedQuietly(providerUuid) : null;
      set({ phase: 'ready', devVisitUuid });
    } catch (error: unknown) {
      // Console-only. Nothing surfaces this to the user by design.
      logger.error('[db] schema init failed', error);
      set({ phase: 'failed' });
    }
  },

  startDevVisit: async () => {
    if (!env.DEV_SEED) return null;
    try {
      const writer = await readWriterIdentity();
      if (!writer) return null;
      await ensureSchema();
      return runDevVisitStart(writer);
    } catch (error: unknown) {
      logger.error('[db] dev visit start failed', error);
      return null;
    }
  },

  reset: () => {
    // `teardownDb()` already calls resetSchemaInit(), but reset() is also
    // reachable on its own, and clearing `phase` is the half teardown cannot
    // do — without it the next login sees 'ready' and skips init entirely.
    resetSchemaInit();
    set({ phase: 'idle', devVisitUuid: null });
  },
}));

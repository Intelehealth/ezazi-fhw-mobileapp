import { create } from 'zustand';

import { deleteArchive, downloadArchive, existingArchive } from '@/core/api/archive.api';
import { ensureSchema, resetSchemaInit } from '@/core/db/init';
import { appStateRepo, userCredentialsRepo, type UserCredentialsRow } from '@/core/db/repositories';
import { readArchive } from '@/core/db/sync/readArchive';
import { transact } from '@/core/db/tx';
import { i18n } from '@/core/i18n';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { logger } from '@/core/utils/logger';
import { showToast } from '@/core/utils/toast';

/**
 * Readiness of the local offline store.
 *
 * `hydrating` is the first sync: the archive downloading and landing. It is
 * also the re-entrancy guard — Home's effect runs on every mount, and a second
 * run would download the same archive over the top of the one being applied.
 */
export type DbPhase = 'idle' | 'preparing' | 'hydrating' | 'ready' | 'failed';

interface DbBootstrapState {
  phase: DbPhase;
  /** Idempotent — safe to call from a screen effect on every mount. */
  initialise: () => Promise<void>;
  /** Logout teardown — forget readiness so the next login re-checks. */
  reset: () => void;
}

/**
 * Drives the post-auth database bootstrap (ARCHITECTURE_RULES §6 "DB lifecycle").
 *
 * Lives in `core/session` rather than a feature because the DB lifecycle spans
 * login → home → logout, and because screens are forbidden from importing
 * `core/db` directly — this store is the legal seam between them. It matches
 * the legacy, where the first sync is driven from Home rather than from Setup
 * (`HomeActivity.java:2242-2248`).
 *
 * A failure is logged and leaves `phase` at 'failed', which the guard below
 * does NOT treat as terminal — the next mount retries. That is also the only
 * retry there is, and the legacy is no better: its failure dialog's OK button
 * calls `finish()`.
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
      await writePendingCredentials();

      if (transact((tx) => appStateRepo.hasNeverPulled(tx))) {
        set({ phase: 'hydrating' });
        await runFirstSync();
        showToast(i18n.t('home.initialSyncComplete'));
      }

      set({ phase: 'ready' });
    } catch (error: unknown) {
      // Console-only. Nothing surfaces this to the user by design — the Toast
      // is success-only for now, and a failure retries on the next mount.
      logger.error('[db] bootstrap failed', error);
      set({ phase: 'failed' });
    }
  },

  reset: () => {
    // `phase` is the half nothing else can clear — without it the next login
    // sees 'ready' and skips both schema init and the first-sync check.
    resetSchemaInit();
    set({ phase: 'idle' });
  },
}));

/**
 * Moves the row login left in the keystore into the table it belongs in.
 * Login cannot do this itself: the database does not exist until the
 * `ensureSchema()` above has run.
 */
async function writePendingCredentials(): Promise<void> {
  const stashed = await secureStorage.get('pendingCredentials');
  if (!stashed) return;

  const row = JSON.parse(stashed) as UserCredentialsRow;
  transact((tx) => userCredentialsRepo.replaceCurrentUser(row, tx));
  // Only once the row is in. Cleared first, a crash in between would lose it
  // until the next login, and nothing would say so.
  await secureStorage.remove('pendingCredentials');
}

/**
 * Download, apply, delete — in that order, and the order is the point.
 *
 * `readArchive` commits the pull cursor LAST, inside the same transaction as
 * the rows, so until it returns the cursor still says "nothing pulled". That
 * is what makes a crash part-way safe: the zip is still on disk and the next
 * launch redoes it rather than skipping records that never landed. Deleting
 * before the cursor moves would lose them for good, because the server has no
 * reason to send them again.
 */
async function runFirstSync(): Promise<void> {
  // A zip from an interrupted run is applied as it stands. Re-downloading it
  // would be correct but wasteful — it is the whole location's data.
  const onDisk = existingArchive();

  let path = onDisk;
  if (!path) {
    const cursor = transact((tx) => appStateRepo.getPullCursor(tx));
    const downloaded = await downloadArchive(cursor);
    if (!downloaded.ok) throw downloaded.error;
    path = downloaded.data;
  } else {
    logger.info('[sync] applying the archive an earlier run left behind');
  }

  const result = await readArchive(path);
  logger.info('[sync] first sync applied', result);

  deleteArchive();
}

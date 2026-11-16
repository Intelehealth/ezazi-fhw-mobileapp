import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackHandler, Platform } from 'react-native';

import { deleteArchive } from '@/core/api/archive.api';
import { teardownDb } from '@/core/db/teardown';
import { secureStorage } from '@/core/services/storage/secure-storage';
import { useAuthStore } from '@/core/session/auth.store';
import { useDbBootstrapStore } from '@/core/session/dbBootstrap.store';
import { logger } from '@/core/utils/logger';

/**
 * Reset app — the destructive counterpart to logout.
 *
 * Logout follows the legacy and deletes nothing; this is the one action that
 * takes the device back to a fresh install. Arpan, 2026-11-16: *"Reset app ->
 * delete everything -> quit app."* See ARCHITECTURE_RULES §6 "DB lifecycle".
 *
 * There is no legacy counterpart. elcg has no reset at all — the only
 * `editor.clear()` in that repo is `OfflineLogin.java:148`, which is a
 * different thing, and `isFirstTimeLaunched` returns to its default only when
 * Android itself clears the app's data.
 */

/**
 * Wipes every store, then quits. It does NOT route anywhere: the app is
 * closing, and on the next launch `bootstrap` finds no setup keys and lands on
 * Setup by itself.
 *
 * Each step is independent, so one failure must not strand the rest — a
 * half-wiped device is worse than either outcome. The state is still reset
 * when a step throws, and on iOS, where there is no way to quit.
 */
export async function resetApp(): Promise<void> {
  // Settled, not all: AsyncStorage.clear() rejecting must not leave the
  // keystore holding a working server credential.
  const results = await Promise.allSettled([
    secureStorage.clearAll(),
    teardownDb(),
    AsyncStorage.clear(),
  ]);

  for (const result of results) {
    // Console-only. Nothing surfaces this — the app is about to close.
    if (result.status === 'rejected') logger.warn('[reset] a store did not clear', result.reason);
  }

  // A first-sync archive can be the whole location's data. Leaving it behind
  // would also hand the next launch a zip to apply against an empty database.
  try {
    deleteArchive();
  } catch (error: unknown) {
    logger.warn('[reset] the archive did not delete', error);
  }

  useDbBootstrapStore.getState().reset();
  // needsSetup, not needsLogin: the setup keys are gone, so this device is no
  // longer set up. Only reachable if exitApp does not fire.
  useAuthStore.setState({ status: 'needsSetup', userUuid: null, role: null });

  // Android only — iOS has no API for this, and Apple rejects apps that fake
  // it. There the wipe stands and the user closes the app themselves.
  if (Platform.OS === 'android') BackHandler.exitApp();
}

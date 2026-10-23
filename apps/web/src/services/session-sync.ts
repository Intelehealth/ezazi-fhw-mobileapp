import { queryClient } from '../config/query-client';
import {
  loggedOut,
  loginSuccess,
  tokenRefreshed,
} from '../reducers/auth.reducer';
import { store } from '../store/store';
import type { AuthUser } from '../types/auth.types';
import { storage } from '../utils/storage';
import { sessionExpiry } from './session-expiry';

function readStoredUser(): AuthUser | null {
  try {
    const raw = storage.getStoredUser();
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

/**
 * Brings this tab's in-memory session (Redux, query cache, the expired
 * modal) in line with what localStorage now says. Tabs share localStorage
 * but not memory, so without this a logout, login or silent refresh in one
 * tab leaves every other tab acting on a session that no longer exists:
 *
 * - the token is gone (logged out elsewhere): sign this tab out too;
 * - a different user logged in elsewhere: switch to them, dropping the
 *   previous user's cached data;
 * - a newer token for the same user: adopt it, and close the session-expired
 *   modal if it was up — that session has just been replaced, so its
 *   "Log in" must not be allowed to wipe the new one.
 *
 * Does nothing for a tab that isn't signed in (login screen, recovery flow).
 */
export function syncSessionFromStorage(): void {
  const { isAuthenticated, token, user } = store.getState().auth;
  if (!isAuthenticated) return;

  const storedToken = storage.getAuthToken();
  if (!storedToken) {
    queryClient.clear();
    sessionExpiry.reset();
    store.dispatch(loggedOut());
    return;
  }

  const storedUser = readStoredUser();
  if (storedUser && storedUser.uuid !== user?.uuid) {
    queryClient.clear();
    store.dispatch(loginSuccess({ token: storedToken, user: storedUser }));
    sessionExpiry.reset();
    return;
  }

  if (storedToken !== token) {
    store.dispatch(tokenRefreshed(storedToken));
    sessionExpiry.reset();
  }
}

/** Starts listening for session changes made in other tabs; returns the stop function. */
export function startSessionSync(): () => void {
  function handleStorage(event: StorageEvent) {
    if (event.storageArea !== localStorage) return;
    if (!storage.isSessionKey(event.key)) return;
    syncSessionFromStorage();
  }

  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

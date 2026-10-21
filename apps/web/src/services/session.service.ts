import { createApiClient, mapAxiosError } from '@ezazi/api-client';
import { env } from '../config/env';
import { tokenRefreshed } from '../reducers/auth.reducer';
import { store } from '../store/store';
import type { RefreshTokenResponse } from '../types/auth.types';
import { saveSessionSnapshot } from '../utils/session-snapshot';
import { storage } from '../utils/storage';
import { sessionExpiry } from './session-expiry';

/**
 * Silent access-token refresh against the auth-gateway's rotating
 * `POST /auth/refresh`.
 *
 * Uses its own bare client — no auth or retry interceptors — so a failing
 * refresh can never recurse into another refresh, and it needs no import of
 * services/http.ts (which depends on this file for its interceptors).
 */
const refreshClient = createApiClient({ baseURL: env.AUTH_GATEWAY_URL });

/** Refresh slightly early so a request never leaves with a token that expires in flight. */
const EXPIRY_SKEW_MS = 30_000;

const REFRESH_LOCK_NAME = 'ezazi-web-token-refresh';

/*
 * One refresh at a time per tab. The gateway rotates refresh tokens and
 * treats a reused one as theft (the whole login family is revoked), so
 * several requests that all 401 together must share a single refresh call
 * and then re-run with its result — never fire one each.
 */
let inFlightRefresh: Promise<string | null> | null = null;

/*
 * The same guarantee across tabs: they share localStorage, hence the same
 * refresh token. The Web Locks API serialises them; where it isn't available
 * the refresh just runs unguarded.
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  /* undefined on insecure (plain-http) origins and in older browsers. */
  const locks = navigator.locks as LockManager | undefined;
  return (
    locks ? locks.request(REFRESH_LOCK_NAME, task) : task()
  ) as Promise<T>;
}

/** The session can't be recovered silently: remember where the user was, then raise the hard-expiry modal. */
function expireSession(): void {
  const userUuid = store.getState().auth.user?.uuid;
  if (userUuid) saveSessionSnapshot(userUuid);
  sessionExpiry.markExpired();
}

async function runRefresh(staleToken: string | null): Promise<string | null> {
  return withRefreshLock(async () => {
    /* Another tab (or request) already replaced the token while we waited for the lock. */
    const current = storage.getAuthToken();
    if (current && current !== staleToken) return current;

    const refreshToken = storage.getRefreshToken();
    if (!refreshToken) {
      /* Nothing to refresh with: only a session that existed has expired. */
      if (staleToken) expireSession();
      return null;
    }

    try {
      const { data } = await refreshClient.post<RefreshTokenResponse>(
        '/auth/refresh',
        { refreshToken }
      );
      storage.setSessionTokens(data);
      store.dispatch(tokenRefreshed(data.accessToken));
      return data.accessToken;
    } catch (error) {
      /*
       * 401 = the gateway rejected the refresh token (expired, revoked or
       * reused): a hard expiry. Anything else (offline, timeout, 5xx) is
       * transient — keep the session and let the original request fail.
       */
      if (mapAxiosError(error).kind === 'unauthorized') expireSession();
      return null;
    }
  });
}

/**
 * Called when a request came back 401: returns a usable access token (new,
 * or one a concurrent refresh already produced) or null when there is none.
 * `failedToken` is the token the rejected request carried.
 */
export function refreshAccessToken(
  failedToken?: string | null
): Promise<string | null> {
  /* Already hard-expired: don't hammer the gateway while the modal is up. */
  if (sessionExpiry.isExpired()) return Promise.resolve(null);

  const current = storage.getAuthToken();
  if (failedToken && current && current !== failedToken) {
    return Promise.resolve(current);
  }

  inFlightRefresh ??= runRefresh(failedToken ?? current).finally(() => {
    inFlightRefresh = null;
  });
  return inFlightRefresh;
}

/**
 * The token every authenticated request is sent with. Refreshes first when
 * the stored one is about to expire, so most requests never see a 401 at all
 * (the 401 path in refreshAccessToken is the safety net, not the plan).
 */
export async function getValidAccessToken(): Promise<string | null> {
  const token = storage.getAuthToken();
  if (!token || sessionExpiry.isExpired()) return token;

  const expiresAt = storage.getAuthTokenExpiresAt();
  const isExpiring =
    expiresAt !== null && expiresAt - Date.now() <= EXPIRY_SKEW_MS;
  if (!isExpiring || !storage.getRefreshToken()) return token;

  /* A failed (transient) refresh falls back to the old token; the server decides. */
  return (await refreshAccessToken()) ?? token;
}

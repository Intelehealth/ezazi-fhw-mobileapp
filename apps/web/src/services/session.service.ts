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

/* Fallback lock (see withStorageLock): how long a holder may keep it, and how long a waiter will wait. */
const STORAGE_LOCK_TTL_MS = 10_000;
const STORAGE_LOCK_WAIT_MS = 5_000;
const STORAGE_LOCK_POLL_MS = 50;

/*
 * One refresh at a time per tab. The gateway rotates refresh tokens and
 * treats a reused one as theft (the whole login family is revoked), so
 * several requests that all 401 together must share a single refresh call
 * and then re-run with its result — never fire one each.
 */
let inFlightRefresh: Promise<string | null> | null = null;

/*
 * The same guarantee across tabs: they share localStorage, hence the same
 * refresh token. The Web Locks API serialises them; it is only available in
 * secure contexts, so on a plain-http origin (a staging box, say) a
 * best-effort localStorage lock stands in — see withStorageLock.
 */
function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  const locks = navigator.locks as LockManager | undefined;
  return (
    locks ? locks.request(REFRESH_LOCK_NAME, task) : withStorageLock(task)
  ) as Promise<T>;
}

const STORAGE_LOCK_KEY = 'ezazi_web_token_refresh_lock';

/*
 * A cooperative mutex in localStorage for browsers without Web Locks: take
 * the lock by writing "<owner>:<time>", wait while someone else's unexpired
 * claim is there, and confirm after writing that the claim is still ours.
 * Not airtight (localStorage has no compare-and-set, so two tabs writing in
 * the same instant can both think they won) but it closes the common race of
 * several tabs waking up together, and a stale claim expires on its own so a
 * crashed tab can never block refreshes for long. If the wait runs out the
 * refresh goes ahead anyway rather than leave the user without a session.
 */
async function withStorageLock<T>(task: () => Promise<T>): Promise<T> {
  const owner = Math.random().toString(36).slice(2);
  const deadline = Date.now() + STORAGE_LOCK_WAIT_MS;
  const claimedByAnother = () => {
    const [holder, since] = (
      localStorage.getItem(STORAGE_LOCK_KEY) ?? ''
    ).split(':');
    return (
      Boolean(holder) &&
      holder !== owner &&
      Date.now() - Number(since) < STORAGE_LOCK_TTL_MS
    );
  };

  while (claimedByAnother() && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, STORAGE_LOCK_POLL_MS));
  }

  localStorage.setItem(STORAGE_LOCK_KEY, `${owner}:${Date.now()}`);
  try {
    return await task();
  } finally {
    if (localStorage.getItem(STORAGE_LOCK_KEY)?.startsWith(`${owner}:`)) {
      localStorage.removeItem(STORAGE_LOCK_KEY);
    }
  }
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
      /*
       * Nothing to refresh with. A tab that still believes it is signed in
       * (Redux says so, or the failed request carried a token) has lost its
       * session — e.g. another tab logged out — so say so, rather than leave
       * it on the dashboard with every request quietly failing.
       */
      if (staleToken || store.getState().auth.isAuthenticated) expireSession();
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

/** What logout needs to revoke the session server-side, read before local storage is cleared. */
export interface GatewaySessionTokens {
  accessToken: string | null;
  refreshToken: string | null;
  /** Epoch ms at which `accessToken` expires, when known. */
  accessTokenExpiresAt: number | null;
}

export function readGatewaySessionTokens(): GatewaySessionTokens {
  return {
    accessToken: storage.getAuthToken(),
    refreshToken: storage.getRefreshToken(),
    accessTokenExpiresAt: storage.getAuthTokenExpiresAt(),
  };
}

/**
 * Revokes the refresh-token family at the gateway (`POST /auth/logout`) so a
 * stolen or leftover refresh token can't extend the session after logout.
 * Meant to run in the background once the user is already signed out locally,
 * with the tokens captured beforehand; it never throws.
 *
 * The gateway only accepts the call with a valid access token, and a user who
 * was idle for a while has an expired one — the most common way to log out.
 * So an expiring token is first exchanged (this rotates the pair, and the
 * rotated refresh token is the one revoked). If even that fails the refresh
 * token is already dead and there is nothing left to revoke.
 */
export async function revokeGatewaySession({
  accessToken,
  refreshToken,
  accessTokenExpiresAt,
}: GatewaySessionTokens): Promise<void> {
  if (!accessToken || !refreshToken) return;

  try {
    let bearer = accessToken;
    let toRevoke = refreshToken;

    const isExpiring =
      accessTokenExpiresAt !== null &&
      accessTokenExpiresAt - Date.now() <= EXPIRY_SKEW_MS;
    if (isExpiring) {
      const { data } = await refreshClient.post<RefreshTokenResponse>(
        '/auth/refresh',
        { refreshToken }
      );
      bearer = data.accessToken;
      toRevoke = data.refreshToken;
    }

    await refreshClient.post(
      '/auth/logout',
      { refreshToken: toRevoke },
      { headers: { Authorization: `Bearer ${bearer}` } }
    );
  } catch {
    /* Best-effort: the user is already signed out locally. */
  }
}

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { queryClient } from '../../config/query-client';
import {
  loggedOut,
  loginSuccess,
  tokenRefreshed,
} from '../../reducers/auth.reducer';
import { sessionExpiry } from '../../services/session-expiry';
import {
  startSessionSync,
  syncSessionFromStorage,
} from '../../services/session-sync';
import type { AuthUser } from '../../types/auth.types';
import { storage } from '../../utils/storage';

const authState = vi.hoisted(() => ({
  isAuthenticated: true,
  token: 'access-1' as string | null,
  user: { uuid: 'u-1' } as { uuid: string } | null,
}));
const dispatch = vi.hoisted(() => vi.fn());

vi.mock('../../store/store', () => ({
  store: { getState: () => ({ auth: authState }), dispatch },
}));

vi.mock('../../config/query-client', () => ({
  queryClient: { clear: vi.fn() },
}));

const USER_1 = { uuid: 'u-1' } as AuthUser;
const USER_2 = { uuid: 'u-2' } as AuthUser;

function storeSession(token: string, user: AuthUser) {
  storage.setSessionTokens({
    accessToken: token,
    refreshToken: 'refresh',
    expiresIn: 900,
  });
  storage.setStoredUser(JSON.stringify(user));
}

beforeEach(() => {
  dispatch.mockReset();
  vi.mocked(queryClient.clear).mockReset();
  authState.isAuthenticated = true;
  authState.token = 'access-1';
  authState.user = { uuid: 'u-1' };
  localStorage.clear();
  sessionExpiry.reset();
});

describe('syncSessionFromStorage', () => {
  it('does nothing in a tab that is not signed in', () => {
    authState.isAuthenticated = false;

    syncSessionFromStorage();

    expect(dispatch).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
  });

  it('signs this tab out when another tab logged out (the token is gone), and closes the expired modal', () => {
    sessionExpiry.markExpired();

    syncSessionFromStorage();

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it('adopts a newer token for the same user, and closes the expired modal that session replaced', () => {
    storeSession('access-2', USER_1);
    sessionExpiry.markExpired();

    syncSessionFromStorage();

    expect(dispatch).toHaveBeenCalledWith(tokenRefreshed('access-2'));
    expect(queryClient.clear).not.toHaveBeenCalled();
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it("switches to the other user when someone else logged in elsewhere, dropping the previous user's cached data", () => {
    storeSession('access-9', USER_2);
    sessionExpiry.markExpired();

    syncSessionFromStorage();

    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      loginSuccess({ token: 'access-9', user: USER_2 })
    );
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it('does nothing when storage still matches this tab', () => {
    storeSession('access-1', USER_1);

    syncSessionFromStorage();

    expect(dispatch).not.toHaveBeenCalled();
    expect(queryClient.clear).not.toHaveBeenCalled();
  });

  it('treats a token with no stored user as the same user', () => {
    storage.setSessionTokens({
      accessToken: 'access-2',
      refreshToken: 'r',
      expiresIn: 900,
    });

    syncSessionFromStorage();

    expect(dispatch).toHaveBeenCalledWith(tokenRefreshed('access-2'));
  });

  it('ignores a stored user that cannot be read', () => {
    storage.setSessionTokens({
      accessToken: 'access-2',
      refreshToken: 'r',
      expiresIn: 900,
    });
    storage.setStoredUser('{broken');

    syncSessionFromStorage();

    expect(dispatch).toHaveBeenCalledWith(tokenRefreshed('access-2'));
    expect(queryClient.clear).not.toHaveBeenCalled();
  });

  it('switches users even when this tab has no user in memory', () => {
    authState.user = null;
    storeSession('access-9', USER_2);

    syncSessionFromStorage();

    expect(dispatch).toHaveBeenCalledWith(
      loginSuccess({ token: 'access-9', user: USER_2 })
    );
  });
});

describe('startSessionSync', () => {
  function emit(init: StorageEventInit) {
    window.dispatchEvent(new StorageEvent('storage', init));
  }

  it('syncs when the stored token changes in another tab', () => {
    const stop = startSessionSync();

    emit({ key: 'ezazi_web_auth_token', storageArea: localStorage });

    expect(dispatch).toHaveBeenCalledWith(loggedOut());
    stop();
  });

  it('syncs when the stored user changes, and when storage is cleared outright', () => {
    const stop = startSessionSync();

    emit({ key: 'ezazi_web_auth_user', storageArea: localStorage });
    emit({ key: null, storageArea: localStorage });

    expect(dispatch).toHaveBeenCalledTimes(2);
    stop();
  });

  it('ignores unrelated keys and sessionStorage events', () => {
    const stop = startSessionSync();

    emit({ key: 'some_other_key', storageArea: localStorage });
    emit({ key: 'ezazi_web_auth_token', storageArea: sessionStorage });

    expect(dispatch).not.toHaveBeenCalled();
    stop();
  });

  it('stops listening once stopped', () => {
    const stop = startSessionSync();
    stop();

    emit({ key: 'ezazi_web_auth_token', storageArea: localStorage });

    expect(dispatch).not.toHaveBeenCalled();
  });
});

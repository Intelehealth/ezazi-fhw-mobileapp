import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenRefreshed } from '../../reducers/auth.reducer';
import { sessionExpiry } from '../../services/session-expiry';
import {
  getValidAccessToken,
  refreshAccessToken,
} from '../../services/session.service';
import { saveSessionSnapshot } from '../../utils/session-snapshot';
import { storage } from '../../utils/storage';

const post = vi.hoisted(() => vi.fn());

vi.mock('@ezazi/api-client', async importOriginal => ({
  ...(await importOriginal<typeof import('@ezazi/api-client')>()),
  createApiClient: () => ({ post }),
}));

const storeState = vi.hoisted(() => ({
  user: { uuid: 'u-1' } as { uuid: string } | null,
}));
const dispatch = vi.hoisted(() => vi.fn());
vi.mock('../../store/store', () => ({
  store: { getState: () => ({ auth: storeState }), dispatch },
}));

vi.mock('../../utils/session-snapshot', () => ({
  saveSessionSnapshot: vi.fn(),
}));

const NOW = new Date('2026-01-01T00:00:00Z').getTime();

const ROTATED = {
  tokenType: 'Bearer',
  accessToken: 'access-2',
  expiresIn: 900,
  refreshToken: 'refresh-2',
  refreshExpiresIn: 604800,
  sessionId: 'jti-2',
};

/** An axios-shaped failure, the way mapAxiosError reads it. */
function httpFailure(status: number) {
  return Object.assign(new Error(`status ${status}`), {
    isAxiosError: true,
    response: { status, data: { error: { message: 'nope' } } },
  });
}

function signIn(expiresInMs = 900_000) {
  storage.setSessionTokens({
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    expiresIn: expiresInMs / 1000,
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  post.mockReset();
  dispatch.mockReset();
  vi.mocked(saveSessionSnapshot).mockReset();
  storeState.user = { uuid: 'u-1' };
  localStorage.clear();
  sessionExpiry.reset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionExpiry.reset();
});

describe('refreshAccessToken', () => {
  it('rotates the token pair, stores it, updates Redux and returns the new access token', async () => {
    signIn();
    post.mockResolvedValue({ data: ROTATED });

    const token = await refreshAccessToken('access-1');

    expect(post).toHaveBeenCalledWith('/auth/refresh', {
      refreshToken: 'refresh-1',
    });
    expect(token).toBe('access-2');
    expect(storage.getAuthToken()).toBe('access-2');
    expect(storage.getRefreshToken()).toBe('refresh-2');
    expect(storage.getAuthTokenExpiresAt()).toBe(NOW + 900_000);
    expect(dispatch).toHaveBeenCalledWith(tokenRefreshed('access-2'));
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it('shares ONE refresh between concurrent callers instead of firing one each (the gateway revokes reused refresh tokens)', async () => {
    signIn();
    let finish: (value: unknown) => void = () => undefined;
    post.mockReturnValue(new Promise(resolve => (finish = resolve)));

    const first = refreshAccessToken('access-1');
    const second = refreshAccessToken('access-1');
    const third = refreshAccessToken('access-1');
    finish({ data: ROTATED });

    await expect(Promise.all([first, second, third])).resolves.toEqual([
      'access-2',
      'access-2',
      'access-2',
    ]);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('allows a later refresh once the previous one has settled', async () => {
    signIn();
    post.mockResolvedValueOnce({ data: ROTATED });
    await refreshAccessToken('access-1');

    post.mockResolvedValueOnce({
      data: { ...ROTATED, accessToken: 'access-3', refreshToken: 'refresh-3' },
    });
    await expect(refreshAccessToken('access-2')).resolves.toBe('access-3');
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('just hands back the current token when the rejected request used an older one (someone already refreshed)', async () => {
    signIn();
    storage.setSessionTokens({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
      expiresIn: 900,
    });

    const token = await refreshAccessToken('access-1');

    expect(token).toBe('access-2');
    expect(post).not.toHaveBeenCalled();
  });

  it('refreshes when the failed token is the current one, or when it is unknown', async () => {
    signIn();
    post.mockResolvedValue({ data: ROTATED });

    await expect(refreshAccessToken(undefined)).resolves.toBe('access-2');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('skips the network when another tab replaced the token while waiting for the refresh lock', async () => {
    signIn();
    const request = vi.fn(
      async (_name: string, task: () => Promise<unknown>) => {
        /* Another tab finished its refresh before this tab got the lock. */
        storage.setSessionTokens({
          accessToken: 'access-from-other-tab',
          refreshToken: 'refresh-from-other-tab',
          expiresIn: 900,
        });
        return task();
      }
    );
    vi.stubGlobal('navigator', { locks: { request } });

    const token = await refreshAccessToken('access-1');

    expect(request).toHaveBeenCalledWith(
      'ezazi-web-token-refresh',
      expect.any(Function)
    );
    expect(token).toBe('access-from-other-tab');
    expect(post).not.toHaveBeenCalled();
  });

  it('runs the refresh inside the cross-tab lock when the Web Locks API exists', async () => {
    signIn();
    const request = vi.fn((_name: string, task: () => Promise<unknown>) =>
      task()
    );
    vi.stubGlobal('navigator', { locks: { request } });
    post.mockResolvedValue({ data: ROTATED });

    await expect(refreshAccessToken('access-1')).resolves.toBe('access-2');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('hard-expires the session, saving a snapshot first, when the gateway rejects the refresh token', async () => {
    signIn();
    post.mockRejectedValue(httpFailure(401));

    const token = await refreshAccessToken('access-1');

    expect(token).toBeNull();
    expect(saveSessionSnapshot).toHaveBeenCalledWith('u-1');
    expect(sessionExpiry.isExpired()).toBe(true);
    /* Nothing is cleared here: the modal's "Log in" does that, keeping the snapshot. */
    expect(storage.getAuthToken()).toBe('access-1');
  });

  it.each([
    ['offline', new Error('Network Error')],
    ['a gateway outage', httpFailure(503)],
  ])('keeps the session on a transient failure (%s)', async (_case, error) => {
    signIn();
    post.mockRejectedValue(error);

    const token = await refreshAccessToken('access-1');

    expect(token).toBeNull();
    expect(sessionExpiry.isExpired()).toBe(false);
    expect(saveSessionSnapshot).not.toHaveBeenCalled();
    expect(storage.getAuthToken()).toBe('access-1');
  });

  it('hard-expires when a session existed but there is no refresh token to renew it with', async () => {
    storage.setAuthToken('access-1');

    const token = await refreshAccessToken('access-1');

    expect(token).toBeNull();
    expect(post).not.toHaveBeenCalled();
    expect(sessionExpiry.isExpired()).toBe(true);
  });

  it('does not raise the expired modal when nobody was signed in', async () => {
    const token = await refreshAccessToken();

    expect(token).toBeNull();
    expect(sessionExpiry.isExpired()).toBe(false);
  });

  it('still raises the modal, without a snapshot, when no user is in Redux', async () => {
    signIn();
    storeState.user = null;
    post.mockRejectedValue(httpFailure(401));

    await refreshAccessToken('access-1');

    expect(saveSessionSnapshot).not.toHaveBeenCalled();
    expect(sessionExpiry.isExpired()).toBe(true);
  });

  it('answers immediately, without touching the gateway, once the session has hard-expired', async () => {
    signIn();
    sessionExpiry.markExpired();

    await expect(refreshAccessToken('access-1')).resolves.toBeNull();
    expect(post).not.toHaveBeenCalled();
  });
});

describe('getValidAccessToken', () => {
  it('is null when there is no stored token', async () => {
    await expect(getValidAccessToken()).resolves.toBeNull();
  });

  it('returns the stored token as-is while it is comfortably valid', async () => {
    signIn();

    await expect(getValidAccessToken()).resolves.toBe('access-1');
    expect(post).not.toHaveBeenCalled();
  });

  it('refreshes ahead of time once the token is within 30 seconds of expiring', async () => {
    signIn(20_000);
    post.mockResolvedValue({ data: ROTATED });

    await expect(getValidAccessToken()).resolves.toBe('access-2');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('shares a pre-emptive refresh between simultaneous requests', async () => {
    signIn(20_000);
    post.mockResolvedValue({ data: ROTATED });

    await Promise.all([
      getValidAccessToken(),
      getValidAccessToken(),
      getValidAccessToken(),
    ]);

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('falls back to the old token when the pre-emptive refresh fails transiently, and lets the server decide', async () => {
    signIn(20_000);
    post.mockRejectedValue(new Error('Network Error'));

    await expect(getValidAccessToken()).resolves.toBe('access-1');
  });

  it('returns the token untouched when its expiry is unknown', async () => {
    storage.setAuthToken('access-1');
    localStorage.setItem('ezazi_web_refresh_token', 'refresh-1');

    await expect(getValidAccessToken()).resolves.toBe('access-1');
    expect(post).not.toHaveBeenCalled();
  });

  it('does not try to refresh an expiring token when there is no refresh token', async () => {
    signIn(20_000);
    localStorage.removeItem('ezazi_web_refresh_token');

    await expect(getValidAccessToken()).resolves.toBe('access-1');
    expect(post).not.toHaveBeenCalled();
  });

  it('leaves the token alone once the session has hard-expired', async () => {
    signIn(20_000);
    sessionExpiry.markExpired();

    await expect(getValidAccessToken()).resolves.toBe('access-1');
    expect(post).not.toHaveBeenCalled();
  });
});

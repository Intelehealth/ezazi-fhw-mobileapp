import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The real pieces end to end — the shared @ezazi/api-client interceptors,
 * services/http.ts, services/session.service.ts, the real store and storage —
 * with only the network faked, by replacing axios's default adapter before any
 * client is created. It stands in for the auth-gateway: access-1 is expired,
 * /auth/refresh rotates to access-2, and the refresh token itself can be made
 * to fail.
 */
type Reply = { status: number; data?: unknown };

const calls: { url: string; authorization?: string }[] = [];
let refreshReply: Reply;

function fakeGateway(
  config: InternalAxiosRequestConfig
): Promise<AxiosResponse> {
  const authorization = config.headers.get('Authorization') as
    string | undefined;
  calls.push({ url: config.url ?? '', authorization });

  const reply = ((): Reply => {
    if (config.url === '/auth/refresh') return refreshReply;
    return authorization === 'Bearer access-2'
      ? { status: 200, data: { ok: true } }
      : { status: 401, data: { error: { message: 'expired' } } };
  })();

  const response: AxiosResponse = {
    status: reply.status,
    statusText: '',
    data: reply.data ?? {},
    headers: {},
    config,
  };
  if (reply.status >= 400) {
    return Promise.reject(
      new AxiosError('failed', 'ERR_BAD_REQUEST', config, null, response)
    );
  }
  return Promise.resolve(response);
}

const ROTATED = {
  tokenType: 'Bearer',
  accessToken: 'access-2',
  expiresIn: 900,
  refreshToken: 'refresh-2',
  refreshExpiresIn: 604800,
  sessionId: 'jti-2',
};

async function load() {
  vi.resetModules();
  axios.defaults.adapter = fakeGateway;
  const { httpClient } = await import('../../services/http');
  const { storage } = await import('../../utils/storage');
  const { sessionExpiry } = await import('../../services/session-expiry');
  return { httpClient, storage, sessionExpiry };
}

const refreshCalls = () => calls.filter(call => call.url === '/auth/refresh');

beforeEach(() => {
  calls.length = 0;
  refreshReply = { status: 200, data: ROTATED };
  localStorage.clear();
  sessionStorage.clear();
  window.history.pushState(null, '', '/dashboard/profile');
});

afterEach(() => {
  vi.resetModules();
  window.history.pushState(null, '', '/');
});

describe('session expiry (interceptor + silent refresh + re-queue)', () => {
  it('answers several simultaneous 401s with ONE refresh and re-sends every request with the new token', async () => {
    const { httpClient, storage } = await load();
    storage.setSessionTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
    });

    const responses = await Promise.all([
      httpClient.get('/a'),
      httpClient.get('/b'),
      httpClient.get('/c'),
    ]);

    expect(responses.map(response => response.status)).toEqual([200, 200, 200]);
    expect(refreshCalls()).toHaveLength(1);
    /* Each request went out once with the stale token, then once more with the new one. */
    for (const url of ['/a', '/b', '/c']) {
      expect(
        calls.filter(call => call.url === url).map(call => call.authorization)
      ).toEqual(['Bearer access-1', 'Bearer access-2']);
    }
    expect(storage.getAuthToken()).toBe('access-2');
    expect(storage.getRefreshToken()).toBe('refresh-2');
  });

  it('refreshes ahead of time when the token is about to expire, so no request ever 401s', async () => {
    const { httpClient, storage } = await load();
    storage.setSessionTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 10,
    });

    const [a, b] = await Promise.all([
      httpClient.get('/a'),
      httpClient.get('/b'),
    ]);

    expect([a.status, b.status]).toEqual([200, 200]);
    expect(refreshCalls()).toHaveLength(1);
    expect(
      calls
        .filter(call => call.url !== '/auth/refresh')
        .map(call => call.authorization)
    ).toEqual(['Bearer access-2', 'Bearer access-2']);
  });

  it('hard-expires when the refresh token is rejected: requests fail, the modal is raised, and the page and forms are snapshotted', async () => {
    refreshReply = {
      status: 401,
      data: { error: { message: 'Refresh token has expired' } },
    };
    const { httpClient, storage, sessionExpiry } = await load();
    const { store } = await import('../../store/store');
    const { loginSuccess } = await import('../../reducers/auth.reducer');
    const { registerFormDraft } = await import('../../utils/session-snapshot');
    store.dispatch(
      loginSuccess({
        token: 'access-1',
        user: {
          uuid: 'u-1',
          username: 'doctor1',
          displayName: 'Dr One',
          roles: [],
          providerUuid: 'p-1',
          personUuid: 'per-1',
        },
      })
    );
    storage.setSessionTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
    });
    registerFormDraft('profile', () => ({ givenName: 'Asha' }));

    await expect(httpClient.get('/a')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(sessionExpiry.isExpired()).toBe(true);
    expect(
      JSON.parse(sessionStorage.getItem('ezazi_web_session_snapshot')!)
    ).toEqual({
      userUuid: 'u-1',
      returnTo: '/dashboard/profile',
      drafts: { profile: { givenName: 'Asha' } },
    });

    /* While the modal is up, further 401s don't hammer the gateway again. */
    await expect(httpClient.get('/b')).rejects.toBeDefined();
    expect(refreshCalls()).toHaveLength(1);
  });

  it('keeps the session when the refresh fails for a transient reason', async () => {
    refreshReply = { status: 503, data: { error: { message: 'down' } } };
    const { httpClient, storage, sessionExpiry } = await load();
    storage.setSessionTokens({
      accessToken: 'access-1',
      refreshToken: 'refresh-1',
      expiresIn: 900,
    });

    await expect(httpClient.get('/a')).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(sessionExpiry.isExpired()).toBe(false);
    expect(storage.getRefreshToken()).toBe('refresh-1');
  });
});

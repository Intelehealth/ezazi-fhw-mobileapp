import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `createApiClient` is mocked (not axios itself) so these tests assert on
 * *this file's own* wiring — which options it hands @ezazi/api-client —
 * rather than re-testing that package's own interceptor behavior (covered
 * by its own test suite).
 */
const createApiClient = vi.fn<(...args: unknown[]) => unknown>(() => ({
  __stub: 'axios-instance',
  defaults: {},
}));
vi.mock('@ezazi/api-client', () => ({
  createApiClient: (...args: unknown[]) => createApiClient(...args),
}));

const dispatch = vi.hoisted(() => vi.fn());
vi.mock('../../store/store', () => ({ store: { dispatch } }));

const clearQueryCache = vi.hoisted(() => vi.fn());
vi.mock('../../config/query-client', () => ({
  queryClient: { clear: clearQueryCache },
}));

const redirectTo = vi.hoisted(() => vi.fn());
vi.mock('../../utils/navigation', () => ({ redirectTo }));

vi.mock('../../utils/storage', () => ({
  storage: {
    getAuthToken: vi.fn(() => 'stored-token'),
    clearAuthToken: vi.fn(),
    clearStoredUser: vi.fn(),
  },
}));

describe('http', () => {
  beforeEach(() => {
    vi.resetModules();
    createApiClient.mockClear();
    dispatch.mockClear();
    clearQueryCache.mockClear();
    redirectTo.mockClear();
    window.history.pushState(null, '', '/');
  });

  afterEach(() => {
    window.history.pushState(null, '', '/');
    vi.unstubAllEnvs();
  });

  it('builds the authenticated client against AUTH_GATEWAY_URL with a token provider and 401 handler', async () => {
    const { env } = await import('../../config/env');
    await import('../../services/http');

    const authCall = createApiClient.mock.calls.find(
      ([opts]) => (opts as { baseURL: string }).baseURL === env.AUTH_GATEWAY_URL
    );
    expect(authCall).toBeDefined();

    const options = authCall![0] as {
      getAuthToken: () => string | null;
      onUnauthorized: () => void;
    };
    expect(options.getAuthToken()).toBe('stored-token');
    expect(typeof options.onUnauthorized).toBe('function');
  });

  it('builds the public client against CONFIG_URL with no token provider or 401 handler', async () => {
    const { env } = await import('../../config/env');
    await import('../../services/http');

    const publicCall = createApiClient.mock.calls.find(
      ([opts]) => (opts as { baseURL: string }).baseURL === env.CONFIG_URL
    );
    expect(publicCall).toBeDefined();

    const options = publicCall![0] as Record<string, unknown>;
    expect(options.getAuthToken).toBeUndefined();
    expect(options.onUnauthorized).toBeUndefined();
  });

  it('on 401, clears the stored session, Redux state and query cache, then redirects to the login path', async () => {
    const { storage } = await import('../../utils/storage');
    const { loggedOut } = await import('../../reducers/auth.reducer');
    await import('../../services/http');

    const options = createApiClient.mock.calls[0][0] as {
      onUnauthorized: () => void;
    };
    window.history.pushState(null, '', '/dashboard/profile');

    options.onUnauthorized();

    expect(storage.clearAuthToken).toHaveBeenCalled();
    expect(storage.clearStoredUser).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalledWith(loggedOut());
    expect(clearQueryCache).toHaveBeenCalledTimes(1);
    expect(redirectTo).toHaveBeenCalledWith('/auth/login');
  });

  it('on 401, prefixes the login path with VITE_BASE_PATH', async () => {
    vi.stubEnv('VITE_BASE_PATH', '/intelehealth');
    await import('../../services/http');

    const options = createApiClient.mock.calls[0][0] as {
      onUnauthorized: () => void;
    };
    window.history.pushState(null, '', '/intelehealth/dashboard');

    options.onUnauthorized();

    expect(redirectTo).toHaveBeenCalledWith('/intelehealth/auth/login');
  });

  it('on 401, does not redirect if already somewhere under the auth routes', async () => {
    await import('../../services/http');

    const options = createApiClient.mock.calls[0][0] as {
      onUnauthorized: () => void;
    };
    window.history.pushState(null, '', '/auth/forgot-password');

    options.onUnauthorized();

    expect(redirectTo).not.toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
  });

  it('builds the OpenMRS client against OPENMRS_URL with no Bearer auth, riding a session cookie instead', async () => {
    const { env } = await import('../../config/env');
    const { openMrsHttpClient } = await import('../../services/http');

    const openMrsCall = createApiClient.mock.calls.find(
      ([opts]) => (opts as { baseURL: string }).baseURL === env.OPENMRS_URL
    );
    expect(openMrsCall).toBeDefined();

    // No getAuthToken/onUnauthorized: OpenMRS can't verify this app's
    // auth-gateway JWT at all (see openMrsHttpClient's own doc comment) —
    // auth rides the session cookie profileService.createSession establishes.
    const options = openMrsCall![0] as Record<string, unknown>;
    expect(options.getAuthToken).toBeUndefined();
    expect(options.onUnauthorized).toBeUndefined();
    expect(
      (
        openMrsHttpClient as unknown as {
          defaults: { withCredentials?: boolean };
        }
      ).defaults.withCredentials
    ).toBe(true);
  });

  it('getOpenMrsBaseUrl returns env.OPENMRS_URL directly, including in development mode', async () => {
    const { env } = await import('../../config/env');
    const { getOpenMrsBaseUrl } = await import('../../services/http');

    expect(getOpenMrsBaseUrl()).toBe(env.OPENMRS_URL);
  });

  it('builds the pre-auth auth-gateway client against AUTH_GATEWAY_URL with no token provider or 401 handler', async () => {
    const { env } = await import('../../config/env');
    await import('../../services/http');

    // Two clients now share AUTH_GATEWAY_URL (httpClient + authGatewayPublicClient)
    // — the public one is identified by having neither option set, unlike httpClient's call.
    const authGatewayCalls = createApiClient.mock.calls.filter(
      ([opts]) => (opts as { baseURL: string }).baseURL === env.AUTH_GATEWAY_URL
    );
    expect(authGatewayCalls).toHaveLength(2);

    const publicCall = authGatewayCalls.find(
      ([opts]) => !(opts as Record<string, unknown>).getAuthToken
    );
    expect(publicCall).toBeDefined();
    const options = publicCall![0] as Record<string, unknown>;
    expect(options.getAuthToken).toBeUndefined();
    expect(options.onUnauthorized).toBeUndefined();
  });
});

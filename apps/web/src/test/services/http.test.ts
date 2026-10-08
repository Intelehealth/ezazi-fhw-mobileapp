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
    window.location.hash = '';
  });

  afterEach(() => {
    window.location.hash = '';
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

  it('on 401, clears the stored session and redirects to #/auth/login when not already there', async () => {
    const { storage } = await import('../../utils/storage');
    await import('../../services/http');

    const options = createApiClient.mock.calls[0][0] as {
      onUnauthorized: () => void;
    };
    window.location.hash = '#/dashboard';

    options.onUnauthorized();

    expect(storage.clearAuthToken).toHaveBeenCalledTimes(1);
    expect(storage.clearStoredUser).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/auth/login');
  });

  it('on 401, does not rewrite the hash if already somewhere under #/auth', async () => {
    await import('../../services/http');

    const options = createApiClient.mock.calls[0][0] as {
      onUnauthorized: () => void;
    };
    window.location.hash = '#/auth/forgot-password';

    options.onUnauthorized();

    expect(window.location.hash).toBe('#/auth/forgot-password');
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

  it('builds the mindmap client against MINDMAP_URL with a token provider and 401 handler', async () => {
    const { env } = await import('../../config/env');
    await import('../../services/http');

    // baseURL alone doesn't disambiguate: MINDMAP_URL and CONFIG_URL are both
    // '' by default (no placeholder host — see env.ts), so publicHttpClient's
    // call would match first too. getAuthToken presence picks out the
    // authenticated one, same disambiguation the AUTH_GATEWAY_URL test below
    // already needs for its own two same-baseURL clients.
    const mindmapCall = createApiClient.mock.calls.find(
      ([opts]) =>
        (opts as { baseURL: string }).baseURL === env.MINDMAP_URL &&
        (opts as Record<string, unknown>).getAuthToken
    );
    expect(mindmapCall).toBeDefined();

    const options = mindmapCall![0] as {
      getAuthToken: () => string | null;
      onUnauthorized: () => void;
    };
    expect(options.getAuthToken()).toBe('stored-token');
    expect(typeof options.onUnauthorized).toBe('function');
  });

  it("on 401, the mindmap client's onUnauthorized clears the session too", async () => {
    const { env } = await import('../../config/env');
    const { storage } = await import('../../utils/storage');
    await import('../../services/http');

    const mindmapCall = createApiClient.mock.calls.find(
      ([opts]) =>
        (opts as { baseURL: string }).baseURL === env.MINDMAP_URL &&
        (opts as Record<string, unknown>).getAuthToken
    );
    const options = mindmapCall![0] as { onUnauthorized: () => void };
    window.location.hash = '#/dashboard';

    options.onUnauthorized();

    // toHaveBeenCalled (not an exact count): the utils/storage mock module
    // isn't re-created per vi.resetModules() the way services/http.ts is
    // (vi.mock's factory runs once for the whole file), so its call count
    // accumulates across this file's other 401 tests too.
    expect(storage.clearAuthToken).toHaveBeenCalled();
    expect(window.location.hash).toBe('#/auth/login');
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

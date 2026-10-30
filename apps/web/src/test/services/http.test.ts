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

const getValidAccessToken = vi.hoisted(() => vi.fn());
const refreshAccessToken = vi.hoisted(() => vi.fn());
vi.mock('../../services/session.service', () => ({
  getValidAccessToken,
  refreshAccessToken,
}));

describe('http', () => {
  beforeEach(() => {
    vi.resetModules();
    createApiClient.mockClear();
    getValidAccessToken.mockReset();
    refreshAccessToken.mockReset();

    /*
     * Every client is looked up by its baseURL, so the four URLs must be
     * distinct. They come from a developer's untracked .env, which a clean
     * checkout (CI) doesn't have — there they would all be '' and the lookups
     * would match the wrong client — so set them here instead of relying on it.
     */
    vi.stubEnv('VITE_AUTH_GATEWAY_URL', 'https://gateway.test');
    vi.stubEnv('VITE_PORTAL_URL', 'https://portal.test');
    vi.stubEnv('VITE_CONFIG_URL', 'https://config.test');
    vi.stubEnv('VITE_OPENMRS_URL', 'https://openmrs.test/openmrs/ws/rest/v1');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('builds the authenticated client against AUTH_GATEWAY_URL with the session service as its token provider and 401 handler', async () => {
    const { env } = await import('../../config/env');
    await import('../../services/http');

    const authCall = createApiClient.mock.calls.find(
      ([opts]) => (opts as { baseURL: string }).baseURL === env.AUTH_GATEWAY_URL
    );
    expect(authCall).toBeDefined();

    const options = authCall![0] as {
      getAuthToken: () => Promise<string | null>;
      onUnauthorized: (failedToken?: string) => Promise<string | null>;
    };

    /* Requests are sent with the (pre-emptively refreshed) valid token... */
    getValidAccessToken.mockResolvedValue('fresh-token');
    await expect(options.getAuthToken()).resolves.toBe('fresh-token');

    /* ...and a 401 is answered by the shared silent refresh, told which token failed. */
    refreshAccessToken.mockResolvedValue('replacement-token');
    await expect(options.onUnauthorized('stale-token')).resolves.toBe(
      'replacement-token'
    );
    expect(refreshAccessToken).toHaveBeenCalledWith('stale-token');
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

  it('builds the portal client against PORTAL_URL with the same token provider and 401 handler as httpClient', async () => {
    const { env } = await import('../../config/env');
    await import('../../services/http');

    const portalCall = createApiClient.mock.calls.find(
      ([opts]) => (opts as { baseURL: string }).baseURL === env.PORTAL_URL
    );
    expect(portalCall).toBeDefined();

    const options = portalCall![0] as {
      getAuthToken: () => Promise<string | null>;
      onUnauthorized: (failedToken?: string) => Promise<string | null>;
    };

    getValidAccessToken.mockResolvedValue('fresh-token');
    await expect(options.getAuthToken()).resolves.toBe('fresh-token');

    refreshAccessToken.mockResolvedValue('replacement-token');
    await expect(options.onUnauthorized('stale-token')).resolves.toBe(
      'replacement-token'
    );
    expect(refreshAccessToken).toHaveBeenCalledWith('stale-token');
  });
});

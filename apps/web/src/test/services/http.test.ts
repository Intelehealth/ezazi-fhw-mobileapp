import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `createApiClient` is mocked (not axios itself) so these tests assert on
 * *this file's own* wiring — which options it hands @ezazi/api-client —
 * rather than re-testing that package's own interceptor behavior (covered
 * by its own test suite).
 */
const createApiClient = vi.fn<(...args: unknown[]) => unknown>(() => ({
  __stub: 'axios-instance',
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
});

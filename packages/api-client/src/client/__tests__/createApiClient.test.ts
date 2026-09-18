import { describe, it, expect, afterEach, vi } from 'vitest';
import { createApiClient } from '../createApiClient';
import * as interceptors from '../interceptors';

vi.mock('../interceptors', () => ({
  attachAuthInterceptor: vi.fn(),
  attachUnauthorizedRetryInterceptor: vi.fn(),
}));

describe('createApiClient', () => {

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('creates an axios instance with the given baseURL and a default timeout', () => {
    const instance = createApiClient({ baseURL: 'https://example.test' });
    expect(instance.defaults.baseURL).toBe('https://example.test');
    expect(instance.defaults.timeout).toBe(15000);
  });

  it('honors a custom timeout', () => {
    const instance = createApiClient({ baseURL: 'https://example.test', timeout: 5000 });
    expect(instance.defaults.timeout).toBe(5000);
  });

  it('attaches the auth interceptor only when getAuthToken is provided', () => {
    createApiClient({ baseURL: 'https://example.test' });
    expect(interceptors.attachAuthInterceptor).not.toHaveBeenCalled();

    createApiClient({ baseURL: 'https://example.test', getAuthToken: () => 'x' });
    expect(interceptors.attachAuthInterceptor).toHaveBeenCalledTimes(1);
  });

  it('attaches the unauthorized-retry interceptor only when onUnauthorized is provided', () => {
    createApiClient({ baseURL: 'https://example.test' });
    expect(interceptors.attachUnauthorizedRetryInterceptor).not.toHaveBeenCalled();

    createApiClient({ baseURL: 'https://example.test', onUnauthorized: () => null });
    expect(interceptors.attachUnauthorizedRetryInterceptor).toHaveBeenCalledTimes(1);
  });

});

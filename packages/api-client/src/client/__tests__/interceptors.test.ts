import { describe, it, expect, vi } from 'vitest';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { attachAuthInterceptor, attachUnauthorizedRetryInterceptor } from '../interceptors';

type RequestHandler = (
  config: InternalAxiosRequestConfig,
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
type RejectedHandler = (error: unknown) => unknown;

function createFakeConfig(): InternalAxiosRequestConfig {
  return { headers: { set: vi.fn() } } as unknown as InternalAxiosRequestConfig;
}

/** Fakes just enough of an AxiosInstance to unit-test interceptor wiring, offline. */
function createFakeInstance() {
  let requestHandler: RequestHandler | undefined;
  let responseRejectedHandler: RejectedHandler | undefined;
  const callInstance = vi.fn();

  const instance = Object.assign(callInstance, {
    interceptors: {
      request: {
        use: (fn: RequestHandler) => {
          requestHandler = fn;
        },
      },
      response: {
        use: (_onFulfilled: unknown, onRejected: RejectedHandler) => {
          responseRejectedHandler = onRejected;
        },
      },
    },
  }) as unknown as AxiosInstance;

  return {
    instance,
    callInstance,
    getRequestHandler: () => requestHandler,
    getResponseRejectedHandler: () => responseRejectedHandler,
  };
}

describe('attachAuthInterceptor', () => {

  it('attaches an Authorization header when a token is available', async () => {
    const { instance, getRequestHandler } = createFakeInstance();
    attachAuthInterceptor(instance, () => 'token-123');

    const config = createFakeConfig();
    await getRequestHandler()!(config);

    expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer token-123');
  });

  it('does not attach a header when no token is available', async () => {
    const { instance, getRequestHandler } = createFakeInstance();
    attachAuthInterceptor(instance, () => null);

    const config = createFakeConfig();
    await getRequestHandler()!(config);

    expect(config.headers.set).not.toHaveBeenCalled();
  });

  it('supports an async token provider', async () => {
    const { instance, getRequestHandler } = createFakeInstance();
    attachAuthInterceptor(instance, async () => 'async-token');

    const config = createFakeConfig();
    await getRequestHandler()!(config);

    expect(config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer async-token');
  });

});

describe('attachUnauthorizedRetryInterceptor', () => {

  function create401Error(retried = false) {
    return {
      isAxiosError: true,
      response: { status: 401 },
      config: { _retry: retried, headers: { set: vi.fn() } },
    };
  }

  it('retries once with the new token when onUnauthorized resolves one', async () => {
    const { instance, callInstance, getResponseRejectedHandler } = createFakeInstance();
    const onUnauthorized = vi.fn().mockResolvedValue('new-token');
    attachUnauthorizedRetryInterceptor(instance, onUnauthorized);

    const error = create401Error();
    await getResponseRejectedHandler()!(error);

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(error.config.headers.set).toHaveBeenCalledWith('Authorization', 'Bearer new-token');
    expect(callInstance).toHaveBeenCalledWith(error.config);
  });

  it('does not retry a request that has already been retried', async () => {
    const { instance, callInstance, getResponseRejectedHandler } = createFakeInstance();
    const onUnauthorized = vi.fn().mockResolvedValue('new-token');
    attachUnauthorizedRetryInterceptor(instance, onUnauthorized);

    const error = create401Error(true);
    await expect(getResponseRejectedHandler()!(error)).rejects.toBe(error);

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(callInstance).not.toHaveBeenCalled();
  });

  it('rejects without retrying when onUnauthorized yields no token', async () => {
    const { instance, callInstance, getResponseRejectedHandler } = createFakeInstance();
    const onUnauthorized = vi.fn().mockResolvedValue(null);
    attachUnauthorizedRetryInterceptor(instance, onUnauthorized);

    const error = create401Error();
    await expect(getResponseRejectedHandler()!(error)).rejects.toBe(error);

    expect(callInstance).not.toHaveBeenCalled();
  });

  it('passes through non-401 errors untouched', async () => {
    const { instance, callInstance, getResponseRejectedHandler } = createFakeInstance();
    const onUnauthorized = vi.fn();
    attachUnauthorizedRetryInterceptor(instance, onUnauthorized);

    const error = { isAxiosError: true, response: { status: 500 }, config: {} };
    await expect(getResponseRejectedHandler()!(error)).rejects.toBe(error);

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(callInstance).not.toHaveBeenCalled();
  });

});
